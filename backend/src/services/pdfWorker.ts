import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument } from 'pdf-lib';
import prisma from '../config/db.js';
import storageService from './storageService.js';

// Resolve uploads folder location
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads');

export let queuePaused = false;
export const pauseQueue = () => {
  queuePaused = true;
  console.log('[Worker] PDF processing queue has been PAUSED');
};
export const resumeQueue = () => {
  queuePaused = false;
  console.log('[Worker] PDF processing queue has been RESUMED');
};

let isRunning = false;
let workerInterval: NodeJS.Timeout | null = null;

const uploadDir = process.env.UPLOAD_DIR 
  ? path.resolve(process.env.UPLOAD_DIR) 
  : DEFAULT_UPLOAD_DIR;

/**
 * Worker process logic to process a single pending Flipbook.
 */
const processFlipbook = async (flipbookId: string) => {
  console.log(`[Worker] Started processing flipbook: ${flipbookId}`);

  // 1. Move status to PROCESSING
  const flipbook = await prisma.flipbook.update({
    where: { id: flipbookId },
    data: { status: 'PROCESSING' },
  });

  try {
    const fullPdfPath = path.join(uploadDir, flipbook.originalPdfPath);
    
    // 2. Read file size
    const fileStats = await fs.stat(fullPdfPath);
    const fileSize = fileStats.size;

    // 3. Load PDF via pdf-lib to get metadata
    const pdfBytes = await fs.readFile(fullPdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { 
      updateMetadata: false 
    });
    
    const pageCount = pdfDoc.getPageCount();

    // 4. Update Flipbook in database
    await prisma.flipbook.update({
      where: { id: flipbookId },
      data: {
        pageCount,
        fileSize,
        status: 'COMPLETED',
      },
    });

    console.log(`[Worker] Successfully processed flipbook: ${flipbookId} (${pageCount} pages, ${fileSize} bytes)`);
  } catch (err: any) {
    console.error(`[Worker] Failed to process flipbook ${flipbookId}:`, err);
    
    await prisma.flipbook.update({
      where: { id: flipbookId },
      data: {
        status: 'FAILED',
        error: err.message || 'Unknown processing error',
      },
    });
  }
};

/**
 * Background loop that polls for PENDING flipbooks.
 */
const checkAndProcessJobs = async () => {
  if (isRunning || queuePaused) return;
  isRunning = true;

  try {
    // Find oldest pending flipbook job
    const pendingFlipbook = await prisma.flipbook.findFirst({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    if (pendingFlipbook) {
      await processFlipbook(pendingFlipbook.id);
    }
  } catch (err) {
    console.error('[Worker] Error in job queue loop:', err);
  } finally {
    isRunning = false;
  }
};

/**
 * Starts the background processing worker.
 */
export const startWorker = (intervalMs = 3000) => {
  if (workerInterval) return;
  
  console.log(`[Worker] Background PDF processing worker started (polling every ${intervalMs}ms)`);
  workerInterval = setInterval(checkAndProcessJobs, intervalMs);
};

/**
 * Stops the background processing worker.
 */
export const stopWorker = () => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[Worker] Background PDF processing worker stopped');
  }
};
