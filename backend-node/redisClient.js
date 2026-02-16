const redis = require('redis');
const { promisify } = require('util');

let client = null;
let isConnected = false;

const initRedis = async () => {
  try {
    client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
      },
      password: process.env.REDIS_PASSWORD || undefined
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('Redis Client Connected');
      isConnected = true;
    });

    // Add a timeout to prevent hanging on connection
    const connectPromise = client.connect();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    return client;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    console.log('Running in memory-only mode without Redis');
    return null;
  }
};

const getRedisClient = () => client;
const isRedisConnected = () => isConnected;

module.exports = {
  initRedis,
  getRedisClient,
  isRedisConnected
};