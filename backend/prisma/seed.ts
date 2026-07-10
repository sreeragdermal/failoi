import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@flipbook.com';
  const password = 'adminpassword';
  const name = 'System Administrator';

  console.log('Seeding default administrator account...');

  // Check if admin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Admin user already exists. Skipping...');
    return;
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create ADMIN user
  const admin = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`Successfully seeded ADMIN user: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
