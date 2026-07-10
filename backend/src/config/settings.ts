import prisma from './db.js';

const DEFAULT_SETTINGS: Record<string, string> = {
  website_name: 'Flipbook Creator',
  logo: '',
  favicon: '',
  theme: 'dark',
  maintenance_mode: 'false',
  maintenance_message: 'The system is currently undergoing scheduled maintenance. Please check back later.',
  maintenance_scheduled_at: '',
  default_language: 'en',
  timezone: 'UTC',
  currency: 'USD',
  max_upload_size: '10485760', // 10MB
  max_pdf_pages: '100',
  max_storage_per_user: '104857600', // 100MB
  max_team_members: '5',
  analytics_retention: '30', // days
  smtp_host: 'smtp.mailtrap.io',
  smtp_port: '2525',
  smtp_user: '',
  smtp_pass: '',
  smtp_from: 'noreply@flipbook.com',
  resend_api_key: '',
  template_password_reset: 'Hello, reset your password using this link: {{reset_link}}',
  template_verification: 'Verify your email using this code: {{code}}',
  template_newsletter: 'Welcome to our newsletter!',
};

export const initializeSettings = async () => {
  try {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = await prisma.appSetting.findUnique({ where: { key } });
      if (!existing) {
        await prisma.appSetting.create({ data: { key, value } });
      }
    }
    console.log('[Settings] System settings initialized successfully.');
  } catch (err) {
    console.error('[Settings] Failed to initialize settings:', err);
  }
};

export const getSetting = async (key: string): Promise<string> => {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    return setting ? setting.value : DEFAULT_SETTINGS[key] || '';
  } catch (err) {
    return DEFAULT_SETTINGS[key] || '';
  }
};

export const setSetting = async (key: string, value: string): Promise<void> => {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

export const getAllSettings = async () => {
  const settings = await prisma.appSetting.findMany();
  const result: Record<string, string> = { ...DEFAULT_SETTINGS };
  settings.forEach((s) => {
    result[s.key] = s.value;
  });
  return result;
};
