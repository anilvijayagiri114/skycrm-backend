// // utils/rateLimiter.js
// import rateLimit from 'express-rate-limit';
// import RateLimitRedisStore from 'rate-limit-redis';
// import { getRedisClient } from '../config/redis.js';

// export const createRateLimiter = (options = {}) => {
//   const redisClient = getRedisClient();

//   return rateLimit({
//     store: new RateLimitRedisStore({
//       sendCommand: (...args) => redisClient.sendCommand(args),
//       prefix: 'crm_rl:', // Redis key prefix for rate limits
//     }),
//     windowMs: options.windowMs || 2 * 60 * 1000, // 15 minutes
//     max: options.max || 100, // limit each IP to 100 requests per windowMs
//     message: options.message || 'Too many requests, please try again later.',
//     standardHeaders: true, // adds RateLimit-* headers
//     legacyHeaders: false,  // removes deprecated X-RateLimit-* headers
//   });
// };

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient } from "../config/redis.js";

export const createRateLimiter = (options) => {
  const prefix = options.prefix || "rl:";

  try {
    const redisClient = getRedisClient();
    
    return rateLimit({
      store: new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix,
      }),
      windowMs: options.windowMs,
      max: options.max,
      message: options.message,

      // ✅ Safe key generator
      keyGenerator: (req) => {
        if (options.keyGenerator) return options.keyGenerator(req);
        // fallback: use safe IP version
        return ipKeyGenerator(req);
      },
    });
  } catch (error) {
    console.warn('Redis not available, falling back to memory store:', error.message);
    
    // Fallback to memory store if Redis is not available
    return rateLimit({
      windowMs: options.windowMs,
      max: options.max,
      message: options.message,
      keyGenerator: (req) => {
        if (options.keyGenerator) return options.keyGenerator(req);
        return ipKeyGenerator(req);
      },
    });
  }
};
