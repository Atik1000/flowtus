'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FLOWS, TONE, fmt, fmtDate, paymentStatus } from '@flowtus/core';
import { api, useLang, useToast } from '@flowtus/ui';
import { ORDER_NEXT, TX } from '@/lib/text';
import { useCatalogue } from './Providers';
import { Messages, NextBox, PayBox, Stepper, StatusHeader, useRecord } from './status-parts';
import { waHref } from '@/lib/helpers';

export function OrderStatus({ token }: { token: string }) {
  const { t, lang, sl } = useLang();
  const toast = useToast();
  const { cat } = useCatalogue();
  const { rec, state, load } = useRecord<{ order: any }>(`/orders/${token}`);
  const [confirming, setConfirming] = useState(false);
  const [last, setLast] = useState<{ ref?: string; token?: string }>({});
  useEffect(() => { try { setLast(JSON.parse(localStorage.getItem('flowtus-v2-last') || '{}')); } catch { /* ignore */ } }, []);

  if (state === 'loading') return <section className="page-narrow"><span className="muted">Loading your order…</span></section>;
  if (state !== 'ok' || !rec) {
    return (
      <section className="page-narrow">
        <div className="stack g14" style={{ alignItems: 'flex-start' }}>
          <h1 className="display" style={{ fontSize: 44 }}>{state === 'error' ? 'We could not load this order' : 'Order not found'}</h1>
          <p className="muted">{state === 'error' ? 'Check your connection and try again.' : last.token === token ? `Your order ${last.ref} was placed, but this page could not load it. Use Track an order with that number and your phone.` : 'We could not find this order. Check the link, or use Track an order.'}</p>
          <Link href="/track" className="btn btn-rose">{t(TX.track)}</Link>
        </div>
      </section>
    );
  }
  const o = rec.order;
  const ps = paymentStatus(o);
  const pt = TONE(ps);
  const method = ({ cod: 'Cash on delivery', bkash: 'bKash (manual)', nagad: 'Nagad (manual)' } as Record<string, string>)[o.paymentMethod];
  const cancel = async () => {
    try { await api(`/orders/${token}/cancel`, { body: {} }); toast('Your order has been cancelled.'); setConfirming(false); load(); }
    catch (e: any) { toast(e.message); }
  };

  return (
    <section className="page-narrow">
      <StatusHeader eyebrow="Order received" title="Thank you. Your order is in." label="Order" number={o.number} status={o.status}
        extra={<span className="tag" style={{ background: pt.bg, color: pt.fg }}>{t(TX.payment)}: {sl(ps)}</span>} />
      <span className="small muted">Keep this number. You can open this page again from Track an order with your phone number.</span>
      <Stepper path={FLOWS.order.path} status={o.status} />
      <NextBox text={(ORDER_NEXT[o.status] || '') + (o.status === 'Cancelled' && o.cancelReason ? ' ' + o.cancelReason + '.' : '')} />
      <PayBox rec={o} isOrder token={token} onChange={load} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 28 }}>
        <div className="stack g10">
          <h2 className="h3">Items</h2>
          {o.items.map((it: any, i: number) => (
            <div key={i} className="row between g12" style={{ borderBottom: '1px solid var(--soft-2)', padding: '8px 0', fontSize: 15, alignItems: 'flex-start' }}>
              <span className="stack">
                <span>{(it.kind === 'gift' ? 'Gift: ' : '') + it.name}</span>
                <span className="xs muted">{it.variant} × {it.qty}</span>
                {it.parts.map((p: any, j: number) => <span key={j} className="xs muted">{(p.role === 'wrap' ? 'Wrap: ' : '+ ') + p.name + (p.qty > 1 ? ' × ' + p.qty : '')}</span>)}
                {it.cardMessage ? <span className="xs muted" style={{ fontStyle: 'italic' }}>Card: “{it.cardMessage}”</span> : null}
              </span>
              <span>{fmt(it.lineTotal)}</span>
            </div>
          ))}
          <div className="row between small muted"><span>{t(TX.subtotal)}</span><span>{fmt(o.subtotal)}</span></div>
          <div className="row between small muted"><span>{t(TX.delivery)}</span><span>{fmt(o.fee)}</span></div>
          <div className="row between" style={{ fontSize: 18 }}><span>{t(TX.total)}</span><span>{fmt(o.total)}</span></div>
          <span className="xs muted">{t(TX.payment)}: {method}</span>
        </div>
        <div className="stack g10">
          <h2 className="h3">{t(TX.delivery)}</h2>
          {([['Delivery', fmtDate(o.date, lang) + ' · ' + o.slotLabel], ['Area', o.areaName], ['Address', o.address + (o.landmark ? ` (${o.landmark})` : '')], o.recipient ? ['Recipient', o.recipient.name + (o.recipient.phone ? ' · ' + o.recipient.phone : '')] : null, o.giftMessage ? ['Gift message', o.giftMessage] : null, o.deliveryNotes ? ['Instructions', o.deliveryNotes] : null].filter(Boolean) as string[][]).map(([k, v]) => (
            <div key={k} className="stack" style={{ borderBottom: '1px solid var(--soft-2)', padding: '6px 0' }}><span className="eyebrow-sm" style={{ letterSpacing: '0.12em' }}>{k}</span><span>{v}</span></div>
          ))}
        </div>
      </div>
      <Messages list={o.messages} />
      <div className="row wrap g10" style={{ borderTop: '1px solid var(--hair)', paddingTop: 20 }}>
        <a href={waHref(cat.settings.whatsapp, 'Hello FLOWTUS, about my order ' + o.number)} target="_blank" rel="noopener" className="btn btn-outline btn-sm">{cat.settings.whatsapp ? 'WhatsApp us about this order' : 'Contact us'}</a>
        {o.status === 'Pending Confirmation' ? (
          confirming ? (
            <span className="row wrap g8"><span className="small">Cancel this order?</span><button type="button" className="btn btn-danger-solid btn-sm" onClick={cancel}>Yes, cancel</button><button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(false)}>Keep order</button></span>
          ) : <button type="button" className="link-btn danger" style={{ padding: '0 18px', fontSize: 16 }} onClick={() => setConfirming(true)}>Cancel this order</button>
        ) : null}
      </div>
    </section>
  );
}
