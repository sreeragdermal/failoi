import prisma from '../config/db.js';

export const generateBackupData = async () => {
  const users = await prisma.user.findMany();
  const flipbooks = await prisma.flipbook.findMany();
  const pages = await prisma.pageAsset.findMany();
  const analytics = await prisma.analytics.findMany();
  const bookmarks = await prisma.bookmark.findMany();
  const shareLinks = await prisma.shareLink.findMany();
  const auditLogs = await prisma.auditLog.findMany();
  const systemLogs = await prisma.systemLog.findMany();
  const settings = await prisma.appSetting.findMany();
  const ipRules = await prisma.ipRule.findMany();
  const notifications = await prisma.notification.findMany();

  return {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: {
      users,
      flipbooks,
      pages,
      analytics,
      bookmarks,
      shareLinks,
      auditLogs,
      systemLogs,
      settings,
      ipRules,
      notifications
    }
  };
};

export const restoreBackupData = async (backup: any) => {
  if (!backup || !backup.data) {
    throw new Error('Invalid backup format');
  }

  // Restore everything inside a Prisma transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete all dependencies first
    await tx.shareLink.deleteMany();
    await tx.bookmark.deleteMany();
    await tx.analytics.deleteMany();
    await tx.pageAsset.deleteMany();
    await tx.flipbook.deleteMany();
    await tx.session.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.systemLog.deleteMany();
    await tx.ipRule.deleteMany();
    await tx.appSetting.deleteMany();
    await tx.notification.deleteMany();
    await tx.impersonationLog.deleteMany();
    await tx.user.deleteMany();

    const { users, flipbooks, pages, analytics, bookmarks, shareLinks, auditLogs, systemLogs, settings, ipRules, notifications } = backup.data;

    // 2. Insert records sequentially
    if (users?.length) {
      await tx.user.createMany({ data: users });
    }
    if (settings?.length) {
      await tx.appSetting.createMany({ data: settings });
    }
    if (ipRules?.length) {
      await tx.ipRule.createMany({ data: ipRules });
    }
    if (flipbooks?.length) {
      await tx.flipbook.createMany({ data: flipbooks });
    }
    if (pages?.length) {
      await tx.pageAsset.createMany({ data: pages });
    }
    if (analytics?.length) {
      await tx.analytics.createMany({ data: analytics });
    }
    if (bookmarks?.length) {
      await tx.bookmark.createMany({ data: bookmarks });
    }
    if (shareLinks?.length) {
      await tx.shareLink.createMany({ data: shareLinks });
    }
    if (auditLogs?.length) {
      await tx.auditLog.createMany({ data: auditLogs });
    }
    if (systemLogs?.length) {
      await tx.systemLog.createMany({ data: systemLogs });
    }
    if (notifications?.length) {
      await tx.notification.createMany({ data: notifications });
    }
  });
};
