import { Router } from 'express';
import { authenticateUser } from '../middlewares/auth.js';
import { trackSession, getFlipbookReport } from '../controllers/analyticsController.js';

const router = Router();

// Publicly accessible tracking endpoint (loaded from reader iframes/sites)
router.post('/track', trackSession);

// Private dashboard reporting endpoint (requires owner authentication)
router.get('/report/:id', authenticateUser, getFlipbookReport);

export default router;
