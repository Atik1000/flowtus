/* Live test suite: runs the real business rules against fresh seed data (admin › Test report).
   Tests that need infrastructure which does not exist inside a pure function are reported as "n/a", never as passed. */
import { addDays, dhakaNow, rid } from './util';
import { seed } from './seed';
import { configKey, customEstimate, findP, priceCart, priceLine } from './pricing';
import { serviceCheck, slotCheck } from './availability';
import { checkUpload, normPhone } from './util';
import { confirmRecurrence, currentQuote, expectedAmount, expireQuotes, paymentStatus, quoteTotals, respondQuote, sendQuote, submitPayment, transition, verifyPayment } from './workflow';
import { createBooking, createCorporate, createCustom, customerCancel, placeOrder, requestReschedule, validateCheckout, validateCustom } from './requests';

export interface TestResult {
  group: string;
  name: string;
  status: 'pass' | 'fail' | 'n/a';
  detail: string;
}

export function runTests(): TestResult[] {
  const out: TestResult[] = [];
  const now = dhakaNow();
  const D = (n: number) => addDays(now.date, n);
  const owner = { name: 'Owner', role: 'owner' as const };
  const staff = { name: 'Staff', role: 'staff' as const };
  const T = (group: string, name: string, fn: () => any) => {
    try {
      const r = fn();
      out.push({ group, name, status: r === true ? 'pass' : r === 'na' ? 'n/a' : 'fail', detail: r === true ? '' : r === 'na' ? 'Needs a real backend' : String(r) });
    } catch (err: any) {
      out.push({ group, name, status: 'fail', detail: 'Threw: ' + err.message });
    }
  };
  const fresh = () => seed(now);
  const line = (pid: string, vid: string, qty?: any, extra?: any) => ({ key: rid(6), productId: pid, variantId: vid, qty: qty == null ? 1 : qty, addons: [], ...(extra || {}) });
  const goodCheckout = (_db?: any) => ({ name: 'Test Customer', phone: '01711000000', area: 'gulshan-1', address: 'House 1, Road 2, Gulshan 1', date: D(2), slot: 'morning', pay: 'cod' });
  const C = 'Catalogue & cart', CU = 'Custom flowers', G = 'Gift builder', SB = 'Service bookings', PY = 'Payments & checkout', AD = 'Administration';

  T(C, 'Product unavailable blocks cart', () => priceLine(fresh(), line('seasonal-tulips', '10')).issues[0].code === 'unavailable' || 'not flagged');
  T(C, 'Variant unavailable while others remain', () => { const db = fresh(); const a = priceLine(db, line('classic-red-roses', '50')), b = priceLine(db, line('classic-red-roses', '12')); return (a.issues[0].code === 'variant-unavailable' && !b.blocking) || 'wrong'; });
  T(C, 'Price change after adding requires review', () => { const db = fresh(); const l = line('blush-garden', 'std', 1, { snapUnit: 1890 }); findP(db, 'blush-garden')!.variants[0].price = 1990; const r = priceLine(db, l); return (r.issues[0].code === 'price-changed' && r.issues[0].to === 1990) || 'no flag'; });
  T(C, 'Quantity above limit blocked', () => priceLine(fresh(), line('grand-bloom', 'sig', 4)).issues.some((i) => i.code === 'qty-limit') || 'not blocked');
  T(C, 'Fractional / zero quantity rejected', () => { const db = fresh(); return (priceLine(db, line('ivory-grace', 'std', 1.5)).blocking && priceLine(db, line('ivory-grace', 'std', 0)).blocking) || 'accepted'; });
  T(C, 'Archived product flagged in cart', () => { const db = fresh(); findP(db, 'pink-promise')!.archived = true; return priceLine(db, line('pink-promise', '12')).issues[0].code === 'archived' || 'no'; });
  T(C, 'Removed product flagged in cart', () => priceLine(fresh(), line('does-not-exist', 'x')).issues[0].code === 'missing' || 'no');
  T(C, 'Product without price cannot be bought', () => priceLine(fresh(), line('orchid-pot', 'std')).issues[0].code === 'no-price' || 'priced');
  T(C, 'Same product, different customisation → separate lines', () => configKey(line('classic-red-roses', '12', 1, { message: 'A' })) !== configKey(line('classic-red-roses', '12', 1, { message: 'B' })) || 'merged');
  T(C, 'Same configuration → same key (merge qty)', () => configKey(line('classic-red-roses', '12', 1, { addons: [{ id: 'card', qty: 1 }] })) === configKey(line('classic-red-roses', '12', 2, { addons: [{ id: 'card', qty: 1 }] })) || 'not merged');
  T(C, 'Add-on priced per item', () => { const db = fresh(); const r = priceLine(db, line('classic-red-roses', '12', 2, { addons: [{ id: 'card', qty: 1 }, { id: 'teddy', qty: 1 }] })); return (r.unit === 1490 + 150 + 650 && r.total === 2 * 2290) || 'got ' + r.total; });
  T(C, 'Checkout blocked for invalid cart', () => { const db = fresh(); const r = placeOrder(db, [line('seasonal-tulips', '10')], goodCheckout(db), { now }); return (r.cart === true && db.orders.length === 0) || 'order created'; });
  T(C, 'Empty cart cannot check out', () => placeOrder(fresh(), [], goodCheckout(), { now }).error === 'Your cart is empty.' || 'no');
  T(C, 'Mixed availability: lead-time item blocks same-day', () => { const db = fresh(); const cp = priceCart(db, [line('ivory-grace', 'std'), line('grand-bloom', 'sig')], 'gulshan-1'); return /notice/.test(slotCheck(db, now.date, 'evening', { now, leadDays: cp.leadDays }) || '') || 'allowed'; });
  T(C, 'Cart restored after refresh', () => 'na');

  const cust = (extra: any) => ({ date: D(3), name: 'Ana', phone: '01711000000', ...extra });
  T(CU, '120 roses × ৳30 demo = ৳3,600', () => customEstimate(fresh().custom.find((c) => c.id === 'red-rose'), 120).value === 3600 || 'wrong');
  T(CU, '500 marigolds × ৳3 demo = ৳1,500 (seasonal note)', () => { const e = customEstimate(fresh().custom.find((c) => c.id === 'marigold'), 500); return (e.value === 1500 && e.confirm) || JSON.stringify(e); });
  T(CU, '20 marigold garlands priced per garland', () => { const it = fresh().custom.find((c) => c.id === 'marigold-garland')!; return (it.unit === 'garland' && customEstimate(it, 20).value === 2400) || 'wrong'; });
  T(CU, 'Manual-quote item shows Price on request', () => customEstimate(fresh().custom.find((c) => c.id === 'custom-bouquet'), 3).onRequest === true || 'priced');
  T(CU, 'No price configured → never ৳0', () => { const e = customEstimate(fresh().custom.find((c) => c.id === 'beli-chain'), 10); return (e.value === null && e.onRequest) || 'showed a price'; });
  T(CU, 'Unavailable flower rejected', () => !!validateCustom(fresh(), cust({ item: 'gladiolus', qty: 20 }), { now }).item || 'accepted');
  T(CU, 'Invalid quantities rejected (0, −5, 2.5, abc)', () => { const db = fresh(); const bad = [0, -5, '2.5', 'abc'].filter((q) => !validateCustom(db, cust({ item: 'red-rose', qty: q }), { now }).qty); return !bad.length || 'accepted ' + bad.join(','); });
  T(CU, 'Below minimum order rejected', () => /Minimum/.test(validateCustom(fresh(), cust({ item: 'marigold', qty: 20 }), { now }).qty || '') || 'accepted');
  T(CU, 'Above maximum order rejected', () => !!validateCustom(fresh(), cust({ item: 'red-rose', qty: 5000 }), { now }).qty || 'accepted');
  T(CU, 'Bundle multiple enforced (tuberose × 25)', () => /bundles of 10/.test(validateCustom(fresh(), cust({ item: 'tuberose', qty: 25 }), { now }).qty || '') || 'accepted');
  T(CU, 'Price change before submission is caught', () => { const db = fresh(); db.custom[0].unitPrice = 35; const r = createCustom(db, cust({ item: 'red-rose', qty: 120 }), { now, snapPrice: 30 }); return (r.priceChanged && r.priceChanged.to === 35 && !db.requests.length) || 'not caught'; });
  T(CU, 'Duplicate submission returns same request', () => { const db = fresh(); const f = cust({ item: 'red-rose', qty: 120 }); const a = createCustom(db, f, { now, idem: 'k1' }), b = createCustom(db, f, { now, idem: 'k1' }); return (a.rec.ref === b.rec.ref && db.requests.length === 1) || 'duplicated'; });
  T(CU, 'Network/save failure keeps nothing, allows retry', () => { const db = fresh(); db.demo.failNext = true; const f = cust({ item: 'red-rose', qty: 50 }); const a = createCustom(db, f, { now, idem: 'k2' }), b = createCustom(db, f, { now, idem: 'k2' }); return (a.network && b.ok && db.requests.length === 1) || 'wrong'; });
  T(CU, 'Photo upload: wrong type / too large rejected', () => (checkUpload({ type: 'application/pdf', size: 100 }) && checkUpload({ type: 'image/jpeg', size: 9e6 }) && !checkUpload({ type: 'image/png', size: 2e5 })) || 'wrong');
  T(CU, 'Submission creates a request, not an order', () => { const db = fresh(); const r = createCustom(db, cust({ item: 'red-rose', qty: 120 }), { now }); return (r.rec.status === 'New Request' && db.orders.length === 0 && /^CR-/.test(r.rec.ref)) || 'wrong'; });

  const gift = (extra?: any) => ({ key: rid(5), kind: 'gift' as const, productId: 'blush-garden', variantId: 'std', wrapId: 'premium-wrap', extras: [{ id: 'chocolate-box', qty: 1 }, { id: 'card', qty: 1 }], qty: 1, message: 'Happy birthday', ...(extra || {}) });
  T(G, 'Gift total = flowers + wrap + extras', () => { const r = priceLine(fresh(), gift()); return r.total === 1890 + 250 + 1850 + 150 || 'got ' + r.total; });
  T(G, 'Signature wrap is included (৳0)', () => priceLine(fresh(), gift({ wrapId: 'signature', extras: [] })).total === 1890 || 'wrong');
  T(G, 'Removing extras updates total', () => priceLine(fresh(), gift({ extras: [] })).total === 1890 + 250 || 'wrong');
  T(G, 'Extra quantity limit enforced', () => priceLine(fresh(), gift({ extras: [{ id: 'card', qty: 5 }] })).issues.some((i) => i.code === 'qty-limit') || 'allowed');
  T(G, 'Disabled wrap blocks the gift', () => priceLine(fresh(), gift({ wrapId: 'kraft-wrap' })).issues[0].code === 'unavailable' || 'allowed');
  T(G, 'Flower becomes unavailable → flagged', () => { const db = fresh(); findP(db, 'blush-garden')!.available = false; return priceLine(db, gift()).blocking || 'allowed'; });
  T(G, 'Extra becomes unavailable → flagged', () => { const db = fresh(); findP(db, 'chocolate-box')!.available = false; return priceLine(db, gift()).blocking || 'allowed'; });
  T(G, 'Two different gift configs stay separate', () => configKey(gift()) !== configKey(gift({ message: 'Different' })) || 'merged');
  T(G, 'Message preserved in order snapshot', () => { const db = fresh(); const r = placeOrder(db, [gift()], goodCheckout(db), { now }); return r.order.items[0].cardMessage === 'Happy birthday' || 'lost'; });
  T(G, 'Gift price change detected at checkout', () => { const db = fresh(); const g = gift({ snapUnit: 4140 }); findP(db, 'card')!.variants[0].price = 200; return priceLine(db, g).issues[0].code === 'price-changed' || 'not detected'; });

  const carF = (d?: number) => ({ date: D(d || 5), time: '10:00', package: 'classic', carType: 'Sedan', carModel: 'Toyota Allion', carSupplied: 'I will provide the car', area: 'banani', address: 'House 10, Road 11, Banani', name: 'Rafi', phone: '01811000000' });
  const holudF = (phone: string) => ({ date: D(9), time: '10:00', venueType: 'Home', indoor: 'Indoor', scope: 'Stage', area: 'banani', address: 'House 10, Road 11, Banani', name: 'Rafi', phone });
  T(SB, 'Available date and slot accepted', () => createBooking(fresh(), 'car-decoration', carF(), { now }).ok || 'rejected');
  T(SB, 'Blocked date rejected', () => !!createBooking(fresh(), 'car-decoration', carF(6), { now }).errors || 'accepted');
  T(SB, 'Insufficient lead time rejected', () => /notice/.test((createBooking(fresh(), 'car-decoration', carF(1), { now }).errors || {}).date || '') || 'accepted');
  T(SB, 'Time outside operating hours rejected', () => !!(createBooking(fresh(), 'car-decoration', { ...carF(), time: '22:00' }, { now }).errors || {}).time || 'accepted');
  T(SB, 'Unsupported service area rejected (installation ≠ delivery)', () => { const db = fresh(); const a = createBooking(db, 'bashor-ghor', { date: D(5), time: '10:00', package: 'classic', roomType: 'Bedroom', area: 'banani', address: 'House 10, Road 11, Banani', name: 'Rafi', phone: '01811000000' }, { now }); const b = serviceCheck(db, db.services[0], { date: D(5), area: 'baridhara' }, { now }); return (!!(a.errors || {}).area && !b.error) || 'wrong'; });
  T(SB, 'Incomplete form rejected', () => { const e = createBooking(fresh(), 'car-decoration', { date: D(5) }, { now }).errors; return (e && !!e.carModel && !!e.address && !!e.phone) || 'accepted'; });
  T(SB, 'Disabled service rejects bookings', () => !!createBooking(fresh(), 'photo-corner', {}, { now }).error || 'accepted');
  T(SB, 'Duplicate booking request detected', () => { const db = fresh(); createBooking(db, 'car-decoration', carF(), { now }); return !!createBooking(db, 'car-decoration', carF(), { now }).duplicateOf || 'not detected'; });
  const toConfirmable = (db: any, rec: any) => {
    sendQuote(db, rec, { items: [{ desc: 'Classic', qty: 1, amount: 4500 }], depositPct: 30, validUntil: D(3) }, owner, { now });
    respondQuote(db, rec, true, null, { now });
    const t = quoteTotals(currentQuote(rec));
    submitPayment(db, rec, { method: 'bkash', txn: 'TX' + rid(8), amount: t.deposit });
    verifyPayment(db, rec, rec.payments[rec.payments.length - 1].id, owner, true);
  };
  T(SB, 'Pending requests do not consume capacity', () => { const db = fresh(); createBooking(db, 'holud-decoration', holudF('01811000000'), { now }); return !serviceCheck(db, db.services.find((s) => s.id === 'holud-decoration'), { date: D(9) }, { now }).error || 'pending consumed capacity'; });
  T(SB, 'Concurrent requests: only one can be confirmed for an exclusive slot', () => { const db = fresh(); const a = createBooking(db, 'holud-decoration', holudF('01811000001'), { now }).rec, b = createBooking(db, 'holud-decoration', holudF('01811000002'), { now }).rec; toConfirmable(db, a); toConfirmable(db, b); const r1 = transition(db, 'booking', a, 'Confirmed', owner), r2 = transition(db, 'booking', b, 'Confirmed', owner); return (r1.ok && /capacity/.test(r2.error || '')) || JSON.stringify([r1, r2]); });
  T(SB, 'Deposit not paid → cannot confirm', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; sendQuote(db, r, { items: [{ desc: 'Classic', qty: 1, amount: 4500 }], depositPct: 30, validUntil: D(3) }, owner, { now }); respondQuote(db, r, true, null, { now }); return /Deposit/.test(transition(db, 'booking', r, 'Confirmed', owner).error || '') || 'confirmed'; });
  T(SB, 'Deposit verified → booking confirmed', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; toConfirmable(db, r); return (transition(db, 'booking', r, 'Confirmed', owner).ok && r.status === 'Confirmed') || r.status; });
  T(SB, 'Quote revised → previous superseded, re-approval needed', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; sendQuote(db, r, { items: [{ desc: 'A', qty: 1, amount: 4500 }], depositPct: 30, validUntil: D(3) }, owner, { now }); sendQuote(db, r, { items: [{ desc: 'A', qty: 1, amount: 5000 }], depositPct: 30, validUntil: D(3) }, owner, { now }); return (r.quotes[0].approval === 'superseded' && r.quotes[1].approval === 'pending' && r.quotes[1].rev === 2) || 'wrong'; });
  T(SB, 'Expired quote cannot be approved', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; sendQuote(db, r, { items: [{ desc: 'A', qty: 1, amount: 4500 }], depositPct: 30, validUntil: now.date }, owner, { now }); const later = { date: D(1), hour: 10, minute: 0 }; expireQuotes(db, later); return (r.status === 'Quote Expired' && !!respondQuote(db, r, true, null, { now: later }).error) || r.status; });
  T(SB, 'Customer reschedule → owner applies with availability recheck', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; toConfirmable(db, r); transition(db, 'booking', r, 'Confirmed', owner); const a = requestReschedule(db, r, D(8), '11:00', { now }); const b = transition(db, 'booking', r, 'Rescheduled', owner); return (a.ok && b.ok && r.data.date === D(8)) || JSON.stringify([a, b]); });
  T(SB, 'Reschedule to blocked date refused', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; toConfirmable(db, r); transition(db, 'booking', r, 'Confirmed', owner); return !!requestReschedule(db, r, D(6), '', { now }).error || 'allowed'; });
  T(SB, 'Customer cancels before confirmation', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; return (customerCancel(db, r).ok && r.status === 'Cancelled') || 'no'; });
  T(SB, 'Cancelled booking releases capacity', () => { const db = fresh(); const svc = db.services.find((s) => s.id === 'holud-decoration')!; const r = createBooking(db, 'holud-decoration', holudF('01811000001'), { now }).rec; toConfirmable(db, r); transition(db, 'booking', r, 'Confirmed', owner); const full = !!serviceCheck(db, svc, { date: D(9) }, { now }).error; transition(db, 'booking', r, 'Cancelled', owner, 'test'); return (full && !serviceCheck(db, svc, { date: D(9) }, { now }).error) || 'not released'; });
  T(SB, 'Partner unavailable blocks confirmation', () => { const db = fresh(); const svc = db.services.find((s) => s.id === 'stage-entrance')!; svc.partnerAvailable = false; const r = createBooking(db, 'stage-entrance', { date: D(12), time: '09:00', venueType: 'Hotel / banquet', indoor: 'Indoor', dims: '20x10 ft', scope: 'Stage', area: 'banani', address: 'Hotel X, Road 11, Banani', name: 'Rafi', phone: '01811000003' }, { now }).rec; toConfirmable(db, r); return /Partner/.test(transition(db, 'booking', r, 'Confirmed', owner).error || '') || 'confirmed'; });
  T(SB, 'Booking completed through valid path', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; toConfirmable(db, r); ['Confirmed', 'Preparing', 'In Progress', 'Completed'].forEach((s) => transition(db, 'booking', r, s, owner)); return r.status === 'Completed' || r.status; });
  T(SB, 'Refund after cancellation with verified deposit', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; toConfirmable(db, r); transition(db, 'booking', r, 'Confirmed', owner); transition(db, 'booking', r, 'Cancelled', owner, 'Customer request'); const a = transition(db, 'booking', r, 'Refund Pending', owner), b = transition(db, 'booking', r, 'Refunded', owner); return (a.ok && b.ok && paymentStatus(r) === 'Refunded') || paymentStatus(r); });

  T(PY, 'Invalid phone numbers rejected', () => (['0171234567', '02123456789', '01212345678', 'abc'].every((p) => !normPhone(p)) && ['+8801711000000', '01711-000000', '8801911000000'].every((p) => normPhone(p))) || 'wrong');
  T(PY, 'Missing address rejected', () => !!placeOrder(fresh(), [line('ivory-grace', 'std')], { ...goodCheckout(), address: '' }, { now }).errors!.address || 'accepted');
  T(PY, 'Past / too-far / blocked dates rejected', () => { const db = fresh(); return [D(-1), D(40), D(6)].every((d) => slotCheck(db, d, 'morning', { now })) || 'accepted'; });
  T(PY, 'Disabled delivery area rejected', () => !!validateCheckout(fresh(), { ...goodCheckout(), area: 'baridhara' }, { leadDays: 0 }, { now }).area || 'accepted');
  T(PY, 'Same-day cutoff enforced', () => /close/.test(slotCheck(fresh(), now.date, 'evening', { now: { date: now.date, hour: 16, minute: 0 } }) || '') || 'allowed');
  T(PY, 'Full delivery window rejected', () => { const db = fresh(); db.delivery.slots[0].cap = 1; placeOrder(db, [line('ivory-grace', 'std')], goodCheckout(), { now }); return /fully booked/.test(slotCheck(db, D(2), 'morning', { now }) || '') || 'allowed'; });
  T(PY, 'Duplicate order submission → one order', () => { const db = fresh(); const c = [line('ivory-grace', 'std')]; placeOrder(db, c, goodCheckout(), { now, idem: 'o1' }); placeOrder(db, c, goodCheckout(), { now, idem: 'o1' }); return db.orders.length === 1 || db.orders.length; });
  T(PY, 'Network error → no order, retry succeeds', () => { const db = fresh(); db.demo.failNext = true; const c = [line('ivory-grace', 'std')]; const a = placeOrder(db, c, goodCheckout(), { now, idem: 'o2' }), b = placeOrder(db, c, goodCheckout(), { now, idem: 'o2' }); return (a.network && b.ok && db.orders.length === 1) || 'wrong'; });
  T(PY, 'Disabled payment method rejected', () => { const db = fresh(); db.settings.pay.nagad.enabled = false; return !!placeOrder(db, [line('ivory-grace', 'std')], { ...goodCheckout(), pay: 'nagad' }, { now }).errors!.pay || 'accepted'; });
  T(PY, 'Total changed since review → must re-confirm', () => { const db = fresh(); const r = placeOrder(db, [line('ivory-grace', 'std')], goodCheckout(), { now, expectTotal: 1000 }); return (r.totalChanged && !db.orders.length) || 'placed'; });
  T(PY, 'Server re-prices instead of trusting client', () => { const r = placeOrder(fresh(), [line('ivory-grace', 'std', 1, { unitPrice: 1 })], goodCheckout(), { now }); return r.order.total === 1690 + 100 || r.order.total; });
  const paidOrder = () => { const db = fresh(); const o = placeOrder(db, [line('ivory-grace', 'std')], { ...goodCheckout(), pay: 'bkash' }, { now }).order; return { db, o }; };
  T(PY, 'Missing transaction reference rejected', () => { const { db, o } = paidOrder(); return submitPayment(db, o, { method: 'bkash', txn: '', amount: o.total }).field === 'txn' || 'accepted'; });
  T(PY, 'Duplicate transaction reference rejected', () => { const { db, o } = paidOrder(); submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ9', amount: o.total }); return /already/.test(submitPayment(db, o, { method: 'bkash', txn: 'abc123xyz9', amount: o.total }).error || '') || 'accepted'; });
  T(PY, 'Amount mismatch flagged for owner', () => { const { db, o } = paidOrder(); return submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ8', amount: 500 }).pay.mismatch === true || 'not flagged'; });
  T(PY, 'Submitted reference stays pending (never auto-verified)', () => { const { db, o } = paidOrder(); submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ7', amount: o.total }); return paymentStatus(o) === 'Awaiting Verification' || paymentStatus(o); });
  T(PY, 'Rejected payment → can resubmit', () => { const { db, o } = paidOrder(); submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ6', amount: o.total }); verifyPayment(db, o, o.payments[0].id, owner, false, 'Not found'); return submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ5', amount: o.total }).ok || 'blocked'; });
  T(PY, 'Payment on cancelled order refused', () => { const { db, o } = paidOrder(); transition(db, 'order', o, 'Cancelled', owner); return !!submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ4', amount: o.total }).error || 'accepted'; });
  T(PY, 'Cancelled after payment → refund pending → refunded', () => { const { db, o } = paidOrder(); submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ3', amount: o.total }); verifyPayment(db, o, o.payments[0].id, owner, true); transition(db, 'order', o, 'Cancelled', owner); transition(db, 'order', o, 'Refund Pending', owner); const a = paymentStatus(o); transition(db, 'order', o, 'Refunded', owner); return (a === 'Refund Pending' && paymentStatus(o) === 'Refunded') || a; });
  T(PY, 'Partial deposit leaves remaining balance', () => { const db = fresh(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; toConfirmable(db, r); return (expectedAmount(r) === 4500 - 1350 && paymentStatus(r) === 'Partially paid') || expectedAmount(r); });
  T(PY, 'PIN / OTP never collected', () => !/pin|otp/i.test(JSON.stringify(seed(now).services.map((s) => s.fields))) || 'found');
  T(PY, 'Real payment gateway', () => 'na');

  T(AD, 'Price update does not change existing orders', () => { const db = fresh(); const o = placeOrder(db, [line('ivory-grace', 'std')], goodCheckout(), { now }).order; findP(db, 'ivory-grace')!.variants[0].price = 9999; return o.items[0].unitPrice === 1690 || 'changed'; });
  T(AD, 'Disabled service hidden from booking', () => { const db = fresh(); db.services[0].active = false; return !!serviceCheck(db, db.services[0], carF(), { now }).error || 'bookable'; });
  T(AD, 'Owner blocks a date → new bookings refused', () => { const db = fresh(); db.blocks.push({ id: 'x', date: D(5), scope: 'car-decoration', slot: 'all', reason: 'Team off' }); return !!createBooking(db, 'car-decoration', carF(5), { now }).errors || 'accepted'; });
  T(AD, 'Invalid status transition refused', () => { const { db, o } = paidOrder(); ['Confirmed', 'Preparing', 'Ready for Dispatch'].forEach((s) => transition(db, 'order', o, s, owner)); o.rider = 'X'; transition(db, 'order', o, 'Out for Delivery', owner); transition(db, 'order', o, 'Delivered', owner); return !!transition(db, 'order', o, 'Preparing', owner).error || 'allowed'; });
  T(AD, 'Staff cannot confirm, verify payments or send quotes', () => { const { db, o } = paidOrder(); const r = createBooking(db, 'car-decoration', carF(), { now }).rec; submitPayment(db, o, { method: 'bkash', txn: 'ABC123XYZ2', amount: o.total }); return (!!transition(db, 'order', o, 'Confirmed', staff).error && !!verifyPayment(db, o, o.payments[0].id, staff, true).error && !!sendQuote(db, r, { items: [{ desc: 'x', qty: 1, amount: 1 }], depositPct: 0, validUntil: D(2) }, staff, { now }).error) || 'allowed'; });
  T(AD, 'Out for delivery requires an assigned rider', () => { const { db, o } = paidOrder(); ['Confirmed', 'Preparing', 'Ready for Dispatch'].forEach((s) => transition(db, 'order', o, s, owner)); return /rider/.test(transition(db, 'order', o, 'Out for Delivery', owner).error || '') || 'allowed'; });
  T(AD, 'Internal notes kept apart from customer messages', () => { const { o } = paidOrder(); o.notes.push({ at: 1, text: 'secret', by: 'Owner' }); return !o.messages.some((m: any) => m.text === 'secret') || 'leaked'; });
  T(AD, 'Audit log records admin changes', () => { const { db, o } = paidOrder(); transition(db, 'order', o, 'Confirmed', owner); return (db.audit[0].ref === o.number && /Confirmed/.test(db.audit[0].action)) || 'missing'; });
  const corp = (mode: string, qty: string, dur: string) => ({ company: 'Acme', name: 'Nadia', phone: '01911000000', orderType: 'Reception flowers', mode, qty, start: D(3), freq: 'Weekly', duration: dur, area: 'gulshan-2', address: 'Level 5, Road 90, Gulshan 2' });
  const approvedCorp = (db: any, f: any) => { const r = createCorporate(db, f, { now }).rec; sendQuote(db, r, { items: [{ desc: 'x', qty: 1, amount: 1 }], depositPct: 0, validUntil: D(5) }, owner, { now }); respondQuote(db, r, true, null, { now }); return r; };
  T(AD, 'Recurring schedule only after confirmed terms', () => { const db = fresh(); const r = createCorporate(db, corp('Recurring', '2 arrangements', '3 months'), { now }).rec; const before = r.schedule; const a = confirmRecurrence(db, r, { freq: 'Weekly', count: 4, start: D(3) }, owner, { now }); sendQuote(db, r, { items: [{ desc: 'Weekly reception', qty: 2, amount: 3000 }], depositPct: 0, validUntil: D(5) }, owner, { now }); respondQuote(db, r, true, null, { now }); const b = confirmRecurrence(db, r, { freq: 'Weekly', count: 4, start: D(3) }, owner, { now }); return (before === null && !!a.error && b.ok && r.schedule.length === 4 && r.status === 'Active') || JSON.stringify([a, b]); });
  T(AD, 'Recurring delivery on blocked date flagged', () => { const db = fresh(); const r = approvedCorp(db, corp('Recurring', '2', '1 month')); confirmRecurrence(db, r, { freq: 'Weekly', count: 2, start: D(6) }, owner, { now }); return r.schedule[0].status === 'Needs new date' || r.schedule[0].status; });
  T(AD, 'Pause stops upcoming deliveries', () => { const db = fresh(); const r = approvedCorp(db, corp('Recurring', '2', '1 month')); confirmRecurrence(db, r, { freq: 'Weekly', count: 3, start: D(8) }, owner, { now }); transition(db, 'corporate', r, 'Paused', owner); return r.schedule.every((d: any) => d.status === 'Paused') || 'not paused'; });
  T(AD, 'Server-side authorisation of admin routes', () => 'na');
  return out;
}
