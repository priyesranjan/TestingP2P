const rateLimit = require('express-rate-limit');

const createRateLimiter = () => {
  return rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const messageThrottle = new Map();

const checkMessageThrottle = (userId) => {
  const now = Date.now();
  const lastMessage = messageThrottle.get(userId);
  const throttleMs = parseInt(process.env.MESSAGE_THROTTLE_MS) || 500;
  
  if (lastMessage && now - lastMessage < throttleMs) {
    return false;
  }
  
  messageThrottle.set(userId, now);
  return true;
};

const cleanupThrottle = (userId) => {
  messageThrottle.delete(userId);
};

module.exports = {
  createRateLimiter,
  checkMessageThrottle,
  cleanupThrottle
};