/* Creating orders & requests, validation, cancellation and reschedule. [server] functions re-price and re-check everything. */
import { daysBetween, dhakaNow, DhakaNow, fmt, isWhole, normPhone, refCode, rid, token, validEmail } from './util';
import { unitLabel } from './seed';
import { customEstimate, priceCart, PricedCart } from './pricing';
import { blocksOn, serviceCheck, slotCheck } from './availability';
import { log, paidSum, Result } from './workflow';
import type { Db, Service } from './types';

interface CreateOpts {
  now?: DhakaNow;
  idem?: string;
  snapPrice?: number | null;
  allowDuplicate?: boolean;
  expectTotal?: number | null;
}

function demoFail(db: Db): boolean {
  if (db.demo && db.demo.failNext) {
    db.demo.failNext = false;
    return true;
  }
  return false;
}

/* ---------- Custom flower orders ---------- */
export function validateCustom(db: Db, f: any, o: { now?: DhakaNow } = {}): Record<string, string> {
  const now = o.now || dhakaNow();
  const e: Record<string, string> = {};
  const item = db.custom.find((c) => c.id === f.item);
  if (!item) e.item = 'Choose a flower or product.';
  else if (!item.available) e.item = item.name + ' is not available right now.';
  const q = String(f.qty == null ? '' : f.qty).trim();
  if (!q) e.qty = 'Enter a quantity.';
  else if (!/^-?\d+(\.\d+)?$/.test(q)) e.qty = 'Enter a number.';
  else if (!isWhole(q)) e.qty = +q <= 0 ? 'Quantity must be more than 0.' : 'Enter a whole number.';
  else if (+q === 0) e.qty = 'Quantity must be more than 0.';
  else if (item) {
    if (+q < item.min) e.qty = 'Minimum order is ' + item.min + ' ' + unitLabel(item.unit, item.min) + '.';
    else if (+q > item.max) e.qty = 'For more than ' + item.max.toLocaleString('en-US') + ' ' + unitLabel(item.unit, 2) + ', contact us directly so we can check supply.';
    else if (item.multiple > 1 && +q % item.multiple) e.qty = 'Sold in bundles of ' + item.multiple + '. Try ' + (Math.floor(+q / item.multiple) * item.multiple || item.multiple) + ' or ' + Math.ceil(+q / item.multiple) * item.multiple + '.';
  }
  const lead = item ? item.leadDays : 1;
  if (!f.date) e.date = 'Choose the date you need it.';
  else if (f.date < now.date) e.date = 'This date is in the past.';
  else if (daysBetween(now.date, f.date) < lead) e.date = 'Custom orders need at least ' + lead + ' day' + (lead > 1 ? 's' : '') + '’ notice.';
  else if (daysBetween(now.date, f.date) > db.delivery.customMaxDays) e.date = 'We take custom orders up to ' + db.delivery.customMaxDays + ' days ahead.';
  else {
    const bl = blocksOn(db, f.date, 'custom')[0];
    if (bl) e.date = 'We cannot take orders for this date' + (bl.reason ? ' (' + bl.reason + ')' : '') + '.';
  }
  if (String(f.notes || '').length > 1000) e.notes = 'Keep notes under 1,000 characters.';
  if (!String(f.name || '').trim() || String(f.name).trim().length < 2) e.name = 'Enter your name.';
  if (!normPhone(f.phone)) e.phone = 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.';
  if (f.photo && f.photo.error) e.photo = f.photo.error;
  return e;
}

const photoRef = (p: any) => (p && !p.error ? { id: p.id, name: p.name, size: p.size } : null);

export function createCustom(db: Db, f: any, o: CreateOpts = {}): Result {
  const now = o.now || dhakaNow();
  if (o.idem && db.idem[o.idem]) return { ok: true, rec: db.requests.find((r) => r.ref === db.idem[o.idem!]), duplicate: true };
  const e = validateCustom(db, f, o);
  if (Object.keys(e).length) return { errors: e };
  const item = db.custom.find((c) => c.id === f.item)!;
  if (o.snapPrice !== undefined && o.snapPrice !== item.unitPrice) return { priceChanged: { from: o.snapPrice, to: item.unitPrice } };
  if (demoFail(db)) return { network: true };
  const est = customEstimate(item, f.qty);
  const rec = {
    id: rid(10),
    kind: 'custom',
    ref: refCode('CR', now),
    token: token(),
    createdAt: Date.now(),
    status: 'New Request',
    data: { item: item.id, itemName: item.name, bn: item.bn, type: item.type, unit: item.unit, qty: +f.qty, unitPrice: item.unitPrice, priceMode: item.priceMode, estimate: est.value, date: f.date, colours: f.colours || '', notes: f.notes || '', photo: photoRef(f.photo) },
    customer: { name: String(f.name).trim(), phone: normPhone(f.phone) },
    quotes: [],
    payments: [],
    history: [],
    messages: [],
    notes: [],
  };
  log(db, rec, 'Request submitted');
  db.requests.unshift(rec);
  if (o.idem) db.idem[o.idem] = rec.ref;
  return { ok: true, rec };
}

/* ---------- Service bookings ---------- */
export function serviceFieldsOk(db: Db, svc: Service, f: any, o: { now?: DhakaNow } = {}): Record<string, string> {
  const e: Record<string, string> = {};
  const req = svc.req || [];
  req.forEach((k) => {
    const v = f[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) e[k] = 'Required.';
  });
  if (f.phone && !normPhone(f.phone)) e.phone = 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.';
  if (f.name && String(f.name).trim().length < 2) e.name = 'Enter your name.';
  ['trays', 'qty', 'tables'].forEach((k) => {
    if (svc.fields.includes(k) && f[k] !== '' && f[k] != null && (!isWhole(f[k]) || +f[k] < 1 || +f[k] > 100)) e[k] = 'Enter a whole number from 1 to 100.';
  });
  if (f.address && String(f.address).trim().length < 8) e.address = 'Add the full address: house, road, block and area.';
  if (svc.fields.includes('address') && !req.includes('address') && f.handover === 'Deliver to my address' && !String(f.address || '').trim()) e.address = 'Add the delivery address.';
  if (svc.fields.includes('area') && !req.includes('area') && f.handover === 'Deliver to my address' && !f.area) e.area = 'Choose the delivery area.';
  if (f.carSupplied === 'FLOWTUS arranges the car') e.carSupplied = 'We do not arrange cars yet. We decorate a car you provide.';
  if (f.photo && f.photo.error) e.photo = f.photo.error;
  if (String(f.notes || '').length > 1000) e.notes = 'Keep notes under 1,000 characters.';
  if (!e.date && !e.time && !e.area) {
    const c = serviceCheck(db, svc, f, o);
    if (c.error) e[c.field || 'date'] = c.error;
  }
  return e;
}
export function serviceEstimate(svc: Service, f: any): { value: number | null; label?: string; custom?: boolean; from?: boolean } {
  if (svc.priceModel === 'package') {
    const p = svc.packages.find((x) => x.id === f.package);
    return p ? { value: p.price, label: p.name } : { value: null, custom: f.package === 'custom' };
  }
  if (svc.priceModel === 'from' && svc.perUnit) {
    const n = +f[svc.perUnit === 'tray' ? 'trays' : 'tables'];
    if (f.dalaScope && /contents/.test(f.dalaScope)) return { value: null, from: true };
    return isWhole(n) && n > 0 ? { value: (svc.fromPrice || 0) * n, from: true } : { value: null, from: true };
  }
  if (svc.fromPrice) return { value: svc.fromPrice, from: true };
  return { value: null };
}
export function createBooking(db: Db, svcId: string, f: any, o: CreateOpts = {}): Result {
  const now = o.now || dhakaNow();
  const svc = db.services.find((s) => s.id === svcId);
  if (o.idem && db.idem[o.idem]) return { ok: true, rec: db.requests.find((r) => r.ref === db.idem[o.idem!]), duplicate: true };
  if (!svc || !svc.active) return { error: 'This service is not taking bookings right now.' };
  const e = serviceFieldsOk(db, svc, f, o);
  if (Object.keys(e).length) return { errors: e };
  const phone = normPhone(f.phone);
  const dup = db.requests.find((r) => r.kind === 'booking' && r.serviceId === svcId && r.data.date === f.date && r.customer.phone === phone && !['Cancelled', 'Declined', 'Unavailable', 'Refunded'].includes(r.status));
  if (dup && !o.allowDuplicate) return { duplicateOf: dup };
  if (demoFail(db)) return { network: true };
  const data: Record<string, any> = {};
  svc.fields.forEach((k) => {
    if (!['name', 'phone'].includes(k)) data[k] = f[k] == null ? '' : f[k];
  });
  if (data.photo) data.photo = photoRef(data.photo);
  const est = serviceEstimate(svc, f);
  const pk = svc.packages.find((p) => p.id === f.package);
  const rec = {
    id: rid(10),
    kind: 'booking',
    ref: refCode('BK', now),
    token: token(),
    createdAt: Date.now(),
    status: 'New Request',
    serviceId: svc.id,
    serviceName: svc.name[0],
    data,
    snapshot: { priceModel: svc.priceModel, package: pk ? { name: pk.name, price: pk.price, includes: pk.includes } : null, estimate: est.value, depositPct: svc.depositPct, partner: svc.partner },
    customer: { name: String(f.name).trim(), phone },
    quotes: [],
    payments: [],
    history: [],
    messages: [],
    notes: [],
    team: '',
  };
  log(db, rec, 'Booking request submitted');
  db.requests.unshift(rec);
  if (o.idem) db.idem[o.idem] = rec.ref;
  return { ok: true, rec };
}

/* ---------- Corporate ---------- */
export function validateCorporate(db: Db, f: any, o: { now?: DhakaNow } = {}): Record<string, string> {
  const now = o.now || dhakaNow();
  const e: Record<string, string> = {};
  if (!String(f.company || '').trim()) e.company = 'Enter the business name.';
  if (!String(f.name || '').trim()) e.name = 'Enter a contact name.';
  if (!normPhone(f.phone)) e.phone = 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.';
  if (f.email && !validEmail(f.email)) e.email = 'Enter a valid email address.';
  if (!f.orderType) e.orderType = 'Choose what you need.';
  if (!f.mode) e.mode = 'Choose one-time or recurring.';
  if (!String(f.qty || '').trim()) e.qty = 'Describe quantities, e.g. 3 reception arrangements.';
  if (!f.start) e.start = f.mode === 'Recurring' ? 'Choose the first delivery date.' : 'Choose the date.';
  else if (f.start < now.date) e.start = 'This date is in the past.';
  else if (daysBetween(now.date, f.start) < 2) e.start = 'Business orders need at least 2 days’ notice.';
  if (f.mode === 'Recurring') {
    if (!f.freq) e.freq = 'Choose how often.';
    if (!f.duration) e.duration = 'Choose a duration.';
  }
  if (!f.area) e.area = 'Choose the delivery area.';
  else if (f.area === 'outside') e.area = 'This area is outside our delivery coverage. Contact us to discuss.';
  if (!String(f.address || '').trim()) e.address = 'Enter the business address.';
  return e;
}
export function createCorporate(db: Db, f: any, o: CreateOpts = {}): Result {
  const now = o.now || dhakaNow();
  if (o.idem && db.idem[o.idem]) return { ok: true, rec: db.requests.find((r) => r.ref === db.idem[o.idem!]), duplicate: true };
  const e = validateCorporate(db, f, o);
  if (Object.keys(e).length) return { errors: e };
  if (demoFail(db)) return { network: true };
  const data = { ...f };
  delete data.name;
  delete data.phone;
  const rec = {
    id: rid(10),
    kind: 'corporate',
    ref: refCode('CO', now),
    token: token(),
    createdAt: Date.now(),
    status: 'New Request',
    data,
    customer: { name: String(f.name).trim(), phone: normPhone(f.phone), email: f.email || '', company: f.company },
    quotes: [],
    payments: [],
    history: [],
    messages: [],
    notes: [],
    schedule: null,
  };
  log(db, rec, 'Business request submitted');
  db.requests.unshift(rec);
  if (o.idem) db.idem[o.idem] = rec.ref;
  return { ok: true, rec };
}

/* ---------- Checkout ---------- */
export function validateCheckout(db: Db, f: any, cartP: { leadDays: number }, o: { now?: DhakaNow } = {}): Record<string, string> {
  const e: Record<string, string> = {};
  if (!String(f.name || '').trim()) e.name = 'Enter your name.';
  if (!normPhone(f.phone)) e.phone = 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.';
  if (f.email && !validEmail(f.email)) e.email = 'Enter a valid email address.';
  if (f.forOther) {
    if (!String(f.rname || '').trim()) e.rname = 'Enter the recipient’s name.';
    if (f.rphone && !normPhone(f.rphone)) e.rphone = 'Enter a valid Bangladeshi mobile number.';
  }
  const area = db.areas.find((a) => a.id === f.area);
  if (!f.area) e.area = 'Choose a delivery area.';
  else if (f.area === 'outside' || !area || !area.delivery) e.area = 'This area is outside our current delivery area.';
  if (!String(f.address || '').trim()) e.address = 'Enter the delivery address.';
  else if (String(f.address).trim().length < 8) e.address = 'Add house, road and block so the rider can find it.';
  const sc = slotCheck(db, f.date, f.slot, { ...o, leadDays: cartP.leadDays });
  if (sc) {
    if (!f.date || /date|past|ahead|notice|blocked|Not available/i.test(sc)) e.date = sc;
    else e.slot = sc;
  }
  const pm = (db.settings.pay as any)[f.pay];
  if (!f.pay) e.pay = 'Choose a payment method.';
  else if (!pm || !pm.enabled) e.pay = 'This payment method is not available.';
  if (String(f.giftMessage || '').length > 200) e.giftMessage = 'Keep the message under 200 characters.';
  return e;
}
/* [server] Places an order. Re-prices everything, rechecks the slot, enforces idempotency. */
export function placeOrder(db: Db, cart: any[], f: any, o: CreateOpts = {}): Result {
  const now = o.now || dhakaNow();
  if (o.idem && db.idem[o.idem]) return { ok: true, order: db.orders.find((x) => x.number === db.idem[o.idem!]), duplicate: true };
  if (!cart.length) return { error: 'Your cart is empty.' };
  const cp: PricedCart = priceCart(db, cart, f.area);
  if (cp.blocking) return { error: 'Some items in your cart need attention.', cart: true };
  const e = validateCheckout(db, f, cp, o);
  if (Object.keys(e).length) return { errors: e };
  if (o.expectTotal != null && o.expectTotal !== cp.total) return { totalChanged: { from: o.expectTotal, to: cp.total } };
  if (demoFail(db)) return { network: true };
  const area = db.areas.find((a) => a.id === f.area)!;
  const slot = db.delivery.slots.find((s) => s.id === f.slot)!;
  const order = {
    id: rid(10),
    number: refCode('FLW', now),
    token: token(),
    createdAt: Date.now(),
    status: 'Pending Confirmation',
    paymentMethod: f.pay,
    customer: { name: f.name.trim(), phone: normPhone(f.phone), email: f.email || '' },
    recipient: f.forOther ? { name: f.rname, phone: normPhone(f.rphone) || '' } : null,
    address: f.address,
    landmark: f.landmark || '',
    areaId: area.id,
    areaName: area.name[0],
    date: f.date,
    slotId: slot.id,
    slotLabel: slot.label,
    giftMessage: f.giftMessage || '',
    deliveryNotes: f.notes || '',
    items: cp.lines.map((l) => ({ productId: l.productId, kind: l.kind || 'product', name: l.pr.p!.name, variant: l.pr.v!.name, basePrice: l.pr.v!.price, unitPrice: l.pr.unit, qty: +l.qty, lineTotal: l.pr.total, cardMessage: l.message || '', recipient: l.recipient || '', parts: l.pr.parts })),
    subtotal: cp.subtotal,
    fee: cp.fee,
    total: cp.total,
    payments: [],
    rider: '',
    history: [],
    messages: [],
    notes: [],
  };
  log(db, order, 'Order placed');
  db.orders.unshift(order);
  if (o.idem) db.idem[o.idem] = order.number;
  return { ok: true, order };
}

export function customerCancel(db: Db, rec: any, reason?: string): Result {
  const kind = rec.number ? 'order' : rec.kind;
  const early = kind === 'order' ? ['Pending Confirmation'] : ['New Request', 'Checking Availability', 'Reviewing', 'Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval', 'Awaiting Revised Quote', 'Quote Expired', 'Awaiting Deposit', 'Approved', 'Payment/Deposit', 'Reschedule Requested'];
  if (!early.includes(rec.status)) return { error: 'This can no longer be cancelled online. Please contact us.' };
  const from = rec.status;
  rec.status = 'Cancelled';
  rec.cancelReason = 'Cancelled by customer' + (reason ? ': ' + reason : '');
  (rec.payments || []).forEach((p: any) => {
    if (p.status === 'Awaiting Verification') {
      p.status = 'Rejected';
      p.reason = 'Cancelled before verification';
    }
  });
  log(db, rec, from + ' → Cancelled · by customer' + (reason ? ': ' + reason : ''), null, paidSum(rec) > 0 ? 'Cancelled. Your verified payment of ' + fmt(paidSum(rec)) + ' will be reviewed for a refund under the cancellation policy.' : 'Cancelled at your request.');
  return { ok: true };
}
export function requestReschedule(db: Db, rec: any, date: string, time?: string, o: { now?: DhakaNow } = {}): Result {
  if (!['Quote Sent', 'Awaiting Customer Approval', 'Awaiting Deposit', 'Confirmed', 'Rescheduled'].includes(rec.status)) return { error: 'Rescheduling is not available at this stage. Contact us.' };
  const svc = db.services.find((s) => s.id === rec.serviceId);
  const c = serviceCheck(db, svc, { ...rec.data, date, time: time || rec.data.time }, { exceptId: rec.id, ...o });
  if (c.error) return { error: c.error };
  rec.reschedule = { date, time: time || '', from: rec.data.date, wasConfirmed: ['Confirmed', 'Rescheduled'].includes(rec.status) };
  const from = rec.status;
  rec.status = 'Reschedule Requested';
  log(db, rec, from + ' → Reschedule Requested · new date ' + date);
  return { ok: true };
}
export function findByRef(db: Db, ref: string, phone: string): { type: 'order' | 'request'; token: string } | null {
  const r = String(ref || '').trim().toUpperCase();
  const ph = normPhone(phone);
  if (!r || !ph) return null;
  const o = db.orders.find((x) => x.number === r && x.customer.phone === ph);
  if (o) return { type: 'order', token: o.token };
  const q = db.requests.find((x) => x.ref === r && x.customer.phone === ph);
  if (q) return { type: 'request', token: q.token };
  return null;
}

