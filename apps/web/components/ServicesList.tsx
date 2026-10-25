import Link from 'next/link';
import { IMG, Photo } from '@flowtus/ui';
import { ProductCard } from '@/components/ProductCard';
import { svcPrice } from '@/lib/helpers';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

/** Wedding and event service listings (grouped by `group`), plus ready-made accessories for the wedding group. */
export async function ServicesList({ group }: { group: 'wedding' | 'event' }) {
  const { cat, lang, t } = await pageContext();
  const list = cat.services.filter((s) => s.group === group);
  const acc = group === 'wedding' ? cat.products.filter((p) => !p.archived && p.dept === 'wedding') : [];
  return (
    <section className="page" style={{ gap: 40 }}>
      <div className="stack g14" style={{ maxWidth: 720 }}>
        <h1 className="h1">{t(group === 'wedding' ? TX.weddingTitle : TX.eventsTitle)}</h1>
        <p className="lead">{t(group === 'wedding' ? TX.weddingLead : TX.eventsLead)}</p>
        <p className="small" style={{ color: 'var(--sage-dark)', background: 'var(--sage-bg)', padding: '12px 16px' }}>
          Every service starts as a request. We check the date, team and flowers, then send a written quote. Your booking is confirmed only after you approve the quote and any deposit is verified.
        </p>
      </div>
      <div className="grid-services">
        {list.map((s) => {
          const badge = !s.active ? 'Not taking bookings right now' : s.partner ? 'Delivered with a partner team' : '';
          return (
            <Link key={s.id} href={`/service/${s.id}`} className="stack g14" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
              <div style={{ position: 'relative' }}>
                <Photo src={IMG(s.img || s.id, 0, 700)} ratio="r43" alt={s.name[0]} />
                {badge ? <span className="xxs" style={{ position: 'absolute', top: 12, left: 12, background: 'var(--surface)', letterSpacing: '0.06em', padding: '6px 10px' }}>{badge}</span> : null}
              </div>
              <span className="stack" style={{ gap: 2 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, lineHeight: 1.1 }}>{t(s.name)}</span>
                <span className="bn" style={{ fontSize: 15, color: 'var(--sage)' }}>{lang === 'bn' ? s.name[0] : s.name[1]}</span>
              </span>
              <span className="small muted" style={{ textWrap: 'pretty', fontSize: 15 }}>{s.short}</span>
              <span className="row between g12 small"><span>{svcPrice(s)}</span><span style={{ color: 'var(--rose)' }}>{t(TX.viewDetails)}</span></span>
            </Link>
          );
        })}
      </div>
      {acc.length ? (
        <div className="stack g24" style={{ borderTop: '1px solid var(--hair)', paddingTop: 48 }}>
          <div className="row between end wrap g16">
            <h2 className="display" style={{ fontSize: 40 }}>{t(TX.readyMade)}</h2>
            <Link href="/book/wedding-accessories" className="small">Need something made to measure? Request it →</Link>
          </div>
          <div className="grid-products">{acc.map((p) => <ProductCard key={p.id} p={p} lang={lang} />)}</div>
        </div>
      ) : null}
    </section>
  );
}
