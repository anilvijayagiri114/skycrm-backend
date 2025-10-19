// const cache = new Map();
// const CACHE_TTL_SECONDS = 20;

// export const cacheMiddleware = (req, res, next) => {
//   if (req.method !== 'GET') {
//     return next();
//   }

//   const key = req.originalUrl;
//   const cached = cache.get(key);

//   if (cached && (Date.now() - cached.timestamp) / 1000 < CACHE_TTL_SECONDS) {
//     console.log(`[Cache HIT] for key: ${key}`);
//     return res.json(cached.data);
//   }

//   console.log(`[Cache MISS] for key: ${key}`);
//   const originalJson = res.json;
//   res.json = (data) => {
//     cache.set(key, { data, timestamp: Date.now() });
//     originalJson.call(res, data);
//   };

//   next();
// };

// export const clearCache = (key) => {
//   console.log(`[Cache CLEARED] for key: ${key}`);
//   cache.delete(key);
// };


import { connectRedis } from "../config/redis.js";
import dotenv from "dotenv";
dotenv.config();

const CACHE_TTL_SECONDS = parseInt(process.env.REDIS_TTL) || 200;

export const redisCacheMiddleware = async (req, res, next) => {
  if (req.method !== "GET") return next();

  const key = req.originalUrl;
  
  try {
    const redisClient = await connectRedis();
    const cachedData = await redisClient.get(key);

    if (cachedData) {
      console.log(`[Redis Cache HIT] for key: ${key}`);
      return res.json(JSON.parse(cachedData));
    }

    console.log(`[Redis Cache MISS] for key: ${key}`);

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      redisClient.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(data));
      return originalJson(data);
    };

    next();
  } catch (err) {
    console.warn("Redis caching not available, skipping cache:", err.message);
    next();
  }
};

export const clearRedisCache = async (key) => {
  try {
    const redisClient = await connectRedis();
    await redisClient.del(key);
    console.log(`[Redis Cache CLEARED] for key: ${key}`);
  } catch (err) {
    console.warn("Redis cache clear failed:", err.message);
  }
};

