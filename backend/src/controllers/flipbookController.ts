import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/auth.js';
import prisma from '../config/db.js';
import storageService from '../services/storageService.js';
import { generateUniqueSlug } from '../utils/slugify.js';
import { getOrInitializeGuestSession, getGuestSession } from '../utils/guestSession.js';

/**
 * Handle PDF and cover image upload (supports guests and authenticated users).
 */
export const uploadFlipbook = async (req: AuthRequest, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const pdfFile = files?.pdf?.[0];
  const thumbnailFile = files?.thumbnail?.[0];

  if (!pdfFile) {
    return res.status(400).json({ error: 'PDF file is required' });
  }

  try {
    // 1. Save original PDF
    const pdfPath = await storageService.saveFile(
      pdfFile.buffer,
      'pdfs',
      pdfFile.originalname
    );

    // 2. Save thumbnail cover if sent
    let thumbnailPath = null;
    if (thumbnailFile) {
      thumbnailPath = await storageService.saveFile(
        thumbnailFile.buffer,
        'thumbnails',
        thumbnailFile.originalname
      );
    }

    // 3. Generate Unique Slug
    const title = req.body.title || pdfFile.originalname.replace(/\.[^/.]+$/, '');
    const slug = await generateUniqueSlug(title);

    // Determine ownership (User vs Guest)
    let userId: string | null = null;
    let guestSessionId: string | null = null;
    let expirationDate: Date | null = null;
    let visibility: 'PRIVATE' | 'PUBLIC' = 'PRIVATE';

    if (req.user) {
      userId = req.user.id;
      visibility = 'PRIVATE';
    } else {
      // Guest upload: resolve or create guest session
      const guestSession = await getOrInitializeGuestSession(req, res);
      guestSessionId = guestSession.id;
      visibility = 'PUBLIC'; // Guest uploads are public by default so they can flip & share immediately
      expirationDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
    }

    // 4. Save initial database entry
    const flipbook = await prisma.flipbook.create({
      data: {
        userId,
        guestSessionId,
        expirationDate,
        title,
        description: req.body.description || '',
        slug,
        originalPdfPath: pdfPath,
        thumbnailPath,
        fileSize: pdfFile.size,
        visibility,
        status: 'PENDING',     // Queued for background worker parsing
      },
    });

    return res.status(201).json({
      message: 'Flipbook uploaded successfully and queued for processing',
      flipbook: {
        ...flipbook,
        pdfUrl: storageService.getFileUrl(flipbook.originalPdfPath),
        thumbnailUrl: flipbook.thumbnailPath ? storageService.getFileUrl(flipbook.thumbnailPath) : null,
      },
    });
  } catch (err: any) {
    console.error('[FlipbookController] Upload error:', err);
    return res.status(500).json({ error: 'Failed to process file upload' });
  }
};

/**
 * Get current user's flipbooks.
 */
export const getMyFlipbooks = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const flipbooks = await prisma.flipbook.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    const formattedFlipbooks = flipbooks.map((f) => ({
      ...f,
      pdfUrl: storageService.getFileUrl(f.originalPdfPath),
      thumbnailUrl: f.thumbnailPath ? storageService.getFileUrl(f.thumbnailPath) : null,
    }));

    return res.status(200).json({ flipbooks: formattedFlipbooks });
  } catch (err) {
    console.error('[FlipbookController] Fetch my flipbooks error:', err);
    return res.status(500).json({ error: 'Failed to retrieve flipbooks' });
  }
};

/**
 * Get details of a single flipbook.
 */
export const getFlipbookById = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.params;

  try {
    const flipbook = await prisma.flipbook.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!flipbook) {
      return res.status(404).json({ error: 'Flipbook not found' });
    }

    return res.status(200).json({
      flipbook: {
        ...flipbook,
        pdfUrl: storageService.getFileUrl(flipbook.originalPdfPath),
        thumbnailUrl: flipbook.thumbnailPath ? storageService.getFileUrl(flipbook.thumbnailPath) : null,
      },
    });
  } catch (err) {
    console.error('[FlipbookController] Fetch single flipbook error:', err);
    return res.status(500).json({ error: 'Failed to retrieve flipbook details' });
  }
};

/**
 * Update flipbook settings (Title, Visibility, Expiration, Protections).
 * Allows guests to edit their temporary flipbook if session cookie matches.
 */
export const updateFlipbook = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    title,
    description,
    slug,
    visibility,
    password,
    expirationDate,
    disableDownload,
    disablePrint,
    disableCopy,
    requireEmail,
    domainRestriction,
  } = req.body;

  try {
    let canEdit = false;
    const existing = await prisma.flipbook.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Flipbook not found' });
    }

    // Check expiration date
    if (existing.expirationDate && existing.expirationDate < new Date()) {
      return res.status(410).json({ error: 'flipbook_expired', message: 'This flipbook has expired.' });
    }

    if (req.user && existing.userId === req.user.id) {
      canEdit = true;
    } else {
      const guestSession = await getGuestSession(req);
      if (guestSession && existing.guestSessionId === guestSession.id && existing.userId === null) {
        canEdit = true;
      }
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions to update this flipbook' });
    }

    // Validate custom slug uniqueness if changed
    let finalSlug = existing.slug;
    if (slug && slug !== existing.slug) {
      const slugCollision = await prisma.flipbook.findFirst({
        where: { slug, NOT: { id } },
      });
      if (slugCollision) {
        return res.status(400).json({ error: 'Slug already taken' });
      }
      finalSlug = slug;
    }

    // Hash password if visibility set to PASSWORD and new password is provided
    let passwordHash = existing.passwordHash;
    if (visibility === 'PASSWORD') {
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      } else if (!existing.passwordHash) {
        return res.status(400).json({ error: 'Password required for password visibility' });
      }
    } else if (visibility !== undefined) {
      passwordHash = null; // Clear password if visibility changes
    }

    // Update settings
    const updated = await prisma.flipbook.update({
      where: { id },
      data: {
        title: title !== undefined ? title : existing.title,
        description: description !== undefined ? description : existing.description,
        slug: finalSlug,
        visibility: visibility !== undefined ? visibility : existing.visibility,
        passwordHash,
        // Only allow authenticated users to change or clear the expirationDate manually
        expirationDate: req.user && expirationDate !== undefined
          ? (expirationDate ? new Date(expirationDate) : null)
          : existing.expirationDate,
        disableDownload: disableDownload !== undefined ? disableDownload : existing.disableDownload,
        disablePrint: disablePrint !== undefined ? disablePrint : existing.disablePrint,
        disableCopy: disableCopy !== undefined ? disableCopy : existing.disableCopy,
        requireEmail: requireEmail !== undefined ? requireEmail : existing.requireEmail,
        domainRestriction: domainRestriction !== undefined ? domainRestriction : existing.domainRestriction,
      },
    });

    return res.status(200).json({
      message: 'Flipbook updated successfully',
      flipbook: {
        ...updated,
        pdfUrl: storageService.getFileUrl(updated.originalPdfPath),
        thumbnailUrl: updated.thumbnailPath ? storageService.getFileUrl(updated.thumbnailPath) : null,
      },
    });
  } catch (err) {
    console.error('[FlipbookController] Update flipbook error:', err);
    return res.status(500).json({ error: 'Failed to update flipbook settings' });
  }
};

/**
 * Delete a flipbook and its files.
 */
export const deleteFlipbook = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.flipbook.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Flipbook not found' });
    }

    let canDelete = false;
    if (req.user && existing.userId === req.user.id) {
      canDelete = true;
    } else {
      const guestSession = await getGuestSession(req);
      if (guestSession && existing.guestSessionId === guestSession.id && existing.userId === null) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions to delete this flipbook' });
    }

    // Delete database entry
    await prisma.flipbook.delete({
      where: { id },
    });

    // Delete files asynchronously
    storageService.deleteFile(existing.originalPdfPath).catch((err) =>
      console.error(`[Cleanup] Failed to delete PDF at ${existing.originalPdfPath}:`, err)
    );

    if (existing.thumbnailPath) {
      storageService.deleteFile(existing.thumbnailPath).catch((err) =>
        console.error(`[Cleanup] Failed to delete thumbnail at ${existing.thumbnailPath}:`, err)
      );
    }

    return res.status(200).json({ message: 'Flipbook and associated assets deleted successfully' });
  } catch (err) {
    console.error('[FlipbookController] Delete flipbook error:', err);
    return res.status(500).json({ error: 'Failed to delete flipbook' });
  }
};

/**
 * Retrieve workspace flipbook management data (includes permissions, countdowns, and claim state).
 */
export const getWorkspaceFlipbook = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const flipbook = await prisma.flipbook.findUnique({
      where: { id },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    if (!flipbook) {
      return res.status(404).json({ error: 'Flipbook not found' });
    }

    // Check expiration date
    if (flipbook.expirationDate && flipbook.expirationDate < new Date()) {
      return res.status(410).json({ error: 'flipbook_expired', message: 'This flipbook link has expired.' });
    }

    let canEdit = false;
    let canClaim = false;

    if (req.user && flipbook.userId === req.user.id) {
      canEdit = true;
      canClaim = false;
    } else {
      const guestSession = await getGuestSession(req);
      if (guestSession && flipbook.guestSessionId === guestSession.id && flipbook.userId === null) {
        canEdit = true;
        canClaim = true;
      }
    }

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions to manage this workspace.' });
    }

    const formattedPages = flipbook.pages.map(page => ({
      ...page,
      imageUrl: storageService.getFileUrl(page.imagePath)
    }));

    return res.status(200).json({
      flipbook: {
        id: flipbook.id,
        title: flipbook.title,
        description: flipbook.description,
        slug: flipbook.slug,
        visibility: flipbook.visibility,
        status: flipbook.status,
        error: flipbook.error,
        pageCount: flipbook.pageCount,
        fileSize: flipbook.fileSize,
        temporary: flipbook.userId === null,
        expiresAt: flipbook.expirationDate,
        pdfUrl: storageService.getFileUrl(flipbook.originalPdfPath),
        thumbnailUrl: flipbook.thumbnailPath ? storageService.getFileUrl(flipbook.thumbnailPath) : null,
        pages: formattedPages,
        canEdit,
        canClaim
      }
    });
  } catch (err) {
    console.error('[FlipbookController] Fetch workspace flipbook error:', err);
    return res.status(500).json({ error: 'Failed to retrieve workspace details' });
  }
};

/**
 * Retrieve flipbook metadata by slug for public reader access.
 * Returns only public-safe presentation variables.
 */
export const getPublicFlipbookBySlug = async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;

  try {
    const flipbook = await prisma.flipbook.findUnique({
      where: { slug },
      include: {
        user: {
          select: { name: true, email: true },
        },
        pages: {
          orderBy: { pageNumber: 'asc' }
        }
      },
    });

    if (!flipbook) {
      return res.status(404).json({ error: 'Flipbook not found' });
    }

    // Check expiration date
    if (flipbook.expirationDate && flipbook.expirationDate < new Date()) {
      return res.status(410).json({ error: 'flipbook_expired', message: 'This flipbook link has expired.' });
    }

    // If private, only owner can view
    if (flipbook.visibility === 'PRIVATE') {
      if (!req.user || req.user.id !== flipbook.userId) {
        return res.status(403).json({ error: 'This flipbook is private.' });
      }
    }

    // If password protected, require password unlock (except for owner)
    const isOwner = req.user?.id === flipbook.userId;
    const isPasswordProtected = flipbook.visibility === 'PASSWORD';

    const formattedPages = flipbook.pages.map(page => ({
      ...page,
      imageUrl: storageService.getFileUrl(page.imagePath)
    }));

    // Format response details (hide original file locations and guest hashes for strict security)
    const secureFlipbook = {
      id: flipbook.id,
      title: flipbook.title,
      description: flipbook.description,
      slug: flipbook.slug,
      pageCount: flipbook.pageCount,
      fileSize: flipbook.fileSize,
      visibility: flipbook.visibility,
      disableDownload: flipbook.disableDownload,
      disablePrint: flipbook.disablePrint,
      disableCopy: flipbook.disableCopy,
      requireEmail: flipbook.requireEmail,
      domainRestriction: flipbook.domainRestriction,
      status: flipbook.status,
      ownerName: flipbook.user?.name || 'Publisher',
      thumbnailUrl: flipbook.thumbnailPath ? storageService.getFileUrl(flipbook.thumbnailPath) : null,
      pdfUrl: isOwner || !isPasswordProtected ? storageService.getFileUrl(flipbook.originalPdfPath) : null,
      pages: isOwner || !isPasswordProtected ? formattedPages : [],
      isPasswordProtected,
      isUnlocked: isOwner,
      temporary: flipbook.userId === null,
      expiresAt: flipbook.expirationDate
    };

    return res.status(200).json({ flipbook: secureFlipbook });
  } catch (err) {
    console.error('[FlipbookController] Public fetch error:', err);
    return res.status(500).json({ error: 'Failed to fetch reader settings' });
  }
};

/**
 * Validate password for locked flipbooks.
 */
export const unlockPasswordProtectedFlipbook = async (req: AuthRequest, res: Response) => {
  const { slug } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  try {
    const flipbook = await prisma.flipbook.findUnique({
      where: { slug },
    });

    if (!flipbook || flipbook.visibility !== 'PASSWORD' || !flipbook.passwordHash) {
      return res.status(400).json({ error: 'This flipbook does not require password validation.' });
    }

    const isValid = await bcrypt.compare(password, flipbook.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    return res.status(200).json({
      message: 'Access granted',
      pdfUrl: storageService.getFileUrl(flipbook.originalPdfPath),
      isUnlocked: true,
    });
  } catch (err) {
    console.error('[FlipbookController] Unlock error:', err);
    return res.status(500).json({ error: 'Failed to validate password access' });
  }
};

/**
 * Generates and streams a QR code pointing to the public reader URL.
 */
export const getFlipbookQRCode = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const flipbook = await prisma.flipbook.findUnique({
      where: { id },
    });

    if (!flipbook) {
      return res.status(404).json({ error: 'Flipbook not found' });
    }

    // Owner check for private books, allow guests to get QR if session matches
    let isAllowed = false;
    if (flipbook.visibility !== 'PRIVATE') {
      isAllowed = true;
    } else if (req.user && req.user.id === flipbook.userId) {
      isAllowed = true;
    } else {
      const guestSession = await getGuestSession(req);
      if (guestSession && flipbook.guestSessionId === guestSession.id && flipbook.userId === null) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ error: 'Access denied: this flipbook is private.' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const publicUrl = `${frontendUrl}/f/${flipbook.slug}`;

    res.setHeader('Content-Type', 'image/png');

    const QRCode = (await import('qrcode')).default;
    await QRCode.toFileStream(res, publicUrl, {
      type: 'png',
      width: 300,
      margin: 2,
    });
  } catch (err) {
    console.error('[FlipbookController] QR generation error:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate QR Code' });
    }
  }
};

/**
 * Claim an unclaimed guest flipbook atomically using Prisma.
 */
export const claimFlipbook = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { flipbookId } = req.body;
  if (!flipbookId) {
    return res.status(400).json({ error: 'claim_failed', message: 'Flipbook ID is required to claim.' });
  }

  try {
    const guestSession = await getGuestSession(req);
    if (!guestSession) {
      return res.status(400).json({ error: 'claim_failed', message: 'No active guest session cookie found.' });
    }

    const now = new Date();
    const affected = await prisma.flipbook.updateMany({
      where: {
        id: flipbookId,
        userId: null,
        guestSessionId: guestSession.id,
        expirationDate: { gt: now } // Exclaimed guest books must have expirationDate in the future
      },
      data: {
        userId: req.user.id,
        guestSessionId: null,
        expirationDate: null,
        claimedAt: now
      }
    });

    if (affected.count === 0) {
      return res.status(400).json({
        error: 'claim_failed',
        message: 'Flipbook already claimed, expired, or invalid guest ownership.'
      });
    }

    return res.status(200).json({
      message: 'Saved to your library',
      flipbookId
    });
  } catch (err) {
    console.error('[FlipbookController] Claim flipbook error:', err);
    return res.status(500).json({ error: 'Failed to claim flipbook' });
  }
};
