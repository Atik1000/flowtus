'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fmt, issueText } from '@flowtus/core';
import { IMG, Photo, useLang, useToast } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { useCart } from './Providers';
import { writeDraft } from './useForm';

export function CartView() {
  const { t } = useLang();
  const toast = useToast();
  const router = useRouter();
  const { cart, setCart, priced, ready } = useCart();
  const blocked = priced.blocking;

  if (!ready) return <section className="page-form"><h1 className="h1">{t(TX.cart)}</h1></section>;
  if (!cart.length) {
    return (
      <section className="page-form">
        <h1 className="h1">{t(TX.cart)}</h1>
        <div className="empty">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>{t(TX.cartEmpty)}</span>
          <span className="muted">Bouquets, gift boxes and extras you add will appear here.</span>
          <div className="row wrap g10" style={{ justifyContent: 'center' }}>
            <Link href="/shop/flowers" className="btn btn-rose">{t(TX.shopFlowers)}</Link>
            <Link href="/build" className="btn btn-outline">{t(TX.buildCta)}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-form">
      <h1 className="h1">{t(TX.cart)}</h1>
      <div className="two-col">
        <div className="span2 stack">
          {priced.lines.map((l) => {
            const p = l.pr.p;
            const isGift = l.kind === 'gift';
            const priceChanged = l.pr.issues.some((x) => x.code === 'price-changed');
            return (
              <div key={l.key} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0, 1fr)', gap: 18, padding: '20px 0', borderBottom: '1px solid var(--hair)' }}>
                <div style={{ width: 96 }}><Photo src={p?.img ? IMG(p.img, 0, 300) : null} alt="" placeholder="" /></div>
                <div className="stack g6" style={{ minWidth: 0 }}>
                  <div className="row between wrap g12" style={{ alignItems: 'flex-start' }}>
                    <Link href={p ? `/p/${p.slug}` : '/'} style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--ink)', textDecoration: 'none' }}>{(isGift ? 'Gift: ' : '') + (p ? p.name : 'Item no longer available')}</Link>
                    <span>{fmt(l.pr.total)}</span>
                  </div>
                  <span className="small muted">{l.pr.v?.name} · {fmt(l.pr.unit)} each</span>
                  {l.pr.parts.length ? <div className="stack xs muted">{l.pr.parts.map((x, i) => <span key={i}>{(x.role === 'wrap' ? 'Wrap: ' : '+ ') + x.name + (x.qty > 1 ? ' × ' + x.qty : '') + ' · ' + (x.line ? fmt(x.line) : 'Included')}</span>)}</div> : null}
                  {l.message ? <span className="xs muted italic" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>Card: “{l.message}”</span> : null}
                  {l.recipient ? <span className="xs muted">For {l.recipient}</span> : null}
                  {l.pr.issues.length ? (
                    <div role="alert" className="note error stack g6" style={{ fontSize: 14, padding: '10px 12px' }}>
                      {l.pr.issues.map((x, i) => <span key={i}>{issueText(x)}</span>)}
                      {priceChanged ? <button type="button" className="btn btn-xs btn-danger" style={{ alignSelf: 'flex-start', borderColor: 'var(--err)' }} onClick={() => setCart(cart.map((x) => (x.key === l.key ? { ...x, snapUnit: l.pr.unit } : x)))}>Accept new price</button> : null}
                    </div>
                  ) : null}
                  <div className="row wrap g14" style={{ marginTop: 6 }}>
                    <div className="stepper-qty">
                      <button type="button" aria-label="Decrease quantity" onClick={() => { if (+l.qty > 1) setCart(cart.map((x) => (x.key === l.key ? { ...x, qty: +x.qty - 1 } : x))); }}>−</button>
                      <span aria-live="polite">{l.qty}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => { if (p && +l.qty >= p.maxQty) { toast(`You can order up to ${p.maxQty} of this item.`); return; } setCart(cart.map((x) => (x.key === l.key ? { ...x, qty: +x.qty + 1 } : x))); }}>+</button>
                    </div>
                    {isGift ? <button type="button" className="link-btn" onClick={() => { writeDraft('build', { productId: l.productId, variantId: l.variantId, wrapId: l.wrapId || 'signature', extras: l.extras || [], message: l.message || '', recipient: l.recipient || '', step: 5, editKey: l.key }); router.push('/build'); }}>Edit gift</button> : null}
                    <button type="button" className="link-btn plain" onClick={() => { setCart(cart.filter((x) => x.key !== l.key)); toast('Removed from your cart.'); }}>Remove</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="summary">
          <div className="row between" style={{ fontSize: 15 }}><span>{t(TX.subtotal)}</span><span>{fmt(priced.subtotal)}</span></div>
          <div className="row between small muted"><span>{t(TX.delivery)}</span><span>Calculated at checkout</span></div>
          {blocked ? <div role="alert" className="note error" style={{ fontSize: 14, padding: '10px 12px' }}>Some items need attention before you can check out.</div> : null}
          <Link href={blocked ? '/cart' : '/checkout'} aria-disabled={blocked} className="btn btn-rose btn-lg">{t(TX.checkout)}</Link>
          <Link href="/shop/flowers" className="small" style={{ textAlign: 'center', color: 'var(--ink)' }}>{t(TX.continueShopping)}</Link>
        </aside>
      </div>
    </section>
  );
}
