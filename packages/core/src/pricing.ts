/* Catalogue & pricing. [server] functions must run on the server against the database; client copies are for instant feedback only. */
import { fmt, isWhole } from './util';
import type { CustomItem, Db, Product } from './types';

export const findP = (db: Db, id: string): Product | undefined => db.products.find((p) => p.id === id);
export const variantOf = (p: Product | undefined, vid?: string) => (p ? p.variants.find((v) => v.id === vid) : undefined);
export const visible = (p?: Product | null) => !!p && !p.archived;
export function minPrice(p: Product): number | null {
  const ps = p.variants.filter((v) => v.price != null).map((v) => v.price as number);
  return ps.length ? Math.min(...ps) : null;
}

export function productIssue(p: Product | undefined, vid?: string): string | null {
  if (!p) return 'missing';
  if (p.archived) return 'archived';
  if (!p.available) return 'unavailable';
  const v = variantOf(p, vid);
  if (!v) return 'variant-missing';
  if (!v.available) return 'variant-unavailable';
  if (v.price == null || isNaN(v.price)) return 'no-price';
  return null;
}

export interface Issue {
  code: string;
  what?: string;
  max?: number;
  from?: number;
  to?: number;
}
const ISSUE: Record<string, (w: string, x: Issue) => string> = {
  missing: (w) => (w || 'This item') + ' is no longer sold. Remove it to continue.',
  archived: (w) => w + ' has been removed from the catalogue. Remove it to continue.',
  unavailable: (w) => w + ' is currently unavailable. Remove it to continue.',
  'variant-missing': (w) => 'The size you chose for ' + w + ' is no longer offered. Remove it and choose again.',
  'variant-unavailable': (w) => 'The size you chose for ' + w + ' is currently unavailable.',
  'no-price': (w) => w + ' needs a price from our team. Ask us on WhatsApp.',
  'qty-limit': (w, x) => 'You can order up to ' + x.max + ' of ' + w + '.',
  'qty-invalid': () => 'Quantity must be a whole number of at least 1.',
  'price-changed': (w, x) => 'The price of ' + w + ' changed from ' + fmt(x.from) + ' to ' + fmt(x.to) + '. Review and accept the new price to continue.',
};
export const issueText = (i: Issue): string => (ISSUE[i.code] ? ISSUE[i.code](i.what || '', i) : i.code);

export interface CartLine {
  key?: string;
  kind?: 'product' | 'gift';
  productId: string;
  variantId: string;
  qty: number | string;
  addons?: { id: string; qty: number }[];
  extras?: { id: string; qty: number }[];
  wrapId?: string;
  message?: string;
  recipient?: string;
  snapUnit?: number;
  editKey?: string;
}

export function configKey(l: CartLine): string {
  const ad = (l.addons || l.extras || [])
    .filter((a) => a.qty > 0)
    .map((a) => a.id + ':' + a.qty)
    .sort()
    .join(',');
  return [l.kind || 'product', l.productId, l.variantId, l.wrapId || '', ad, (l.message || '').trim(), (l.recipient || '').trim()].join('|');
}

export interface Part {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  line: number;
  role: 'wrap' | 'extra' | 'addon';
}
export interface PricedLine {
  p?: Product;
  v?: Product['variants'][number];
  unit: number;
  total: number;
  parts: Part[];
  issues: Issue[];
  blocking: boolean;
}

/* [server] Prices one cart line from live catalogue data. */
export function priceLine(db: Db, line: CartLine): PricedLine {
  const issues: Issue[] = [];
  const parts: Part[] = [];
  const p = findP(db, line.productId);
  const v = variantOf(p, line.variantId);
  const name = p ? p.name : 'Item';
  const iss = productIssue(p, line.variantId);
  if (iss) issues.push({ code: iss, what: name });
  let unit = v && v.price != null ? v.price : 0;
  const addPart = (id: string, qty: number, role: Part['role']) => {
    const ap = findP(db, id);
    const av = ap && ap.variants[0];
    const ai = productIssue(ap, av && av.id);
    if (ai) issues.push({ code: ai, what: ap ? ap.name : 'An extra' });
    if (ap && qty > ap.maxQty) issues.push({ code: 'qty-limit', what: ap.name, max: ap.maxQty });
    const pr = av && av.price != null ? av.price : 0;
    unit += pr * qty;
    parts.push({ id, name: ap ? ap.name : 'Removed extra', qty, unitPrice: pr, line: pr * qty, role });
  };
  if (line.kind === 'gift') {
    if (line.wrapId && line.wrapId !== 'signature') addPart(line.wrapId, 1, 'wrap');
    else parts.push({ id: 'signature', name: 'Signature FLOWTUS wrap', qty: 1, unitPrice: 0, line: 0, role: 'wrap' });
    (line.extras || []).filter((a) => a.qty > 0).forEach((a) => addPart(a.id, a.qty, 'extra'));
  } else (line.addons || []).filter((a) => a.qty > 0).forEach((a) => addPart(a.id, a.qty, 'addon'));
  if (!isWhole(line.qty) || +line.qty < 1) issues.push({ code: 'qty-invalid', what: name });
  else if (p && +line.qty > p.maxQty) issues.push({ code: 'qty-limit', what: name, max: p.maxQty });
  if (!issues.length && line.snapUnit != null && line.snapUnit !== unit) issues.push({ code: 'price-changed', what: name, from: line.snapUnit, to: unit });
  return { p, v, unit, total: unit * (+line.qty || 0), parts, issues, blocking: issues.length > 0 };
}

export interface PricedCart {
  lines: (CartLine & { pr: PricedLine })[];
  subtotal: number;
  fee: number | null;
  total: number;
  blocking: boolean;
  leadDays: number;
  count: number;
}
export function priceCart(db: Db, cart: CartLine[], areaId?: string | null): PricedCart {
  const lines = cart.map((l) => ({ ...l, pr: priceLine(db, l) }));
  const subtotal = lines.reduce((s, l) => s + l.pr.total, 0);
  const area = db.areas.find((a) => a.id === areaId && a.delivery);
  const fee = area ? area.fee : null;
  const leadDays = Math.max(0, ...lines.map((l) => (l.pr.p && l.pr.p.leadDays) || 0));
  return { lines, subtotal, fee, total: subtotal + (fee || 0), blocking: lines.some((l) => l.pr.blocking), leadDays, count: lines.reduce((s, l) => s + (+l.qty || 0), 0) };
}

export function customEstimate(item: CustomItem | undefined, qty: unknown): { value: number | null; onRequest?: boolean; confirm?: boolean } {
  if (!item) return { value: null };
  if (item.unitPrice == null || item.priceMode === 'quote') return { value: null, onRequest: true };
  if (!isWhole(qty) || +(qty as any) <= 0) return { value: null };
  return { value: item.unitPrice * +(qty as any), confirm: item.priceMode === 'confirm' || item.seasonal };
}
