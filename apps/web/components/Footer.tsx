import Link from 'next/link';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';
import { showDemo } from './demo';

export async function Footer() {
  const { cat, t, db } = await pageContext();
  const s = cat.settings;
  const contactLine = [s.phone && `Phone ${s.phone}`, s.whatsapp && `WhatsApp ${s.whatsapp}`, s.email].filter(Boolean).join(' · ') || 'Contact details coming soon.';
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
  const col = (title: string, links: [string, string][]) => (
    <nav aria-label={title} className="stack g8 small">
      <span className="col-h">{title}</span>
      {links.map(([href, label]) => <Link key={href + label} href={href}>{label}</Link>)}
    </nav>
  );
  return (
    <footer className="site-footer">
      <div className="container" style={{ padding: '64px 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 36 }}>
        <div className="stack g12">
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.3em', color: 'var(--bg)' }}>FLOWTUS</span>
          <span className="small">Flowers, gifts and floral services in Dhaka.</span>
          <span className="xs" style={{ color: 'var(--rose-tint)' }}>{contactLine}</span>
        </div>
        {col(t(TX.footShop), [['/shop/flowers', t(TX.flowers)], ['/shop/gifts', t(TX.gifts)], ['/shop/extras', 'Extras'], ['/occasions', t(TX.occasions)], ['/build', t(TX.build)]])}
        {col(t(TX.footServices), [['/wedding', t(TX.wedding)], ['/events', t(TX.events)], ['/corporate', t(TX.corporate)], ['/custom', t(TX.custom)]])}
        {col(t(TX.footHelp), [['/faq', t(TX.faq)], ['/contact', t(TX.contact)], ['/track', t(TX.track)], ...Object.entries(db.settings.policies).map(([k, p]) => [`/policy/${k}`, t(p.title as any)] as [string, string])])}
      </div>
      <div className="container row between wrap g16 xs" style={{ padding: '20px 24px 32px', borderTop: '1px solid #5a4250', color: 'var(--rose-tint)' }}>
        <span>{showDemo ? t(TX.demoBar) : '© FLOWTUS'}</span>
        <a href={adminUrl} style={{ color: 'var(--rose-tint)' }}>Owner admin</a>
      </div>
    </footer>
  );
}
