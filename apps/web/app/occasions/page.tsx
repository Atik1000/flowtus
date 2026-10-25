import Link from 'next/link';
import { IMG, Photo } from '@flowtus/ui';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

export const metadata = { title: 'Occasions' };

export default async function Occasions() {
  const { cat, t } = await pageContext();
  return (
    <section className="page" style={{ gap: 32 }}>
      <h1 className="h1">{t(TX.occasions)}</h1>
      <div className="grid-tiles">
        {cat.occasions.filter((o) => o.active).map((o, i) => (
          <Link key={o.id} href={`/occasion/${o.id}`} className="stack g10" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
            <Photo src={IMG('occ-' + o.id, i, 500)} ratio="r11" alt={t(o.name)} />
            <span className="row between g8" style={{ alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 24 }}>{t(o.name)}</span>
              <span className="xs muted">{cat.products.filter((p) => !p.archived && p.occ.includes(o.id)).length} items</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
