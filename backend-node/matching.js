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
  const redisClient = getRedisClient();
  
  if (isRedisConnected() && redisClient) {
    try {
      let partnerId = await redisClient.rPop(QUEUE_KEY);
      
      while (partnerId === currentUserId && partnerId !== null) {
        partnerId = await redisClient.rPop(QUEUE_KEY);
      }
      
      if (partnerId && partnerId !== currentUserId) {
        console.log(`Matched ${currentUserId} with ${partnerId} via Redis`);
        return partnerId;
      }
      
      return null;
    } catch (error) {
      console.error('Redis getNextMatch error:', error);
    }
  }
  
  if (inMemoryQueue.length === 0) {
    return null;
  }
  
  let partnerId = inMemoryQueue.pop();
  while (partnerId === currentUserId && inMemoryQueue.length > 0) {
    partnerId = inMemoryQueue.pop();
  }
  
  if (partnerId && partnerId !== currentUserId) {
    console.log(`Matched ${currentUserId} with ${partnerId} via memory`);
    return partnerId;
  }
  
  return null;
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