const express = require('express');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { uploadToR2 } = require('../services/r2');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB

// POST /api/messages/send — Send text message
router.post('/send', authenticate, async (req, res) => {
    const { callId, type, content } = req.body;
    if (!callId || !content) {
        return res.status(400).json({ error: 'Call ID and content required' });
    }

    try {
        const message = await prisma.message.create({
            data: {
                callId,
                senderId: req.user.id,
                type: type || 'text',
                content
            }
        });
        res.json({ success: true, message });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// POST /api/upload — Upload media to Cloudflare R2
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const url = await uploadToR2(req.file);
        res.json({ success: true, url });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// GET /api/messages/:callId — Get messages for a call
router.get('/:callId', authenticate, async (req, res) => {
    try {
        const messages = await prisma.message.findMany({
            where: { callId: req.params.callId },
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, name: true, avatarUrl: true } } }
        });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

module.exports = router;
