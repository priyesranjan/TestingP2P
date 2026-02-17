const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/user/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { expertProfile: true }
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/profile
router.put('/profile', authenticate, async (req, res) => {
  const { name, avatarUrl } = req.body;
  try {
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, avatarUrl }
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/user/balance
router.get('/balance', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { balance: true }
  });
  res.json({ balance: user.balance });
});

// POST /api/user/delete-request
router.post('/delete-request', authenticate, async (req, res) => {
  const { reason } = req.body;
  try {
    await prisma.deleteRequest.upsert({
      where: { userId: req.user.id },
      update: { reason, status: 'pending' },
      create: { userId: req.user.id, reason }
    });
    res.json({ success: true, message: 'Delete request submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

// GET /api/user/call-history
router.get('/call-history', authenticate, async (req, res) => {
  try {
    const calls = await prisma.callSession.findMany({
      where: {
        OR: [
          { callerId: req.user.id },
          { expertId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        caller: { select: { id: true, name: true, avatarUrl: true } },
        expert: { select: { id: true, name: true, avatarUrl: true } }
      }
    });
    res.json(calls);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /api/user/dashboard
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const [user, recentCalls, recentTxns] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id } }),
      prisma.callSession.findMany({
        where: { callerId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 3
      }),
      prisma.walletTransaction.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 3
      })
    ]);

    res.json({
      balance: user.balance,
      isOnline: user.isOnline,
      recentCalls,
      recentTransactions: recentTxns
    });
  });
  } catch (err) {
  res.status(500).json({ error: 'Dashboard failed' });
}
});

// GET /api/user/experts — List available experts
router.get('/experts', authenticate, async (req, res) => {
  try {
    const experts = await prisma.expertProfile.findMany({
      where: { isVerify: true }, // Only verified experts
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, isOnline: true } }
      },
      orderBy: [
        { isAvailable: 'desc' }, // Available first
        { tier: 'desc' }         // Higher tier first
      ]
    });
    res.json(experts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch experts' });
  }
});

module.exports = router;
