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
import { startCleanupWorker } from './services/cleanupWorker.js';
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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 10000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no Origin (e.g. mobile apps, curl, or direct browser navigations like OAuth callback)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allow localhost development origins
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // 3. Allow FRONTEND_URL environment variable
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && origin === frontendUrl) {
      return callback(null, true);
    }

    // 4. Allow production frontend and Vercel preview domains
    if (origin === 'https://failoi.vercel.app') {
      return callback(null, true);
    }

    try {
      const parsedOrigin = new URL(origin);
      if (parsedOrigin.hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (e) {
      // Fail silently if origin URL is not parseable
    }

    // 5. Safe rejection without throwing/crashing Express
    return callback(null, false);
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

// Root Status Check
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'FAILOI API is running successfully',
    timestamp: new Date()
  });
});

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Start HTTP Server unconditionally to prevent Render port scan timeout (502 Gateway errors)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// Safely initialize settings and start worker asynchronously without blocking or terminating the HTTP server
try {
  startWorker();
  startCleanupWorker();
} catch (workerErr) {
  console.error('[Startup] Background workers failed to start:', workerErr);
}

initializeSettings().catch((settingsErr) => {
  console.error('[Startup] Database settings initialization failed:', settingsErr);
});
