import { InfoPage } from '@/components/InfoPage';
import { waHref } from '@/lib/helpers';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

export const metadata = { title: 'Contact' };

export default async function Contact() {
  const { cat, t } = await pageContext();
  const s = cat.settings;
  const rows = ([['Phone', s.phone], ['WhatsApp', s.whatsapp], ['Email', s.email], ['Instagram', s.instagram], ['Facebook', s.facebook]] as [string, string][]).filter((x) => x[1]);
  return (
    <InfoPage active="contact" title="Contact FLOWTUS" draft={false}>
      {rows.length ? (
        <div className="stack">{rows.map(([k, v]) => <div key={k} className="row g16" style={{ borderBottom: '1px solid var(--soft-2)', padding: '10px 0' }}><span className="muted" style={{ minWidth: 120 }}>{k}</span><span>{v}</span></div>)}</div>
      ) : <p className="muted" style={{ maxWidth: 600 }}>Phone, WhatsApp and email will be published here once FLOWTUS confirms them.</p>}
      <p className="muted">We currently deliver to {cat.areas.filter((a) => a.delivery).map((a) => t(a.name)).join(', ')}.</p>
      {s.whatsapp ? <a href={waHref(s.whatsapp)} target="_blank" rel="noopener" className="btn btn-rose" style={{ alignSelf: 'flex-start' }}>{t(TX.whatsapp)}</a> : null}
    </InfoPage>
  );
}
