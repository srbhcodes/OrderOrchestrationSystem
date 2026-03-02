import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl);

/** BullMQ requires maxRetriesPerRequest: null for blocking commands */
export const bullmqConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

redisClient.on('connect', () => {
  console.log('✅ Redis connected');
});

redisClient.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

