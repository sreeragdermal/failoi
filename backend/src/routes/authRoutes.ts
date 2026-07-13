import { Router } from 'express';
import { 
  register, login, refresh, logout, forgotPassword, resetPassword, 
  updateProfile, changePassword,
  setup2FA, enable2FA, disable2FA, verify2FALogin,
  googleLogin, googleCallback, getCsrfToken
} from '../controllers/authController.js';
import { authenticateUser } from '../middlewares/auth.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/verify-2fa', verify2FALogin);

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// CSRF recovery endpoint
router.get('/csrf', authenticateUser, getCsrfToken);

// Profile and password change routes
router.put('/profile', authenticateUser, updateProfile);
router.put('/change-password', authenticateUser, changePassword);

// 2FA Setup routes
router.post('/2fa/setup', authenticateUser, setup2FA);
router.post('/2fa/enable', authenticateUser, enable2FA);
router.post('/2fa/disable', authenticateUser, disable2FA);

export default router;

