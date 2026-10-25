'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLang } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { useCart } from './Providers';

const NAV: [string, keyof typeof TX][] = [
  ['/shop/flowers', 'flowers'], ['/shop/gifts', 'gifts'], ['/occasions', 'occasions'], ['/wedding', 'wedding'],
  ['/events', 'events'], ['/corporate', 'corporate'], ['/build', 'build'], ['/custom', 'custom'],
];

const Svg = ({ children, size = 20 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{children}</svg>
);

export function Header() {
  const { t, lang, setLang } = useLang();
  const { count } = useCart();
  const path = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => { setMenu(false); setSearch(false); }, [path]);

  return (
    <header className="site-header">
      <div className="container row between g16" style={{ padding: '14px 24px' }}>
        <Link href="/" aria-label="FLOWTUS home" className="logo">
          <b>FLOWTUS</b>
          <small>FLOWERS · THOUGHTFULLY</small>
        </Link>
        <div className="row g4">
          <button type="button" className="icon-btn" aria-label={t(TX.search)} aria-expanded={search} onClick={() => setSearch((s) => !s)}>
            <Svg><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
          </button>
          <button type="button" aria-label="Switch language" onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
            style={{ minHeight: 44, padding: '0 10px', background: 'transparent', border: '1px solid var(--input)', borderRadius: 2, color: 'var(--ink)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-bn)' }}>
            {lang === 'en' ? 'বাংলা' : 'English'}
          </button>
          <Link href="/track" className="only-desktop" style={{ padding: '0 12px', minHeight: 44, display: 'flex', alignItems: 'center', color: 'var(--ink)', fontSize: 13, letterSpacing: '0.06em', textDecoration: 'none' }}>{t(TX.track)}</Link>
          <Link href="/cart" className="icon-btn" aria-label={`${t(TX.cart)}${count ? ` (${count})` : ''}`}>
            <Svg><path d="M5 8h14l-1.2 12H6.2L5 8z" /><path d="M9 8V6a3 3 0 016 0v2" /></Svg>
            {count > 0 ? <span className="badge">{count}</span> : null}
          </Link>
          <button type="button" className="icon-btn only-mobile" aria-label={t(TX.menu)} aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Svg size={22}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>
          </button>
        </div>
      </div>
      <nav aria-label="Main" className="nav-main only-desktop">
        {NAV.map(([href, key]) => <Link key={href} href={href} className={path === href || path.startsWith(href + '/') ? 'on' : ''}>{t(TX[key])}</Link>)}
      </nav>
      {search ? (
        <form role="search" className="container row g8" style={{ padding: '0 24px 16px' }} onSubmit={(e) => { e.preventDefault(); router.push('/search?q=' + encodeURIComponent(q.trim())); }}>
          <label htmlFor="site-search" className="sr-only">{t(TX.search)}</label>
          <input id="site-search" type="search" className="input" style={{ flex: 1, minWidth: 0 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Roses, birthday, chocolate…" autoFocus />
          <button type="submit" className="btn btn-primary">{t(TX.search)}</button>
        </form>
      ) : null}
      {menu ? (
        <nav aria-label="Mobile" className="mobile-nav">
          {NAV.map(([href, key]) => <Link key={href} href={href}>{t(TX[key])}</Link>)}
          <Link href="/track">{t(TX.track)}</Link>
        </nav>
      ) : null}
    </header>
  );
}
