'use client';
import { useState } from 'react';
import { fmtDate } from '@flowtus/core';
import { Field } from '@flowtus/ui';
import { adm, Loading, Title, useAct, useLoad } from '@/components/admin';
import { useSave } from '@/components/editor';
import { dhakaNow } from '@flowtus/core';

export default function Calendar() {
  const { data, error, reload } = useLoad<any>('/calendar');
  const { act } = useAct(reload);
  const s = useSave();
  const [f, setF] = useState({ date: '', scope: 'all', slot: 'all', reason: '' });
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Title>Calendar &amp; availability</Title>
      <div className="panel">
        <h2 className="h4">Block a date</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 14 }}>
          <Field type="date" name="date" label="Date" min={dhakaNow().date} value={f.date} onChange={(v) => setF({ ...f, date: v })} error={s.err('date')} />
          <Field type="select" name="scope" label="What to block" value={f.scope} onChange={(v) => setF({ ...f, scope: v })} options={data.scopes.map((x: any) => ({ value: x.id, label: x.label }))} error={s.err('scope')} />
          <Field type="select" name="slot" label="Delivery window" value={f.slot} onChange={(v) => setF({ ...f, slot: v })} options={[{ value: 'all', label: 'All windows' }, ...data.slots.map((x: any) => ({ value: x.id, label: x.label }))]} />
          <Field type="text" name="reason" label="Reason (shown to customers)" value={f.reason} onChange={(v) => setF({ ...f, reason: v })} />
        </div>
        {s.banner ? <div className="note error" style={{ padding: '8px 12px' }}>{s.banner}</div> : null}
        <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={s.busy} onClick={async () => { if (await s.save(() => adm('/blocks', { method: 'POST', body: f }), 'Block added.')) { setF({ date: '', scope: 'all', slot: 'all', reason: '' }); reload(); } }}>Add block</button>
        {data.blocks.map((b: any) => (
          <div key={b.id} className="row between g10 small" style={{ borderTop: '1px solid var(--soft-2)', padding: '8px 0' }}>
            <span>{fmtDate(b.date)} · {data.scopes.find((x: any) => x.id === b.scope)?.label || b.scope}{b.slot !== 'all' ? ` · ${data.slots.find((x: any) => x.id === b.slot)?.label || b.slot}` : ''}{b.reason ? ` · ${b.reason}` : ''}</span>
            <button type="button" className="link-btn danger" style={{ fontSize: 13 }} onClick={() => act(() => adm(`/blocks/${b.id}`, { method: 'DELETE' }), 'Block removed.')}>Remove</button>
          </div>
        ))}
      </div>
      <div className="list">
        {data.days.map((d: any) => (
          <div key={d.date} className="list-row" style={{ background: d.blocks.length ? 'var(--err-bg)' : undefined, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))' }}>
            <strong style={{ fontWeight: 500 }}>{fmtDate(d.date)}</strong>
            <span>{d.deliveries} deliver{d.deliveries === 1 ? 'y' : 'ies'}</span>
            <span>{d.bookings.length ? d.bookings.join(', ') : 'No confirmed bookings'}</span>
            <span style={{ color: 'var(--err)' }}>{d.blocks.map((b: any) => `Blocked: ${b.scope}${b.reason ? ' (' + b.reason + ')' : ''}`).join('; ')}</span>
            <span style={{ color: 'var(--warn)' }}>{d.pending ? `${d.pending} pending (no slot held)` : ''}</span>
          </div>
        ))}
      </div>
    </>
  );
}
