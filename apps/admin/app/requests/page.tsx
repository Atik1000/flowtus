'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FLOWS, fmtDate } from '@flowtus/core';
import { Field, StatusPill } from '@flowtus/ui';
import { Loading, Title, useLoad } from '@/components/admin';

const KIND: Record<string, string> = { custom: 'Custom flowers', booking: 'Booking', corporate: 'Corporate' };

function Requests() {
  const sp = useSearchParams();
  const [kind, setKind] = useState(sp.get('kind') || '');
  const [status, setStatus] = useState(sp.get('status') || '');
  const [q, setQ] = useState('');
  const qs = new URLSearchParams(Object.entries({ kind, status, q }).filter(([, v]) => v) as [string, string][]).toString();
  const { data, error } = useLoad<any[]>('/requests' + (qs ? '?' + qs : ''));
  const statuses = Array.from(new Set(Object.values(FLOWS).flatMap((f) => Object.keys(f.T))));
  return (
    <>
      <Title>Requests &amp; bookings</Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 12 }}>
        <Field type="select" name="kind" ph="All kinds" value={kind} onChange={setKind} options={[{ value: 'custom', label: 'Custom flowers' }, { value: 'booking', label: 'Bookings' }, { value: 'corporate', label: 'Corporate' }]} />
        <Field type="select" name="status" ph="All statuses" value={status} onChange={setStatus} options={statuses} />
        <Field type="text" name="q" ph="Search reference, name or phone" value={q} onChange={setQ} />
      </div>
      {!data ? <Loading error={error} /> : (
        <div className="list">
          {data.length === 0 ? <div style={{ padding: 28 }} className="muted">No requests match these filters.</div> : null}
          {data.map((r) => (
            <Link key={r.ref} href={`/requests/${r.ref}`} className="list-row">
              <span className="stack"><strong style={{ fontWeight: 500, letterSpacing: '0.03em' }}>{r.ref}</strong><span className="xxs muted">{KIND[r.kind]}</span></span>
              <span>{r.name}</span><span>{r.date ? fmtDate(r.date) : ''}</span><span>{r.title}</span>
              <span style={{ justifySelf: 'start' }}><StatusPill status={r.status} /></span><span className="xxs muted">{r.pay}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
export default function Page() { return <Suspense><Requests /></Suspense>; }
