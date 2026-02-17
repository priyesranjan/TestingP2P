const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/reviews — Submit review after call
router.post('/', authenticate, async (req, res) => {
    const { callId, rating, comment } = req.body;
    if (!callId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Call ID and rating (1-5) required' });
    }

    try {
        const call = await prisma.callLog.findUnique({ where: { id: callId } });
        if (!call) return res.status(404).json({ error: 'Call not found' });
        if (call.callerId !== req.user.id) {
            return res.status(403).json({ error: 'Only caller can review' });
        }
        if (!call.expertId) {
            return res.status(400).json({ error: 'Cannot review random calls' });
        }

        const review = await prisma.review.upsert({
            where: { callId },
            update: { rating, comment },
            create: {
                callId,
                reviewerId: req.user.id,
                expertId: call.expertId,
                rating,
                comment
            }
        });

        // Recalculate expert average rating
        const avgResult = await prisma.review.aggregate({
            where: { expertId: call.expertId },
            _avg: { rating: true }
        });
        await prisma.expertProfile.update({
            where: { userId: call.expertId },
            data: { avgRating: avgResult._avg.rating || 0 }
        });

        res.json({ success: true, review });
    } catch (err) {
        console.error('Review error:', err);
        res.status(500).json({ error: 'Failed to submit review' });
    }
});

// GET /api/reviews/:expertId
router.get('/:expertId', async (req, res) => {
    try {
        const reviews = await prisma.review.findMany({
            where: { expertId: req.params.expertId },
            orderBy: { createdAt: 'desc' },
            take: 30,
            include: { reviewer: { select: { name: true, avatarUrl: true } } }
        });
        res.json(reviews);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

module.exports = router;
