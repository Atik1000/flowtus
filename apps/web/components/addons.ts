import { DEPTS, fmt, productIssue, type Product } from '@flowtus/core';
import type { AddonItem } from '@flowtus/ui';
import type { Lang } from '@flowtus/ui';

/** Builds the add-on cards for the shared Field renderer from catalogue products. */
export function addonItems(list: Product[], cur: { id: string; qty: number }[], lang: Lang): AddonItem[] {
  return list.map((p) => {
    const v = p.variants[0];
    const cat = (DEPTS[p.dept]?.cats.find((c) => c[0] === p.cat) || [])[lang === 'bn' ? 2 : 1] || '';
    return { id: p.id, cat, name: p.name, price: v && v.price != null ? fmt(v.price) : '', qty: (cur.find((x) => x.id === p.id) || { qty: 0 }).qty, disabled: !!productIssue(p, v && v.id), reason: 'Currently unavailable', max: p.maxQty };
  });
}

/** Applies a quantity change to a list of {id, qty}, honouring the product's max quantity. */
export function setAddonQty(cur: { id: string; qty: number }[], products: Product[], id: string, qty: number, toast: (m: string) => void) {
  const p = products.find((x) => x.id === id);
  if (p && qty > p.maxQty) { toast(`You can add up to ${p.maxQty} × ${p.name}.`); return cur; }
  const nx = cur.filter((x) => x.id !== id);
  if (qty > 0) nx.push({ id, qty });
  return nx;
}
