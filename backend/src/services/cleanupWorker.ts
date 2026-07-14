import prisma from '../config/db.js';
import storageService from './storageService.js';

export const startCleanupWorker = () => {
  console.log('[CleanupWorker] Starting expired guest flipbooks cleanup worker...');
  // Run once on startup, then every hour
  runCleanup().catch(err => console.error('[CleanupWorker] Initial cleanup failed:', err));
  setInterval(() => {
    runCleanup().catch(err => console.error('[CleanupWorker] Scheduled cleanup execution failed:', err));
  }, 60 * 60 * 1000);
};

const runCleanup = async () => {
  const now = new Date();
  console.log('[CleanupWorker] Running database and storage cleanup for expired guest sessions at:', now.toISOString());

  try {
    // 1. Resolve expired unclaimed guest flipbooks
    const expiredFlipbooks = await prisma.flipbook.findMany({
      where: {
        userId: null,
        expirationDate: {
          lt: now
        }
      },
      include: {
        pages: true
      }
    });

    if (expiredFlipbooks.length > 0) {
      console.log(`[CleanupWorker] Found ${expiredFlipbooks.length} expired guest flipbooks.`);
    }

    for (const fb of expiredFlipbooks) {
      let isSuccess = true;

      // Deleting page assets
      for (const page of fb.pages) {
        try {
          await storageService.deleteFile(page.imagePath);
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error(`[CleanupWorker] Failed to delete page asset ${page.imagePath}:`, err);
            isSuccess = false;
          }
        }
      }

      // Deleting original PDF
      try {
        await storageService.deleteFile(fb.originalPdfPath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`[CleanupWorker] Failed to delete original PDF ${fb.originalPdfPath}:`, err);
          isSuccess = false;
        }
      }

      // Deleting thumbnail cover
      if (fb.thumbnailPath) {
        try {
          await storageService.deleteFile(fb.thumbnailPath);
        } catch (err: any) {
          if (err.code !== 'ENOENT') {
            console.error(`[CleanupWorker] Failed to delete thumbnail cover ${fb.thumbnailPath}:`, err);
            isSuccess = false;
          }
        }
      }

      // If all files deleted successfully (or were already absent), delete DB record
      if (isSuccess) {
        try {
          await prisma.flipbook.delete({
            where: { id: fb.id }
          });
          console.log(`[CleanupWorker] Successfully purged expired flipbook ${fb.id} (${fb.title}) from database.`);
        } catch (err) {
          console.error(`[CleanupWorker] Failed to delete database record for flipbook ${fb.id}:`, err);
        }
      } else {
        console.warn(`[CleanupWorker] Deletion failures occurred for flipbook ${fb.id}. Database record preserved for retry.`);
      }
    }

    // 2. Resolve expired GuestSessions with no associated flipbooks
    const deletedSessions = await prisma.guestSession.deleteMany({
      where: {
        expiresAt: { lt: now },
        flipbooks: {
          none: {}
        }
      }
    });

    if (deletedSessions.count > 0) {
      console.log(`[CleanupWorker] Purged ${deletedSessions.count} expired and orphaned guest sessions.`);
    }

  } catch (err) {
    console.error('[CleanupWorker] Unexpected error in cleanup execution:', err);
  }
};
