import prisma from '../config/db.js';

export const logSystem = async (
  type: 'AUTH' | 'UPLOAD' | 'ANALYTICS' | 'ADMIN' | 'WORKER' | 'EMAIL' | 'API' | 'DATABASE',
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  details?: any
) => {
  try {
    await prisma.systemLog.create({
      data: {
        type,
        level,
        message,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      },
    });
  } catch (err) {
    console.error('[SystemLogger] Failed to write system log:', err);
  }
};
