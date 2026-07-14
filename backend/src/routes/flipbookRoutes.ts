import { Router } from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import { authenticateUser, optionalAuthenticateUser, AuthRequest } from '../middlewares/auth.js';
import {
  uploadFlipbook,
  getMyFlipbooks,
  getFlipbookById,
  updateFlipbook,
  deleteFlipbook,
  getPublicFlipbookBySlug,
  unlockPasswordProtectedFlipbook,
  getFlipbookQRCode,
  getWorkspaceFlipbook,
  claimFlipbook
} from '../controllers/flipbookController.js';

const router = Router();

// Configure Multer storage in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max PDF size
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'pdf') {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF is allowed for the pdf field.') as any, false);
      }
    } else if (file.fieldname === 'thumbnail') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Invalid cover type. Only images are allowed for the thumbnail field.') as any, false);
      }
    } else {
      cb(new Error('Unexpected field upload') as any, false);
    }
  }
});

// Multipart upload configuration
const uploadFields = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// 1. Static Prefix & Claim Routes (Registered FIRST to avoid capture conflicts with generic /:id)
router.post('/claim', authenticateUser, claimFlipbook);

router.get('/workspace/:id', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticateUser(req as any, res, next);
  } else {
    next();
  }
}, getWorkspaceFlipbook);

router.get('/slug/:slug', (req: AuthRequest, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
    } catch (err) {
      // Stale or invalid token: ignore and treat as guest
      req.user = undefined;
    }
  }
  next();
}, getPublicFlipbookBySlug);

router.post('/slug/:slug/unlock', unlockPasswordProtectedFlipbook);

// 2. Base & Generic Dynamic Workspace Routes (Registered AFTER static prefixes)
router.post('/', optionalAuthenticateUser, uploadFields, uploadFlipbook);
router.get('/', authenticateUser, getMyFlipbooks);

router.get('/:id', authenticateUser, getFlipbookById);
router.get('/:id/qr', (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticateUser(req as any, res, next);
  } else {
    next();
  }
}, getFlipbookQRCode);

// PUT and DELETE use optionalAuthenticateUser to let controllers check user JWT OR guest session cookie
router.put('/:id', optionalAuthenticateUser, updateFlipbook);
router.delete('/:id', optionalAuthenticateUser, deleteFlipbook);

export default router;
