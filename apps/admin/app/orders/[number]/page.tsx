'use client';
import Link from 'next/link';
import { use, useState } from 'react';
import { fmt, fmtDate } from '@flowtus/core';
import { Field, StatusPill } from '@flowtus/ui';
import { adm, History, Kv, Loading, Panel, Thread, Title, useAct, useLoad, useMe } from '@/components/admin';

export default function OrderDetail({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  const { data, error, reload } = useLoad<any>(`/orders/${number}`);
  const { act, busy } = useAct(reload);
  const me = useMe();
  const [reason, setReason] = useState('');
  const [rider, setRider] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  if (!data) return <Loading error={error} />;
  const o = data.rec;
  const post = (path: string, body: any = {}) => adm(`/orders/${number}/${path}`, { method: 'POST', body });
  return (
    <>
      <Link href="/orders" className="small">← Orders</Link>
      <div className="row wrap g12"><h1 className="display" style={{ fontSize: 36 }}>{o.number}</h1><StatusPill status={o.status} className="tag" /><span className="xs muted">{o.paymentMethod} · {data.payStatus}</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 20, alignItems: 'start' }}>
        <div className="stack g20">
          <Panel title="Details">
            <Kv k="Customer" v={`${o.customer.name} · ${o.customer.phone}${o.customer.email ? ' · ' + o.customer.email : ''}`} />
            {o.recipient ? <Kv k="Recipient" v={`${o.recipient.name} ${o.recipient.phone || ''}`} /> : null}
            <Kv k="Delivery" v={`${fmtDate(o.date)} · ${o.slotLabel}`} /><Kv k="Area" v={o.areaName} /><Kv k="Address" v={o.address + (o.landmark ? ` (${o.landmark})` : '')} />
            {o.giftMessage ? <Kv k="Gift message" v={o.giftMessage} /> : null}{o.deliveryNotes ? <Kv k="Instructions" v={o.deliveryNotes} /> : null}
            {o.cancelReason ? <Kv k="Cancelled" v={o.cancelReason} /> : null}
          </Panel>
          <Panel title="Items (price snapshot)">
            {o.items.map((it: any, i: number) => (
              <div key={i} className="row between g12 small" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 6, alignItems: 'flex-start' }}>
                <span className="stack"><span>{(it.kind === 'gift' ? 'Gift: ' : '') + it.name} · {it.variant} × {it.qty}</span><span className="xxs muted">{it.parts.map((p: any) => `${p.name}${p.qty > 1 ? ' × ' + p.qty : ''}`).join(', ')}{it.cardMessage ? ` · Card: “${it.cardMessage}”` : ''}</span></span><span>{fmt(it.lineTotal)}</span>
              </div>
            ))}
            <div className="row between small muted"><span>Subtotal · delivery</span><span>{fmt(o.subtotal)} · {fmt(o.fee)}</span></div>
            <div className="row between" style={{ fontSize: 17 }}><span>Total</span><span>{fmt(o.total)}</span></div>
          </Panel>
          <Panel title="Payments">
            {o.payments.map((p: any) => (
              <div key={p.id} className="stack g6 small" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 8 }}>
                <div className="row between wrap g10"><span>{p.method} · {p.txn} · {fmt(p.amount)}</span><StatusPill status={p.status} /></div>
                <span className="xxs muted">Submitted {new Date(p.at).toLocaleString('en-GB')}{p.by ? ` · by ${p.by}` : ''}</span>
                {p.mismatch ? <span className="note error" style={{ padding: '6px 10px' }}>Amount mismatch: customer sent {fmt(p.amount)}, expected {fmt(p.expected)}.</span> : null}
                {p.status === 'Awaiting Verification' ? (
                  <div className="row g8">
                    <button type="button" className="btn btn-sage btn-xs" disabled={busy} onClick={() => act(() => post(`payments/${p.id}/verify`), 'Payment verified.')}>Verify</button>
                    <button type="button" className="btn btn-danger btn-xs" disabled={busy} onClick={() => act(() => post(`payments/${p.id}/reject`, { reason }), 'Payment rejected.')}>Reject (uses note above)</button>
                  </div>
                ) : null}
              </div>
            ))}
            {me.role === 'owner' && o.paymentMethod === 'cod' && data.expected > 0 ? <button type="button" className="btn btn-primary btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => act(() => post('cash'), 'Cash recorded.')}>Record cash received</button> : null}
            <span className="xxs muted">Verify only after checking the transaction in your bKash or Nagad account. Submitting a reference never marks an order paid.</span>
          </Panel>
        </div>
        <div className="stack g20">
          <Panel title="Status">
            <Field type="text" name="reason" label="Note (used for cancel, reject, etc.)" value={reason} onChange={setReason} />
            <div className="row wrap g8">
              {data.allowed.map((to: string) => {
                const owner = data.ownerOnly.includes(to);
                return <button key={to} type="button" className={'btn btn-xs ' + (to === 'Cancelled' ? 'btn-danger' : 'btn-outline')} disabled={busy} title={owner && me.role !== 'owner' ? 'Owner only' : ''} onClick={() => act(() => post('transition', { to, note: reason }), `Moved to ${to}.`)}>→ {to}</button>;
              })}
            </div>
            <span className="xxs muted">Only valid next steps are shown. Owner-only steps are refused for staff.</span>
            <Field type="text" name="rider" label="Rider" value={rider ?? o.rider} onChange={setRider} />
            <button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => act(() => post('rider', { rider: rider ?? o.rider }), 'Rider saved.')}>Save rider</button>
          </Panel>
          <Thread title="Internal notes" list={o.notes} field={<><Field type="textarea" name="note" rows={3} value={note} onChange={setNote} /><button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={async () => { if (await act(() => post('notes', { text: note }), 'Note added.')) setNote(''); }}>Add note</button></>} />
          <Thread title="Customer messages" list={o.messages} field={<><Field type="textarea" name="msg" rows={3} value={msg} onChange={setMsg} /><button type="button" className="btn btn-primary btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={async () => { if (await act(() => post('messages', { text: msg }), 'Posted to customer.')) setMsg(''); }}>Post to customer</button></>} />
          <History list={o.history} />
        </div>
      </div>
    </>
  );
}
