import prisma from '../config/db.js';

export const notifyAdmin = async (
  type: 'STORAGE_80' | 'DB_ERROR' | 'WORKER_CRASH' | 'UPLOAD_FAIL' | 'SERVER_OFFLINE' | 'HIGH_CPU' | 'HIGH_MEM' | 'SUSPICIOUS_LOGIN',
  message: string
) => {
  try {
    // Avoid duplicate unread notifications
    const existing = await prisma.notification.findFirst({
      where: { type, message, read: false },
    });
    if (existing) return;

    await prisma.notification.create({
      data: {
        type,
        message,
      },
    });
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err);
  }
};
