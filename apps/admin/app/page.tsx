'use client';
import Link from 'next/link';
import { StatusPill } from '@flowtus/ui';
import { adm, Loading, Panel, Title, useAct, useLoad, useMe } from '@/components/admin';
import { fmtDate } from '@flowtus/core';

export default function Overview() {
  const { data, error, reload } = useLoad<any>('/overview');
  const { act, busy } = useAct(reload);
  const me = useMe();
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Title>Overview</Title>
      {data.empty ? (
        <div className="panel row between wrap g14" style={{ flexDirection: 'row' }}>
          <span>No orders or requests yet. Counts below come only from stored records.</span>
          {me.role === 'owner' ? <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => act(() => adm('/demo/sample', { method: 'POST', body: {} }), 'Sample activity loaded. Every record is marked "Sample".')}>Load sample activity (demo)</button> : null}
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 190px), 1fr))', gap: 12 }}>
        {data.cards.map((c: any) => <Link key={c.label} href={c.href} className="stat"><b style={{ color: c.n > 0 ? 'var(--rose)' : 'var(--muted)' }}>{c.n}</b><span className="small">{c.label}</span></Link>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 20 }}>
        <Panel title="Today's deliveries">
          {data.today.length ? data.today.map((o: any) => <Link key={o.number} href={`/orders/${o.number}`} className="row between g10 small" style={{ borderTop: '1px solid var(--soft-2)', padding: '8px 0', color: 'var(--ink)', textDecoration: 'none' }}><span>{o.number} · {o.name}</span><StatusPill status={o.status} /></Link>) : <span className="xs muted">No deliveries scheduled for today.</span>}
        </Panel>
        <Panel title="Upcoming installations">
          {data.installs.map((o: any) => <Link key={o.ref} href={`/requests/${o.ref}`} className="row between g10 small" style={{ borderTop: '1px solid var(--soft-2)', padding: '8px 0', color: 'var(--ink)', textDecoration: 'none' }}><span>{fmtDate(o.when)} · {o.title}</span><StatusPill status={o.status} /></Link>)}
          <span className="xs muted">Only confirmed bookings are listed. Pending requests do not hold a slot.</span>
        </Panel>
      </div>
    </>
  );
}
