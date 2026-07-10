import { Router } from 'express';
import multer from 'multer';
import { authenticateUser } from '../middlewares/auth.js';
import {
  uploadFlipbook,
  getMyFlipbooks,
  getFlipbookById,
  updateFlipbook,
  deleteFlipbook,
  getPublicFlipbookBySlug,
  unlockPasswordProtectedFlipbook,
  getFlipbookQRCode
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

// Private Workspace Routes
router.post('/', authenticateUser, uploadFields, uploadFlipbook);
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
router.put('/:id', authenticateUser, updateFlipbook);
router.delete('/:id', authenticateUser, deleteFlipbook);

// Public Reader Routes (Optional auth check, lets us see if the visitor is the owner)
router.get('/slug/:slug', (req, res, next) => {
  // Silent auth check
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authenticateUser(req as any, res, next);
  } else {
    next();
  }
}, getPublicFlipbookBySlug);

router.post('/slug/:slug/unlock', unlockPasswordProtectedFlipbook);

export default router;
