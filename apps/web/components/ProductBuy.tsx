'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fmt, priceLine, productIssue, variantOf, type CartLine, type Product } from '@flowtus/core';
import { Field, useLang, useToast } from '@flowtus/ui';
import { waHref } from '@/lib/helpers';
import { TX } from '@/lib/text';
import { addonItems, setAddonQty } from './addons';
import { useCart, useCatalogue } from './Providers';

/** Variant, add-ons, quantity, gift message and add-to-cart. Prices come from the live catalogue; the server re-prices at checkout. */
export function ProductBuy({ productId }: { productId: string }) {
  const { t, lang } = useLang();
  const toast = useToast();
  const { db, cat } = useCatalogue();
  const { addLine } = useCart();
  const p = db.products.find((x) => x.id === productId) as Product;
  const firstOk = p.variants.find((v) => v.available && v.price != null) || p.variants[0];
  const [variantId, setVariantId] = useState(firstOk?.id || '');
  const [qty, setQty] = useState(1);
  const [addons, setAddons] = useState<{ id: string; qty: number }[]>([]);
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('');
  useEffect(() => { if (!p.variants.some((v) => v.id === variantId)) setVariantId(firstOk?.id || ''); }, [p, variantId, firstOk]);

  const v = variantOf(p, variantId);
  const issue = productIssue(p, variantId);
  const extras = db.products.filter((x) => !x.archived && x.dept === 'extras' && !x.wrap);
  const line: CartLine = { kind: 'product', productId: p.id, variantId, qty, addons, message, recipient };
  const pr = priceLine(db, line);
  const canBuy = !issue;
  const avail =
    issue === 'unavailable' ? { dot: 'var(--err-strong)', label: 'Currently unavailable' }
    : issue === 'variant-unavailable' ? { dot: 'var(--err-strong)', label: 'This size is currently unavailable. Choose another size.' }
    : issue === 'no-price' ? { dot: 'var(--gold)', label: 'Price confirmed by our team on request' }
    : p.leadDays ? { dot: 'var(--gold)', label: `Needs ${p.leadDays} day${p.leadDays > 1 ? 's' : ''}’ notice` }
    : { dot: 'var(--sage)', label: `Available for same-day delivery before ${db.delivery.cutoffHour}:00` };
  const setQ = (n: number) => {
    if (n < 1) return;
    if (n > p.maxQty) { toast(`You can order up to ${p.maxQty} of this item.`); return; }
    setQty(n);
  };
  const add = () => {
    if (message.length > 200) { toast('Keep the gift message under 200 characters.'); return; }
    if (addLine(line)) { setAddons([]); setMessage(''); setRecipient(''); setQty(1); toast(`${p.name} added to your cart.`, '/cart', 'View cart'); }
  };

  return (
    <div className="stack g22" style={{ gap: 22, maxWidth: 520 }}>
      <span style={{ fontSize: 22 }}>{v && v.price != null ? fmt(v.price) : t(TX.priceOnRequest)}</span>
      {p.sample ? <div className="note warn" style={{ fontSize: 13, padding: '10px 14px' }}>Sample listing. Photo, flowers and price are demonstration values until FLOWTUS confirms them.</div> : null}
      <div className="row g10 small"><span style={{ width: 8, height: 8, borderRadius: '50%', background: avail.dot, flex: 'none' }} />{avail.label}</div>
      {p.variants.length > 1 ? (
        <Field type="chips" name="variant" label="Size" value={variantId} onChange={setVariantId}
          options={p.variants.map((x) => ({ value: x.id, label: x.name, sub: x.price != null ? fmt(x.price) : 'Price on request', disabled: !x.available, reason: 'Unavailable' }))} />
      ) : null}
      {p.addons && canBuy ? <Field type="addons" name="addons" label="Add extras" hint="Optional. Added to each item." items={addonItems(extras, addons, lang)} onQty={(id, q) => setAddons((cur) => setAddonQty(cur, extras, id, q, toast))} /> : null}
      {canBuy ? (
        <>
          <div className="stack g8">
            <span className="small" style={{ fontWeight: 500 }}>Quantity</span>
            <div className="row g14">
              <div className="stepper-qty">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQ(qty - 1)}>−</button>
                <span aria-live="polite">{qty}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQ(qty + 1)}>+</button>
              </div>
              <span className="xs muted">Up to {p.maxQty}</span>
            </div>
          </div>
          <Field type="textarea" name="message" label="Gift card message" maxLen={200} rows={3} ph="Optional" value={message} onChange={setMessage} error={message.length > 200 ? 'Keep the message under 200 characters.' : ''} />
          <Field type="text" name="recipient" label="Recipient name" ph="Optional" value={recipient} onChange={setRecipient} />
        </>
      ) : null}
      <div className="stack g10">
        <button type="button" className="btn btn-rose btn-lg" disabled={!canBuy} onClick={add}>
          {canBuy ? `${t(TX.addToCart)} · ${fmt(pr.total)}` : issue === 'no-price' ? t(TX.priceOnRequest) : 'Currently unavailable'}
        </button>
        {issue === 'no-price' ? <Link href={p.dept === 'wedding' ? '/book/wedding-accessories' : '/custom'} className="btn btn-primary">Request a quote</Link> : null}
        <a href={waHref(cat.settings.whatsapp, `Hello FLOWTUS, I have a question about ${p.name}.`)} target="_blank" rel="noopener" className="btn btn-outline">
          {cat.settings.whatsapp ? 'Ask about this on WhatsApp' : 'Ask us about this'}
        </a>
      </div>
    </div>
  );
}
