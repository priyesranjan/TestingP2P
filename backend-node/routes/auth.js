const express = require('express');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory OTP store (use Redis in production)
const otpStore = new Map();

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
        return res.status(400).json({ error: 'Valid phone number required' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 min

    // TODO: Send OTP via SMS API (Twilio, MSG91, etc.)
    // For now, log it (REMOVE IN PRODUCTION)
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({ success: true, message: 'OTP sent successfully' });
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
        return res.status(400).json({ error: 'Phone and OTP required' });
    }

    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== otp || Date.now() > stored.expiresAt) {
        return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    otpStore.delete(phone); // One-time use

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        user = await prisma.user.create({
            data: { phone, name: `User_${phone.slice(-4)}` }
        });
    }

    // Generate JWT
    const token = jwt.sign(
        { userId: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: '30d' }
    );

    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            role: user.role,
            balance: user.balance,
            avatarUrl: user.avatarUrl
        }
    });
});

module.exports = router;
