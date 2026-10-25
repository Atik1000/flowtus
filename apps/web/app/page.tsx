import Link from 'next/link';
import { IMG, Photo } from '@flowtus/ui';
import { ProductCard } from '@/components/ProductCard';
import { customPrice, svcPrice, waHref } from '@/lib/helpers';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

export default async function Home() {
  const { cat, lang, t } = await pageContext();
  const vis = cat.products.filter((p) => !p.archived);
  const featured = vis.filter((p) => p.featured && p.dept !== 'gifts').slice(0, 4);
  const gifts = vis.filter((p) => p.dept === 'gifts').slice(0, 4);
  const occasions = cat.occasions.filter((o) => o.active).slice(0, 6);
  const customItems = cat.custom.filter((c) => c.available).slice(0, 6);
  const tiles = ['car-decoration', 'holud-decoration', 'bashor-ghor', 'dala-decoration'].map((id) => cat.services.find((s) => s.id === id)).filter((s) => s && s.active);
  const svcs = (g: string) => cat.services.filter((s) => s.group === g && s.active).slice(0, 5);
  const wa = waHref(cat.settings.whatsapp);
  const hasWa = !!cat.settings.whatsapp;
  const contactLine = [cat.settings.phone, cat.settings.email].filter(Boolean).join(' · ') || 'Phone and email will be published once FLOWTUS confirms them.';
  const heading = (title: string, href: string, label = t(TX.viewAll)) => (
    <div className="row between end wrap g16">
      <h2 className="h2">{title}</h2>
      <Link href={href} className="small">{label}</Link>
    </div>
  );
  const bigBtn = 'btn btn-rose';

  return (
    <>
      <section className="container split" style={{ padding: '56px 24px 88px' }}>
        <div className="stack g24">
          <span className="eyebrow">{t(TX.heroEyebrow)}</span>
          <h1 className="hero-title">{t(TX.heroTitle)}</h1>
          <p className="lead" style={{ maxWidth: 460 }}>{t(TX.heroLead)}</p>
          <div className="row wrap g12">
            <Link href="/shop/flowers" className={bigBtn}>{t(TX.shopFlowers)}</Link>
            <Link href="/custom" className="btn btn-outline">{t(TX.orderCustom)}</Link>
          </div>
          <a href={wa} target="_blank" rel="noopener" className="small">{hasWa ? 'Order on WhatsApp' : t(TX.contactUs)} →</a>
        </div>
        <Photo src="/images/hero.jpg" alt="FLOWTUS bouquet" ratio="r45" eager className="" />
      </section>

      <section className="section">
        {heading(t(TX.featTitle), '/shop/flowers')}
        <div className="grid-products">{featured.map((p) => <ProductCard key={p.id} p={p} lang={lang} />)}</div>
      </section>

      <section className="bg-soft">
        <div className="band stack g32">
          {heading(t(TX.occTitle), '/occasions', t(TX.allOcc) + ' →')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 170px), 1fr))', gap: 16 }}>
            {occasions.map((o, i) => (
              <Link key={o.id} href={`/occasion/${o.id}`} className="stack g10" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
                <Photo src={IMG('occ-' + o.id, i, 500)} ratio="r11" alt={t(o.name)} />
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{t(o.name)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="band stack g32">
        {heading(t(TX.giftsTitle), '/shop/gifts')}
        <div className="grid-products">{gifts.map((p) => <ProductCard key={p.id} p={p} lang={lang} />)}</div>
      </section>

      <section className="container split" style={{ padding: '0 24px 88px' }}>
        <Photo src="/images/about.jpg" ratio="r43" alt="Gift builder" />
        <div className="stack g20">
          <span className="eyebrow">{t(TX.build)}</span>
          <h2 className="h2">{t(TX.buildTitle)}</h2>
          <p className="lead" style={{ fontSize: 18, maxWidth: 460 }}>{t(TX.buildLead)}</p>
          <Link href="/build" className={bigBtn} style={{ alignSelf: 'flex-start' }}>{t(TX.buildCta)}</Link>
        </div>
      </section>

      <section style={{ background: 'var(--ink)', color: 'var(--soft)' }}>
        <div className="band split-start" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 48 }}>
          <div className="stack g20">
            <span className="eyebrow" style={{ color: 'var(--rose-tint)' }}>{t(TX.customEyebrow)}</span>
            <h2 className="h2" style={{ color: 'var(--bg)' }}>{t(TX.customTitle)}</h2>
            <p style={{ fontWeight: 300, fontSize: 18, color: '#d9c8cf', maxWidth: 480 }}>{t(TX.customLead)}</p>
            <Link href="/custom" className="btn btn-light" style={{ alignSelf: 'flex-start' }}>{t(TX.orderCustom)}</Link>
          </div>
          <div className="stack">
            {customItems.map((c) => (
              <div key={c.id} className="row between g16" style={{ padding: '14px 0', borderBottom: '1px solid #5a4250', alignItems: 'flex-start' }}>
                <span className="stack"><span style={{ color: 'var(--bg)' }}>{c.name}</span><span className="bn small" style={{ color: 'var(--rose-tint)' }}>{c.bn}</span></span>
                <span className="small" style={{ color: '#d9c8cf', textAlign: 'right' }}>{customPrice(c, lang)}</span>
              </div>
            ))}
            <span className="xxs" style={{ color: 'var(--rose-tint)', marginTop: 12 }}>Demonstration prices. Final prices are confirmed in a quote.</span>
          </div>
        </div>
      </section>

      <section className="container stack g32" style={{ padding: '88px 24px 0' }}>
        <div className="row between end wrap g16">
          <div className="stack g10"><span className="eyebrow">{t(TX.wedding)}</span><h2 className="h2 bn">গাড়ি সাজানো · গায়ে হলুদ · বাসর ঘর</h2></div>
          <Link href="/wedding" className="small">{t(TX.viewAll)}</Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 24 }}>
          {tiles.map((s) => s && (
            <Link key={s.id} href={`/service/${s.id}`} className="stack g12" style={{ color: 'var(--ink)', textDecoration: 'none' }}>
              <Photo src={IMG(s.img || s.id, 0, 700)} alt={s.name[0]} />
              <span className="stack" style={{ gap: 2 }}>
                <span className="bn" style={{ fontSize: 20, fontWeight: 500 }}>{s.name[1]}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>{s.name[0]}</span>
                <span className="small muted">{svcPrice(s)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container" style={{ padding: '56px 24px 88px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 24 }}>
        {([['wedding', TX.wedding, TX.weddingTitle, TX.weddingLead, '/wedding'], ['event', TX.events, TX.eventsTitle, TX.eventsLead, '/events']] as const).map(([g, eb, title, lead, href]) => (
          <div key={g} className="card card-lg">
            <span className="eyebrow">{t(eb)}</span>
            <h2 className="display" style={{ fontSize: 38, lineHeight: 1.05 }}>{t(title)}</h2>
            <p className="muted">{t(lead)}</p>
            <div className="stack">
              {svcs(g).map((x) => (
                <Link key={x.id} href={`/service/${x.id}`} className="row between g12" style={{ padding: '12px 0', borderTop: '1px solid var(--soft-2)', color: 'var(--ink)', textDecoration: 'none' }}>
                  <span>{t(x.name)}</span><span className="xs muted">{svcPrice(x)} →</span>
                </Link>
              ))}
            </div>
            <Link href={href} className="small">{t(TX.viewAll)}</Link>
          </div>
        ))}
      </section>

      <section style={{ background: 'var(--sage-bg)' }}>
        <div className="container split" style={{ padding: '80px 24px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 40 }}>
          <div className="stack g16">
            <span className="eyebrow" style={{ color: '#4e5c43' }}>{t(TX.corporate)}</span>
            <h2 className="h2">{t(TX.corpTitle)}</h2>
            <p style={{ color: 'var(--sage-dark)', maxWidth: 480 }}>{t(TX.corpLead)}</p>
            <Link href="/corporate" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t(TX.corpCta)}</Link>
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
            {['Office & reception flowers', 'Client and employee gifts', 'Opening ceremonies', 'Recurring weekly or monthly supply'].map((x) => (
              <li key={x} style={{ borderTop: '1px solid #c9d1be', paddingTop: 12, color: 'var(--sage-dark)' }}>{x}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band stack g32">
        <h2 className="h2">{t(TX.howTitle)}</h2>
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: 24 }}>
          {([['01', TX.how1, TX.how1b], ['02', TX.how2, TX.how2b], ['03', TX.how3, TX.how3b], ['04', TX.how4, TX.how4b]] as const).map(([n, a, b]) => (
            <li key={n} className="stack g8" style={{ borderTop: '1px solid var(--ink)', paddingTop: 18 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--rose)' }}>{n}</span>
              <span style={{ fontSize: 17, fontWeight: 500 }}>{t(a)}</span>
              <span className="small muted" style={{ textWrap: 'pretty' }}>{t(b)}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="container" style={{ padding: '0 24px 96px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 48 }}>
        <div className="stack g16">
          <h2 className="h2">{t(TX.faqTitle)}</h2>
          <div>
            {cat.settings.faqs.slice(0, 4).map((q) => (
              <details key={q.q} style={{ borderTop: '1px solid var(--hair)', padding: '16px 0' }}><summary style={{ fontSize: 17, minHeight: 28 }}>{q.q}</summary><p className="muted" style={{ margin: '10px 0 0' }}>{q.a}</p></details>
            ))}
          </div>
          <Link href="/faq" className="small">{t(TX.allFaq)} →</Link>
        </div>
        <div className="bg-soft stack g16" style={{ padding: 40, alignSelf: 'start' }}>
          <h2 className="display" style={{ fontSize: 36, lineHeight: 1.05 }}>{t(TX.contactTitle)}</h2>
          <p className="muted">{t(TX.contactLead)}</p>
          <span className="small muted">{contactLine}</span>
          <a href={wa} target="_blank" rel="noopener" className="btn btn-outline" style={{ alignSelf: 'flex-start' }}>{hasWa ? t(TX.whatsapp) : t(TX.contactUs)}</a>
        </div>
      </section>
    </>
  );
}
