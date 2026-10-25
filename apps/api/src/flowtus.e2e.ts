/* End-to-end tests against a real PostgreSQL database (set DATABASE_URL to a throw-away database; this suite wipes orders and requests). */
import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { addDays, dhakaNow } from '@flowtus/core';
import { AppModule } from './app.module';
import { configure } from './bootstrap';
import { PrismaService } from './common/prisma.service';
import { seedDatabase } from './common/seed-database';
import * as bcrypt from 'bcryptjs';

process.env.NODE_ENV = 'test';
const D = (n: number) => addDays(dhakaNow().date, n);
const X = { 'x-requested-with': 'flowtus-admin' };

describe('FLOWTUS API', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let http: () => ReturnType<typeof request>;
  let owner: string[] = [];
  let staff: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configure(app);
    await app.init();
    prisma = app.get(PrismaService);
    await seedDatabase(prisma, { wipe: true });
    await prisma.user.deleteMany();
    const hash = await bcrypt.hash('Test-Password-123', 10);
    await prisma.user.createMany({ data: [{ email: 'o@t.test', name: 'Owner', role: 'owner', passwordHash: hash }, { email: 's@t.test', name: 'Staff', role: 'staff', passwordHash: hash }] });
    http = () => request(app.getHttpServer());
    const login = async (email: string) => (await http().post('/api/auth/login').send({ email, password: 'Test-Password-123' })).headers['set-cookie'] as unknown as string[];
    owner = await login('o@t.test');
    staff = await login('s@t.test');
  });
  afterAll(async () => { await app.close(); });

  const line = (productId = 'ivory-grace', variantId = 'std') => ({ kind: 'product', productId, variantId, qty: 1, addons: [] });
  const checkout = (o: any = {}) => ({ name: 'Test Customer', phone: '01711000000', area: 'gulshan-1', address: 'House 1, Road 2, Gulshan 1', date: D(2), slot: 'morning', pay: 'bkash', ...o });
  const place = (key: string, co: any = {}, cart: any[] = [line()]) => http().post('/api/orders').set('Idempotency-Key', key).send({ cart, checkout: checkout(co) });

  it('hides payment numbers from the public catalogue and internals from order pages', async () => {
    const cat = await http().get('/api/catalogue').expect(200);
    expect(JSON.stringify(cat.body.settings)).not.toMatch(/"number"/);
    const r = await place('e2e-hide-0001').expect(201);
    const view = await http().get(`/api/orders/${r.body.order.token}`).expect(200);
    expect(view.body.order.notes).toBeUndefined();
    expect(view.body.order.history).toBeUndefined();
  });

  it('re-prices on the server and ignores client prices', async () => {
    const r = await http().post('/api/orders').set('Idempotency-Key', 'e2e-price-0001').send({ cart: [{ ...line(), unitPrice: 1, total: 1, snapUnit: undefined }], checkout: checkout({ slot: 'afternoon' }) }).expect(201);
    expect(r.body.order.total).toBe(1690 + 100);
  });

  it('returns the original order for a repeated Idempotency-Key', async () => {
    const a = await place('e2e-idem-00001', { slot: 'evening' }).expect(201);
    const b = await place('e2e-idem-00001', { slot: 'evening' }).expect(201);
    expect(b.body.duplicate).toBe(true);
    expect(b.body.order.number).toBe(a.body.order.number);
    expect(await prisma.order.count({ where: { number: a.body.order.number } })).toBe(1);
  });

  it('lets only one of two simultaneous checkouts take the last place in a delivery window', async () => {
    const cfg: any = (await prisma.appSetting.findUnique({ where: { key: 'delivery' } }))!.value;
    const slots = cfg.slots.map((s: any) => (s.id === 'morning' ? { ...s, cap: 1 } : s));
    await prisma.appSetting.update({ where: { key: 'delivery' }, data: { value: { ...cfg, slots } } });
    await prisma.order.deleteMany({ where: { date: D(5) } });
    const res = await Promise.all([place('e2e-race-a-0001', { date: D(5), slot: 'morning', phone: '01711000001' }), place('e2e-race-b-0001', { date: D(5), slot: 'morning', phone: '01711000002' })]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(await prisma.order.count({ where: { date: D(5), slotId: 'morning' } })).toBe(1);
    await prisma.appSetting.update({ where: { key: 'delivery' }, data: { value: cfg } });
  });

  it('rejects a transaction ID that was already submitted, even across orders and concurrently', async () => {
    const a = await place('e2e-txn-a-00001', { date: D(3), slot: 'morning' }).expect(201);
    const b = await place('e2e-txn-b-00001', { date: D(3), slot: 'afternoon' }).expect(201);
    const pay = (t: string) => http().post(`/api/orders/${t}/payments`).send({ method: 'bkash', txn: 'DUPTXN12345', amount: 1790 });
    const res = await Promise.all([pay(a.body.order.token), pay(b.body.order.token)]);
    expect(res.map((r) => r.status).sort()).toEqual([201, 400]);
  });

  it('keeps staff out of owner-only steps and requires the CSRF header on cookie writes', async () => {
    const r = await place('e2e-staff-00001', { date: D(3), slot: 'evening' }).expect(201);
    const n = r.body.order.number;
    await http().post(`/api/admin/orders/${n}/transition`).set('Cookie', staff).set(X).send({ to: 'Confirmed' }).expect(403);
    await http().post(`/api/admin/orders/${n}/transition`).set('Cookie', owner).send({ to: 'Confirmed' }).expect(403);
    await http().post(`/api/admin/orders/${n}/transition`).set('Cookie', owner).set(X).send({ to: 'Confirmed' }).expect(200);
    await http().get('/api/admin/overview').expect(401);
    await http().get('/api/admin/settings').set('Cookie', staff).expect(403);
  });

  describe('booking confirmation', () => {
    const holud = (phone: string) => ({ date: D(9), time: '10:00', venueType: 'Home', indoor: 'Indoor', scope: 'Stage', area: 'banani', address: 'House 10, Road 11, Banani', name: 'Rafi', phone });
    const post = (ref: string, path: string, body: any = {}) => http().post(`/api/admin/requests/${ref}/${path}`).set('Cookie', owner).set(X).send(body);

    async function readyBooking(phone: string, txn: string) {
      const c = await http().post('/api/requests/bookings/holud-decoration').set('Idempotency-Key', 'e2e-bk-' + phone).send(holud(phone)).expect(201);
      const { ref, token } = c.body.request;
      await post(ref, 'quote', { items: [{ desc: 'Holud', qty: 1, amount: 30000 }], depositPct: 50, validUntil: D(4) }).expect(200);
      await http().post(`/api/requests/${token}/quote/respond`).send({ accept: true }).expect(200);
      await http().post(`/api/requests/${token}/payments`).send({ method: 'bkash', txn, amount: 15000 }).expect(201);
      const full = await http().get(`/api/admin/requests/${ref}`).set('Cookie', owner).expect(200);
      await post(ref, `payments/${full.body.rec.payments[0].id}/verify`).expect(200);
      return ref;
    }

    it('confirms exactly one of two simultaneous bookings for an exclusive date', async () => {
      const a = await readyBooking('01811000011', 'BKTXN0000001');
      const b = await readyBooking('01811000012', 'BKTXN0000002');
      const res = await Promise.all([post(a, 'transition', { to: 'Confirmed' }), post(b, 'transition', { to: 'Confirmed' })]);
      expect(res.map((r) => r.status).sort()).toEqual([200, 400]);
      expect(res.find((r) => r.status === 400)!.body.message).toMatch(/capacity/i);
      const confirmed = await prisma.request.count({ where: { serviceId: 'holud-decoration', bookingDate: D(9), status: 'Confirmed' } });
      expect(confirmed).toBe(1);
    });

    it('does not count pending requests against capacity and shows the reason when full', async () => {
      const v = await http().post('/api/availability/service').send({ serviceId: 'holud-decoration', fields: { date: D(9) } }).expect(201);
      expect(v.body.error).toMatch(/fully booked/i);
      const free = await http().post('/api/availability/service').send({ serviceId: 'holud-decoration', fields: { date: D(11) } }).expect(201);
      expect(free.body.error).toBeNull();
    });
  });

  it('stores reference photos privately behind signed links', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const up = await http().post('/api/uploads').attach('file', Buffer.concat([png, Buffer.alloc(40)]), { filename: 'ref.png', contentType: 'image/png' }).expect(201);
    await http().post('/api/uploads').attach('file', Buffer.from('<?php echo 1; ?>padding-padding'), { filename: 'evil.png', contentType: 'image/png' }).expect(400);
    await http().get(`/api/uploads/${up.body.id}/file`).expect(404);
    const link = await http().get(`/api/uploads/${up.body.id}/link`).set('Cookie', owner).expect(200);
    await http().get(link.body.url).expect(200);
    await http().get(link.body.url.replace(/sig=.{6}/, 'sig=000000')).expect(404);
  });

  it('locks /track for a minute after five wrong guesses', async () => {
    const r = await place('e2e-track-0001', { date: D(3), slot: 'afternoon', phone: '01711000077' }).expect(201);
    const ok = await http().post('/api/track').send({ ref: r.body.order.number, phone: '01711000077' }).expect(200);
    expect(ok.body.type).toBe('order');
    for (let i = 0; i < 5; i++) await http().post('/api/track').send({ ref: 'FLW-000000-ZZZZ', phone: '01711000077' }).expect(404);
    await http().post('/api/track').send({ ref: r.body.order.number, phone: '01711000077' }).expect(429);
  });
});
