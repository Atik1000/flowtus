/* Availability engine. Pending requests never hold capacity. */
import { daysBetween, dhakaNow, DhakaNow } from './util';
import type { Db, Service } from './types';

export const blocksOn = (db: Db, date: string, scope: string) => db.blocks.filter((b) => b.date === date && (b.scope === 'all' || b.scope === scope));
export const ACTIVE_ORDER = (s: string): boolean => !['Cancelled', 'Refund Pending', 'Refunded', 'Refund Rejected'].includes(s);

export interface SlotOpts {
  now?: DhakaNow;
  leadDays?: number;
  exceptId?: string;
}
/* [server] Delivery window check. Returns null when OK, otherwise the reason (shown to the customer verbatim). */
export function slotCheck(db: Db, date: string | undefined, slotId: string | undefined, o: SlotOpts = {}): string | null {
  const now = o.now || dhakaNow();
  const d = db.delivery;
  const s = d.slots.find((x) => x.id === slotId);
  if (!date) return 'Choose a delivery date.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Enter a valid date.';
  if (date < now.date) return 'This date is in the past.';
  if (daysBetween(now.date, date) > d.maxDaysAhead) return 'We take delivery orders up to ' + d.maxDaysAhead + ' days ahead.';
  if (o.leadDays && daysBetween(now.date, date) < o.leadDays) return 'An item in your cart needs ' + o.leadDays + ' day' + (o.leadDays > 1 ? 's' : '') + '’ notice.';
  const bl = blocksOn(db, date, 'delivery').find((b) => !b.slot || b.slot === 'all' || b.slot === slotId);
  if (bl) return 'Not available on this date' + (bl.reason ? ' (' + bl.reason + ')' : '') + '.';
  if (!slotId) return 'Choose a delivery window.';
  if (!s || !s.enabled) return 'This window is not offered.';
  if (date === now.date) {
    if (!d.sameDay) return 'Same-day delivery is not available.';
    if (now.hour >= d.cutoffHour) return 'Same-day orders close at ' + d.cutoffHour + ':00.';
    if (s.start - now.hour < d.leadHours) return 'Too soon. This window needs ' + d.leadHours + ' hours’ notice.';
  }
  const used = db.orders.filter((x) => x.date === date && x.slotId === slotId && ACTIVE_ORDER(x.status) && x.id !== o.exceptId).length;
  if (used >= s.cap) return 'This window is fully booked.';
  return null;
}

export const HOLDS_CAPACITY = ['Confirmed', 'Preparing', 'In Progress', 'Rescheduled'];
export function serviceLoad(db: Db, svcId: string, date: string, exceptId?: string): number {
  return db.requests.filter((r) => r.kind === 'booking' && r.serviceId === svcId && r.data.date === date && HOLDS_CAPACITY.includes(r.status) && r.id !== exceptId).length;
}

export interface ServiceCheck {
  error: string | null;
  field?: string;
  warn?: string[];
}
/* [server] Service availability. Returns {error, warn}. Pending requests never consume capacity. */
export function serviceCheck(db: Db, svc: Service | undefined, f: Record<string, any>, o: SlotOpts = {}): ServiceCheck {
  const now = o.now || dhakaNow();
  if (!svc) return { error: 'This service does not exist.' };
  if (!svc.active) return { error: 'This service is not taking bookings right now.' };
  const date = f.date;
  if (!date) return { error: 'Choose the event date.', field: 'date' };
  if (date < now.date) return { error: 'This date is in the past.', field: 'date' };
  const gap = daysBetween(now.date, date);
  if (gap < svc.leadDays) return { error: 'This service needs at least ' + svc.leadDays + ' days’ notice. For urgent requests, contact us directly.', field: 'date' };
  if (gap > svc.maxDays) return { error: 'We take bookings up to ' + svc.maxDays + ' days ahead.', field: 'date' };
  const bl = blocksOn(db, date, svc.id)[0];
  if (bl) return { error: 'This date is not available' + (bl.reason ? ' (' + bl.reason + ')' : '') + '.', field: 'date' };
  if (f.time) {
    const h = +String(f.time).split(':')[0] + (+String(f.time).split(':')[1] || 0) / 60;
    if (h < svc.hours[0] || h + svc.durationHrs > svc.hours[1])
      return { error: 'Setup must start between ' + svc.hours[0] + ':00 and ' + (svc.hours[1] - svc.durationHrs) + ':00 (it takes about ' + svc.durationHrs + ' hours).', field: 'time' };
  }
  if (svc.fields.includes('area') && f.area) {
    if (f.area === 'outside' || !svc.coverage.includes(f.area)) return { error: 'This area is outside the coverage for this service.', field: 'area' };
  }
  if (svc.capacity && serviceLoad(db, svc.id, date, o.exceptId) >= svc.capacity) return { error: 'This date is fully booked for this service. Choose another date.', field: 'date' };
  const warn: string[] = [];
  if (svc.partner && !svc.partnerAvailable) warn.push('Our partner team has not confirmed availability for new dates. Your request will stay pending until they do.');
  if (f.indoor === 'Outdoor') warn.push('Outdoor setups depend on weather. We will agree a fallback plan in your quote.');
  if (gap <= svc.leadDays + 1) warn.push('This is close to the minimum notice. Some flowers may need substitution.');
  return { error: null, warn };
}
