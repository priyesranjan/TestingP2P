require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8001;

// ───────────────────────────────────────────────
// Middleware
// ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Rate Limiter
try {
  const { createRateLimiter } = require('./rateLimiter');
  if (createRateLimiter) app.use('/api/', createRateLimiter());
} catch (e) {
  console.warn('Rate limiter not found, skipping');
}

// ───────────────────────────────────────────────
// Health Check
// ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Connecto',
    version: '2.0.0',
    uptime: process.uptime()
  });
});

// ───────────────────────────────────────────────
// API Routes
// ───────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/users'));
app.use('/api/experts', require('./routes/experts'));
app.use('/api/calls', require('./routes/calls'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/notifications', require('./routes/notifications'));

// ───────────────────────────────────────────────
// WebSocket (Random Matching)
// ───────────────────────────────────────────────
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server, path: '/api/ws' });

// Matching Queue
const waitingQueue = [];
const activeSessions = new Map();

wss.on('connection', (ws) => {
  const userId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  ws.userId = userId;
  ws.isAlive = true;

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      switch (data.type) {
        case 'find_match': {
          const matchType = data.matchType || 'random_audio'; // random_audio | random_chat
          ws.matchType = matchType;

          // Find someone in queue with same type
          const matchIndex = waitingQueue.findIndex(
            (w) => w.matchType === matchType && w.userId !== userId && w.readyState === WebSocket.OPEN
          );

          if (matchIndex !== -1) {
            const partner = waitingQueue.splice(matchIndex, 1)[0];
            // Notify both
            ws.send(JSON.stringify({ type: 'match_found', partnerId: partner.userId, matchType }));
            partner.send(JSON.stringify({ type: 'match_found', partnerId: userId, matchType }));
            activeSessions.set(userId, partner.userId);
            activeSessions.set(partner.userId, userId);
          } else {
            waitingQueue.push(ws);
            ws.send(JSON.stringify({ type: 'waiting', message: 'Looking for a match...' }));
          }
          break;
        }

        case 'webrtc_signal': {
          const partnerId = activeSessions.get(userId);
          if (partnerId) {
            wss.clients.forEach((client) => {
              if (client.userId === partnerId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'webrtc_signal', signal: data.signal, from: userId }));
              }
            });
          }
          break;
        }

        case 'chat_message': {
          const chatPartnerId = activeSessions.get(userId);
          if (chatPartnerId) {
            wss.clients.forEach((client) => {
              if (client.userId === chatPartnerId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'chat_message',
                  from: userId,
                  content: data.content,
                  messageType: data.messageType || 'text',
                  timestamp: Date.now()
                }));
              }
            });
          }
          break;
        }

        case 'skip': {
          const currentPartnerId = activeSessions.get(userId);
          if (currentPartnerId) {
            // Notify partner
            wss.clients.forEach((client) => {
              if (client.userId === currentPartnerId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'partner_disconnected' }));
              }
            });
            activeSessions.delete(currentPartnerId);
            activeSessions.delete(userId);
          }
          // Re-enter queue
          const qi = waitingQueue.findIndex((w) => w.userId === userId);
          if (qi === -1) waitingQueue.push(ws);
          ws.send(JSON.stringify({ type: 'waiting', message: 'Looking for a new match...' }));
          break;
        }

        case 'end_session': {
          const endPartnerId = activeSessions.get(userId);
          if (endPartnerId) {
            wss.clients.forEach((client) => {
              if (client.userId === endPartnerId && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'partner_disconnected' }));
              }
            });
            activeSessions.delete(endPartnerId);
            activeSessions.delete(userId);
          }
          break;
        }
      }
    } catch (err) {
      console.error('WS Message Error:', err);
    }
  });

  ws.on('close', () => {
    // Remove from queue
    const qi = waitingQueue.findIndex((w) => w.userId === userId);
    if (qi !== -1) waitingQueue.splice(qi, 1);

    // Notify partner
    const partnerId = activeSessions.get(userId);
    if (partnerId) {
      wss.clients.forEach((client) => {
        if (client.userId === partnerId && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'partner_disconnected' }));
        }
      });
      activeSessions.delete(partnerId);
      activeSessions.delete(userId);
    }
  });
});

// Heartbeat
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// ───────────────────────────────────────────────
// Online Users Endpoint
// ───────────────────────────────────────────────
app.get('/api/online', (req, res) => {
  res.json({
    online: wss.clients.size,
    inQueue: waitingQueue.length,
    inCall: activeSessions.size / 2
  });
});

// ───────────────────────────────────────────────
// Start Server
// ───────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║     🚀 Connecto Platform v2.0           ║
║     Running on port ${PORT}                ║
║     30+ API Endpoints                   ║
║     WebSocket Matching Engine           ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = { app, server };