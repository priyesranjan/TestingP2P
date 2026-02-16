require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { initRedis } = require('./redisClient');
const { initWebSocket, getOnlineUsers } = require('./websocket');
const { createRateLimiter } = require('./rateLimiter');

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

app.get('/api', (req, res) => {
  res.json({
    name: 'Ghost Protocol API',
    version: '1.0.0',
    description: 'Anonymous real-time chat with WebRTC support',
    endpoints: {
      health: '/api/health',
      online: '/api/online',
      websocket: '/api/ws'
    }
  });
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