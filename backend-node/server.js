require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { initRedis } = require('./redisClient');
const { initWebSocket, getOnlineUsers } = require('./websocket');
const { createRateLimiter } = require('./rateLimiter');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());

const apiLimiter = createRateLimiter();
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

app.get('/api/online', (req, res) => {
  const users = getOnlineUsers();
  res.json({
    users,
    count: users.length,
    timestamp: Date.now()
  });
});

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware
const verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.get('/api', (req, res) => {
  res.json({
    name: 'Ghost Protocol API',
    version: '1.1.0 (Enhanced)',
    endpoints: {
      health: '/api/health',
      online: '/api/online',
      admin: '/api/admin/*'
    }
  });
});

// Admin API
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    const bannedCount = await prisma.bannedIP.count();
    const onlineUsers = getOnlineUsers();

    res.json({
      online: onlineUsers.length,
      totalUsers,
      bannedCount,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { lastSeen: 'desc' },
      take: 50
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/admin/ban', verifyAdmin, async (req, res) => {
  const { ip, reason } = req.body;
  if (!ip) return res.status(400).json({ error: 'IP required' });

  try {
    await prisma.bannedIP.upsert({
      where: { ipAddress: ip },
      update: { reason },
      create: { ipAddress: ip, reason }
    });
    // Disconnect active user if online
    // This requires exposing a disconnect method from websocket.js or broadcasting an event
    res.json({ success: true, message: `Banned ${ip}` });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

const server = http.createServer(app);

initWebSocket(server);

const startServer = async () => {
  try {
    // await initRedis();
    console.log('Redis initialization skipped (forcing in-memory mode)');
  } catch (error) {
    console.log('Running without Redis:', error.message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ghost Protocol server running on port ${PORT}`);
    console.log(`HTTP API: http://0.0.0.0:${PORT}/api`);
    console.log(`WebSocket: ws://0.0.0.0:${PORT}/ws`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

startServer();