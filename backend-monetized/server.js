import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { supabase, supabaseAdmin } from './supabaseClient.js';
import { initWebSocket } from './websocket.js';
import { createRateLimiter } from './rateLimiter.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import adminRoutes from './routes/admin.js';
import callRoutes from './routes/calls.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

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
    uptime: process.uptime(),
    service: 'Connecto Backend'
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'Connecto API',
    version: '1.0.0',
    description: 'Monetized video chat with Supabase auth',
    endpoints: {
      auth: '/api/auth/*',
      wallet: '/api/wallet/*',
      admin: '/api/admin/*',
      calls: '/api/calls/*',
      websocket: '/api/ws'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/calls', callRoutes);

const server = http.createServer(app);

initWebSocket(server);

const startServer = async () => {
  try {
    console.log('Verifying Supabase connection...');
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('Supabase connection check:', error.message);
    } else {
      console.log('Supabase connected successfully');
    }
  } catch (error) {
    console.log('Supabase initialization:', error.message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Connecto server running on port ${PORT}`);
    console.log(`HTTP API: http://0.0.0.0:${PORT}/api`);
    console.log(`WebSocket: ws://0.0.0.0:${PORT}/api/ws`);
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