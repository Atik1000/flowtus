'use client';
import { Loading, Title, stamp, useLoad } from '@/components/admin';

export default function Audit() {
  const { data, error } = useLoad<any[]>('/audit');
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Title>Audit log</Title>
      {data.length === 0 ? <div className="panel muted">No admin actions recorded yet.</div> : null}
      <div className="list">
        {data.map((r) => (
          <div key={r.id} className="list-row xs" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))' }}>
            <span className="muted">{stamp(r.at)}</span><span>{r.by}</span><span style={{ letterSpacing: '0.03em' }}>{r.ref}</span><span style={{ gridColumn: 'span 2' }}>{r.action}</span>
          </div>
        ))}
      </div>
    </>
  );
}
