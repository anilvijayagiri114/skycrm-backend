import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/session.js';
import roleRoutes from './routes/roles.js';
import statusRoutes from './routes/statuses.js';
import leadRoutes from './routes/leads.js';
import teamRoutes from './routes/team.js';
import userRoutes from './routes/users.js';
import statsRoutes from './routes/stats.js';
import { ensureDefaultAdmin } from './utils/setupDefaultUser.js';
import { initSocket } from './serverSocket.js';
import { loggerMiddleware } from './middleware/loggerMiddleware.js';
import { redisCacheMiddleware } from './middleware/redisCache.js';
import { connectRedis } from './config/redis.js';
import { createRateLimiter } from './utils/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { pendingLogoutMiddleware } from './middleware/pendingLogout.js';
const PORT = process.env.PORT || 8000;

const createApp = () => {
  const app = express();

  // Security middlewares
  app.use(helmet());
  app.use(loggerMiddleware);

  // Rate limiting (only auth routes)
  // const limiter = rateLimit({
  //   windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1 * 60 * 1000,
  //   max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  //   message: { error: 'Too many requests, please try again later.' }
  // });

  const loginLimiter = createRateLimiter({
    prefix: "rl:login:",
    windowMs: 1 * 60 * 1000, // 15 minutes
    max: 5,
    message: { error: "Too many login attempts. Try again later." },
    keyGenerator: (req) => req.body.email || ipKeyGenerator(req), // ✅ email fallback, IP-safe
  });

  const generalLimiter= createRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute per IP
    message: { error: 'Too many requests. Please slow down.' },
  });
  // Connect DB will be done in start()

  // CORS
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGIN //|| "https://skycrm-frontend-1.onrender.com"
      : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization','X-Requested-With']
  }));

  // Logging
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Body parser
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Uploads
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir), {
    maxAge: '1d',
    etag: true
  }));

  // Health
  app.get('/api/health', (req, res) => res.json({ ok: true, service: 'skycrm-backend' }));


  app.use('/api/auth/login', loginLimiter);  // ⬅ Strict limiter for login
  app.use('/api/auth/register', loginLimiter); 
  // Routes
  app.use('/api/auth', generalLimiter, authRoutes);
  // Pending logout check middleware (should be before protected routes)
  app.use(pendingLogoutMiddleware);
  // Session management endpoints
  app.use('/api/session', sessionRoutes);
  app.use('/api/roles',redisCacheMiddleware,roleRoutes);
  app.use('/api/statuses',redisCacheMiddleware, statusRoutes);
   app.use('/api/leads', redisCacheMiddleware, leadRoutes);
  app.use('/api/team',redisCacheMiddleware,teamRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/users', userRoutes);


  // API 404
  app.use('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  // Serve frontend in production
  // if (process.env.NODE_ENV === 'production') {
  //   app.use(express.static(path.join(__dirname, '../../skycrm-frontend/dist')));
  //   app.get('*', (req, res) => {
  //     res.sendFile(path.join(__dirname, '../../skycrm-frontend/dist/index.html'));
  //   });
  // }

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    const error = process.env.NODE_ENV === 'production'
      ? { error: 'Internal Server Error' }
      : { error: err.message, stack: err.stack };
    res.status(err.status || 500).json(error);
  });

  return app;
};

const start = async () => {
  await connectDB();
  
  // Try to connect to Redis, but don't fail if it's not available
  try {
    await connectRedis();
    console.log("✅ Redis connected successfully");
  } catch (error) {
    console.warn("⚠️ Redis connection failed, continuing without Redis:", error.message);
  }
  
  await ensureDefaultAdmin();

  const app = createApp();
  const server = http.createServer(app);

  initSocket(server);

  server.listen(PORT, () => {
    console.log(`SkyCRM backend listening on http://localhost:${PORT}`);
  });
};

start().catch(e => {
  console.error('Failed to start server', e);
  process.exit(1);
});
