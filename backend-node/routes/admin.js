const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// ─── Helper: Log Admin Action ───
const logAction = async (adminId, action, targetType, targetId, details, req) => {
    try {
        await prisma.auditLog.create({
            data: {
                adminId, action, targetType, targetId, details,
                ipAddress: req.ip || req.connection.remoteAddress
            }
        });
    } catch (e) {
        console.error('Audit Log Error:', e);
    }
};

// ─── Auth ───
router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid password' });

    try {
        let adminUser = await prisma.user.findFirst({ where: { role: 'admin' } });
        if (!adminUser) {
            adminUser = await prisma.user.create({
                data: { phone: '0000000000', name: 'Admin', role: 'admin' }
            });
        }
        const token = jwt.sign({ userId: adminUser.id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
        await logAction(adminUser.id, 'login', 'system', 'admin', { success: true }, req);
        res.json({ success: true, token });
    } catch (err) {
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});

// ─── Dashboard Stats ───
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const [totalUsers, totalExperts, totalCalls, totalRevenue, pendingApps, pendingReports, pendingPayouts] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'expert' } }),
            prisma.callSession.count(),
            prisma.walletTransaction.aggregate({ where: { type: 'recharge' }, _sum: { amount: true } }),
            prisma.expertApplication.count({ where: { status: 'pending' } }),
            prisma.report.count({ where: { status: 'pending' } }),
            prisma.payout.aggregate({ where: { status: 'pending' }, _sum: { amount: true } })
        ]);

        res.json({
            totalUsers,
            totalExperts,
            totalCalls,
            totalRevenue: totalRevenue._sum.amount || 0,
            pendingApplications: pendingApps,
            pendingReports,
            pendingPayouts: pendingPayouts._sum.amount || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ─── Expert Analytics ───
router.get('/expert-analytics/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const expert = await prisma.expertProfile.findUnique({
            where: { id: req.params.id },
            include: { user: { select: { name: true, phone: true, avatarUrl: true } } }
        });
        if (!expert) return res.status(404).json({ error: 'Expert not found' });

        // Get last 30 days calls
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const calls = await prisma.callSession.findMany({
            where: { expertProfileId: expert.id, createdAt: { gte: thirtyDaysAgo } },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, durationSeconds: true, expertEarning: true, userRating: true,
                createdAt: true, status: true
            }
        });

        const stats = {
            totalEarnings: expert.totalEarnings,
            totalCalls: expert.totalCalls,
            avgRating: expert.avgRating,
            callsLast30Days: calls.length,
            completionRate: expert.completionRate,
            recentCalls: calls.slice(0, 10)
        };

        res.json({ expert, stats });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

// ─── Applications (Enhanced) ───
router.get('/applications', authenticate, requireAdmin, async (req, res) => {
    try {
        const apps = await prisma.expertApplication.findMany({
            where: { status: 'pending' },
            include: { user: { select: { id: true, name: true, phone: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(apps);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.put('/applications/:id', authenticate, requireAdmin, async (req, res) => {
    const { status, rejectionReason } = req.body;
    try {
        const app = await prisma.expertApplication.update({
            where: { id: req.params.id },
            data: { status, rejectionReason, reviewedBy: req.user.userId, reviewedAt: new Date() }
        });

        if (status === 'approved') {
            await prisma.user.update({
                where: { id: app.userId },
                data: { role: 'expert', isVerified: true }
            });
            await prisma.expertProfile.upsert({
                where: { userId: app.userId },
                update: {},
                create: {
                    userId: app.userId,
                    displayName: app.realName,
                    specialization: app.expertise,
                    subSpecialization: app.subExpertise,
                    languages: app.languages,
                    voiceIntroUrl: app.voiceIntroUrl,
                    bio: `${app.experience} years of experience in ${app.expertise}`,
                    upiId: app.upiId,
                    bankName: app.bankName,
                    bankAccountNo: app.bankAccountNo,
                    bankIfsc: app.bankIfsc
                }
            });
            await logAction(req.user.userId, 'approve_expert', 'application', app.id, { userId: app.userId }, req);
        } else {
            await logAction(req.user.userId, 'reject_expert', 'application', app.id, { reason: rejectionReason }, req);
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed', details: err.message });
    }
});

// ─── Payout Management ───
router.get('/payouts', authenticate, requireAdmin, async (req, res) => {
    try {
        const payouts = await prisma.payout.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { expert: { select: { displayName: true, upiId: true, bankName: true } } }
        });
        res.json(payouts);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/payouts/:id/process', authenticate, requireAdmin, async (req, res) => {
    const { transactionRef } = req.body;
    try {
        const payout = await prisma.payout.update({
            where: { id: req.params.id },
            data: { status: 'completed', transactionRef, processedAt: new Date(), processedBy: req.user.userId }
        });

        // Ledger entry
        await prisma.walletTransaction.create({
            data: {
                userId: (await prisma.expertProfile.findUnique({ where: { id: payout.expertId } })).userId,
                type: 'payout_debit',
                amount: payout.amount,
                balanceBefore: 0, // In reality, fetch user balance first
                balanceAfter: 0,  // Calc new balance
                description: `Payout processed via ${payout.upiId}`,
                referenceType: 'payout',
                referenceId: payout.id
            }
        });

        await logAction(req.user.userId, 'process_payout', 'payout', payout.id, { amount: payout.amount }, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ─── User Management ───
router.get('/users', authenticate, requireAdmin, async (req, res) => {
    const { page = 1, search } = req.query;
    try {
        const where = search ? {
            OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }]
        } : {};

        const users = await prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * 20,
            take: 20,
            select: { id: true, name: true, phone: true, role: true, balance: true, isOnline: true, isBanned: true }
        });
        const total = await prisma.user.count({ where });
        res.json({ users, total, page: parseInt(page), pages: Math.ceil(total / 20) });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/ban', authenticate, requireAdmin, async (req, res) => {
    const { userId, ban, reason } = req.body;
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { isBanned: ban, banReason: reason, bannedAt: ban ? new Date() : null }
        });
        await logAction(req.user.userId, ban ? 'ban_user' : 'unban_user', 'user', userId, { reason }, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ─── Audit Log ───
router.get('/audit-log', authenticate, requireAdmin, async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: { admin: { select: { name: true } } }
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// ─── App Config ───
router.get('/config', authenticate, requireAdmin, async (req, res) => {
    try {
        const config = await prisma.appConfig.findMany();
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

router.put('/config/:key', authenticate, requireAdmin, async (req, res) => {
    try {
        await prisma.appConfig.upsert({
            where: { key: req.params.key },
            update: { value: req.body.value, updatedBy: req.user.userId },
            create: { key: req.params.key, value: req.body.value, updatedBy: req.user.userId }
        });
        await logAction(req.user.userId, 'update_config', 'config', req.params.key, { value: req.body.value }, req);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
