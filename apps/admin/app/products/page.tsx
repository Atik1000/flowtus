'use client';
import Link from 'next/link';
import { useState } from 'react';
import { DEPTS, fmt, minPrice } from '@flowtus/core';
import { Field } from '@flowtus/ui';
import { Loading, Title, useLoad } from '@/components/admin';

export default function Products() {
  const { data, error } = useLoad<any[]>('/products');
  const [dept, setDept] = useState('');
  const [archived, setArchived] = useState(false);
  if (!data) return <Loading error={error} />;
  const rows = data.filter((p) => (!dept || p.dept === dept) && (archived || !p.archived));
  return (
    <>
      <Title actions={<Link href="/products/new" className="btn btn-primary btn-sm">+ New</Link>}>Products</Title>
      <div className="row wrap g12">
        {['', ...Object.keys(DEPTS)].map((d) => <button key={d} type="button" className={'pillbtn' + (dept === d ? ' on' : '')} onClick={() => setDept(d)}>{d ? DEPTS[d].name[0] : 'All'}</button>)}
        <div style={{ minWidth: 200 }}><Field type="toggle" name="arch" label="Show archived" value={archived} onChange={setArchived} /></div>
      </div>
      <div className="list">
        {rows.map((p) => (
          <Link key={p.id} href={`/products/${p.id}`} className="list-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))' }}>
            <span className="stack" style={{ gridColumn: 'span 2' }}><span style={{ fontSize: 15 }}>{p.name}</span><span className="xxs muted">{DEPTS[p.dept]?.name[0]} · {p.variants.length} variant{p.variants.length === 1 ? '' : 's'}</span></span>
            <span>{minPrice(p) == null ? 'Price on request' : fmt(minPrice(p))}</span>
            <span className="pill" style={{ justifySelf: 'start', background: p.archived ? 'var(--soft-2)' : p.available ? 'var(--sage-bg)' : 'var(--err-bg)', color: p.archived ? 'var(--body)' : p.available ? 'var(--sage-dark)' : 'var(--err)' }}>{p.archived ? 'Archived' : p.available ? 'Available' : 'Unavailable'}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
