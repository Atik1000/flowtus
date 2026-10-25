/* Pure language helpers (no 'use client'), so server components can call them. */
export type Lang = 'en' | 'bn';
export type Bi = readonly [string, string] | string;

/** Every bilingual string is stored as a pair [English, বাংলা]. Falls back to English when Bangla copy is missing. */
export function pick(lang: Lang, x: Bi | undefined | null): string {
  if (x == null) return '';
  if (typeof x === 'string') return x;
  return lang === 'bn' ? x[1] || x[0] : x[0];
}
