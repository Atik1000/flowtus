'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { addDays, dhakaNow, fmt, issueText, priceLine } from '@flowtus/core';
import { api, useLang } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { bind, ff } from './fields';
import { FormPage } from './FormPage';
import { useCart, useCatalogue } from './Providers';
import { useForm } from './useForm';
import { useSubmit } from './useSubmit';

type Slot = { id: string; label: string; reason: string | null };

export function CheckoutForm() {
  const { t } = useLang();
  const router = useRouter();
  const { db, cat } = useCatalogue();
  const { cart, setCart, priced, ready } = useCart();
  const sub = useSubmit();
  const now = dhakaNow();
  const pays = [
    cat.settings.pay.cod.enabled && { value: 'cod', label: 'Cash on delivery', sub: 'Pay the rider in cash when your order arrives.' },
    cat.settings.pay.bkash.enabled && { value: 'bkash', label: 'bKash (manual)', sub: 'Payment instructions appear after you place the order. We verify every payment by hand.' },
    cat.settings.pay.nagad.enabled && { value: 'nagad', label: 'Nagad (manual)', sub: 'Payment instructions appear after you place the order. We verify every payment by hand.' },
  ].filter(Boolean) as { value: string; label: string; sub: string }[];
  const form = useForm<Record<string, any>>('checkout', { pay: pays[0]?.value || '' }, { persist: true });
  const v = form.v;
  const [slots, setSlots] = useState<Slot[]>([]);
  useEffect(() => { document.title = 'Checkout · FLOWTUS'; }, []);
  useEffect(() => { if (pays.length && !pays.some((p) => p.value === v.pay)) form.set('pay', pays[0].value); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [pays.length]);

  const cp = priced;
  const area = db.areas.find((a) => a.id === v.area && a.delivery);
  const fee = area ? area.fee : null;
  const total = cp.subtotal + (fee || 0);
  useEffect(() => {
    if (!v.date) { setSlots([]); return; }
    const ctl = new AbortController();
    api<Slot[]>('/availability/slots', { body: { date: v.date, leadDays: cp.leadDays }, signal: ctl.signal }).then(setSlots).catch(() => {});
    return () => ctl.abort();
  }, [v.date, cp.leadDays]);

  if (!ready) return <section className="page-form"><h1 className="h1">Checkout</h1></section>;
  if (!cart.length) {
    return (
      <section className="page-form">
        <h1 className="h1">Checkout</h1>
        <div className="empty"><span style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>{t(TX.cartEmpty)}</span><Link href="/shop/flowers" className="btn btn-rose">{t(TX.shopFlowers)}</Link></div>
      </section>
    );
  }

  const issues = cp.lines.filter((l) => l.pr.blocking);
  const snapSub = cart.reduce((a, l) => a + (l.snapUnit || 0) * (+l.qty || 0), 0);
  const expect = snapSub + (fee || 0);
  const F = (k: string, type: any, label: string, o: any = {}) => ff({ type, ...bind(form, k), label, ...o });

  const submit = () => sub.run(
    (idem) => api<{ order: { token: string; number: string } }>('/orders', { idempotencyKey: idem, body: { cart, checkout: Object.fromEntries(Object.entries(v).filter(([k]) => !k.startsWith('_'))), expectTotal: expect } }),
    {
      onOk: (r) => {
        sub.done();
        try { localStorage.setItem('flowtus-v2-last', JSON.stringify({ ref: r.order.number, token: r.order.token })); } catch { /* ignore */ }
        setCart([]);
        form.reset({ name: v.name, phone: v.phone, email: v.email, pay: pays[0]?.value || '' });
        router.push(`/order/${r.order.token}`);
      },
      onErrors: (e) => form.setErrors(e),
      onConflict: (e) => {
        if (e.code === 'TOTAL_CHANGED') {
          setCart(cart.map((l) => ({ ...l, snapUnit: priceLine(db, l).unit })));
          sub.setBanner({ text: `Your total changed from ${fmt(e.data.from)} to ${fmt(e.data.to)} because a price or delivery fee was updated. Review it and place the order again.`, tone: 'warn' });
          return true;
        }
        if (e.code === 'CART_ISSUES') { sub.setBanner({ text: 'Some items in your cart need attention. Fix them in your cart to continue.', tone: 'error' }); return true; }
        return false;
      },
    },
  );

  return (
    <FormPage
      title="Checkout" lead="Guest checkout. No account needed." banner={sub.banner}
      sections={[
        { key: 'o1', title: 'Your details', fields: [F('name', 'text', 'Your name', { req: true, ac: 'name' }), F('phone', 'tel', 'Mobile number', { req: true, ph: '017XXXXXXXX', ac: 'tel' }), F('email', 'email', 'Email (optional)', { ac: 'email' }), F('forOther', 'toggle', 'I am sending this to someone else'), ...(v.forOther ? [F('rname', 'text', 'Recipient name', { req: true }), F('rphone', 'tel', 'Recipient phone (optional)', { ph: '01XXXXXXXXX' })] : [])] },
        { key: 'o2', title: 'Delivery address', fields: [F('area', 'select', 'Area', { req: true, ph: 'Choose area', options: [...db.areas.filter((a) => a.delivery).map((a) => ({ value: a.id, label: t(a.name) + ' · ' + fmt(a.fee) })), { value: 'outside', label: 'My area is not listed' }] }), F('address', 'textarea', 'Address', { req: true, rows: 2, ph: 'House, road, block' }), F('landmark', 'text', 'Landmark (optional)')] },
        { key: 'o3', title: 'Delivery date and window', fields: [
          F('date', 'date', 'Date', { req: true, min: now.date, max: addDays(now.date, db.delivery.maxDaysAhead), hint: cp.leadDays ? `An item in your cart needs ${cp.leadDays} day${cp.leadDays > 1 ? 's' : ''}’ notice.` : `Same-day delivery for orders placed before ${db.delivery.cutoffHour}:00.` }),
          F('slot', 'chips', 'Window', { req: true, options: db.delivery.slots.filter((s) => s.enabled).map((s) => { const sl = slots.find((x) => x.id === s.id); return { value: s.id, label: s.label, sub: v.date ? (sl ? sl.reason || 'Available' : 'Checking…') : 'Choose a date first', disabled: !v.date || !!sl?.reason, reason: sl?.reason || '' }; }) }),
        ] },
        { key: 'o4', title: 'Message and notes', fields: [F('giftMessage', 'textarea', 'Gift message (optional)', { maxLen: 200, rows: 3 }), F('notes', 'textarea', 'Delivery instructions (optional)', { rows: 2 })] },
        { key: 'o5', title: 'Payment', fields: [F('pay', 'cards', '', { cardMin: '220px', options: pays }), ff({ type: 'info', name: '_pin', tone: 'warn', text: 'FLOWTUS will never ask for your PIN, OTP or password.' })] },
      ]}
      aside={{
        title: 'Order summary',
        rows: [...cp.lines.map((l) => ({ label: (l.kind === 'gift' ? 'Gift: ' : '') + (l.pr.p ? l.pr.p.name : 'Item') + ' × ' + l.qty, sub: l.pr.v?.name, value: fmt(l.pr.total) })), { label: t(TX.subtotal), value: fmt(cp.subtotal) }, { label: t(TX.delivery), value: fee != null ? fmt(fee) : 'Choose an area' }],
        totalLabel: t(TX.total), total: fmt(total),
        notes: [...issues.map((l) => ({ text: issueText(l.pr.issues[0]), tone: 'error' as const })), ...(issues.length ? [{ text: 'Fix these in your cart to continue.', tone: 'error' as const }] : [])],
        secondary: { label: 'Back to cart', href: '/cart' },
        button: 'Place order · ' + fmt(total), busyLabel: 'Placing order…', busy: sub.busy, disabled: cp.blocking, onSubmit: submit,
        disclaimer: 'Your order is checked and confirmed by our team before it is prepared. For bKash or Nagad, you will see payment instructions on the next page.',
      }}
    />
  );
}
