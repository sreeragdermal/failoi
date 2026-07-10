import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getSetting } from '../config/settings.js';
import prisma from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

// 1. JWT Authentication Guard
export const authenticateUser = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
};

// 2. Role Based Access Control
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    // SUPER_ADMIN has master bypass for all administrative roles
    const hasRole = roles.includes(userRole) || userRole === 'SUPER_ADMIN';

    if (!hasRole) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions' });
    }

    next();
  };
};

// 3. Helmet-like Security Headers Middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Custom Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: http://localhost:* https://*; connect-src 'self' http://localhost:* ws://localhost:*"
  );
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
};

// 4. IP-based Rate Limiter (with Security Logs)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const ipBlacklist = new Set<string>();

export const rateLimiter = (limit = 150, windowMs = 15 * 60 * 1000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Fast check for blacklist
    if (ipBlacklist.has(ip)) {
      return res.status(403).json({ error: 'Access denied: Your IP address is blacklisted.' });
    }

    // Check database blacklist cache periodically or on demand
    const isBlacklisted = await prisma.ipRule.findUnique({
      where: { ipAddress: ip }
    });

    if (isBlacklisted && isBlacklisted.type === 'BLACKLIST') {
      ipBlacklist.add(ip);
      return res.status(403).json({ error: 'Access denied: Your IP address is blacklisted.' });
    }

    const record = ipRequestCounts.get(ip);
    if (!record || now > record.resetTime) {
      ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    record.count++;
    if (record.count > limit) {
      // Create Security Alert
      await prisma.securityAlert.create({
        data: {
          type: 'RATE_LIMIT',
          description: `IP ${ip} exceeded rate limit of ${limit} requests.`,
          severity: 'LOW',
          ipAddress: ip,
          browser: req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 100) : 'Unknown'
        }
      }).catch(console.error);

      return res.status(429).json({ error: 'Too many requests, please try again in 15 minutes.' });
    }

    next();
  };
};

// 5. CSRF Protection (Double Submit Cookie Pattern)
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method;
  // Bypass safe read-only methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  const cookieCsrfToken = req.cookies.csrfToken;
  const headerCsrfToken = req.headers['x-csrf-token'];

  if (!cookieCsrfToken || !headerCsrfToken || cookieCsrfToken !== headerCsrfToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }

  next();
};

// 6. Maintenance Mode Interceptor
export const checkMaintenanceMode = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isEnabled = await getSetting('maintenance_mode');
    
    if (isEnabled === 'true') {
      // Bypass check if request is by authenticated SUPER_ADMIN
      if (req.user && req.user.role === 'SUPER_ADMIN') {
        return next();
      }

      // Check if it's hitting login or refresh to allow admin to authenticate
      if (req.path.includes('/auth/login') || req.path.includes('/auth/refresh') || req.path.includes('/auth/logout')) {
        return next();
      }

      const msg = await getSetting('maintenance_message');
      return res.status(503).json({
        error: 'MAINTENANCE_ACTIVE',
        message: msg
      });
    }
  } catch (err) {
    // Fail-safe
  }
  next();
};

// 7. API Response Time Tracker Middleware
const responseTimes: number[] = [];
const MAX_BUFFER_SIZE = 1000;

export const responseTimeTracker = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeMs = (diff[0] * 1e9 + diff[1]) / 1e6; // Convert to ms
    
    responseTimes.push(timeMs);
    if (responseTimes.length > MAX_BUFFER_SIZE) {
      responseTimes.shift();
    }
  });
  
  next();
};

export const getAverageResponseTime = (): number => {
  if (responseTimes.length === 0) return 0;
  const sum = responseTimes.reduce((acc, val) => acc + val, 0);
  return Math.round((sum / responseTimes.length) * 10) / 10; // 1 decimal place
};
