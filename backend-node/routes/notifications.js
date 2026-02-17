const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notifications — List notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        // Count unread
        const unreadCount = await prisma.notification.count({
            where: { userId: req.user.id, isRead: false }
        });

        res.json({ notifications, unreadCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PUT /api/notifications/:id/read — Mark as read
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { id: req.params.id, userId: req.user.id },
            data: { isRead: true, readAt: new Date() }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// PUT /api/notifications/read-all — Mark all as read
router.put('/read-all', authenticate, async (req, res) => {
    try {
        await prisma.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true, readAt: new Date() }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/notifications/register-token — FCM Token
router.post('/register-token', authenticate, async (req, res) => {
    const { fcmToken, deviceType } = req.body;
    try {
        // Create or update user session with new token
        await prisma.userSession.create({
            data: {
                userId: req.user.id,
                deviceType: deviceType || 'unknown',
                fcmToken,
                isActive: true
            }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to register token' });
    }
});

module.exports = router;
