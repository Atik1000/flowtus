import { Prisma, PrismaClient } from '@prisma/client';
import { seed } from '@flowtus/core';

type Client = PrismaClient | Prisma.TransactionClient;

/** Writes FLOWTUS's demonstration catalogue and configuration. With `wipe`, removes all orders, requests and the audit log first. */
export async function seedDatabase(prisma: Client, opts: { wipe?: boolean } = {}) {
  const db = seed();
  if (opts.wipe) {
    await prisma.order.deleteMany();
    await prisma.request.deleteMany();
    await prisma.auditEntry.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.upload.deleteMany();
  }
  await prisma.product.deleteMany();
  await prisma.customItem.deleteMany();
  await prisma.service.deleteMany();
  await prisma.occasion.deleteMany();
  await prisma.area.deleteMany();
  await prisma.block.deleteMany();
  await prisma.team.deleteMany();

  await prisma.product.createMany({
    data: db.products.map((p, i) => ({ ...p, variants: p.variants as any, img: p.img, sort: i })),
  });
  await prisma.customItem.createMany({ data: db.custom.map((c, i) => ({ ...c, sort: i })) });
  await prisma.service.createMany({
    data: db.services.map(({ group, ...s }, i) => ({ ...s, grp: group, name: s.name as any, packages: s.packages as any, sort: i })),
  });
  await prisma.occasion.createMany({ data: db.occasions.map((o, i) => ({ id: o.id, name: o.name as any, active: o.active, sort: i })) });
  await prisma.area.createMany({ data: db.areas.map((a, i) => ({ id: a.id, name: a.name as any, delivery: a.delivery, fee: a.fee, sort: i })) });
  await prisma.block.createMany({ data: db.blocks.map((b) => ({ date: b.date, scope: b.scope, slot: b.slot, reason: b.reason })) });
  await prisma.team.createMany({ data: db.teams });
  await prisma.appSetting.upsert({ where: { key: 'settings' }, update: { value: db.settings as any }, create: { key: 'settings', value: db.settings as any } });
  await prisma.appSetting.upsert({ where: { key: 'delivery' }, update: { value: db.delivery as any }, create: { key: 'delivery', value: db.delivery as any } });
}
