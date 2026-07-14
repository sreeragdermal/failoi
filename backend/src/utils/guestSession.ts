import crypto from 'crypto';
import { Request, Response } from 'express';
import prisma from '../config/db.js';

const COOKIE_NAME = 'failoi_guest';

/**
 * Generate a cryptographically secure opaque guest token.
 */
export const generateGuestToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Return SHA-256 hash of a raw token to prevent database token leakage.
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Read the failoi_guest cookie and resolve the active guest session.
 * If none exists or has expired, initialize a new GuestSession and set the cookie.
 */
export const getOrInitializeGuestSession = async (req: Request, res: Response) => {
  const rawToken = req.cookies[COOKIE_NAME];
  const now = new Date();

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    const guestSession = await prisma.guestSession.findUnique({
      where: { tokenHash },
    });

    if (guestSession && guestSession.expiresAt > now) {
      // Keep session active by updating lastSeenAt
      await prisma.guestSession.update({
        where: { id: guestSession.id },
        data: { lastSeenAt: now },
      });
      return guestSession;
    }
  }

  // Create new GuestSession
  const newToken = generateGuestToken();
  const tokenHash = hashToken(newToken);
  
  // Guest sessions remain valid for 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const guestSession = await prisma.guestSession.create({
    data: {
      tokenHash,
      expiresAt,
    },
  });

  // Set first-party secure HttpOnly cookie
  res.cookie(COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  return guestSession;
};

/**
 * Read the failoi_guest cookie and resolve the active guest session.
 * Returns null if missing or expired.
 */
export const getGuestSession = async (req: Request) => {
  const rawToken = req.cookies[COOKIE_NAME];
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const guestSession = await prisma.guestSession.findUnique({
    where: { tokenHash },
  });

  if (!guestSession || guestSession.expiresAt < new Date()) {
    return null;
  }

  return guestSession;
};
