'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FLOWS, TONE, fmt, fmtDate } from '@flowtus/core';
import { Field, StatusPill } from '@flowtus/ui';
import { Loading, Title, useLoad } from '@/components/admin';

function Orders() {
  const sp = useSearchParams();
  const [status, setStatus] = useState(sp.get('status') || '');
  const [pay, setPay] = useState(sp.get('pay') || '');
  const [q, setQ] = useState('');
  const qs = new URLSearchParams(Object.entries({ status, pay, q }).filter(([, v]) => v) as [string, string][]).toString();
  const { data, error } = useLoad<any[]>('/orders' + (qs ? '?' + qs : ''));
  const statuses = Object.keys(FLOWS.order.T);
  return (
    <>
      <Title>Orders</Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
        <Field type="select" name="status" ph="All statuses" value={status} onChange={setStatus} options={statuses} />
        <Field type="select" name="pay" ph="Any payment status" value={pay} onChange={setPay} options={['Unpaid', 'Awaiting Verification', 'Partially paid', 'Paid', 'Cash on delivery', 'Refund Pending', 'Refunded']} />
        <Field type="text" name="q" ph="Search number, name or phone" value={q} onChange={setQ} />
      </div>
      {!data ? <Loading error={error} /> : (
        <div className="list">
          {data.length === 0 ? <div style={{ padding: 28 }} className="muted">No orders match these filters.</div> : null}
          {data.map((o) => (
            <Link key={o.number} href={`/orders/${o.number}`} className="list-row">
              <span className="stack"><strong style={{ fontWeight: 500, letterSpacing: '0.03em' }}>{o.number}</strong><span className="xxs muted">{o.areaName}</span></span>
              <span>{o.name}</span><span>{fmtDate(o.date)} · {o.slotLabel}</span><span>{fmt(o.total)}</span>
              <span style={{ justifySelf: 'start' }}><StatusPill status={o.status} /></span><span className="xxs muted" style={{ color: TONE(o.pay).fg }}>{o.pay}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
export default function Page() { return <Suspense><Orders /></Suspense>; }
