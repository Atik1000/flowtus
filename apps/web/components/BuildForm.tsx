'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEPTS, fmt, issueText, minPrice, priceLine, productIssue, findP, type CartLine } from '@flowtus/core';
import { IMG, useLang, useToast } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { addonItems, setAddonQty } from './addons';
import { ff } from './fields';
import { FormPage } from './FormPage';
import { useCart, useCatalogue } from './Providers';
import { useForm } from './useForm';

interface Draft { productId: string; variantId: string; wrapId: string; extras: { id: string; qty: number }[]; message: string; recipient: string; step: number; editKey?: string }
const BLANK: Draft = { productId: '', variantId: '', wrapId: 'signature', extras: [], message: '', recipient: '', step: 1 };

/** Five steps — flowers, wrap, extras, message, review. Each step is validated, a live itemised total is shown, and the draft survives a refresh. */
export function BuildForm() {
  const { t, lang } = useLang();
  const toast = useToast();
  const router = useRouter();
  const { db } = useCatalogue();
  const { addLine } = useCart();
  const form = useForm<Draft>('build', BLANK, { persist: true });
  const g = form.v;
  const step = g.step || 1;
  const [banner, setBanner] = useState<string | null>(null);
  useEffect(() => { document.title = 'Build your own gift · FLOWTUS'; }, []);

  const p = g.productId ? findP(db, g.productId) : undefined;
  const line: CartLine = { kind: 'gift', productId: g.productId, variantId: g.variantId, wrapId: g.wrapId || 'signature', extras: g.extras || [], qty: 1, message: g.message || '', recipient: g.recipient || '' };
  const pr = p ? priceLine(db, line) : null;
  const wrapP = g.wrapId && g.wrapId !== 'signature' ? findP(db, g.wrapId) : undefined;
  const ok: Record<number, boolean> = { 1: !!p && !productIssue(p, g.variantId), 2: g.wrapId === 'signature' || (!!wrapP && !productIssue(wrapP, 'std')), 3: !(pr && pr.issues.some((i) => i.code === 'qty-limit')), 4: String(g.message || '').length <= 200, 5: true };
  const errFor: Record<number, string> = { 1: !p ? 'Choose flowers to continue.' : 'These flowers are not available in that size. Choose another.', 2: 'This wrap is not available. Choose another.', 3: 'Reduce the quantity of extras to continue.', 4: 'Keep the message under 200 characters.' };
  const goStep = (n: number) => {
    for (let i = 1; i < n; i++) if (!ok[i]) { setBanner(errFor[i]); form.set('step', i); return; }
    setBanner(null);
    form.set('step', n);
  };
  const pick = (id: string) => { const pp = findP(db, id)!; const vv = pp.variants.find((v) => v.available && v.price != null) || pp.variants[0]; form.setMany({ productId: id, variantId: vv.id }); };
  const extrasList = db.products.filter((x) => x.builderExtra && !x.archived);
  const catLabel = (x: typeof db.products[number]) => { const c = DEPTS[x.dept]?.cats.find((k) => k[0] === x.cat); return c ? c[lang === 'bn' ? 2 : 1] : ''; };

  let sections: any[] = [];
  if (step === 1) sections = [{ key: 's1', title: 'Choose flowers', fields: [
    ff({ type: 'cards', name: 'productId', value: g.productId, onChange: pick, options: db.products.filter((x) => x.builder && !x.archived).map((x) => ({ value: x.id, label: x.name, eyebrow: catLabel(x), price: x.variants.length > 1 ? 'From ' + fmt(minPrice(x)) : fmt(minPrice(x)), img: x.img ? IMG(x.img, 0, 400) : undefined, disabled: !x.available || minPrice(x) == null, reason: 'Currently unavailable' })) }),
    ...(p && p.variants.length > 1 ? [ff({ type: 'chips', name: 'variantId', label: 'Size', value: g.variantId, onChange: (v) => form.set('variantId', v), options: p.variants.map((x) => ({ value: x.id, label: x.name, sub: x.price != null ? fmt(x.price) : '', disabled: !x.available, reason: 'Unavailable' })) })] : []),
  ] }];
  if (step === 2) sections = [{ key: 's2', title: 'Choose wrapping', fields: [ff({ type: 'cards', name: 'wrapId', cardMin: '220px', value: g.wrapId || 'signature', onChange: (v) => form.set('wrapId', v), options: [{ value: 'signature', label: 'Signature FLOWTUS wrap', sub: 'Ivory paper and ribbon.', price: 'Included' }, ...db.products.filter((x) => x.wrap && !x.archived).map((x) => ({ value: x.id, label: x.name, price: '+ ' + fmt(x.variants[0].price), disabled: !x.available, reason: 'Currently unavailable' }))] })] }];
  if (step === 3) sections = [{ key: 's3', title: 'Add extras', desc: 'Optional. Each extra adds to the gift total.', fields: [ff({ type: 'addons', name: 'extras', items: addonItems(extrasList, g.extras || [], lang), onQty: (id, q) => form.set('extras', setAddonQty(g.extras || [], extrasList, id, q, toast)) })] }];
  if (step === 4) sections = [{ key: 's4', title: 'Personal message', fields: [ff({ type: 'textarea', name: 'message', label: 'Card message', maxLen: 200, rows: 4, ph: 'Write a short note for the card', value: g.message, onChange: (v) => form.set('message', v), error: g.message.length > 200 ? errFor[4] : '' }), ff({ type: 'text', name: 'recipient', label: 'Recipient name', ph: 'Optional', value: g.recipient, onChange: (v) => form.set('recipient', v) })] }];
  if (step === 5) sections = [{ key: 's5', title: 'Review your gift', fields: [ff({ type: 'info', name: 'r', text: p ? 'Check the details on the right. You can go back to any step and your choices stay as they are.' : 'Choose flowers first.' }), ...((pr && pr.issues) || []).map((i) => ff({ type: 'info', name: '_i' + i.code, tone: 'error', text: issueText(i) }))] }];

  const labels = ['Flowers', 'Wrapping', 'Extras', 'Message', 'Review'];
  const rows = p ? [{ label: p.name, sub: pr?.v?.name, value: pr?.v && pr.v.price != null ? fmt(pr.v.price) : '—' }, ...(pr?.parts || []).map((x) => ({ label: (x.role === 'wrap' ? 'Wrap: ' : '') + x.name + (x.qty > 1 ? ' × ' + x.qty : ''), value: x.line ? fmt(x.line) : 'Included' }))] : [{ label: 'No flowers chosen yet', value: '—' }];
  const blocked = !p || !!pr?.blocking || !ok[4];

  return (
    <FormPage
      eyebrow="Build Your Own Gift" title="Build a gift"
      lead="Start with flowers, choose a wrap, add extras and a message. Your gift goes into the cart as one item and checks out like any other order."
      banner={banner ? { text: banner, tone: 'error' } : null}
      stepped={labels.map((l, i) => ({ label: `${i + 1}. ${l}`, on: step === i + 1, onClick: () => goStep(i + 1) }))}
      sections={sections}
      nav={{ back: step > 1 ? () => goStep(step - 1) : undefined, backLabel: t(TX.back), next: step < 5 ? () => goStep(step + 1) : undefined, nextLabel: t(TX.next), clear: step === 1 && p ? () => form.setMany({ productId: '', variantId: '' }) : undefined, clearLabel: 'Remove flowers' }}
      aside={{
        title: 'Your gift', rows, preview: g.message ? `“${g.message}”${g.recipient ? ` — for ${g.recipient}` : ''}` : '', totalLabel: 'Gift total', total: pr ? fmt(pr.total) : '—',
        notes: [pr && pr.issues.length ? { text: issueText(pr.issues[0]), tone: 'error' as const } : null, !p ? { text: 'Choose flowers to start your gift.', tone: 'warn' as const } : null].filter(Boolean) as any,
        button: (g.editKey ? 'Update gift in cart' : 'Add gift to cart') + (pr ? ' · ' + fmt(pr.total) : ''), disabled: blocked,
        onSubmit: () => {
          if (blocked) return;
          if (addLine({ ...line, editKey: g.editKey })) { form.reset(BLANK); toast(g.editKey ? 'Gift updated in your cart.' : 'Gift added to your cart.', '/cart', 'View cart'); if (g.editKey) router.push('/cart'); }
        },
        disclaimer: 'Delivery is added at checkout. Every order is confirmed by our team before it is prepared.',
      }}
    />
  );
}
