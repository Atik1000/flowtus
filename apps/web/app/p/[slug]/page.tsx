import Link from 'next/link';
import type { Metadata } from 'next';
import { DEPTS } from '@flowtus/core';
import { IMG, Photo } from '@flowtus/ui';
import { ProductBuy } from '@/components/ProductBuy';
import { ProductCard } from '@/components/ProductCard';
import { catName } from '@/lib/helpers';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { cat } = await pageContext();
  const p = cat.products.find((x) => x.slug === slug);
  return { title: p && !p.archived ? p.name : 'Product not found', description: p?.short };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { cat, lang, t } = await pageContext();
  const p = cat.products.find((x) => x.slug === slug);

  if (!p) {
    return (
      <section className="page-center">
        <h1 className="display" style={{ fontSize: 44 }}>This product could not be found</h1>
        <p className="muted">The link may be wrong, or the product is no longer sold.</p>
        <Link href="/shop/flowers" className="btn btn-rose">{t(TX.shopFlowers)}</Link>
      </section>
    );
  }
  const related = cat.products.filter((x) => !x.archived && x.id !== p.id && x.dept === p.dept && !x.wrap && x.occ.some((o) => p.occ.includes(o))).slice(0, 4);
  if (p.archived) {
    return (
      <section className="container stack g32" style={{ padding: '80px 24px' }}>
        <div className="stack g14" style={{ maxWidth: 640 }}>
          <h1 className="display" style={{ fontSize: 44 }}>{p.name} is no longer available</h1>
          <p className="muted">This product has been removed from our catalogue. Here are similar pieces.</p>
        </div>
        <div className="grid-products">{related.map((x) => <ProductCard key={x.id} p={x} lang={lang} />)}</div>
      </section>
    );
  }

  return (
    <section className="container stack" style={{ padding: '32px 24px 96px', gap: 56 }}>
      <nav aria-label="Breadcrumb" className="row wrap g8 xs muted">
        <Link href="/" style={{ color: 'var(--body)' }}>{t(TX.home)}</Link><span>/</span>
        <Link href={`/shop/${p.dept}`} style={{ color: 'var(--body)' }}>{t(DEPTS[p.dept].name)}</Link><span>/</span><span>{p.name}</span>
      </nav>
      <div className="split split-start">
        <div className="stack g12">
          <Photo src={p.img ? IMG(p.img, 0, 1000) : null} alt={p.name} eager />
          {p.img ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Photo src={IMG(p.img, 1, 600)} ratio="r11" placeholder="Detail photo" />
              <Photo src={IMG(p.img, 2, 600)} ratio="r11" placeholder="Detail photo" />
            </div>
          ) : null}
        </div>
        <div className="stack" style={{ gap: 22 }}>
          <span className="eyebrow">{catName(p, lang)}</span>
          <h1 className="h1">{p.name}</h1>
          <p className="muted">{p.short}</p>
          <ProductBuy productId={p.id} />
        </div>
      </div>
      <div className="facts">
        <div className="stack g8"><h2 className="h3">About this piece</h2><p className="muted">{p.description || p.short}</p></div>
        {p.composition ? <div className="stack g8"><h2 className="h3">What is included</h2><p className="muted">{p.composition}</p></div> : null}
        {p.care ? <div className="stack g8"><h2 className="h3">Care</h2><p className="muted">{p.care}</p><Link href="/policy/substitution" className="small">Substitution policy</Link></div> : null}
      </div>
      {related.length ? (
        <div className="stack g24">
          <h2 className="display" style={{ fontSize: 36 }}>You may also like</h2>
          <div className="grid-products">{related.map((x) => <ProductCard key={x.id} p={x} lang={lang} />)}</div>
        </div>
      ) : null}
    </section>
  );
}
