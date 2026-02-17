const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'connecto-secret-change-me';

// Verify JWT Token
const authenticate = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return res.status(401).json({ error: 'User not found' });
        if (user.isBanned) return res.status(403).json({ error: 'Account suspended' });
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Verify Admin Role
const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Verify Expert Role
const requireExpert = (req, res, next) => {
    if (req.user?.role !== 'expert' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Expert access required' });
    }
    next();
};

module.exports = { authenticate, requireAdmin, requireExpert, JWT_SECRET };
