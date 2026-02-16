const { getRedisClient, isRedisConnected } = require('./redisClient');

const QUEUE_KEY = 'waiting_queue';

let inMemoryQueue = [];

const addToQueue = async (userId) => {
  const redisClient = getRedisClient();

  if (isRedisConnected() && redisClient) {
    try {
      await redisClient.lPush(QUEUE_KEY, userId);
      console.log(`Added ${userId} to Redis queue`);
      return true;
    } catch (error) {
      console.error('Redis addToQueue error:', error);
    }
  }

  inMemoryQueue.push(userId);
  console.log(`Added ${userId} to in-memory queue`);
  return true;
};

const removeFromQueue = async (userId) => {
  const redisClient = getRedisClient();

  if (isRedisConnected() && redisClient) {
    try {
      await redisClient.lRem(QUEUE_KEY, 0, userId);
      console.log(`Removed ${userId} from Redis queue`);
      return true;
    } catch (error) {
      console.error('Redis removeFromQueue error:', error);
    }
  }

  const index = inMemoryQueue.indexOf(userId);
  if (index > -1) {
    inMemoryQueue.splice(index, 1);
    console.log(`Removed ${userId} from in-memory queue`);
  }
  return true;
};

const getNextMatch = async (currentUserId) => {
  try {
    const redisClient = getRedisClient();

    // Redis Mode
    if (isRedisConnected() && redisClient) {
      let partnerId = await redisClient.rPop(QUEUE_KEY);
      // If we picked ourselves, try again (simple retry logic)
      if (partnerId === currentUserId) {
        // Push back and try once more? Or just discard? 
        // Discarding is safer to avoid infinite loop of picking self.
        // But better to push back at head? 
        // For simplicity in high-scale: Discarding a self-match is fine, user will req again.
        partnerId = await redisClient.rPop(QUEUE_KEY);
      }
      return (partnerId && partnerId !== currentUserId) ? partnerId : null;
    }

    // Memory Mode
    if (inMemoryQueue.length === 0) return null;

    // Simple random pick vs Queue? Queue is fairer.
    // Filter out self from queue to avoid popping self?
    // Expensive operation: inMemoryQueue = inMemoryQueue.filter(id => id !== currentUserId);
    // Better: Pop. If self, pop again.

    let partnerId = inMemoryQueue.shift(); // FIFO (Fairer than pop)

    if (partnerId === currentUserId) {
      // If we picked self, put back at end and pick next?
      inMemoryQueue.push(partnerId);
      partnerId = inMemoryQueue.shift();
    }

    return (partnerId && partnerId !== currentUserId) ? partnerId : null;

  } catch (err) {
    console.error('Matching Error:', err);
    return null;
  }
};

const getQueueLength = async () => {
  const redisClient = getRedisClient();

  if (isRedisConnected() && redisClient) {
    try {
      return await redisClient.lLen(QUEUE_KEY);
    } catch (error) {
      console.error('Redis getQueueLength error:', error);
    }
  }

  return inMemoryQueue.length;
};

module.exports = {
  addToQueue,
  removeFromQueue,
  getNextMatch,
  getQueueLength
};