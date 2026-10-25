import { ForbiddenException, Injectable } from '@nestjs/common';
import { Actor, HOLDS_CAPACITY, addDays, createBooking, createCorporate, createCustom, dhakaNow, paymentStatus, placeOrder, priceLine, runTests, sendQuote, submitPayment, rid } from '@flowtus/core';
import { config } from '../common/config';
import { seedDatabase } from '../common/seed-database';
import { StoreService } from '../common/store.service';
import { RecordsAdminService } from './records-admin.service';

const DONE_ORDER = ['Cancelled', 'Delivered', 'Refunded', 'Refund Pending'];

@Injectable()
export class MiscAdminService {
  constructor(private store: StoreService, private records: RecordsAdminService) {}

  async overview() {
    await this.records.expireStaleQuotes();
    const now = dhakaNow();
    const in7 = addDays(now.date, 7);
    const [orders, requests] = await Promise.all([
      this.store.prisma.order.findMany({ select: { number: true, status: true, date: true, slotLabel: true, total: true, customer: true, payments: true, paymentMethod: true } }),
      this.store.prisma.request.findMany({ select: { ref: true, kind: true, status: true, bookingDate: true, data: true, customer: true, payments: true, quotes: true, schedule: true, serviceName: true } }),
    ]);
    const O = orders as any[];
    const R = requests as any[];
    const awaitPay = [...O, ...R].filter((x) => (x.payments || []).some((p: any) => p.status === 'Awaiting Verification'));
    const dueRec = R.filter((r) => r.schedule && r.schedule.some((d: any) => d.status === 'Scheduled' && d.date >= now.date && d.date <= in7));
    const cards = [
      { label: 'New orders', n: O.filter((o) => o.status === 'Pending Confirmation').length, href: '/orders?status=Pending Confirmation' },
      { label: 'New custom requests', n: R.filter((r) => r.kind === 'custom' && ['New Request', 'Checking Availability'].includes(r.status)).length, href: '/requests?kind=custom' },
      { label: 'New bookings', n: R.filter((r) => r.kind === 'booking' && ['New Request', 'Checking Availability', 'Reschedule Requested'].includes(r.status)).length, href: '/requests?kind=booking' },
      { label: 'Quotes awaiting customer', n: R.filter((r) => ['Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval'].includes(r.status)).length, href: '/requests?status=Quote Sent' },
      { label: 'Deposits awaiting', n: R.filter((r) => ['Awaiting Deposit', 'Approved'].includes(r.status)).length, href: '/requests?status=Awaiting Deposit' },
      { label: 'Payments to verify', n: awaitPay.length, href: '/orders?pay=Awaiting Verification' },
      { label: 'Deliveries today', n: O.filter((o) => o.date === now.date && !DONE_ORDER.includes(o.status)).length, href: '/orders' },
      { label: 'Installations next 7 days', n: R.filter((r) => r.kind === 'booking' && HOLDS_CAPACITY.includes(r.status) && r.bookingDate >= now.date && r.bookingDate <= in7).length, href: '/calendar' },
      { label: 'Cancellations & refunds', n: [...O, ...R].filter((x) => ['Cancelled', 'Refund Pending', 'Partner Issue', 'Delivery Failed'].includes(x.status)).length, href: '/requests?status=Cancelled' },
      { label: 'Recurring due in 7 days', n: dueRec.length, href: '/requests?kind=corporate' },
    ];
    return {
      cards,
      empty: !O.length && !R.length,
      today: O.filter((o) => o.date === now.date).map((o) => ({ number: o.number, name: o.customer.name, status: o.status })),
      installs: R.filter((r) => r.kind === 'booking' && HOLDS_CAPACITY.includes(r.status) && r.bookingDate >= now.date)
        .sort((x, y) => (x.bookingDate < y.bookingDate ? -1 : 1)).slice(0, 8)
        .map((r) => ({ ref: r.ref, when: r.bookingDate, title: r.serviceName, status: r.status, pay: paymentStatus(r) })),
    };
  }

  /** The next 21 days: deliveries, confirmed bookings, blocks and pending requests (which hold no capacity). */
  async calendar() {
    const now = dhakaNow();
    const days = Array.from({ length: 21 }, (_, i) => addDays(now.date, i));
    const [orders, bookings, blocks, services, delivery] = await Promise.all([
      this.store.prisma.order.findMany({ where: { date: { in: days } }, select: { date: true, status: true } }),
      this.store.prisma.request.findMany({ where: { kind: 'booking', bookingDate: { in: days } }, select: { bookingDate: true, status: true, serviceName: true, serviceId: true } }),
      this.store.prisma.block.findMany({ where: { date: { in: days } } }),
      this.store.prisma.service.findMany({ select: { id: true, name: true, capacity: true } }),
      this.store.catalogue(),
    ]);
    return {
      days: days.map((date) => ({
        date,
        deliveries: orders.filter((o) => o.date === date && !DONE_ORDER.slice(0, 1).includes(o.status) && !['Refunded', 'Refund Pending'].includes(o.status)).length,
        bookings: bookings.filter((b) => b.bookingDate === date && HOLDS_CAPACITY.includes(b.status)).map((b) => b.serviceName),
        pending: bookings.filter((b) => b.bookingDate === date && ['New Request', 'Checking Availability', 'Quote Sent', 'Awaiting Customer Approval', 'Awaiting Deposit', 'Reschedule Requested'].includes(b.status)).length,
        blocks: blocks.filter((b) => b.date === date).map((b) => ({ id: b.id, scope: b.scope, slot: b.slot, reason: b.reason })),
      })),
      blocks: blocks.map((b) => ({ id: b.id, date: b.date, scope: b.scope, slot: b.slot, reason: b.reason })),
      scopes: [{ id: 'all', label: 'Everything' }, { id: 'delivery', label: 'All deliveries' }, { id: 'custom', label: 'Custom flower orders' }, ...services.map((s: any) => ({ id: s.id, label: (s.name as string[])[0] }))],
      slots: delivery.delivery.slots,
    };
  }

  async audit() {
    const rows = await this.store.prisma.auditEntry.findMany({ orderBy: { id: 'desc' }, take: 400 });
    return rows.map((r) => ({ id: r.id, at: r.at.getTime(), by: r.by, ref: r.ref, action: r.action }));
  }

  tests() {
    return runTests();
  }

  /* ---------- Demo tools (development only) ---------- */
  private guardDemo(actor: Actor) {
    if (!config.allowDemoTools) throw new ForbiddenException('Demo tools are disabled on this server.');
    if (actor.role !== 'owner') throw new ForbiddenException('Only the owner can use demo tools.');
  }

  /** Creates clearly-labelled "Sample: …" orders and requests so every admin screen has something to show. */
  async loadSample(actor: Actor) {
    this.guardDemo(actor);
    const now = dhakaNow();
    const D = (n: number) => addDays(now.date, n);
    const owner = { name: 'Owner', role: 'owner' as const };
    await this.store.run(async (tx) => {
      const u = await this.store.unit(tx);
      const db = u.db;
      await u.loadOrders({});
      await u.loadRequests({});
      const l = (pid: string, vid: string, q = 1) => {
        const x: any = { key: rid(6), productId: pid, variantId: vid, qty: q, addons: [] };
        x.snapUnit = priceLine(db, x).unit;
        return x;
      };
      const o1 = placeOrder(db, [l('classic-red-roses', '12'), l('chocolate-box', '16')], { name: 'Sample: Nusrat Jahan', phone: '01711000001', area: 'gulshan-2', address: 'House 12, Road 45, Gulshan 2', date: D(1), slot: 'afternoon', pay: 'bkash' }, { now }).order;
      if (o1) submitPayment(db, o1, { method: 'bkash', txn: 'DEMO' + rid(6), amount: o1.total });
      placeOrder(db, [l('blush-garden', 'std')], { name: 'Sample: Tanvir Ahmed', phone: '01811000002', area: 'banani', address: 'House 7, Road 11, Banani', date: D(2), slot: 'morning', pay: 'cod' }, { now });
      createCustom(db, { item: 'red-rose', qty: '120', date: D(3), name: 'Sample: Farhana', phone: '01911000003', notes: 'Bundles of 12, deep red' }, { now });
      createCustom(db, { item: 'marigold-garland', qty: '20', date: D(4), name: 'Sample: Rahim family', phone: '01611000004' }, { now });
      const b = createBooking(db, 'car-decoration', { date: D(8), time: '15:00', package: 'signature', carType: 'Sedan', carModel: 'Toyota Premio, white', carSupplied: 'I will provide the car', colours: ['Red', 'White'], area: 'banani', address: 'House 22, Road 4, Banani', name: 'Sample: Sadia', phone: '01711000005' }, { now }).rec;
      if (b) sendQuote(db, b, { items: [{ desc: 'Car decoration — Signature', qty: 1, amount: 8500 }], charges: [{ desc: 'Installation and transport', amount: 500 }], depositPct: 30, validUntil: D(3), included: 'Fresh flowers; installation', excluded: 'The car; driver', terms: db.settings.policies.booking.text }, owner, { now });
      createBooking(db, 'bashor-ghor', { date: D(10), time: '14:00', package: 'signature', roomType: 'Bedroom at home', roomSize: 'King bed', area: 'gulshan-1', address: 'House 3, Road 27, Gulshan 1', name: 'Sample: Imran', phone: '01511000006' }, { now });
      createCorporate(db, { company: 'Sample Co. Ltd', name: 'Sample: Nadia Karim', phone: '01311000007', email: 'office@example.com', orderType: 'Reception & lobby', mode: 'Recurring', qty: '2 reception arrangements', start: D(4), freq: 'Weekly', duration: '3 months', area: 'gulshan-2', address: 'Level 6, Road 90, Gulshan 2', invoice: true }, { now });
      db.audit.unshift({ at: Date.now(), by: `${actor.name} (${actor.role})`, ref: 'demo', action: 'Loaded sample activity (demonstration data)' });
      await u.commit();
    });
    return { ok: true };
  }

  async resetDemo(actor: Actor, confirm: string) {
    this.guardDemo(actor);
    if (confirm !== 'RESET') throw new ForbiddenException('Type RESET to confirm.');
    await this.store.run((tx) => seedDatabase(tx, { wipe: true }));
    return { ok: true };
  }
}
