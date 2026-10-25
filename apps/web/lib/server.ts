import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { pick, type Bi, type Lang } from '@flowtus/ui';
import { toDb } from './catalogue';
import type { PublicCatalogue } from './types';

const API = process.env.API_URL || 'http://localhost:4000';

/** One catalogue fetch per request, revalidated every few seconds so admin edits show up quickly. */
export const getCatalogue = cache(async (): Promise<PublicCatalogue> => {
  const res = await fetch(`${API}/api/catalogue`, { next: { revalidate: 5 } });
  if (!res.ok) throw new Error(`Catalogue unavailable (${res.status})`);
  return res.json();
});

export const getLang = cache(async (): Promise<Lang> => ((await cookies()).get('ft-lang')?.value === 'bn' ? 'bn' : 'en'));

/** Server-side helpers bundled together for page components. */
export async function pageContext() {
  const [cat, lang] = await Promise.all([getCatalogue(), getLang()]);
  return { cat, lang, db: toDb(cat), t: (x: Bi | undefined | null) => pick(lang, x) };
}
