import { BadRequestException, Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createBooking, createCorporate, createCustom, customerCancel, normPhone, placeOrder, requestReschedule, respondQuote, submitPayment } from '@flowtus/core';
import type { Result } from '@flowtus/core';
import { unwrap } from '../common/errors';
import { StoreService, Tx, Unit, orderFromRow, requestFromRow } from '../common/store.service';
import { UploadsService } from '../uploads/uploads.service';
import { publicOrder, publicRequest } from '../catalogue/views';
import { sanitizeCart, sanitizeFields } from './sanitize';

const IDEM = /^[A-Za-z0-9_-]{8,64}$/;
const str = (v: unknown, max = 200) => String(v ?? '').slice(0, max);

/** Anonymous failure tracker for /track (the controller also throttles by IP). Locks an IP for a minute after 5 misses. */
const trackFails = new Map<string, { fails: number; lock: number }>();

@Injectable()
export class RecordsService {
  constructor(private store: StoreService, private uploads: UploadsService) {}

  private idemKey(kind: string, key?: string) {
    if (!key) return undefined;
    if (!IDEM.test(key)) throw new BadRequestException('Invalid Idempotency-Key.');
    return kind + ':' + key;
  }

  /* ---------- Orders ---------- */
  async placeOrder(body: any, idemHeader?: string) {
    const cart = sanitizeCart(body?.cart);
    const f = body?.checkout && typeof body.checkout === 'object' ? sanitizeFields(body.checkout) : {};
    const key = this.idemKey('order', idemHeader);
    const expectTotal = Number.isFinite(Number(body?.expectTotal)) && body?.expectTotal != null ? Number(body.expectTotal) : null;
    return this.store.run(async (tx) => {
      if (key) await this.store.lock(tx, 'idem:' + key);
      // Serialise on the chosen delivery window so two checkouts cannot both take the last place.
      await this.store.lock(tx, `slot:${f.date}:${f.slot}`);
      const u = await this.store.unit(tx);
      await u.idem(key);
      await u.loadOrders({ date: str(f.date, 10) });
      const r = unwrap(placeOrder(u.db, cart, f, { idem: key, expectTotal }));
      await u.commit();
      return { order: publicOrder(r.order, u.db.settings), duplicate: !!r.duplicate };
    });
  }

  private async withOrder<T>(token: string, fn: (u: Unit, o: any, tx: Tx) => Promise<T> | T, opts: { write?: boolean } = {}) {
    return this.store.run(async (tx) => {
      const row = await tx.order.findUnique({ where: { token: str(token, 40) } });
      if (!row) throw new NotFoundException('We could not find this order.');
      if (opts.write) await this.store.lock(tx, 'rec:' + row.id);
      const u = await this.store.unit(tx);
      const [o] = await u.loadOrders({ id: row.id });
      const out = await fn(u, o, tx);
      if (opts.write) await u.commit();
      return out;
    });
  }
  orderByToken(token: string) {
    return this.withOrder(token, (u, o) => ({ order: publicOrder(o, u.db.settings) }));
  }
  cancelOrder(token: string, reason?: string) {
    return this.withOrder(token, (u, o) => {
      unwrap(customerCancel(u.db, o, str(reason, 300)));
      return { order: publicOrder(o, u.db.settings) };
    }, { write: true });
  }
  submitOrderPayment(token: string, body: any) {
    return this.submitPay('order', token, body);
  }

  /* ---------- Shared payment submission ---------- */
  private async submitPay(kind: 'order' | 'request', token: string, body: any) {
    const txn = str(body?.txn, 40).trim().toUpperCase();
    return this.store.run(async (tx) => {
      const row: any = kind === 'order' ? await tx.order.findUnique({ where: { token: str(token, 40) } }) : await tx.request.findUnique({ where: { token: str(token, 40) } });
      if (!row) throw new NotFoundException('We could not find this ' + kind + '.');
      await this.store.lock(tx, 'txn:' + txn);
      await this.store.lock(tx, 'rec:' + row.id);
      const u = await this.store.unit(tx);
      // Load every record that already carries this transaction ID so the duplicate rule sees them.
      if (txn) {
        const probe = JSON.stringify([{ txn }]);
        const os = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Order" WHERE payments @> ${probe}::jsonb`);
        const rs = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM "Request" WHERE payments @> ${probe}::jsonb`);
        if (os.length) await u.loadOrders({ id: { in: os.map((x) => x.id) } });
        if (rs.length) await u.loadRequests({ id: { in: rs.map((x) => x.id) } });
      }
      const [rec] = kind === 'order' ? await u.loadOrders({ id: row.id }) : await u.loadRequests({ id: row.id });
      if (kind === 'order' && !['bkash', 'nagad'].includes(rec.paymentMethod)) throw new BadRequestException('This order is not paid by bKash or Nagad.');
      if (kind === 'order' && body?.method && body.method !== rec.paymentMethod) throw new BadRequestException('Use the payment method you chose at checkout.');
      unwrap(submitPayment(u.db, rec, { method: str(body?.method, 10), txn, amount: body?.amount }));
      await u.commit();
      return kind === 'order' ? { order: publicOrder(rec, u.db.settings) } : { request: publicRequest(rec, u.db.settings) };
    });
  }

  /* ---------- Requests ---------- */
  private async create(kind: string, idemHeader: string | undefined, lockKeys: string[], work: (u: Unit, key?: string) => Promise<Result>) {
    const key = this.idemKey(kind, idemHeader);
    return this.store.run(async (tx) => {
      if (key) await this.store.lock(tx, 'idem:' + key);
      for (const k of lockKeys) await this.store.lock(tx, k);
      const u = await this.store.unit(tx);
      await u.idem(key);
      const r = unwrap(await work(u, key));
      await u.commit();
      return { request: publicRequest(r.rec, u.db.settings), duplicate: !!r.duplicate };
    });
  }
  private async photo(f: any) {
    if (f?.photo?.id) f.photo = await this.uploads.meta(str(f.photo.id, 40));
    else delete f.photo;
  }

  async createCustom(body: any, idem?: string) {
    const f = sanitizeFields(body);
    await this.photo(f);
    const snap = body && 'snapPrice' in body ? (body.snapPrice == null ? null : Number(body.snapPrice)) : undefined;
    return this.create('custom', idem, [], async (u, key) => createCustom(u.db, f, { idem: key, snapPrice: snap }));
  }
  async createBooking(serviceId: string, body: any, idem?: string) {
    const f = sanitizeFields(body?.fields ?? body);
    await this.photo(f);
    return this.create('booking', idem, [], async (u, key) => {
      await u.loadBookings(str(serviceId, 80), [f.date]);
      return createBooking(u.db, serviceId, f, { idem: key, allowDuplicate: body?.allowDuplicate === true });
    });
  }
  async createCorporate(body: any, idem?: string) {
    const f = sanitizeFields(body);
    return this.create('corporate', idem, [], async (u, key) => createCorporate(u.db, f, { idem: key }));
  }

  private async withRequest<T>(token: string, fn: (u: Unit, r: any, tx: Tx) => Promise<T> | T, opts: { write?: boolean } = {}) {
    return this.store.run(async (tx) => {
      const row = await tx.request.findUnique({ where: { token: str(token, 40) } });
      if (!row) throw new NotFoundException('We could not find this request.');
      if (opts.write) await this.store.lock(tx, 'rec:' + row.id);
      const u = await this.store.unit(tx);
      const [r] = await u.loadRequests({ id: row.id });
      const out = await fn(u, r, tx);
      if (opts.write) await u.commit();
      return out;
    });
  }
  requestByToken(token: string) {
    return this.withRequest(token, (u, r) => ({ request: publicRequest(r, u.db.settings) }));
  }
  respondQuote(token: string, accept: boolean, reason?: string) {
    return this.withRequest(token, (u, r) => {
      unwrap(respondQuote(u.db, r, !!accept, null, { reason: str(reason, 500) }));
      return { request: publicRequest(r, u.db.settings) };
    }, { write: true });
  }
  submitRequestPayment(token: string, body: any) {
    return this.submitPay('request', token, body);
  }
  reschedule(token: string, body: any) {
    const date = str(body?.date, 10);
    const time = str(body?.time, 5);
    return this.withRequest(token, async (u, r) => {
      if (r.kind !== 'booking') throw new BadRequestException('Only service bookings can be rescheduled.');
      await u.loadBookings(r.serviceId, [r.data.date, date]);
      unwrap(requestReschedule(u.db, r, date, time));
      return { request: publicRequest(r, u.db.settings) };
    }, { write: true });
  }
  cancelRequest(token: string, reason?: string) {
    return this.withRequest(token, (u, r) => {
      unwrap(customerCancel(u.db, r, str(reason, 300)));
      return { request: publicRequest(r, u.db.settings) };
    }, { write: true });
  }

  /* ---------- Track ---------- */
  async track(ip: string, body: any) {
    const st = trackFails.get(ip) || { fails: 0, lock: 0 };
    if (st.lock > Date.now()) throw new HttpException('Too many attempts. Please wait a minute and try again.', HttpStatus.TOO_MANY_REQUESTS);
    const ref = str(body?.ref, 40).trim().toUpperCase();
    const phone = normPhone(body?.phone);
    let hit: { type: 'order' | 'request'; token: string } | null = null;
    if (ref && phone) {
      const o = await this.store.prisma.order.findFirst({ where: { number: ref, customerPhone: phone }, select: { token: true } });
      if (o) hit = { type: 'order', token: o.token };
      else {
        const r = await this.store.prisma.request.findFirst({ where: { ref, customerPhone: phone }, select: { token: true } });
        if (r) hit = { type: 'request', token: r.token };
      }
    }
    if (hit) {
      trackFails.delete(ip);
      return hit;
    }
    const fails = st.fails + 1;
    const lock = fails >= 5 ? Date.now() + 60_000 : 0;
    trackFails.set(ip, { fails: lock ? 0 : fails, lock });
    if (trackFails.size > 5000) for (const [k, v] of trackFails) if (v.lock < Date.now() && v.fails === 0) trackFails.delete(k);
    throw new NotFoundException(lock ? 'Too many attempts. Please wait a minute and try again.' : 'We could not find a match. Check the reference and use the same phone number you gave us.');
  }
}

export { orderFromRow, requestFromRow };
