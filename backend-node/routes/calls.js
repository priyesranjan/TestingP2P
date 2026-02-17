const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// ─── Initiate Call ───
router.post('/initiate', authenticate, async (req, res) => {
    const { expertId, type } = req.body; // type: expert_call | random_audio | random_chat

    try {
        let expertProfileId = null;
        let ratePerMin = 0;

        // Balance Check for Expert Calls
        if (type === 'expert_call') {
            if (!expertId) return res.status(400).json({ error: 'Expert ID required' });

            const expert = await prisma.expertProfile.findUnique({ where: { userId: expertId } });
            if (!expert) return res.status(404).json({ error: 'Expert not found' });
            if (!expert.isAvailable) return res.status(400).json({ error: 'Expert is offline' });

            expertProfileId = expert.id;
            ratePerMin = Number(expert.ratePerMinAudio); // Default to audio rate for now

            // Min balance: 2 mins
            const minBalance = ratePerMin * 2;
            if (Number(req.user.balance) < minBalance) {
                return res.status(402).json({
                    error: 'Insufficient balance',
                    required: minBalance,
                    current: Number(req.user.balance)
                });
            }
        }

        // Create Session
        const session = await prisma.callSession.create({
            data: {
                callerId: req.user.id,
                expertId: expertId || null, // random calls might not have expertId initially
                expertProfileId: expertProfileId || 'system', // Handle random matching later
                callType: 'audio', // Default
                ratePerMin: ratePerMin,
                status: 'initiated'
            }
        });

        res.json({ success: true, sessionId: session.id });
    } catch (err) {
        console.error('Call init error:', err);
        res.status(500).json({ error: 'Failed to initiate call' });
    }
});

// ─── End Call & Billing ───
router.post('/end', authenticate, async (req, res) => {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'Session ID required' });

    try {
        const session = await prisma.callSession.findUnique({ where: { id: sessionId } });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        if (session.status === 'ended') return res.json({ success: true, message: 'Already ended' });

        const endedAt = new Date();
        const durationMs = endedAt - new Date(session.initiatedAt);
        const durationSeconds = Math.floor(durationMs / 1000);
        const billableSeconds = Math.max(0, durationSeconds); // No grace period for now
        const durationMinutes = Math.ceil(billableSeconds / 60);

        let totalCost = 0;
        let expertEarning = 0;
        let platformFee = 0;

        // Billing Logic for Expert Calls
        if (session.expertId && Number(session.ratePerMin) > 0) {
            totalCost = durationMinutes * Number(session.ratePerMin);
            expertEarning = totalCost * 0.80; // 80% to expert
            platformFee = totalCost * 0.20;   // 20% to platform

            // ─── Double-Entry Ledger Transaction ───
            await prisma.$transaction(async (tx) => {
                // 1. Debit Caller
                const caller = await tx.user.update({
                    where: { id: session.callerId },
                    data: { balance: { decrement: totalCost } }
                });

                await tx.walletTransaction.create({
                    data: {
                        userId: session.callerId,
                        type: 'call_debit',
                        amount: -totalCost,
                        balanceBefore: Number(caller.balance) + totalCost,
                        balanceAfter: Number(caller.balance),
                        referenceType: 'call_session',
                        referenceId: session.id,
                        description: `Call with expert (${durationMinutes} mins)`
                    }
                });

                // 2. Credit Expert
                const expert = await tx.user.update({
                    where: { id: session.expertId },
                    data: { balance: { increment: expertEarning } }
                });

                await tx.expertProfile.update({
                    where: { userId: session.expertId },
                    data: {
                        totalCalls: { increment: 1 },
                        totalMinutes: { increment: durationMinutes },
                        totalEarnings: { increment: expertEarning },
                        pendingPayout: { increment: expertEarning }
                    }
                });

                // 3. Badge Logic (Gamification)
                const updatedProfile = await tx.expertProfile.findUnique({ where: { userId: session.expertId } });
                const currentMins = updatedProfile.totalMinutes;
                const badges = updatedProfile.badges || [];
                let newBadge = null;
                let bonusAmount = 0;
                let newTier = null;

                // Thresholds
                if (currentMins >= 1000 && !badges.includes('Silver')) {
                    newBadge = 'Silver';
                    bonusAmount = 500;
                    newTier = 'Silver';
                } else if (currentMins >= 5000 && !badges.includes('Gold')) {
                    newBadge = 'Gold';
                    bonusAmount = 2000;
                    newTier = 'Gold';
                } else if (currentMins >= 20000 && !badges.includes('Platinum')) {
                    newBadge = 'Platinum';
                    bonusAmount = 5000;
                    newTier = 'Platinum';
                }

                if (newBadge) {
                    // Update Profile
                    await tx.expertProfile.update({
                        where: { userId: session.expertId },
                        data: {
                            badges: { push: newBadge },
                            tier: newTier || updatedProfile.tier,
                            totalEarnings: { increment: bonusAmount },
                            pendingPayout: { increment: bonusAmount } // Bonus is withdrawable
                        }
                    });

                    // Credit Bonus to Wallet (Ledger)
                    await tx.user.update({
                        where: { id: session.expertId },
                        data: { balance: { increment: bonusAmount } }
                    });

                    await tx.walletTransaction.create({
                        data: {
                            userId: session.expertId,
                            type: 'bonus',
                            amount: bonusAmount,
                            balanceBefore: Number(expert.balance), // approximation inside tx
                            balanceAfter: Number(expert.balance) + bonusAmount,
                            referenceType: 'badge_bonus',
                            description: `Unlocked ${newBadge} Badge Bonus`
                        }
                    });

                    // Notify Expert
                    await tx.notification.create({
                        data: {
                            userId: session.expertId,
                            title: `🎉 You unlocked the ${newBadge} Badge!`,
                            body: `Congratulations! You've completed ${currentMins} minutes. A bonus of ₹${bonusAmount} has been added to your wallet.`,
                            type: 'bonus'
                        }
                    });
                }
            });
        }

        // Update Session
        const updatedSession = await prisma.callSession.update({
            where: { id: sessionId },
            data: {
                status: 'ended',
                endedAt,
                durationSeconds,
                billableSeconds,
                totalCost,
                expertEarning,
                platformFee
            }
        });

        res.json({
            success: true,
            session: updatedSession,
            cost: totalCost,
            duration: durationSeconds
        });

    } catch (err) {
        console.error('Call end error:', err);
        res.status(500).json({ error: 'Failed to end call' });
    }
});

// ─── Call History ───
router.get('/history', authenticate, async (req, res) => {
    try {
        const history = await prisma.callSession.findMany({
            where: { OR: [{ callerId: req.user.id }, { expertId: req.user.id }] },
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                caller: { select: { name: true, avatarUrl: true } },
                expert: { select: { name: true, avatarUrl: true } }
            }
        });
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

module.exports = router;
