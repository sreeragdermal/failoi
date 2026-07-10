import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import parser from 'ua-parser-js';
import crypto from 'crypto';
import prisma from '../config/db.js';
import { generateSecret, verifyTOTP } from '../utils/totp.js';
import { logAudit } from '../utils/auditLogger.js';
import { logSystem } from '../utils/systemLogger.js';
import { notifyAdmin } from '../utils/notifications.js';
import { AuthRequest } from '../middlewares/auth.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key';

// Password complexity regex: at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

// Helper to generate access token
const generateAccessToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Helper to generate refresh token
const generateRefreshToken = (user: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

// Extract telemetry from request
const getSessionTelemetry = (req: Request) => {
  const ua = req.headers['user-agent'] || '';
  const parsedUa = new parser.UAParser(ua).getResult();
  const device = parsedUa.device.type || 'desktop';
  const browser = parsedUa.browser.name ? `${parsedUa.browser.name} ${parsedUa.browser.version || ''}`.trim() : 'Unknown';
  const os = parsedUa.os.name ? `${parsedUa.os.name} ${parsedUa.os.version || ''}`.trim() : 'Unknown';
  const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
  
  // Try to determine country (mocked or CF-IPCountry header if available)
  const country = (req.headers['cf-ipcountry'] as string) || 'Localhost';
  
  return { device, browser, os, ipAddress, country };
};

// Setup CSRF Cookie
const setCsrfCookie = (res: Response): string => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrfToken', token, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

export const register = async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Enforce password complexity
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
        role: 'REGISTERED',
      },
    });

    await logSystem('AUTH', 'INFO', `User registered: ${email}`);
    
    // Log Audit action
    await logAudit({
      req: { ...req, user } as any,
      action: 'USER_REGISTER',
      module: 'AUTH',
      targetResource: user.id
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 1. Suspension Check
    if (user.isSuspended) {
      await prisma.securityAlert.create({
        data: {
          type: 'SUSPICIOUS_ACTIVITY',
          description: `Login attempt on suspended user account: ${email}`,
          severity: 'MEDIUM',
          ipAddress: req.ip || req.socket.remoteAddress
        }
      });
      return res.status(403).json({ error: 'This account has been suspended by system administrators.' });
    }

    // 2. Lockout Check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      return res.status(403).json({ error: `Account locked due to excessive failed attempts. Please retry in ${minutesLeft} minute(s).` });
    }

    // 3. Password Verification
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Increment failed login count
      const updatedAttempts = user.failedLoginAttempts + 1;
      const isLocking = updatedAttempts >= 5;
      const lockedUntil = isLocking ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: updatedAttempts,
          lockedUntil
        }
      });

      // Write Security Alert
      await prisma.securityAlert.create({
        data: {
          type: 'FAILED_LOGIN',
          description: `Failed login attempt for user: ${email} (${updatedAttempts}/5 attempts)`,
          severity: isLocking ? 'HIGH' : 'LOW',
          ipAddress: req.ip || req.socket.remoteAddress
        }
      });

      if (isLocking) {
        await notifyAdmin(
          'SUSPICIOUS_LOGIN',
          `Suspicious activity: Account ${email} locked due to 5 consecutive login failures.`
        );
      }

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset failed login status on successful credentials
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });

    // 4. 2FA (TOTP) Challenge
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { userId: user.id, type: '2fa_pending' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      
      return res.status(200).json({
        status: '2FA_REQUIRED',
        tempToken,
        message: 'Multi-factor authentication required.'
      });
    }

    // 5. Successful Login & Session Creation
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Collect telemetry
    const telemetry = getSessionTelemetry(req);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        ...telemetry
      },
    });

    // Set refresh token in HttpOnly Cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Set CSRF token
    const csrfToken = setCsrfCookie(res);

    await logSystem('AUTH', 'INFO', `User logged in: ${email}`);
    await logAudit({
      req: { ...req, user } as any,
      action: 'USER_LOGIN',
      module: 'AUTH',
      targetResource: user.id
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      csrfToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        forcePasswordReset: user.forcePasswordReset
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to log in' });
  }
};

export const verify2FALogin = async (req: Request, res: Response) => {
  const { tempToken, code } = req.body;

  if (!tempToken || !code) {
    return res.status(400).json({ error: 'Authentication code and verification payload are required' });
  }

  try {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as { userId: string; type: string };
    
    if (decoded.type !== '2fa_pending') {
      return res.status(403).json({ error: 'Invalid challenge session' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.twoFactorSecret || !user.twoFactorEnabled) {
      return res.status(403).json({ error: '2FA setup invalid or disabled' });
    }

    // Verify TOTP token
    const verified = verifyTOTP(code, user.twoFactorSecret);
    if (!verified) {
      return res.status(401).json({ error: 'Invalid 2FA authentication code' });
    }

    // Create session
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const telemetry = getSessionTelemetry(req);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        ...telemetry
      },
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const csrfToken = setCsrfCookie(res);

    await logSystem('AUTH', 'INFO', `User logged in via 2FA: ${user.email}`);
    await logAudit({
      req: { ...req, user } as any,
      action: 'USER_LOGIN_2FA',
      module: 'AUTH',
      targetResource: user.id
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      accessToken,
      csrfToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        forcePasswordReset: user.forcePasswordReset
      },
    });
  } catch (err) {
    console.error('2FA Verification error:', err);
    return res.status(403).json({ error: 'Invalid or expired login session' });
  }
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }

  try {
    const dbSession = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!dbSession || dbSession.revoked || dbSession.expiresAt < new Date()) {
      return res.status(403).json({ error: 'Invalid, revoked, or expired refresh token' });
    }

    if (dbSession.user.isSuspended) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET);

    // Update session timestamp & user telemetry
    const telemetry = getSessionTelemetry(req);
    await prisma.session.update({
      where: { id: dbSession.id },
      data: {
        lastActivity: new Date(),
        ...telemetry
      }
    });

    // Generate access token
    const accessToken = generateAccessToken(dbSession.user);
    const csrfToken = setCsrfCookie(res);

    // Check if currently impersonated (cookie adminRefreshToken exists)
    const isImpersonated = !!req.cookies.adminRefreshToken;

    return res.status(200).json({
      accessToken,
      csrfToken,
      user: {
        id: dbSession.user.id,
        email: dbSession.user.email,
        name: dbSession.user.name,
        role: dbSession.user.role,
        forcePasswordReset: dbSession.user.forcePasswordReset,
        isImpersonated
      },
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  try {
    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken },
        data: { revoked: true },
      });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.clearCookie('csrfToken', {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ error: 'Failed to log out' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      console.log(`[Email Mock] Password reset link for ${email}: ${resetLink}`);
      
      // Log to system logs
      await logSystem('EMAIL', 'INFO', `Mock Password Reset Link logged to console for user: ${email}`);
    }

    return res.status(200).json({ message: 'Password reset link sent' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  // Enforce password complexity
  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { id: decoded.id },
      data: { 
        passwordHash: hashedPassword,
        forcePasswordReset: false // Reset flag on update
      },
    });

    await logAudit({
      req: { ...req, user } as any,
      action: 'USER_PASSWORD_RESET',
      module: 'AUTH',
      targetResource: user.id
    });

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const beforeUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { name: name.trim() },
      select: { id: true, email: true, name: true, role: true }
    });

    await logAudit({
      req,
      action: 'UPDATE_PROFILE',
      module: 'AUTH',
      targetResource: req.user.id,
      beforeValue: beforeUser?.name,
      afterValue: updatedUser.name
    });

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  // Enforce password complexity
  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({ 
      error: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' 
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        passwordHash: hashedNewPassword,
        forcePasswordReset: false // Reset flag on manual change
      }
    });

    await logAudit({
      req,
      action: 'CHANGE_PASSWORD',
      module: 'AUTH',
      targetResource: req.user.id
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to change password' });
  }
};

// ==========================================
// 2FA CONFIGURATION ENDPOINTS
// ==========================================

export const setup2FA = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate secret
    const secret = generateSecret();
    const otpauthUrl = `otpauth://totp/Flipbook:${user.email}?secret=${secret}&issuer=Flipbook`;
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    // Save secret but keep enabled=false until verified
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret }
    });

    return res.status(200).json({
      secret,
      qrCodeUrl
    });
  } catch (err) {
    console.error('Setup 2FA error:', err);
    return res.status(500).json({ error: 'Failed to set up 2FA' });
  }
};

export const enable2FA = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Verification code is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA has not been set up yet' });
    }

    const verified = verifyTOTP(code, user.twoFactorSecret);
    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true }
    });

    await logAudit({
      req,
      action: 'ENABLE_2FA',
      module: 'AUTH',
      targetResource: user.id
    });

    return res.status(200).json({ success: true, message: 'Two-factor authentication enabled successfully' });
  } catch (err) {
    console.error('Enable 2FA error:', err);
    return res.status(500).json({ error: 'Failed to enable 2FA' });
  }
};

export const disable2FA = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { currentPassword, code } = req.body;
  if (!currentPassword) {
    return res.status(400).json({ error: 'Current password is required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Verify code only if 2FA was fully enabled
    if (user.twoFactorEnabled) {
      if (!code) {
        return res.status(400).json({ error: '2FA authentication code is required' });
      }
      const verified = verifyTOTP(code, user.twoFactorSecret || '');
      if (!verified) {
        return res.status(400).json({ error: 'Invalid 2FA authentication code' });
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }
    });

    await logAudit({
      req,
      action: 'DISABLE_2FA',
      module: 'AUTH',
      targetResource: user.id
    });

    return res.status(200).json({ success: true, message: 'Two-factor authentication disabled successfully' });
  } catch (err) {
    console.error('Disable 2FA error:', err);
    return res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};


