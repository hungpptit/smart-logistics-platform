import { createClient } from 'redis';

const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT || '6379';
const password = process.env.REDIS_PASSWORD || 'redis_password';

export const redis = createClient({
  url: `redis://:${password}@${host}:${port}`
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redis.isOpen) {
      await redis.connect();
      console.log('✅ Connected to Redis cache service successfully');
    }
  } catch (error) {
    console.error('❌ Redis connection error:', error);
  }
};
