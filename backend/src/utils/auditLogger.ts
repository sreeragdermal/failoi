import prisma from '../config/db.js';
import { Request } from 'express';
import parser from 'ua-parser-js';

export const logAudit = async (params: {
  req: Request & { user?: { id: string; email: string } };
  action: string;
  module: string;
  targetResource?: string;
  beforeValue?: any;
  afterValue?: any;
}) => {
  const { req, action, module, targetResource, beforeValue, afterValue } = params;
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';
  
  // Parse user agent
  const parsedUa = new parser.UAParser(ua).getResult();
  const browser = parsedUa.browser.name ? `${parsedUa.browser.name} ${parsedUa.browser.version || ''}`.trim() : 'Unknown';
  const os = parsedUa.os.name ? `${parsedUa.os.name} ${parsedUa.os.version || ''}`.trim() : 'Unknown';

  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        userEmail: req.user?.email || null,
        action,
        module,
        ipAddress,
        browser,
        os,
        targetResource,
        beforeValue: beforeValue ? (typeof beforeValue === 'string' ? beforeValue : JSON.stringify(beforeValue)) : null,
        afterValue: afterValue ? (typeof afterValue === 'string' ? afterValue : JSON.stringify(afterValue)) : null,
      },
    });
  } catch (err) {
    console.error('[AuditLogger] Failed to write audit log:', err);
  }
};
