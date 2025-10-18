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
import userRoutes from "./routes/users.js"
import { loggerMiddleware } from './middleware/loggerMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security middlewares
app.use(helmet());
app.use(loggerMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 1 * 60 * 1000, // 15 minutes in production, 1 minute in development
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 100 requests per window in production, 1000 in development
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/auth', limiter); // Only apply to auth routes

connectDB();

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN  //|| "https://skycrm-frontend-1.onrender.com"
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(path.join(__dirname, '..', uploadDir), {
  maxAge: '1d',
  etag: true
}));

app.get('/api/health', (req,res) => res.json({ ok: true, service: 'skycrm-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/statuses', statusRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/stats', statsRoutes);
app.use("/api/users",userRoutes);

// 404
// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static files in production
// if (process.env.NODE_ENV === 'production') {
//   // Serve static files from frontend build
//   app.use(express.static(path.join(__dirname, '../../skycrm-frontend/dist')));
  
//   // Handle SPA routing - send all non-api requests to index.html
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../../skycrm-frontend/dist/index.html'));
//   });
// }

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't expose stack traces in production
  const error = process.env.NODE_ENV === 'production' 
    ? { error: 'Internal Server Error' }
    : { error: err.message, stack: err.stack };
  
  res.status(err.status || 500).json(error);
});

export default app;
