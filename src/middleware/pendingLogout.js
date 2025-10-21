import { connectRedis } from '../config/redis.js';

// Middleware to check if user has a pending logout
export const pendingLogoutMiddleware = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.session?.userId;
    if (!userId) return next();
    const redisClient = await connectRedis();
    const key = `pending_logout:${userId}`;
    const pending = await redisClient.get(key);
    if (pending) {
      // If pending logout exists, destroy session and force logout
      if (req.session) req.session.destroy?.();
      return res.status(401).json({ error: 'Logged out due to inactivity/tab close.' });
    }
    next();
  } catch (err) {
    next();
  }
};
