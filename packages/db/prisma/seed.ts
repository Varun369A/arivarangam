import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const adminPassword = await bcrypt.hash('Vs9mkvxdx6%%', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arrivarangam.com' },
    update: {},
    create: {
      email: 'admin@arrivarangam.com',
      password: adminPassword,
      name: 'Admin',
      isAdmin: true,
      tier: 'ADMIN',
      credits: 999999,
      status: 'ACTIVE',
      isEmailVerified: true,
      termsAcceptedAt: new Date(),
    },
  })
  console.log('Admin user created:', admin.email)

  const testPassword = await bcrypt.hash('Test1234!!', 12)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@arrivarangam.com' },
    update: {},
    create: {
      email: 'test@arrivarangam.com',
      password: testPassword,
      name: 'Test User',
      tier: 'PRO',
      credits: 500,
      status: 'ACTIVE',
      isEmailVerified: true,
      termsAcceptedAt: new Date(),
    },
  })
  console.log('Test user created:', testUser.email)

  await prisma.platformLog.create({
    data: {
      type: 'MONITOR',
      severity: 'INFO',
      title: 'Platform initialized',
      description: 'Arrivarangam seeded successfully.',
      approved: true,
      approvedAt: new Date(),
    },
  })

  console.log('Seed complete')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
