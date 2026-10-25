import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Db, DeliveryConfig, Settings } from '@flowtus/core';
import { config } from './config';
import { PrismaService } from './prisma.service';

export type Tx = Prisma.TransactionClient;

const nj = (v: any) => (v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue));
const J = (v: any) => v as Prisma.InputJsonValue;

/* ---------- Row <-> core record mappers ---------- */
export function orderFromRow(r: any) {
  return {
    id: r.id, number: r.number, token: r.token, createdAt: r.createdAt.getTime(), status: r.status, paymentMethod: r.paymentMethod,
    customer: r.customer, recipient: r.recipient ?? null, address: r.address, landmark: r.landmark, areaId: r.areaId, areaName: r.areaName,
    date: r.date, slotId: r.slotId, slotLabel: r.slotLabel, giftMessage: r.giftMessage, deliveryNotes: r.deliveryNotes, items: r.items,
    subtotal: r.subtotal, fee: r.fee, total: r.total, payments: r.payments, rider: r.rider, history: r.history, messages: r.messages, notes: r.notes,
    ...(r.cancelReason ? { cancelReason: r.cancelReason } : {}),
  };
}
export function orderToRow(o: any) {
  return {
    id: o.id, number: o.number, token: o.token, createdAt: new Date(o.createdAt), status: o.status, paymentMethod: o.paymentMethod,
    customerPhone: o.customer.phone, customer: J(o.customer), recipient: nj(o.recipient), address: o.address, landmark: o.landmark || '',
    areaId: o.areaId, areaName: o.areaName, date: o.date, slotId: o.slotId, slotLabel: o.slotLabel, giftMessage: o.giftMessage || '',
    deliveryNotes: o.deliveryNotes || '', items: J(o.items), subtotal: o.subtotal, fee: o.fee ?? null, total: o.total, payments: J(o.payments || []),
    rider: o.rider || '', history: J(o.history || []), messages: J(o.messages || []), notes: J(o.notes || []), cancelReason: o.cancelReason ?? null,
  };
}
export function requestFromRow(r: any) {
  const rec: any = {
    id: r.id, ref: r.ref, token: r.token, kind: r.kind, createdAt: r.createdAt.getTime(), status: r.status, data: r.data, customer: r.customer,
    quotes: r.quotes, payments: r.payments, history: r.history, messages: r.messages, notes: r.notes,
  };
  if (r.serviceId) { rec.serviceId = r.serviceId; rec.serviceName = r.serviceName; }
  if (r.snapshot) rec.snapshot = r.snapshot;
  if (r.kind === 'booking') rec.team = r.team;
  if (r.kind === 'corporate') rec.schedule = r.schedule ?? null;
  if (r.terms) rec.terms = r.terms;
  if (r.reschedule) rec.reschedule = r.reschedule;
  if (r.cancelReason) rec.cancelReason = r.cancelReason;
  return rec;
}
export function requestToRow(r: any) {
  return {
    id: r.id, ref: r.ref, token: r.token, kind: r.kind, createdAt: new Date(r.createdAt), status: r.status, serviceId: r.serviceId ?? null,
    serviceName: r.serviceName ?? null, bookingDate: r.kind === 'booking' ? r.data?.date ?? null : null, customerPhone: r.customer.phone,
    data: J(r.data), snapshot: nj(r.snapshot), customer: J(r.customer), quotes: J(r.quotes || []), payments: J(r.payments || []),
    history: J(r.history || []), messages: J(r.messages || []), notes: J(r.notes || []), team: r.team || '', schedule: nj(r.schedule),
    terms: nj(r.terms), reschedule: nj(r.reschedule), cancelReason: r.cancelReason ?? null,
  };
}

/** Unit of work: loads the catalogue into core's `Db` shape, lets the pure rules mutate records, then writes back only what changed. */
export class Unit {
  readonly db: Db;
  private snap = new Map<string, string>();
  private idemLoaded = new Set<string>();

  constructor(private tx: Tx, db: Db) {
    this.db = db;
  }

  private trackO(o: any) { this.snap.set('o:' + o.id, JSON.stringify(o)); return o; }
  private trackR(r: any) { this.snap.set('r:' + r.id, JSON.stringify(r)); return r; }

  /** Orders loaded here become visible to slot-capacity, duplicate-payment and lookup rules. */
  async loadOrders(where: Prisma.OrderWhereInput) {
    const rows = await this.tx.order.findMany({ where });
    // Always hand back the one canonical object per record so the rules and the commit see the same instance.
    return rows.map(orderFromRow).map((o) => {
      const have = this.db.orders.find((x) => x.id === o.id);
      if (have) return have;
      this.trackO(o);
      this.db.orders.push(o);
      return o;
    });
  }
  async loadRequests(where: Prisma.RequestWhereInput) {
    const rows = await this.tx.request.findMany({ where });
    return rows.map(requestFromRow).map((r) => {
      const have = this.db.requests.find((x) => x.id === r.id);
      if (have) return have;
      this.trackR(r);
      this.db.requests.push(r);
      return r;
    });
  }
  async idem(key?: string | null) {
    if (!key) return;
    const row = await this.tx.idempotencyKey.findUnique({ where: { key } });
    if (!row) return;
    this.db.idem[key] = row.ref;
    this.idemLoaded.add(key);
    await this.loadOrders({ number: row.ref });
    await this.loadRequests({ ref: row.ref });
  }
  /** Loads every booking for a service on the given dates (capacity is counted from these). */
  loadBookings(serviceId: string, dates: (string | undefined | null)[]) {
    const ds = Array.from(new Set(dates.filter(Boolean))) as string[];
    return this.loadRequests({ kind: 'booking', serviceId, bookingDate: { in: ds } });
  }

  async commit() {
    const { db, tx } = this;
    const notes: Prisma.NotificationCreateManyInput[] = [];
    // Every customer-visible message, and every new order or request, is queued for SMS / WhatsApp / email delivery.
    const queue = (rec: any, prev: string | undefined) => {
      const ref = rec.number || rec.ref;
      const base = { ref, phone: rec.customer?.phone ?? null, email: rec.customer?.email || null };
      const path = (rec.number ? '/order/' : '/request/') + rec.token;
      if (prev === undefined) {
        notes.push({ ...base, event: rec.number ? 'order.placed' : 'request.received', body: `FLOWTUS: we received your ${rec.number ? 'order' : 'request'} ${ref}. Track it any time: ${config.publicWebUrl}${path}` });
        return;
      }
      const before = (JSON.parse(prev).messages || []).length;
      for (const m of (rec.messages || []).slice(before)) notes.push({ ...base, event: 'message', body: `FLOWTUS (${ref}): ${m.text} ${config.publicWebUrl}${path}` });
    };
    for (const o of db.orders) {
      const s = JSON.stringify(o);
      const prev = this.snap.get('o:' + o.id);
      if (prev === undefined) await tx.order.create({ data: orderToRow(o) });
      else if (prev !== s) await tx.order.update({ where: { id: o.id }, data: orderToRow(o) });
      if (prev !== s) queue(o, prev);
      this.snap.set('o:' + o.id, s);
    }
    for (const r of db.requests) {
      const s = JSON.stringify(r);
      const prev = this.snap.get('r:' + r.id);
      if (prev === undefined) await tx.request.create({ data: requestToRow(r) });
      else if (prev !== s) await tx.request.update({ where: { id: r.id }, data: requestToRow(r) });
      if (prev !== s) queue(r, prev);
      this.snap.set('r:' + r.id, s);
    }
    if (notes.length) await tx.notification.createMany({ data: notes });
    if (db.audit.length) {
      await tx.auditEntry.createMany({ data: db.audit.slice().reverse().map((a: any) => ({ at: new Date(a.at), by: a.by, ref: String(a.ref), action: a.action })) });
      db.audit.length = 0;
    }
    for (const [key, ref] of Object.entries(db.idem)) {
      if (!this.idemLoaded.has(key)) {
        await tx.idempotencyKey.create({ data: { key, ref } });
        this.idemLoaded.add(key);
      }
    }
  }
}

@Injectable()
export class StoreService {
  constructor(readonly prisma: PrismaService) {}

  run<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn, { maxWait: 10_000, timeout: 30_000 });
  }

  /** Serialises work on one logical resource (a delivery window, a service date, an idempotency key) for the life of the transaction. */
  async lock(tx: Tx, key: string): Promise<void> {
    await tx.$queryRaw`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(hashtext(${key}))) AS l`;
  }

  async unit(tx: Tx): Promise<Unit> {
    return new Unit(tx, await this.catalogue(tx));
  }

  async catalogue(tx: Tx | PrismaService = this.prisma): Promise<Db> {
    const [products, custom, services, occasions, areas, blocks, teams, settings, delivery] = await Promise.all([
      tx.product.findMany({ orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }] }),
      tx.customItem.findMany({ orderBy: { sort: 'asc' } }),
      tx.service.findMany({ orderBy: { sort: 'asc' } }),
      tx.occasion.findMany({ orderBy: { sort: 'asc' } }),
      tx.area.findMany({ orderBy: { sort: 'asc' } }),
      tx.block.findMany({ orderBy: { date: 'asc' } }),
      tx.team.findMany(),
      tx.appSetting.findUnique({ where: { key: 'settings' } }),
      tx.appSetting.findUnique({ where: { key: 'delivery' } }),
    ]);
    return {
      v: 2,
      products: products.map((p: any) => ({
        id: p.id, slug: p.slug, dept: p.dept, cat: p.cat, name: p.name, occ: p.occ, variants: p.variants, short: p.short, description: p.description,
        composition: p.composition, care: p.care, available: p.available, archived: p.archived, maxQty: p.maxQty, leadDays: p.leadDays, builder: p.builder,
        addons: p.addons, builderExtra: p.builderExtra, wrap: p.wrap, featured: p.featured, img: p.img, sample: p.sample,
      })),
      custom: custom.map((c: any) => ({ id: c.id, name: c.name, bn: c.bn, type: c.type, unit: c.unit, unitPrice: c.unitPrice, priceMode: c.priceMode, min: c.min, max: c.max, multiple: c.multiple, presets: c.presets, available: c.available, seasonal: c.seasonal, leadDays: c.leadDays })),
      services: services.map((s: any) => ({
        id: s.id, group: s.grp, name: s.name, short: s.short, active: s.active, priceModel: s.priceModel, packages: s.packages, fromPrice: s.fromPrice, perUnit: s.perUnit,
        depositPct: s.depositPct, leadDays: s.leadDays, maxDays: s.maxDays, hours: s.hours as [number, number], durationHrs: s.durationHrs, capacity: s.capacity, coverage: s.coverage,
        partner: s.partner, partnerAvailable: s.partnerAvailable, included: s.included, excluded: s.excluded, cancellation: s.cancellation, img: s.img, sample: s.sample, fields: s.fields, req: s.req,
      })),
      occasions: occasions.map((o: any) => ({ id: o.id, name: o.name, active: o.active })),
      areas: areas.map((a: any) => ({ id: a.id, name: a.name, delivery: a.delivery, fee: a.fee })),
      delivery: (delivery?.value as unknown as DeliveryConfig) ?? ({ slots: [], sameDay: false, cutoffHour: 15, leadHours: 3, maxDaysAhead: 30, customMaxDays: 60 } as DeliveryConfig),
      blocks: blocks.map((b: any) => ({ id: b.id, date: b.date, scope: b.scope, slot: b.slot, reason: b.reason })),
      teams: teams.map((t: any) => ({ id: t.id, name: t.name })),
      settings: settings?.value as unknown as Settings,
      orders: [],
      requests: [],
      audit: [],
      idem: {},
      demo: { failNext: false },
    };
  }
}
