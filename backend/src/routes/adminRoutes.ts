import { Router } from 'express';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import {
  getAdminStats,
  getUsersList,
  updateUserRole,
  deleteUserAdmin,
  getGlobalFlipbooks,
  deleteFlipbookAdmin,
  
  // Impersonate
  impersonateUser,
  returnFromImpersonation,

  // Emergency Access
  unlockUserAccount,
  resetFailedAttempts,
  forcePasswordReset,
  forceLogoutSessions,
  disableUser2FA,
  verifyEmailManually,
  suspendUserAccount,
  restoreSuspendedAccount,

  // Sessions
  getActiveSessions,
  revokeSession,
  revokeAllUserSessions,

  // Monitor
  getServerTelemetry,

  // Background jobs
  pauseJobQueue,
  resumeJobQueue,
  retryFailedJob,
  deleteFailedJob,
  reprocessFlipbook,
  getJobLogs,

  // Email Configs
  getEmailConfigs,
  updateEmailConfigs,
  sendTestEmail,

  // File Storage
  getStorageMetrics,
  deleteStorageFile,
  moveStorageProvider,
  rebuildThumbnailAdmin,
  regeneratePagesAdmin,

  // Settings
  getAppSettings,
  updateAppSettings,

  // Security Center
  getSecurityStats,
  getSecurityAlerts,
  getIpRules,
  addIpRule,
  deleteIpRule,

  // API Key Manager
  getApiKeys,
  createApiKey,
  regenerateApiKey,
  toggleApiKey,
  deleteApiKey,

  // Logs
  getSystemLogs,
  getAuditLogs,

  // Backup & Restore
  triggerDatabaseBackup,
  triggerStorageBackup,
  triggerSettingsBackup,
  listServerBackups,
  downloadBackupFile,
  restoreDatabaseBackup,

  // Notifications
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../controllers/adminController.js';

const router = Router();

// Apply global admin guards (both ADMIN and SUPER_ADMIN have access to base stats/lists)
router.use(authenticateUser, requireRole(['ADMIN']));

// Base Admin routes
router.get('/stats', getAdminStats);
router.get('/users', getUsersList);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUserAdmin);
router.get('/flipbooks', getGlobalFlipbooks);
router.delete('/flipbooks/:id', deleteFlipbookAdmin);

// ==================================================
// SUPER ADMIN EXCLUSIVE FEATURES (Guarded)
// ==================================================
const superAdminGuard = requireRole(['SUPER_ADMIN']);

// Impersonation
router.post('/impersonate/return', superAdminGuard, returnFromImpersonation); // Handle return first to avoid matching :userId
router.post('/impersonate/:userId', superAdminGuard, impersonateUser);

// Emergency Access
router.post('/users/:id/unlock', superAdminGuard, unlockUserAccount);
router.post('/users/:id/reset-failed', superAdminGuard, resetFailedAttempts);
router.post('/users/:id/force-password-reset', superAdminGuard, forcePasswordReset);
router.post('/users/:id/force-logout', superAdminGuard, forceLogoutSessions);
router.post('/users/:id/disable-2fa', superAdminGuard, disableUser2FA);
router.post('/users/:id/verify-email', superAdminGuard, verifyEmailManually);
router.post('/users/:id/suspend', superAdminGuard, suspendUserAccount);
router.post('/users/:id/unsuspend', superAdminGuard, restoreSuspendedAccount);

// Session Manager
router.get('/sessions', superAdminGuard, getActiveSessions);
router.delete('/sessions/:id', superAdminGuard, revokeSession);
router.delete('/sessions/user/:userId', superAdminGuard, revokeAllUserSessions);

// Telemetry Monitor
router.get('/monitor', superAdminGuard, getServerTelemetry);

// Background Jobs
router.post('/jobs/pause', superAdminGuard, pauseJobQueue);
router.post('/jobs/resume', superAdminGuard, resumeJobQueue);
router.get('/jobs/logs', superAdminGuard, getJobLogs);
router.post('/jobs/:id/retry', superAdminGuard, retryFailedJob);
router.post('/jobs/:id/reprocess', superAdminGuard, reprocessFlipbook);
router.delete('/jobs/:id', superAdminGuard, deleteFailedJob);

// Email Configs
router.get('/settings/email', superAdminGuard, getEmailConfigs);
router.put('/settings/email', superAdminGuard, updateEmailConfigs);
router.post('/settings/email/test', superAdminGuard, sendTestEmail);

// Storage Manager
router.get('/storage', superAdminGuard, getStorageMetrics);
router.delete('/storage/files/:id', superAdminGuard, deleteStorageFile);
router.post('/storage/move', superAdminGuard, moveStorageProvider);
router.post('/storage/rebuild/:id', superAdminGuard, rebuildThumbnailAdmin);
router.post('/storage/regenerate/:id', superAdminGuard, regeneratePagesAdmin);

// App Settings
router.get('/settings', superAdminGuard, getAppSettings);
router.put('/settings', superAdminGuard, updateAppSettings);

// Security Center
router.get('/security/stats', superAdminGuard, getSecurityStats);
router.get('/security/alerts', superAdminGuard, getSecurityAlerts);
router.get('/security/ip-rules', superAdminGuard, getIpRules);
router.post('/security/ip-rules', superAdminGuard, addIpRule);
router.delete('/security/ip-rules/:id', superAdminGuard, deleteIpRule);

// API Keys
router.get('/apikeys', superAdminGuard, getApiKeys);
router.post('/apikeys', superAdminGuard, createApiKey);
router.post('/apikeys/:id/regenerate', superAdminGuard, regenerateApiKey);
router.put('/apikeys/:id/toggle', superAdminGuard, toggleApiKey);
router.delete('/apikeys/:id', superAdminGuard, deleteApiKey);

// Logs
router.get('/logs/system', superAdminGuard, getSystemLogs);
router.get('/logs/audit', superAdminGuard, getAuditLogs);

// Backup & Restore
router.post('/backup/db', superAdminGuard, triggerDatabaseBackup);
router.post('/backup/storage', superAdminGuard, triggerStorageBackup);
router.post('/backup/settings', superAdminGuard, triggerSettingsBackup);
router.get('/backups', superAdminGuard, listServerBackups);
router.get('/backups/:name/download', superAdminGuard, downloadBackupFile);
router.post('/backup/restore', superAdminGuard, restoreDatabaseBackup);

// Notifications
router.get('/notifications', superAdminGuard, getAdminNotifications);
router.put('/notifications/:id/read', superAdminGuard, markNotificationRead);
router.put('/notifications/read-all', superAdminGuard, markAllNotificationsRead);

export default router;
