import { BadRequestException } from '@nestjs/common';
import type { CartLine } from '@flowtus/core';

const str = (v: unknown, max = 200) => String(v ?? '').slice(0, max);
const parts = (v: unknown) =>
  (Array.isArray(v) ? v : []).slice(0, 20).map((a: any) => ({ id: str(a?.id, 80), qty: Math.trunc(Number(a?.qty)) || 0 }));

/** Copies only the fields the pricing rules read. Client-supplied prices, totals and flags are dropped; the server re-prices everything. */
export function sanitizeCart(input: unknown): CartLine[] {
  if (!Array.isArray(input)) throw new BadRequestException('Your cart is empty.');
  if (input.length > 50) throw new BadRequestException('Your cart has too many lines.');
  return input.map((l: any) => ({
    key: str(l?.key, 40),
    kind: l?.kind === 'gift' ? 'gift' : 'product',
    productId: str(l?.productId, 80),
    variantId: str(l?.variantId, 80),
    qty: typeof l?.qty === 'number' || typeof l?.qty === 'string' ? l.qty : 0,
    addons: parts(l?.addons),
    extras: parts(l?.extras),
    wrapId: l?.wrapId ? str(l.wrapId, 80) : undefined,
    message: str(l?.message, 400),
    recipient: str(l?.recipient, 120),
    snapUnit: Number.isFinite(Number(l?.snapUnit)) && l?.snapUnit != null ? Number(l.snapUnit) : undefined,
  }));
}

/** Plain string fields only (no nested objects), with a size cap, for free-form form bodies. */
export function sanitizeFields(input: any, maxKeys = 60): Record<string, any> {
  const out: Record<string, any> = {};
  if (!input || typeof input !== 'object') return out;
  Object.keys(input).slice(0, maxKeys).forEach((k) => {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k)) return;
    const v = input[k];
    if (typeof v === 'string') out[k] = v.slice(0, 2000);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).map((x) => str(x, 120));
    else if (v && typeof v === 'object' && k === 'photo') out[k] = { id: str((v as any).id, 40) };
  });
  return out;
}
