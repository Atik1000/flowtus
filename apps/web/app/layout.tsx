import type { Metadata, Viewport } from 'next';
import '@flowtus/ui/styles.css';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Providers } from '@/components/Providers';
import { showDemo } from '@/components/demo';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

export const metadata: Metadata = {
  title: { default: 'FLOWTUS — Flowers, gifts & floral services · Dhaka', template: '%s · FLOWTUS' },
  description: 'Flowers, gifts, custom flower orders, wedding and event floral services in Dhaka.',
};
// Pages read the live catalogue and the language cookie, so nothing is prerendered at build time (no API needed to build).
export const dynamic = 'force-dynamic';

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { cat, lang, t } = await pageContext();
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500&family=Noto+Sans+Bengali:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Providers initialLang={lang} catalogue={cat}>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {showDemo ? <div className="demo-bar">{t(TX.demoBar)}</div> : null}
            <div className="announce">{cat.settings.announcement}</div>
            <Header />
            <main id="main" style={{ flex: 1 }}>{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
