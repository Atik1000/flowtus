'use client';
import Link from 'next/link';
import { useState } from 'react';
import { minPrice, type Occasion, type Product } from '@flowtus/core';
import { Field, useLang } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { ProductCard } from './ProductCard';

export interface Chip { key: string; label: string; href: string; on: boolean }

/** Product grid with occasion filter, price sort, "load more" and an empty state. */
export function ListView({ title, intro, chips, shortcuts, items, occasions }: { title: string; intro?: string; chips: Chip[]; shortcuts: boolean; items: Product[]; occasions: Occasion[] }) {
  const { t, lang } = useLang();
  const [occ, setOcc] = useState('');
  const [sort, setSort] = useState('featured');
  const [n, setN] = useState(12);

  let list = occ ? items.filter((p) => p.occ.includes(occ)) : items;
  const key = (p: Product) => { const m = minPrice(p); return m == null ? Infinity : m; };
  if (sort === 'low') list = list.slice().sort((a, b) => key(a) - key(b));
  else if (sort === 'high') list = list.slice().sort((a, b) => (key(b) === Infinity ? -1 : key(b)) - (key(a) === Infinity ? -1 : key(a)));
  else list = list.slice().sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (a.available ? 0 : 1) - (b.available ? 0 : 1));
  const total = list.length;
  const clear = () => { setOcc(''); setSort('featured'); setN(12); };

  return (
    <section className="page">
      <div className="stack g12">
        <h1 className="h1">{title}</h1>
        {intro ? <p className="muted" style={{ maxWidth: 640 }}>{intro}</p> : null}
      </div>
      <div className="row between wrap g16" style={{ borderTop: '1px solid var(--hair)', borderBottom: '1px solid var(--hair)', padding: '16px 0' }}>
        <div role="group" aria-label="Category" className="row wrap g8">
          {chips.map((c) => <Link key={c.key} href={c.href} className={'pillbtn' + (c.on ? ' on' : '')}>{c.label}</Link>)}
        </div>
        <div className="row wrap g10">
          <div style={{ minWidth: 180 }}><Field type="select" name="occ" label="" ph="All occasions" value={occ} onChange={(v) => { setOcc(v); setN(12); }} options={occasions.filter((o) => o.active).map((o) => ({ value: o.id, label: t(o.name) }))} /></div>
          <div style={{ minWidth: 180 }}><Field type="select" name="sort" label="" ph="Featured" value={sort === 'featured' ? '' : sort} onChange={(v) => setSort(v || 'featured')} options={[{ value: 'low', label: 'Price: low to high' }, { value: 'high', label: 'Price: high to low' }]} /></div>
        </div>
      </div>
      {shortcuts ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 12 }}>
          {[['/custom', t(TX.customTitle), 'Order by the stem, piece or garland.'], ['/build', t(TX.build), 'Flowers, wrap, extras and a message.']].map(([href, h, sub]) => (
            <Link key={href} href={href} className="bg-soft row between g12 hover-soft" style={{ padding: '20px 24px', color: 'var(--ink)', textDecoration: 'none' }}>
              <span className="stack"><span style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{h}</span><span className="small muted">{sub}</span></span>
              <span style={{ color: 'var(--rose)' }}>→</span>
            </Link>
          ))}
        </div>
      ) : null}
      <span className="small muted" aria-live="polite">{total} item{total === 1 ? '' : 's'}</span>
      {total === 0 ? (
        <div className="empty">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Nothing matches these filters</span>
          <span className="muted">Try another occasion, or ask us for something custom.</span>
          <div className="row wrap g10" style={{ justifyContent: 'center' }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={clear}>Clear filters</button>
            <Link href="/custom" className="btn btn-rose btn-sm">{t(TX.orderCustom)}</Link>
          </div>
        </div>
      ) : null}
      <div className="grid-products">{list.slice(0, n).map((p) => <ProductCard key={p.id} p={p} lang={lang} />)}</div>
      {total > n ? <button type="button" className="btn btn-outline" style={{ alignSelf: 'center', padding: '0 32px' }} onClick={() => setN(n + 12)}>Load more</button> : null}
    </section>
  );
}
