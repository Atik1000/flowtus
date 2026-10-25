import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Actor, FLOWS, Kind, OWNER_ONLY, confirmRecurrence, currentQuote, expectedAmount, paymentStatus, quoteTotals, recordCash, respondQuote,
  sendQuote, serviceCheck, setDelivery, transition, verifyPayment, log, dhakaNow, expireQuotes,
} from '@flowtus/core';
import { unwrap } from '../common/errors';
import { StoreService, Tx, Unit } from '../common/store.service';
import { UploadsService } from '../uploads/uploads.service';

const str = (v: unknown, max = 500) => String(v ?? '').slice(0, max);
const paramStr = (v: unknown) => str(v, 80);

type RefKind = 'order' | 'request';

@Injectable()
export class RecordsAdminService {
  constructor(private store: StoreService, private uploads: UploadsService) {}

  /* ---------- Lists ---------- */
  async listOrders(q: { status?: string; pay?: string; q?: string }) {
    const where: any = {};
    if (q.status) where.status = str(q.status, 40);
    if (q.q) {
      const s = str(q.q, 60);
      where.OR = [{ number: { contains: s.toUpperCase() } }, { customerPhone: { contains: s } }, { customer: { path: ['name'], string_contains: s } }];
    }
    const rows = await this.store.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
    let list = rows.map((o: any) => ({ number: o.number, name: o.customer.name, date: o.date, slotLabel: o.slotLabel, total: o.total, status: o.status, areaName: o.areaName, pay: paymentStatus(o), createdAt: o.createdAt.getTime() }));
    if (q.pay) list = list.filter((o) => o.pay === q.pay);
    return list;
  }

  async listRequests(q: { kind?: string; status?: string; q?: string }) {
    const where: any = {};
    if (q.kind) where.kind = str(q.kind, 20);
    if (q.status) where.status = str(q.status, 40);
    if (q.q) {
      const s = str(q.q, 60);
      where.OR = [{ ref: { contains: s.toUpperCase() } }, { customerPhone: { contains: s } }, { customer: { path: ['name'], string_contains: s } }];
    }
    const rows = await this.store.prisma.request.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 });
    return rows.map((r: any) => {
      const title = r.kind === 'custom' ? `${Number(r.data.qty).toLocaleString('en-US')} × ${r.data.itemName}` : r.kind === 'booking' ? r.serviceName : `${r.customer.company} · ${r.data.orderType}`;
      const q0 = (r.quotes || [])[r.quotes.length - 1];
      return { ref: r.ref, kind: r.kind, name: r.customer.name, date: r.kind === 'corporate' ? r.data.start : r.data.date, title, status: r.status, pay: q0 ? paymentStatus(r) : 'No quote yet', createdAt: r.createdAt.getTime() };
    });
  }

  /* ---------- Detail ---------- */
  async getOrder(number: string) {
    const row = await this.store.prisma.order.findUnique({ where: { number: paramStr(number) } });
    if (!row) throw new NotFoundException('This order does not exist or was removed.');
    const o: any = { ...row, createdAt: row.createdAt.getTime() };
    return { kind: 'order', rec: o, payStatus: paymentStatus(o), allowed: this.allowed('order', o.status), ownerOnly: OWNER_ONLY, expected: expectedAmount(o) };
  }

  async getRequest(ref: string) {
    return this.store.run(async (tx) => {
      const row = await tx.request.findUnique({ where: { ref: paramStr(ref) } });
      if (!row) throw new NotFoundException('This record does not exist or was removed.');
      const u = await this.store.unit(tx);
      let rec: any;
      if (row.kind === 'booking') {
        await u.loadBookings(row.serviceId!, [row.bookingDate, (row.reschedule as any)?.date]);
        rec = u.db.requests.find((r) => r.id === row.id);
      } else [rec] = await u.loadRequests({ id: row.id });
      const kind = rec.kind as Kind;
      let avail: any = null;
      if (kind === 'booking') {
        const svc = u.db.services.find((s) => s.id === rec.serviceId);
        const c = serviceCheck(u.db, svc, rec.data, { exceptId: rec.id });
        avail = c.error ? { ok: false, text: c.error } : { ok: true, text: 'Date, time and area look available. Pending requests do not hold capacity; capacity is rechecked when you confirm.', warn: c.warn };
      }
      const q = currentQuote(rec);
      const photo = rec.data?.photo?.id ? { name: rec.data.photo.name, url: this.uploads.signedUrl(rec.data.photo.id) } : null;
      return {
        kind, rec, payStatus: q ? paymentStatus(rec) : 'No quote yet', allowed: this.allowed(kind, rec.status), ownerOnly: OWNER_ONLY, avail, photo,
        totals: q ? quoteTotals(q) : null, expected: expectedAmount(rec), teams: u.db.teams, service: u.db.services.find((s) => s.id === rec.serviceId) ?? null,
      };
    });
  }

  private allowed(kind: Kind, status: string) {
    return (FLOWS[kind].T[status] || []).slice();
  }

  /* ---------- Mutations ---------- */
  /** Runs `fn` against one record inside a transaction, holding the record lock and (for bookings) the service-date locks. */
  private async mutate(refKind: RefKind, id: string, actor: Actor | null, fn: (u: Unit, rec: any, kind: Kind, tx: Tx) => Promise<any> | any) {
    return this.store.run(async (tx) => {
      const row: any = refKind === 'order' ? await tx.order.findUnique({ where: { number: paramStr(id) } }) : await tx.request.findUnique({ where: { ref: paramStr(id) } });
      if (!row) throw new NotFoundException('This record does not exist or was removed.');
      const lockKeys = [`rec:${row.id}`];
      if (refKind === 'request' && row.kind === 'booking') {
        for (const d of new Set([row.bookingDate, row.reschedule?.date].filter(Boolean))) lockKeys.push(`svc:${row.serviceId}:${d}`);
      }
      for (const k of lockKeys.sort()) await this.store.lock(tx, k); // fixed order prevents deadlocks
      const u = await this.store.unit(tx);
      let rec: any;
      if (refKind === 'order') [rec] = await u.loadOrders({ id: row.id });
      else if (row.kind === 'booking') {
        await u.loadBookings(row.serviceId, [row.bookingDate, row.reschedule?.date]);
        [rec] = await u.loadRequests({ id: row.id });
        rec = u.db.requests.find((r) => r.id === row.id);
      } else [rec] = await u.loadRequests({ id: row.id });
      const kind: Kind = refKind === 'order' ? 'order' : rec.kind;
      const out = await fn(u, rec, kind, tx);
      await u.commit();
      return out;
    });
  }

  transition(refKind: RefKind, id: string, actor: Actor, to: string, note?: string) {
    return this.mutate(refKind, id, actor, (u, rec, kind) => {
      unwrap(transition(u.db, kind, rec, str(to, 40), actor, str(note, 500) || undefined));
      return { status: rec.status };
    });
  }
  setRider(number: string, actor: Actor, rider: string) {
    return this.mutate('order', number, actor, (u, rec) => {
      rec.rider = str(rider, 80).trim();
      log(u.db, rec, rec.rider ? 'Rider assigned: ' + rec.rider : 'Rider cleared', actor);
      return { rider: rec.rider };
    });
  }
  setTeam(ref: string, actor: Actor, team: string) {
    return this.mutate('request', ref, actor, (u, rec) => {
      rec.team = str(team, 80);
      log(u.db, rec, rec.team ? 'Assigned to ' + rec.team : 'Assignment cleared', actor);
      return { team: rec.team };
    });
  }
  addNote(refKind: RefKind, id: string, actor: Actor, text: string) {
    const t = str(text, 1000).trim();
    if (!t) throw new BadRequestException('Write a note first.');
    return this.mutate(refKind, id, actor, (_u, rec) => {
      rec.notes = rec.notes || [];
      rec.notes.push({ at: Date.now(), text: t, by: actor.name });
      return { ok: true };
    });
  }
  postMessage(refKind: RefKind, id: string, actor: Actor, text: string) {
    const t = str(text, 1000).trim();
    if (!t) throw new BadRequestException('Write a message first.');
    return this.mutate(refKind, id, actor, (u, rec) => {
      log(u.db, rec, 'Message posted to customer', actor, t);
      return { ok: true };
    });
  }
  verifyPayment(refKind: RefKind, id: string, payId: string, actor: Actor, ok: boolean, reason?: string) {
    return this.mutate(refKind, id, actor, (u, rec) => {
      unwrap(verifyPayment(u.db, rec, paramStr(payId), actor, ok, str(reason, 300) || undefined));
      return { status: rec.status, pay: paymentStatus(rec) };
    });
  }
  recordCash(number: string, actor: Actor) {
    return this.mutate('order', number, actor, (u, rec) => {
      unwrap(recordCash(u.db, rec, actor));
      return { pay: paymentStatus(rec) };
    });
  }

  sendQuote(ref: string, actor: Actor, body: any) {
    const d = {
      items: (Array.isArray(body?.items) ? body.items : []).slice(0, 40).map((i: any) => ({ desc: str(i?.desc, 300), qty: i?.qty, amount: i?.amount })),
      charges: (Array.isArray(body?.charges) ? body.charges : []).slice(0, 20).map((c: any) => ({ desc: str(c?.desc, 300), amount: c?.amount })),
      depositPct: body?.depositPct,
      validUntil: str(body?.validUntil, 10),
      included: str(body?.included, 1500),
      excluded: str(body?.excluded, 1500),
      terms: str(body?.terms, 3000),
    };
    return this.mutate('request', ref, actor, (u, rec) => {
      unwrap(sendQuote(u.db, rec, d, actor));
      return { status: rec.status, quote: currentQuote(rec) };
    });
  }
  /** Owner records an approval or decline given by phone / WhatsApp. */
  recordApproval(ref: string, actor: Actor, accept: boolean, reason?: string) {
    return this.mutate('request', ref, actor, (u, rec) => {
      unwrap(respondQuote(u.db, rec, accept, actor, { reason: str(reason, 500) }));
      return { status: rec.status };
    });
  }
  confirmTerms(ref: string, actor: Actor, body: any) {
    const terms = { freq: str(body?.freq, 20), count: Number(body?.count), start: str(body?.start, 10) };
    return this.mutate('request', ref, actor, (u, rec) => {
      if (rec.kind !== 'corporate') throw new BadRequestException('Recurring terms apply only to business requests.');
      unwrap(confirmRecurrence(u.db, rec, terms, actor));
      return { status: rec.status, schedule: rec.schedule };
    });
  }
  setDeliveryStatus(ref: string, actor: Actor, id: string, status: string, note?: string) {
    if (!['Delivered', 'Partial', 'Missed', 'Skipped', 'Scheduled'].includes(status)) throw new BadRequestException('Unknown delivery status.');
    return this.mutate('request', ref, actor, (u, rec) => {
      unwrap(setDelivery(u.db, rec, paramStr(id), status, actor, str(note, 300) || undefined));
      return { schedule: rec.schedule };
    });
  }

  /** Marks stale pending quotes as expired. Safe to call often. */
  async expireStaleQuotes() {
    const today = dhakaNow().date;
    const cands = await this.store.prisma.request.findMany({ where: { status: { in: ['Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval'] } }, select: { id: true, quotes: true } });
    const stale = cands.filter((r: any) => {
      const q = r.quotes[r.quotes.length - 1];
      return q && q.approval === 'pending' && q.validUntil < today;
    });
    if (!stale.length) return 0;
    return this.store.run(async (tx) => {
      const u = await this.store.unit(tx);
      await u.loadRequests({ id: { in: stale.map((s) => s.id) } });
      const changed = expireQuotes(u.db);
      await u.commit();
      return changed.length;
    });
  }
}
