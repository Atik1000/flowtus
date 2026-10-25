import { DEPTS, fmt, unitLabel } from '@flowtus/core';
import type { Product, Service, CustomItem } from '@flowtus/core';
import type { Lang } from '@flowtus/ui';
import { TX } from './text';

export const catName = (p: Product, lang: Lang) => {
  const c = (DEPTS[p.dept]?.cats ?? []).find((x) => x[0] === p.cat);
  return c ? (lang === 'bn' ? c[2] : c[1]) : '';
};

export const svcPrice = (s: Service) => {
  if (s.priceModel === 'package' && s.packages.length) return 'Packages from ' + fmt(Math.min(...s.packages.map((p) => p.price)));
  if (s.fromPrice) return 'From ' + fmt(s.fromPrice) + (s.perUnit ? ' per ' + s.perUnit : '');
  return 'Quote on request';
};

export const customPrice = (c: CustomItem, lang: Lang) => {
  if (c.unitPrice == null || c.priceMode === 'quote') return lang === 'bn' ? TX.priceOnRequest[1] : TX.priceOnRequest[0];
  return fmt(c.unitPrice) + ' / ' + unitLabel(c.unit, 1, lang) + (c.priceMode === 'confirm' ? ' · to be confirmed' : '');
};

export const waHref = (whatsapp: string, text = 'Hello FLOWTUS') => {
  const n = String(whatsapp || '').replace(/\D/g, '').replace(/^88/, '');
  return n ? `https://wa.me/88${n}?text=${encodeURIComponent(text)}` : '/contact';
};
