const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/wallet/balance
router.get('/balance', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { balance: true }
        });
        res.json({ balance: user.balance });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/wallet/history — Detailed Ledger
router.get('/history', authenticate, async (req, res) => {
    try {
        const transactions = await prisma.walletTransaction.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch wallet history' });
    }
});

module.exports = router;
