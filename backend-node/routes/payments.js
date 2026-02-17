const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

let Razorpay;
let razorpay;
try {
    if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
        Razorpay = require('razorpay');
        razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    }
} catch (e) {
    console.warn('Razorpay SDK not installed or keys missing.');
}

// POST /api/payments/create-order
router.post('/create-order', authenticate, async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount < 50) return res.status(400).json({ error: 'Minimum recharge is ₹50' });

    try {
        if (!razorpay) return res.status(500).json({ error: 'Payment gateway not configured' });

        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: `rcpt_${Date.now()}`,
            notes: { userId: req.user.id }
        });

        await prisma.transaction.create({
            data: {
                userId: req.user.id,
                type: 'recharge',
                amount,
                razorpayOrderId: order.id,
                status: 'pending'
            }
        });

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: RAZORPAY_KEY_ID
        });
    } catch (err) {
        console.error('Razorpay order error:', err);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

// POST /api/payments/verify
router.post('/verify', authenticate, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        const generatedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }

        // Transaction to update user balance and record ledger entry
        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Transaction Status
            // Use findMany + updateMany as findUnique needs unique constraint on razorpayOrderId if strict
            // But here we rely on the fact that order_id is unique enough for logic
            await tx.transaction.updateMany({
                where: { razorpayOrderId: razorpay_order_id, userId: req.user.id },
                data: { razorpayPaymentId: razorpay_payment_id, status: 'success' }
            });

            const txn = await tx.transaction.findFirst({ where: { razorpayOrderId: razorpay_order_id } });
            if (!txn) throw new Error('Transaction not found');

            // 2. Update User Balance
            const user = await tx.user.update({
                where: { id: req.user.id },
                data: { balance: { increment: txn.amount } }
            });

            // 3. Create Ledger Entry
            await tx.walletTransaction.create({
                data: {
                    userId: req.user.id,
                    type: 'recharge',
                    amount: txn.amount,
                    balanceBefore: Number(user.balance) - Number(txn.amount),
                    balanceAfter: Number(user.balance),
                    referenceType: 'transaction',
                    referenceId: txn.id,
                    description: `Wallet recharge via Razorpay`
                }
            });

            return user;
        });

        res.json({ success: true, newBalance: result.balance });
    } catch (err) {
        console.error('Payment verify error:', err);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// GET /api/payments/history — Redirects to wallet history
router.get('/history', authenticate, async (req, res) => {
    // Redirect to new wallet endpoint logic or just duplicate query
    try {
        const txns = await prisma.transaction.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(txns);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
