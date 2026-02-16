import rateLimit from 'express-rate-limit';

export const createRateLimiter = () => {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const messageThrottle = new Map();

export const checkMessageThrottle = (userId) => {
  const now = Date.now();
  const lastMessage = messageThrottle.get(userId);
  const throttleMs = 500;
  
  if (lastMessage && now - lastMessage < throttleMs) {
    return false;
  }
  
  messageThrottle.set(userId, now);
  return true;
};

export const cleanupThrottle = (userId) => {
  messageThrottle.delete(userId);
};