/* Shared helpers: ids, money, Asia/Dhaka time, validation. Pure and isomorphic (browser + Node). */

const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const rid = (n: number): string =>
  Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)), (x) => A[x % A.length]).join('');
export const token = (): string => rid(22);
export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
export const fmt = (n: number | null | undefined): string =>
  n == null || isNaN(Number(n)) ? '—' : '৳' + Math.round(Number(n)).toLocaleString('en-US');

/* ---------- Time (Asia/Dhaka) ---------- */
export interface DhakaNow {
  date: string;
  hour: number;
  minute: number;
}
export function dhakaNow(d?: Date): DhakaNow {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d || new Date());
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { date: g('year') + '-' + g('month') + '-' + g('day'), hour: +g('hour') % 24, minute: +g('minute') };
}
export const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 864e5);
export const weekday = (iso: string): number => new Date(iso + 'T00:00:00Z').getUTCDay();
export const fmtDate = (iso?: string | null, lang?: string): string =>
  iso
    ? new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
        timeZone: 'UTC',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
export const fmtStamp = (ts: number, lang?: string): string =>
  new Date(ts).toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    timeZone: 'Asia/Dhaka',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
export const refCode = (prefix: string, now: DhakaNow): string =>
  prefix + '-' + now.date.slice(2).replace(/-/g, '') + '-' + rid(4);

/* ---------- Validation helpers ---------- */
export function normPhone(p: unknown): string | null {
  const s = String(p || '')
    .replace(/[\s\-().]/g, '')
    .replace(/^\+?88(?=01)/, '');
  return /^01[3-9]\d{8}$/.test(s) ? s : null;
}
export const validEmail = (e: unknown): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());
export const isWhole = (v: unknown): boolean => /^\d+$/.test(String(v == null ? '' : v).trim());

export const UPLOAD = {
  types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
  maxBytes: 5 * 1024 * 1024,
};
export function checkUpload(file?: { type: string; size: number } | null): string | null {
  if (!file) return null;
  if (!UPLOAD.types.includes(file.type)) return 'Use a JPG, PNG, WEBP or HEIC photo.';
  if (file.size > UPLOAD.maxBytes) return 'Photo must be 5 MB or smaller.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}
