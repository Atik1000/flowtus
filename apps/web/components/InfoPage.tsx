import Link from 'next/link';
import type { ReactNode } from 'react';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

/** Shell for FAQ, contact and policy pages: help navigation on the left, draft badge until the owner approves the copy. */
export async function InfoPage({ active, title, draft, children }: { active: string; title: string; draft: boolean; children: ReactNode }) {
  const { cat, t } = await pageContext();
  return (
    <section style={{ maxWidth: 1040, margin: '0 auto', padding: '56px 24px 96px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 48, alignItems: 'start' }}>
      <nav aria-label="Help" className="stack" style={{ gap: 2 }}>
        <Link href="/faq" style={{ padding: '8px 0', color: active === 'faq' ? 'var(--rose)' : 'var(--ink)' }}>{t(TX.faq)}</Link>
        <Link href="/contact" style={{ padding: '8px 0', color: active === 'contact' ? 'var(--rose)' : 'var(--ink)' }}>{t(TX.contact)}</Link>
        {Object.entries(cat.settings.policies).map(([k, p]) => <Link key={k} href={`/policy/${k}`} style={{ padding: '8px 0', color: active === k ? 'var(--rose)' : 'var(--ink)' }}>{t(p.title)}</Link>)}
      </nav>
      <article className="stack g18" style={{ gridColumn: 'span 3', minWidth: 0, gap: 18 }}>
        <h1 className="h1-sm">{title}</h1>
        {draft ? <div className="note warn" style={{ fontSize: 14, padding: '10px 14px' }}>Draft — pending owner review. Not yet an approved FLOWTUS policy.</div> : null}
        {children}
      </article>
    </section>
  );
}
