import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import flipbookRoutes from './routes/flipbookRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startWorker } from './services/pdfWorker.js';
import { initializeSettings } from './config/settings.js';
import {
  securityHeaders,
  rateLimiter,
  csrfProtection,
  checkMaintenanceMode,
  responseTimeTracker
} from './middlewares/auth.js';

// Resolve directory paths in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middlewares
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'] // Allow the CSRF token header
}));
app.use(express.json());
app.use(cookieParser());

// Static uploads directory serving
const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// Apply Security Middlewares to API routes
app.use(securityHeaders);
app.use(responseTimeTracker);
app.use(rateLimiter(180)); // 180 requests per 15 mins window
app.use(csrfProtection);
app.use(checkMaintenanceMode);

// Mount API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/flipbooks', flipbookRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start Background Worker Queue
startWorker();

// Initialize system database settings & Start Server
initializeSettings().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
});
