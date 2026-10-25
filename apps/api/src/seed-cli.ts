import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedDatabase } from './common/seed-database';

const prisma = new PrismaClient();
const DEFAULTS = ['ChangeMe-Owner-2026', 'ChangeMe-Staff-2026'];

async function upsertUser(email: string, password: string, name: string, role: 'owner' | 'staff') {
  if (process.env.NODE_ENV === 'production' && DEFAULTS.includes(password)) {
    throw new Error(`Refusing to create ${role} account with the default password in production. Set ${role.toUpperCase()}_PASSWORD.`);
  }
  if (password.length < 12) throw new Error(`${role.toUpperCase()}_PASSWORD must be at least 12 characters.`);
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({ where: { email }, update: { passwordHash, name, role, active: true }, create: { email, name, role, passwordHash } });
}

async function main() {
  const existing = await prisma.product.count();
  if (existing === 0 || process.env.SEED_FORCE === 'true') {
    await seedDatabase(prisma);
    console.log('Seeded demonstration catalogue and settings.');
  } else {
    console.log('Catalogue already present; skipping (set SEED_FORCE=true to replace it).');
  }
  await upsertUser(process.env.OWNER_EMAIL || 'owner@flowtus.local', process.env.OWNER_PASSWORD || DEFAULTS[0], 'Owner', 'owner');
  await upsertUser(process.env.STAFF_EMAIL || 'staff@flowtus.local', process.env.STAFF_PASSWORD || DEFAULTS[1], 'Staff', 'staff');
  console.log('Owner and staff accounts ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
