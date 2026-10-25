'use client';
import Link from 'next/link';
import { fmt, unitLabel } from '@flowtus/core';
import { Loading, Title, useLoad } from '@/components/admin';

export default function CustomList() {
  const { data, error } = useLoad<any[]>('/custom');
  if (!data) return <Loading error={error} />;
  return (
    <>
      <Title actions={<Link href="/custom/new" className="btn btn-primary btn-sm">+ New</Link>}>Custom catalogue</Title>
      <div className="list">
        {data.map((c) => (
          <Link key={c.id} href={`/custom/${c.id}`} className="list-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
            <span className="stack" style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 15 }}>{c.name}</span><span className="xxs muted">{c.bn} · min {c.min}, max {c.max}</span></span>
            <span>{c.unitPrice == null || c.priceMode === 'quote' ? 'Price on request' : `${fmt(c.unitPrice)} / ${unitLabel(c.unit, 1)}`}</span>
            <span className="pill" style={{ justifySelf: 'start', background: c.available ? 'var(--sage-bg)' : 'var(--err-bg)', color: c.available ? 'var(--sage-dark)' : 'var(--err)' }}>{c.available ? 'Available' : 'Unavailable'}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
