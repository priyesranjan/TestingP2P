const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { uploadToR2 } = require('../services/r2');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ─── Public Endpoints ───

// GET /api/experts — List online experts
router.get('/', async (req, res) => {
    try {
        const experts = await prisma.expertProfile.findMany({
            where: { isAvailable: true, isActive: true },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true, isOnline: true } }
            },
            orderBy: [{ isFeatured: 'desc' }, { avgRating: 'desc' }]
        });
        res.json(experts);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch experts' });
    }
});

// GET /api/experts/:id — Public Profile
router.get('/:id', async (req, res) => {
    try {
        const profile = await prisma.expertProfile.findUnique({
            where: { userId: req.params.id },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true, isOnline: true } },
                timeSlots: true
            }
        });
        if (!profile) return res.status(404).json({ error: 'Expert not found' });

        const reviews = await prisma.review.findMany({
            where: { expertId: req.params.id, isPublic: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { reviewer: { select: { name: true, avatarUrl: true } } }
        });

        res.json({ profile, reviews });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ─── Protected Expert Routes ───

// POST /api/experts/apply — Enhanced KYC Application
const kycUpload = upload.fields([
    { name: 'voiceIntro', maxCount: 1 },
    { name: 'idProof', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 }
]);

router.post('/apply', authenticate, kycUpload, async (req, res) => {
    try {
        const files = req.files || {};
        if (!files.voiceIntro || !files.idProof) {
            return res.status(400).json({ error: 'Voice intro and ID proof are required' });
        }

        const [voiceUrl, idUrl, selfieUrl, photoUrl] = await Promise.all([
            uploadToR2(files.voiceIntro[0]),
            uploadToR2(files.idProof[0]),
            files.selfie ? uploadToR2(files.selfie[0]) : null,
            files.profilePhoto ? uploadToR2(files.profilePhoto[0]) : null
        ]);

        const appData = {
            userId: req.user.id,
            realName: req.body.realName,
            email: req.body.email,
            phoneNumber: req.body.phoneNumber,
            dateOfBirth: new Date(req.body.dateOfBirth),
            gender: req.body.gender,
            city: req.body.city,
            state: req.body.state,
            upiId: req.body.upiId,
            bankName: req.body.bankName,
            bankAccountNo: req.body.bankAccountNo,
            bankIfsc: req.body.bankIfsc,
            panNumber: req.body.panNumber,
            expertise: req.body.expertise,
            subExpertise: req.body.subExpertise,
            experience: req.body.experience,
            languages: JSON.parse(req.body.languages || '[]'),
            voiceIntroUrl: voiceUrl,
            idProofUrl: idUrl,
            selfieUrl: selfieUrl,
            profilePhotoUrl: photoUrl,
            status: 'pending'
        };

        const application = await prisma.expertApplication.upsert({
            where: { userId: req.user.id },
            update: appData,
            create: appData
        });

        res.json({ success: true, application });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Application failed', details: err.message });
    }
});

// GET /api/experts/my-analytics — Expert Dashboard
router.get('/my-analytics', authenticate, async (req, res) => {
    try {
        const profile = await prisma.expertProfile.findUnique({
            where: { userId: req.user.id }
        });
        if (!profile) return res.status(404).json({ error: 'Not an expert' });

        const calls = await prisma.callSession.findMany({
            where: { expertProfileId: profile.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        res.json({
            profile,
            stats: {
                totalEarnings: profile.totalEarnings,
                pendingPayout: profile.pendingPayout,
                totalCalls: profile.totalCalls,
                avgRating: profile.avgRating
            },
            recentCalls: calls
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/experts/my-schedule
router.get('/my-schedule', authenticate, async (req, res) => {
    try {
        const profile = await prisma.expertProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile) return res.status(404).json({ error: 'Not an expert' });

        const slots = await prisma.expertTimeSlot.findMany({
            where: { expertId: profile.id }
        });
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// PUT /api/experts/my-schedule — Update Slots
router.put('/my-schedule', authenticate, async (req, res) => {
    const { slots } = req.body; // Array of { dayOfWeek, startTime, endTime, isActive }
    try {
        const profile = await prisma.expertProfile.findUnique({ where: { userId: req.user.id } });

        // Transaction to replace slots
        await prisma.$transaction([
            prisma.expertTimeSlot.deleteMany({ where: { expertId: profile.id } }),
            prisma.expertTimeSlot.createMany({
                data: slots.map(s => ({ ...s, expertId: profile.id }))
            })
        ]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

// PUT /api/experts/availability — Toggle Online
router.put('/availability', authenticate, async (req, res) => {
    const { isAvailable } = req.body;
    try {
        await prisma.expertProfile.update({
            where: { userId: req.user.id },
            data: { isAvailable }
        });
        await prisma.user.update({
            where: { id: req.user.id },
            data: { isOnline: isAvailable }
        });
        res.json({ success: true, isAvailable });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ─── Payouts ───

// POST /api/experts/withdraw
router.post('/withdraw', authenticate, async (req, res) => {
    const { amount, upiId } = req.body;
    try {
        const expert = await prisma.expertProfile.findUnique({ where: { userId: req.user.id } });
        if (!expert) return res.status(404).json({ error: 'Expert not found' });

        const withdrawAmount = Number(amount);
        if (withdrawAmount < 500) return res.status(400).json({ error: 'Minimum withdrawal is ₹500' });

        // Check current wallet balance (Source of Truth)
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (Number(user.balance) < withdrawAmount) return res.status(400).json({ error: 'Insufficient wallet balance' });

        // Transaction: Debit Wallet + Create Payout Request
        await prisma.$transaction(async (tx) => {
            // 1. Debit User Wallet
            await tx.user.update({
                where: { id: req.user.id },
                data: { balance: { decrement: withdrawAmount } }
            });

            await tx.walletTransaction.create({
                data: {
                    userId: req.user.id,
                    type: 'payout_debit',
                    amount: -withdrawAmount,
                    balanceBefore: Number(user.balance),
                    balanceAfter: Number(user.balance) - withdrawAmount,
                    description: `Payout request to ${upiId || expert.upiId}`,
                    referenceType: 'payout_request'
                }
            });

            // 2. Create Payout Record
            await tx.payout.create({
                data: {
                    expertId: expert.id,
                    amount: withdrawAmount,
                    upiId: upiId || expert.upiId,
                    status: 'requested'
                }
            });
        });

        res.json({ success: true, message: 'Withdrawal requested' });
    } catch (err) {
        console.error('Withdraw error:', err);
        res.status(500).json({ error: 'Failed to request withdrawal' });
    }
});

// GET /api/experts/my-payouts
router.get('/my-payouts', authenticate, async (req, res) => {
    try {
        const expert = await prisma.expertProfile.findUnique({ where: { userId: req.user.id } });
        if (!expert) return res.status(404).json({ error: 'Not an expert' });

        const payouts = await prisma.payout.findMany({
            where: { expertId: expert.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(payouts);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
