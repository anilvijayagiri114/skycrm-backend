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
import roleRoutes from './routes/roles.js';
import statusRoutes from './routes/statuses.js';
import leadRoutes from './routes/leads.js';
import teamRoutes from './routes/team.js';
import statsRoutes from './routes/stats.js';
import { ensureDefaultAdmin } from './utils/setupDefaultUser.js';
import { initSocket } from './serverSocket.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8000;

const createApp = () => {
  const app = express();

  // Security middlewares
  app.use(helmet());

  // Rate limiting (only auth routes)
  const limiter = rateLimit({
    windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1 * 60 * 1000,
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: { error: 'Too many requests, please try again later.' }
  });

  // Connect DB will be done in start()

  // CORS
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.CORS_ORIGIN 
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

  // Routes
  app.use('/api/auth', limiter, authRoutes);
  app.use('/api/roles', roleRoutes);
  app.use('/api/statuses', statusRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/team', teamRoutes);
  app.use('/api/stats', statsRoutes);

  // API 404
  app.use('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

  // Serve frontend in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../frontend/dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
    });
  }

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
