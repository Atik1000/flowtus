import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fmt } from '@flowtus/core';
import { IMG, Photo } from '@flowtus/ui';
import { svcPrice, waHref } from '@/lib/helpers';
import { pageContext } from '@/lib/server';
import { TX } from '@/lib/text';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { cat } = await pageContext();
  const s = cat.services.find((x) => x.id === id);
  return { title: s ? s.name[0] : 'Service', description: s?.short };
}

export default async function Service({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { cat, t } = await pageContext();
  const s = cat.services.find((x) => x.id === id);
  if (!s) notFound();
  const areas = s.coverage.map((c) => cat.areas.find((a) => a.id === c)).filter(Boolean).map((a) => t(a!.name)).join(', ');
  const reqs: [string, string][] = [
    ['Notice', `At least ${s.leadDays} days before the event`],
    ['Setup hours', `${s.hours[0]}:00 – ${s.hours[1]}:00 (about ${s.durationHrs} hours on site)`],
    ['Service area', areas || 'To be confirmed'],
    ['Deposit', s.depositPct ? `${s.depositPct}% after you approve the quote` : 'None'],
    ['Capacity', s.capacity ? `${s.capacity} booking${s.capacity > 1 ? 's' : ''} per day` : 'No daily limit'],
  ];
  const groupHref = s.group === 'wedding' ? '/wedding' : '/events';
  const groupName = t(s.group === 'wedding' ? TX.weddingTitle : TX.eventsTitle);
  const wa = cat.settings.whatsapp;
  return (
    <section className="container stack" style={{ padding: '32px 24px 96px', gap: 48 }}>
      <nav aria-label="Breadcrumb" className="row wrap g8 xs muted">
        <Link href="/" style={{ color: 'var(--body)' }}>{t(TX.home)}</Link><span>/</span><Link href={groupHref} style={{ color: 'var(--body)' }}>{groupName}</Link><span>/</span><span>{t(s.name)}</span>
      </nav>
      <div className="split split-start">
        <div className="stack g12">
          <Photo src={IMG(s.img || s.id, 0, 1000)} ratio="r43" alt={s.name[0]} eager />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Photo src={IMG(s.img || s.id, 1, 600)} ratio="r11" placeholder="Reference photo" />
            <Photo src={IMG(s.img || s.id, 2, 600)} ratio="r11" placeholder="Reference photo" />
          </div>
        </div>
        <div className="stack" style={{ gap: 22 }}>
          <h1 className="h1">{t(s.name)}</h1>
          <p className="lead">{s.short}</p>
          <span style={{ fontSize: 20 }}>{svcPrice(s)}</span>
          <div className="note warn" style={{ padding: '10px 14px' }}>Package prices shown are demonstration values until FLOWTUS confirms them.</div>
          {s.partner ? <div className="note" style={{ fontSize: 14, padding: '12px 14px' }}>This service is delivered with a partner team. FLOWTUS manages your booking and quote; availability depends on the partner.</div> : null}
          {!s.active ? <div role="status" className="note error" style={{ fontSize: 15, padding: '12px 14px' }}>This service is not taking bookings right now. Contact us to be told when it reopens.</div> : null}
          {s.packages.length ? (
            <div className="stack g10">
              <h2 className="h3">{t(TX.packages)}</h2>
              {s.packages.map((k) => (
                <div key={k.id} className="row between g16" style={{ border: '1px solid var(--hair)', background: 'var(--surface)', padding: '14px 16px', alignItems: 'flex-start' }}>
                  <span className="stack"><span>{k.name}</span><span className="xs muted">{k.includes}</span></span><span>{fmt(k.price)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="row wrap g10">
            {s.active ? <Link href={`/book/${s.id}`} className="btn btn-rose btn-lg">{t(TX.bookNow)}</Link> : null}
            <a href={waHref(wa, `Hello FLOWTUS, I would like to ask about ${s.name[0]}.`)} target="_blank" rel="noopener" className="btn btn-outline btn-lg">{wa ? 'Ask on WhatsApp' : 'Contact us'}</a>
          </div>
        </div>
      </div>
      <div className="facts">
        <div className="stack g10"><h2 className="h3">{t(TX.bookingReq)}</h2>{reqs.map(([k, v]) => <div key={k} className="stack" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 8 }}><span className="eyebrow-sm" style={{ letterSpacing: '0.12em' }}>{k}</span><span>{v}</span></div>)}</div>
        {s.included.length ? <div className="stack g10"><h2 className="h3">{t(TX.included)}</h2><ul className="muted stack g6" style={{ margin: 0, paddingLeft: 18 }}>{s.included.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
        {s.excluded.length ? <div className="stack g10"><h2 className="h3">{t(TX.excluded)}</h2><ul className="muted stack g6" style={{ margin: 0, paddingLeft: 18 }}>{s.excluded.map((x) => <li key={x}>{x}</li>)}</ul></div> : null}
        <div className="stack g10"><h2 className="h3">Cancellation</h2><p className="muted">{s.cancellation}</p></div>
      </div>
    </section>
  );
}
