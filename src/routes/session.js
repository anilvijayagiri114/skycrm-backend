import express from 'express';
import { connectRedis } from '../config/redis.js';
import { authRequired as authMiddleware  } from '../middleware/auth.js';
const router = express.Router();

// Set pending logout (called on tab unload)
router.post('/pending-logout', authMiddleware, async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(400).json({ error: 'No user.' });
  const redisClient = await connectRedis();
  await redisClient.set(`pending_logout:${userId}`, '1', { EX: 10 }); // 10s expiry
  res.json({ ok: true });
});

// Cancel pending logout (called on reconnect/API call)
router.post('/cancel-pending-logout', authMiddleware, async (req, res) => {
  const userId = req.user?.id || req.session?.userId;
  if (!userId) return res.status(400).json({ error: 'No user.' });
  const redisClient = await connectRedis();
  await redisClient.del(`pending_logout:${userId}`);
  res.json({ ok: true });
});

export default router;
