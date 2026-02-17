const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/reports — Report a user
router.post('/', authenticate, async (req, res) => {
    const { reportedId, reason } = req.body;
    if (!reportedId || !reason) {
        return res.status(400).json({ error: 'Reported user ID and reason required' });
    }

    try {
        const report = await prisma.report.create({
            data: {
                reporterId: req.user.id,
                reportedId,
                reason
            }
        });
        res.json({ success: true, message: 'Report submitted', report });
    } catch (err) {
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

module.exports = router;
