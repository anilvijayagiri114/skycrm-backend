import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

let redisClient;

export const connectRedis = async () => {
  if (redisClient) return redisClient;

  try {
    redisClient = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
    });

    redisClient.on("connect", () => console.log("✅ Connected to Redis Cloud"));
    redisClient.on("ready", () => console.log("🚀 Redis ready for commands"));
    redisClient.on("error", (err) => console.error("❌ Redis Error:", err));
    redisClient.on("end", () => console.warn("⚠️ Redis connection closed"));

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("❌ Failed to connect to Redis:", error.message);
    redisClient = null; // Reset client on failure
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};