import { BadRequestException, Body, Controller, Get, Header, Post } from '@nestjs/common';
import { priceCart, serviceCheck, slotCheck } from '@flowtus/core';
import { StoreService } from '../common/store.service';
import { publicCatalogue } from './views';
import { sanitizeCart } from '../records/sanitize';

@Controller()
export class CatalogueController {
  constructor(private store: StoreService) {}

  @Get('health')
  health() {
    return { ok: true };
  }

  @Get('catalogue')
  @Header('Cache-Control', 'public, max-age=5, stale-while-revalidate=30')
  async catalogue() {
    return publicCatalogue(await this.store.catalogue());
  }

  /** Why each delivery window is or is not available on a date (shown to the customer verbatim). */
  @Post('availability/slots')
  async slots(@Body() body: { date?: string; leadDays?: number }) {
    const date = String(body?.date || '');
    const db = await this.store.catalogue();
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) db.orders = (await this.store.prisma.order.findMany({ where: { date } })).map((o: any) => ({ id: o.id, date: o.date, slotId: o.slotId, status: o.status }));
    const leadDays = Math.max(0, Math.min(30, Number(body?.leadDays) || 0));
    return db.delivery.slots.filter((s) => s.enabled).map((s) => ({ id: s.id, label: s.label, reason: slotCheck(db, date, s.id, { leadDays }) }));
  }

  @Post('availability/service')
  async service(@Body() body: { serviceId?: string; fields?: Record<string, any> }) {
    const db = await this.store.catalogue();
    const svc = db.services.find((s) => s.id === body?.serviceId);
    if (!svc) throw new BadRequestException('This service does not exist.');
    const f = body.fields || {};
    const date = String(f.date || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      db.requests = (await this.store.prisma.request.findMany({ where: { kind: 'booking', serviceId: svc.id, bookingDate: date }, select: { id: true, kind: true, serviceId: true, status: true, data: true } })).map((r: any) => ({ id: r.id, kind: r.kind, serviceId: r.serviceId, status: r.status, data: r.data }));
    }
    return serviceCheck(db, svc, { date, time: f.time, area: f.area, indoor: f.indoor });
  }

  /** Re-prices a cart from live catalogue data. */
  @Post('cart/price')
  async price(@Body() body: { cart?: unknown; area?: string }) {
    const db = await this.store.catalogue();
    const cp = priceCart(db, sanitizeCart(body?.cart), body?.area);
    return { subtotal: cp.subtotal, fee: cp.fee, total: cp.total, blocking: cp.blocking, leadDays: cp.leadDays, lines: cp.lines.map((l) => ({ key: l.key, unit: l.pr.unit, total: l.pr.total, issues: l.pr.issues, parts: l.pr.parts })) };
  }
}
