import Link from 'next/link';
import { fmt, minPrice, type Product } from '@flowtus/core';
import { IMG, Photo, type Lang } from '@flowtus/ui';
import { catName } from '@/lib/helpers';
import { TX } from '@/lib/text';

/** Flat product card: image on top, Cormorant name, Jost price. */
export function ProductCard({ p, lang }: { p: Product; lang: Lang }) {
  const mp = minPrice(p);
  const multi = p.variants.filter((v) => v.price != null).length > 1;
  const tag = !p.available ? 'Currently unavailable' : mp == null ? 'Price on request' : '';
  const i = lang === 'bn' ? 1 : 0;
  return (
    <Link href={`/p/${p.slug}`} className="stack g14 pcard" style={{ color: 'var(--ink)', textDecoration: 'none', minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        <Photo src={p.img ? IMG(p.img, 0, 700) : null} alt={p.name} />
        {tag ? <span style={{ position: 'absolute', top: 12, left: 12, background: 'var(--surface)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', pointerEvents: 'none' }}>{tag}</span> : null}
      </div>
      <span className="stack g6">
        <span className="eyebrow-sm" style={{ letterSpacing: '0.14em' }}>{catName(p, lang)}</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 500, lineHeight: 1.15 }}>{p.name}</span>
        <span className="row between g12" style={{ alignItems: 'baseline', fontSize: 15 }}>
          <span>{mp == null ? TX.priceOnRequest[i] : (multi ? 'From ' : '') + fmt(mp)}</span>
          <span className="xs" style={{ color: 'var(--rose)', letterSpacing: '0.04em' }}>{TX.viewDetails[i]}</span>
        </span>
      </span>
    </Link>
  );
}
