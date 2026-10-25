'use client';
import Link from 'next/link';
import { Loading, Title, useLoad } from '@/components/admin';

export default function Services() {
  const { data, error } = useLoad<any[]>('/services');
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Title>Services</Title>
      <div className="list">
        {data.map((s) => (
          <Link key={s.id} href={`/services/${s.id}`} className="list-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
            <span className="stack" style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 15 }}>{s.name[0]}</span><span className="xxs muted">{s.group} · {s.fields.length} form fields · {s.capacity ? s.capacity + '/day' : 'no daily limit'}</span></span>
            <span>{s.depositPct}% deposit</span>
            <span className="pill" style={{ justifySelf: 'start', background: s.active ? 'var(--sage-bg)' : 'var(--err-bg)', color: s.active ? 'var(--sage-dark)' : 'var(--err)' }}>{s.active ? 'Taking bookings' : 'Disabled'}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
