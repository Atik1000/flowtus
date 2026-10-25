/* State machines, payments, transitions and quotes. Every status change goes through transition(). */
import { addDays, dhakaNow, DhakaNow, fmt, fmtDate, rid } from './util';
import { serviceCheck, serviceLoad } from './availability';
import type { Actor, Db, Kind } from './types';

export const FLOWS: Record<Kind, { path: string[]; T: Record<string, string[]> }> = {
  order: {
    path: ['Pending Confirmation', 'Confirmed', 'Preparing', 'Ready for Dispatch', 'Out for Delivery', 'Delivered'],
    T: { 'Pending Confirmation': ['Confirmed', 'Cancelled'], Confirmed: ['Preparing', 'Cancelled'], Preparing: ['Ready for Dispatch', 'Cancelled'], 'Ready for Dispatch': ['Out for Delivery', 'Cancelled'], 'Out for Delivery': ['Delivered', 'Delivery Failed'], 'Delivery Failed': ['Out for Delivery', 'Cancelled'], Cancelled: ['Refund Pending'], 'Refund Pending': ['Refunded', 'Refund Rejected'], Delivered: [], Refunded: [], 'Refund Rejected': [] },
  },
  custom: {
    path: ['New Request', 'Checking Availability', 'Quote Sent', 'Awaiting Customer Approval', 'Approved', 'Payment/Deposit', 'Confirmed', 'Preparing', 'Delivered'],
    T: { 'New Request': ['Checking Availability', 'Unavailable', 'Declined', 'Cancelled'], 'Checking Availability': ['Unavailable', 'Declined', 'Cancelled'], 'Quote Sent': ['Awaiting Customer Approval', 'Approved', 'Quote Expired', 'Awaiting Revised Quote', 'Cancelled'], 'Awaiting Customer Approval': ['Approved', 'Quote Expired', 'Awaiting Revised Quote', 'Cancelled'], 'Awaiting Revised Quote': ['Cancelled'], 'Quote Expired': ['Cancelled'], Approved: ['Payment/Deposit', 'Confirmed', 'Cancelled'], 'Payment/Deposit': ['Confirmed', 'Cancelled'], Confirmed: ['Preparing', 'Cancelled'], Preparing: ['Delivered', 'Collected'], Cancelled: ['Refund Pending'], 'Refund Pending': ['Refunded'], Delivered: [], Collected: [], Unavailable: [], Declined: [], Refunded: [] },
  },
  booking: {
    path: ['New Request', 'Checking Availability', 'Quote Sent', 'Awaiting Customer Approval', 'Awaiting Deposit', 'Confirmed', 'Preparing', 'In Progress', 'Completed'],
    T: { 'New Request': ['Checking Availability', 'Unavailable', 'Declined', 'Cancelled'], 'Checking Availability': ['Unavailable', 'Declined', 'Cancelled'], 'Quote Sent': ['Awaiting Customer Approval', 'Awaiting Deposit', 'Confirmed', 'Quote Expired', 'Awaiting Revised Quote', 'Reschedule Requested', 'Cancelled'], 'Awaiting Customer Approval': ['Awaiting Deposit', 'Confirmed', 'Quote Expired', 'Awaiting Revised Quote', 'Reschedule Requested', 'Cancelled'], 'Awaiting Revised Quote': ['Cancelled'], 'Quote Expired': ['Cancelled'], 'Awaiting Deposit': ['Confirmed', 'Reschedule Requested', 'Cancelled'], Confirmed: ['Preparing', 'Reschedule Requested', 'Partner Issue', 'Cancelled'], 'Reschedule Requested': ['Rescheduled', 'Checking Availability', 'Cancelled'], Rescheduled: ['Preparing', 'Reschedule Requested', 'Cancelled'], Preparing: ['In Progress', 'Partner Issue', 'Cancelled'], 'In Progress': ['Completed', 'Partner Issue'], 'Partner Issue': ['Preparing', 'Cancelled'], Cancelled: ['Refund Pending'], 'Refund Pending': ['Refunded'], Completed: [], Unavailable: [], Declined: [], Refunded: [] },
  },
  corporate: {
    path: ['New Request', 'Reviewing', 'Proposal Sent', 'Approved', 'Active', 'Completed'],
    T: { 'New Request': ['Reviewing', 'Declined', 'Cancelled'], Reviewing: ['Declined', 'Cancelled'], 'Proposal Sent': ['Approved', 'Quote Expired', 'Awaiting Revised Quote', 'Cancelled'], 'Awaiting Revised Quote': ['Cancelled'], 'Quote Expired': ['Cancelled'], Approved: ['Active', 'Cancelled'], Active: ['Paused', 'Completed', 'Cancelled'], Paused: ['Active', 'Cancelled'], Cancelled: ['Refund Pending'], 'Refund Pending': ['Refunded'], Completed: [], Declined: [], Refunded: [] },
  },
};
export const QUOTE_STATUS: Record<string, string> = { custom: 'Quote Sent', booking: 'Quote Sent', corporate: 'Proposal Sent' };
export const OWNER_ONLY = ['Confirmed', 'Approved', 'Awaiting Deposit', 'Active', 'Refund Pending', 'Refunded', 'Refund Rejected'];

export const STATUS_BN: Record<string, string> = {
  'Pending Confirmation': 'নিশ্চিতকরণের অপেক্ষায়', Confirmed: 'নিশ্চিত', Preparing: 'প্রস্তুত হচ্ছে', 'Ready for Dispatch': 'পাঠানোর জন্য প্রস্তুত', 'Out for Delivery': 'ডেলিভারির পথে', Delivered: 'ডেলিভারি সম্পন্ন', 'Delivery Failed': 'ডেলিভারি করা যায়নি', Cancelled: 'বাতিল', 'Refund Pending': 'রিফান্ড প্রক্রিয়াধীন', Refunded: 'রিফান্ড সম্পন্ন', 'Refund Rejected': 'রিফান্ড প্রত্যাখ্যাত', 'New Request': 'নতুন অনুরোধ', 'Checking Availability': 'প্রাপ্যতা যাচাই চলছে', 'Quote Sent': 'কোটেশন পাঠানো হয়েছে', 'Awaiting Customer Approval': 'আপনার অনুমোদনের অপেক্ষায়', Approved: 'অনুমোদিত', 'Payment/Deposit': 'পেমেন্ট/অগ্রিম', 'Awaiting Deposit': 'অগ্রিমের অপেক্ষায়', 'In Progress': 'কাজ চলছে', Completed: 'সম্পন্ন', Collected: 'সংগ্রহ করা হয়েছে', Unavailable: 'পাওয়া যাচ্ছে না', Declined: 'প্রত্যাখ্যাত', 'Quote Expired': 'কোটেশনের মেয়াদ শেষ', 'Awaiting Revised Quote': 'সংশোধিত কোটেশনের অপেক্ষায়', 'Reschedule Requested': 'তারিখ পরিবর্তনের অনুরোধ', Rescheduled: 'নতুন তারিখ নির্ধারিত', 'Partner Issue': 'পার্টনার সমস্যা', Reviewing: 'পর্যালোচনা চলছে', 'Proposal Sent': 'প্রস্তাব পাঠানো হয়েছে', Active: 'চালু', Paused: 'সাময়িক বিরতি', Unpaid: 'অপরিশোধিত', 'Awaiting Verification': 'যাচাইয়ের অপেক্ষায়', Verified: 'যাচাইকৃত', Rejected: 'প্রত্যাখ্যাত', Paid: 'পরিশোধিত', 'Partially paid': 'আংশিক পরিশোধিত', 'Cash on delivery': 'ক্যাশ অন ডেলিভারি',
};

export const TONE = (s: string): { bg: string; fg: string } => {
  if (['Pending Confirmation', 'New Request', 'Checking Availability', 'Reviewing', 'Awaiting Verification', 'Awaiting Deposit', 'Payment/Deposit', 'Awaiting Customer Approval', 'Reschedule Requested', 'Awaiting Revised Quote', 'Refund Pending', 'Unpaid', 'Paused'].includes(s)) return { bg: '#F6ECD9', fg: '#6B4A20' };
  if (['Confirmed', 'Preparing', 'Ready for Dispatch', 'Approved', 'Rescheduled', 'In Progress', 'Active', 'Verified', 'Paid', 'Partially paid'].includes(s)) return { bg: '#E6EADF', fg: '#3F4A37' };
  if (['Out for Delivery', 'Quote Sent', 'Proposal Sent'].includes(s)) return { bg: '#F1E1E6', fg: '#7A3550' };
  if (['Delivered', 'Completed', 'Collected'].includes(s)) return { bg: '#5F6E52', fg: '#FFFFFF' };
  if (['Partner Issue', 'Delivery Failed', 'Rejected', 'Quote Expired'].includes(s)) return { bg: '#F6E3E3', fg: '#7A1F2E' };
  return { bg: '#EFE6DD', fg: '#5A4550' };
};

/** Appends to history, optional customer-visible message, and (when an actor acts) the audit log. */
export function log(db: Db, rec: any, text: string, actor?: Actor | null, visible?: string | null): void {
  const at = Date.now();
  rec.history = rec.history || [];
  rec.history.push({ at, text, by: actor ? actor.name : 'Customer' });
  if (visible) {
    rec.messages = rec.messages || [];
    rec.messages.push({ at, text: visible, from: 'FLOWTUS' });
  }
  if (actor) db.audit.unshift({ at, by: actor.name + ' (' + actor.role + ')', ref: rec.number || rec.ref, action: text });
}

/* ---------- Payments ---------- */
export const paidSum = (rec: any): number => (rec.payments || []).filter((p: any) => p.status === 'Verified').reduce((s: number, p: any) => s + p.amount, 0);
export const currentQuote = (req: any): any => (req.quotes && req.quotes.length ? req.quotes[req.quotes.length - 1] : null);
export const quoteTotals = (q: any) => {
  const items = q.items.reduce((s: number, i: any) => s + (+i.qty || 0) * (+i.amount || 0), 0);
  const charges = (q.charges || []).reduce((s: number, c: any) => s + (+c.amount || 0), 0);
  const total = items + charges;
  const deposit = Math.round((total * (+q.depositPct || 0)) / 100);
  return { items, charges, total, deposit, balance: total - deposit };
};
export function expectedAmount(rec: any): number | null {
  if (rec.number) return rec.total - paidSum(rec);
  const q = currentQuote(rec);
  if (!q || q.approval !== 'approved') return null;
  const t = quoteTotals(q);
  const paid = paidSum(rec);
  return paid < t.deposit ? t.deposit - paid : t.total - paid;
}
export function paymentStatus(rec: any): string {
  const ps = rec.payments || [];
  if (ps.some((p: any) => p.status === 'Refunded')) return 'Refunded';
  if (ps.some((p: any) => p.status === 'Refund Pending')) return 'Refund Pending';
  const paid = paidSum(rec);
  const due = rec.number ? rec.total : currentQuote(rec) && currentQuote(rec).approval === 'approved' ? quoteTotals(currentQuote(rec)).total : null;
  if (due != null && paid >= due && paid > 0) return 'Paid';
  if (ps.some((p: any) => p.status === 'Awaiting Verification')) return 'Awaiting Verification';
  if (paid > 0) return 'Partially paid';
  if (rec.paymentMethod === 'cod') return 'Cash on delivery';
  return 'Unpaid';
}

export interface Result {
  ok?: boolean;
  error?: string;
  field?: string;
  [k: string]: any;
}

/* [server] Customer submits a manual MFS transaction reference. Never marks anything paid. */
export function submitPayment(db: Db, rec: any, f: { method: string; txn?: string; amount?: any }): Result {
  if (['Cancelled', 'Refunded', 'Declined', 'Unavailable', 'Refund Pending'].includes(rec.status))
    return { error: 'This ' + (rec.number ? 'order' : 'request') + ' is ' + rec.status.toLowerCase() + '. Please do not send money. If you already paid, contact us with your transaction ID.' };
  const method = f.method;
  if (!['bkash', 'nagad'].includes(method) || !(db.settings.pay as any)[method].enabled) return { error: 'Choose an available payment method.' };
  const txn = String(f.txn || '').trim().toUpperCase();
  if (!txn) return { error: 'Enter the transaction ID from your ' + (method === 'bkash' ? 'bKash' : 'Nagad') + ' confirmation message.', field: 'txn' };
  if (!/^[A-Z0-9]{8,12}$/.test(txn)) return { error: 'Transaction IDs are 8–12 letters and numbers.', field: 'txn' };
  const all = db.orders.concat(db.requests).flatMap((r) => (r.payments || []).map((p: any) => ({ owner: r.number || r.ref, ...p })));
  const dup = all.find((p) => p.txn === txn && p.method === method && p.status !== 'Rejected');
  if (dup) return { error: 'This transaction ID has already been submitted' + (dup.owner === (rec.number || rec.ref) ? ' for this ' + (rec.number ? 'order' : 'request') : '') + '.', field: 'txn' };
  const amount = +String(f.amount || '').replace(/[, ৳]/g, '');
  if (!amount || amount <= 0 || !isFinite(amount)) return { error: 'Enter the amount you sent.', field: 'amount' };
  const expected = expectedAmount(rec);
  if (expected == null) return { error: 'There is nothing to pay yet. Approve your quote first.' };
  if ((rec.payments || []).some((p: any) => p.status === 'Awaiting Verification' && p.method === method && p.amount === amount)) return { error: 'You already submitted a payment of this amount. It is waiting for verification.' };
  const pay = { id: rid(8), method, txn, amount, expected, mismatch: amount !== expected, status: 'Awaiting Verification', at: Date.now() };
  rec.payments = rec.payments || [];
  rec.payments.push(pay);
  log(db, rec, 'Payment reference ' + txn + ' submitted (' + fmt(amount) + (pay.mismatch ? ', expected ' + fmt(expected) : '') + ')');
  return { ok: true, pay };
}
export function verifyPayment(db: Db, rec: any, payId: string, actor: Actor, ok: boolean, reason?: string): Result {
  if (actor.role !== 'owner') return { error: 'Only the owner can verify or reject payments.' };
  const p = (rec.payments || []).find((x: any) => x.id === payId);
  if (!p) return { error: 'Payment not found.' };
  if (p.status !== 'Awaiting Verification') return { error: 'This payment is already ' + p.status.toLowerCase() + '.' };
  p.status = ok ? 'Verified' : 'Rejected';
  p.reason = reason || '';
  p.by = actor.name;
  p.byAt = Date.now();
  log(db, rec, 'Payment ' + p.txn + ' ' + p.status.toLowerCase() + (reason ? ': ' + reason : ''), actor, ok ? 'We received your payment of ' + fmt(p.amount) + '.' : 'We could not verify transaction ' + p.txn + (reason ? ' (' + reason + ')' : '') + '. Please check it and submit again, or contact us.');
  if (ok && rec.kind === 'custom' && rec.status === 'Approved') rec.status = 'Payment/Deposit';
  return { ok: true };
}
export function recordCash(db: Db, rec: any, actor: Actor): Result {
  if (actor.role !== 'owner') return { error: 'Only the owner can record payments.' };
  const due = rec.total - paidSum(rec);
  if (due <= 0) return { error: 'Nothing is due.' };
  rec.payments = rec.payments || [];
  rec.payments.push({ id: rid(8), method: 'cod', txn: 'CASH', amount: due, expected: due, status: 'Verified', at: Date.now(), by: actor.name });
  log(db, rec, 'Cash received ' + fmt(due), actor);
  return { ok: true };
}
export function refund(db: Db, rec: any, actor: Actor, done: boolean): Result {
  if (actor.role !== 'owner') return { error: 'Only the owner can issue refunds.' };
  const ps = (rec.payments || []).filter((p: any) => p.status === (done ? 'Refund Pending' : 'Verified'));
  if (!ps.length) return { error: done ? 'No refund is pending.' : 'There is no verified payment to refund.' };
  ps.forEach((p: any) => (p.status = done ? 'Refunded' : 'Refund Pending'));
  return { ok: true };
}

/* ---------- Transitions ---------- */
export function guard(db: Db, kind: Kind, rec: any, to: string, actor: Actor): string | null {
  const fl = FLOWS[kind];
  if (!(fl.T[rec.status] || []).includes(to)) return 'Not allowed: ' + rec.status + ' → ' + to + '.';
  if (OWNER_ONLY.includes(to) && actor.role !== 'owner') return 'Only the owner can move to ' + to + '.';
  const q = kind !== 'order' && currentQuote(rec);
  if (['Approved', 'Awaiting Deposit'].includes(to) || (to === 'Confirmed' && kind !== 'order') || to === 'Active') {
    if (!q) return 'Send a quote first.';
    if (q.approval !== 'approved') return 'The customer has not approved quote R' + q.rev + ' yet. Record their approval first.';
  }
  if (to === 'Confirmed' && kind !== 'order') {
    const t = quoteTotals(q);
    if (t.deposit > 0 && paidSum(rec) < t.deposit) return 'Deposit of ' + fmt(t.deposit) + ' not verified yet (verified: ' + fmt(paidSum(rec)) + ').';
    if (kind === 'booking') {
      const svc = db.services.find((s) => s.id === rec.serviceId);
      if (svc && svc.capacity && serviceLoad(db, svc.id, rec.data.date, rec.id) >= svc.capacity) return 'No capacity left on ' + rec.data.date + '. Another booking already holds this slot.';
      if (svc && svc.partner && !svc.partnerAvailable) return 'Partner has not confirmed availability.';
    }
  }
  if (to === 'Rescheduled') {
    if (!rec.reschedule || !rec.reschedule.date) return 'No new date requested.';
    const svc = db.services.find((s) => s.id === rec.serviceId);
    const c = serviceCheck(db, svc, { ...rec.data, date: rec.reschedule.date, time: rec.reschedule.time || rec.data.time }, { exceptId: rec.id });
    if (c.error) return 'New date not available: ' + c.error;
  }
  if (to === 'Refund Pending' && paidSum(rec) <= 0) return 'There is no verified payment to refund.';
  if (to === 'Out for Delivery' && kind === 'order' && !rec.rider) return 'Assign a rider first.';
  return null;
}

const CUSTOMER_MSG: Record<string, (r: any, n?: string) => string> = {
  Confirmed: (r) => (r.number ? 'Your order is confirmed.' : 'Your booking is confirmed for ' + fmtDate(r.data.date) + '.'),
  'Out for Delivery': () => 'Your order is on its way.',
  Delivered: () => 'Your order was delivered.',
  Unavailable: (r, n) => 'We are sorry, we cannot fulfil this request' + (n ? ': ' + n : '.') + ' Contact us and we will suggest an alternative.',
  Declined: (r, n) => 'We are unable to take this request' + (n ? ': ' + n : '.') + ' Contact us if you would like to discuss alternatives.',
  Cancelled: (r, n) => 'This ' + (r.number ? 'order' : 'request') + ' has been cancelled' + (n ? ': ' + n : '.') + (paidSum(r) > 0 ? ' Your payment will be reviewed for a refund under our cancellation policy.' : ''),
  Rescheduled: (r) => 'Your booking has moved to ' + fmtDate(r.data.date) + '.',
  'Partner Issue': () => 'There is an issue with our partner team for your booking. We will contact you shortly.',
  'Refund Pending': () => 'Your refund is being processed.',
  Refunded: () => 'Your refund has been completed.',
  Paused: () => 'Your recurring deliveries are paused.',
  Active: () => 'Your recurring deliveries are active.',
};

/* [server] Single entry point for every status change. */
export function transition(db: Db, kind: Kind, rec: any, to: string, actor: Actor, note?: string): Result {
  const g = guard(db, kind, rec, to, actor);
  if (g) return { error: g };
  const from = rec.status;
  rec.status = to;
  if (to === 'Rescheduled') {
    rec.data.date = rec.reschedule.date;
    if (rec.reschedule.time) rec.data.time = rec.reschedule.time;
    rec.reschedule.done = true;
  }
  if (to === 'Checking Availability' && from === 'Reschedule Requested') {
    rec.data.date = rec.reschedule.date;
    if (rec.reschedule.time) rec.data.time = rec.reschedule.time;
    const q = currentQuote(rec);
    if (q && q.approval !== 'superseded') q.approval = 'superseded';
  }
  if (to === 'Refund Pending') refund(db, rec, actor, false);
  if (to === 'Refunded') refund(db, rec, actor, true);
  if (to === 'Paused' && rec.schedule) rec.schedule.forEach((d: any) => { if (d.status === 'Scheduled') d.status = 'Paused'; });
  if (to === 'Active' && from === 'Paused' && rec.schedule) rec.schedule.forEach((d: any) => { if (d.status === 'Paused' && d.date >= dhakaNow().date) d.status = 'Scheduled'; });
  if (to === 'Cancelled' && rec.schedule) rec.schedule.forEach((d: any) => { if (['Scheduled', 'Paused'].includes(d.status)) d.status = 'Cancelled'; });
  if (to === 'Cancelled') rec.cancelReason = note || 'Cancelled by FLOWTUS';
  const vis = CUSTOMER_MSG[to] ? CUSTOMER_MSG[to](rec, note) : null;
  log(db, rec, from + ' → ' + to + (note ? ' · ' + note : ''), actor, vis);
  return { ok: true };
}

/* ---------- Quotes ---------- */
export function sendQuote(db: Db, req: any, d: any, actor: Actor, o: { now?: DhakaNow } = {}): Result {
  const now = o.now || dhakaNow();
  if (actor.role !== 'owner') return { error: 'Only the owner can send quotes.' };
  const allowedFrom = ['New Request', 'Checking Availability', 'Reviewing', 'Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval', 'Awaiting Revised Quote', 'Quote Expired'];
  if (!allowedFrom.includes(req.status)) return { error: 'A quote cannot be sent while the request is ' + req.status + '.' };
  const items = (d.items || []).filter((i: any) => String(i.desc || '').trim());
  if (!items.length) return { error: 'Add at least one quote line.' };
  if (items.some((i: any) => !(+i.qty > 0) || !(+i.amount >= 0) || String(i.amount).trim() === '')) return { error: 'Every line needs a quantity above 0 and a price.' };
  if (!d.validUntil || d.validUntil < now.date) return { error: 'Set a valid-until date from today onwards.' };
  const pct = +d.depositPct;
  if (isNaN(pct) || pct < 0 || pct > 100) return { error: 'Deposit must be 0–100%.' };
  (req.quotes || []).forEach((q: any) => { if (q.approval === 'pending') q.approval = 'superseded'; });
  const rev = (req.quotes || []).length + 1;
  const q = {
    ref: 'Q-' + req.ref.slice(3) + '-R' + rev,
    rev,
    items: items.map((i: any) => ({ desc: i.desc, qty: +i.qty, amount: +i.amount })),
    charges: (d.charges || []).filter((c: any) => String(c.desc || '').trim()).map((c: any) => ({ desc: c.desc, amount: +c.amount || 0 })),
    included: d.included || '',
    excluded: d.excluded || '',
    depositPct: pct,
    validUntil: d.validUntil,
    terms: d.terms || '',
    at: Date.now(),
    by: actor.name,
    approval: 'pending',
  };
  req.quotes = req.quotes || [];
  req.quotes.push(q);
  const from = req.status;
  req.status = QUOTE_STATUS[req.kind];
  log(db, req, from + ' → ' + req.status + ' · quote R' + rev + ' ' + fmt(quoteTotals(q).total), actor, rev > 1 ? 'We revised your quote (revision ' + rev + '). Please review and approve it again.' : 'Your quote is ready. Please review and approve it.');
  return { ok: true, quote: q };
}
/** Marks stale pending quotes as expired. Returns the records that changed. */
export function expireQuotes(db: Db, now?: DhakaNow): any[] {
  now = now || dhakaNow();
  const changed: any[] = [];
  db.requests.forEach((r) => {
    const q = currentQuote(r);
    if (q && q.approval === 'pending' && q.validUntil < now!.date && ['Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval'].includes(r.status)) {
      q.approval = 'expired';
      const f = r.status;
      r.status = 'Quote Expired';
      log(db, r, f + ' → Quote Expired (automatic)', null, 'Your quote expired on ' + fmtDate(q.validUntil) + '. Contact us for a new quote.');
      changed.push(r);
    }
  });
  return changed;
}
/* Customer or admin records approval/decline of the CURRENT quote. */
export function respondQuote(db: Db, req: any, accept: boolean, by?: Actor | null, o: { now?: DhakaNow; reason?: string } = {}): Result {
  const now = o.now || dhakaNow();
  const q = currentQuote(req);
  if (!q) return { error: 'No quote to respond to.' };
  if (q.approval === 'expired' || q.validUntil < now.date) return { error: 'This quote has expired. Ask us for a new quote.' };
  if (q.approval !== 'pending') return { error: 'This quote is ' + q.approval + '.' };
  if (by && by.role && by.role !== 'owner') return { error: 'Only the owner can record approval on behalf of a customer.' };
  if (accept) {
    q.approval = 'approved';
    q.approvedAt = Date.now();
    q.approvedVia = by ? 'Recorded by ' + by.name : 'Customer (website)';
    const t = quoteTotals(q);
    const from = req.status;
    if (req.kind === 'custom') req.status = 'Approved';
    else if (req.kind === 'booking') req.status = t.deposit > 0 ? 'Awaiting Deposit' : 'Awaiting Customer Approval';
    else req.status = 'Approved';
    log(db, req, from + ' → ' + req.status + ' · quote R' + q.rev + ' approved (' + q.approvedVia + ')', by && by.role ? by : null);
  } else {
    q.approval = 'declined';
    const from = req.status;
    req.status = 'Awaiting Revised Quote';
    log(db, req, from + ' → Awaiting Revised Quote · customer asked for changes' + (o.reason ? ': ' + o.reason : ''), by && by.role ? by : null);
  }
  return { ok: true };
}

/* Recurring schedule is created only after the owner confirms terms. */
export function confirmRecurrence(db: Db, req: any, terms: any, actor: Actor, o: { now?: DhakaNow } = {}): Result {
  const now = o.now || dhakaNow();
  if (actor.role !== 'owner') return { error: 'Only the owner can confirm recurring terms.' };
  const q = currentQuote(req);
  if (!q || q.approval !== 'approved') return { error: 'The customer must approve the proposal first.' };
  const step = ({ Weekly: 7, Fortnightly: 14, Monthly: 28 } as Record<string, number>)[terms.freq];
  if (!step) return { error: 'Choose a frequency.' };
  const count = +terms.count;
  if (!Number.isInteger(count) || count < 1 || count > 52) return { error: 'Number of deliveries must be 1–52.' };
  if (!terms.start || terms.start < now.date) return { error: 'Start date must be today or later.' };
  const per = quoteTotals(q).total;
  req.schedule = Array.from({ length: count }, (_, i) => {
    const date = addDays(terms.start, i * step);
    const bl = db.blocks.find((b) => b.date === date && (b.scope === 'all' || b.scope === 'delivery'));
    return { id: rid(6), date, status: bl ? 'Needs new date' : 'Scheduled', note: bl ? 'Blocked: ' + (bl.reason || 'unavailable') : '', price: per };
  });
  req.terms = { ...terms, perDelivery: per, confirmedAt: Date.now(), by: actor.name };
  const r = transition(db, 'corporate', req, 'Active', actor, 'Recurring terms confirmed: ' + count + ' × ' + String(terms.freq).toLowerCase());
  return r.error ? r : { ok: true };
}
export function setDelivery(db: Db, req: any, id: string, status: string, actor: Actor, note?: string): Result {
  const d = (req.schedule || []).find((x: any) => x.id === id);
  if (!d) return { error: 'Delivery not found.' };
  if (['Delivered', 'Cancelled'].includes(d.status)) return { error: 'This delivery is already ' + d.status.toLowerCase() + '.' };
  d.status = status;
  if (note) d.note = note;
  log(db, req, 'Delivery ' + d.date + ' → ' + status + (note ? ' · ' + note : ''), actor, status === 'Missed' ? 'We missed your delivery on ' + fmtDate(d.date) + '. We will contact you to arrange a replacement.' : null);
  return { ok: true };
}

