'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Banner, Notice, type Tone } from '@flowtus/ui';

export interface FpField { key: string; node: ReactNode; wide?: boolean }
export interface FpSection { key: string; title: string; desc?: string; fields: FpField[] }
export interface FpRow { label: string; sub?: string; value: string }
export interface FpProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  bullets?: string[];
  crumbs?: { label: string; href: string }[];
  banner?: { text: string; tone?: Tone; actions?: { label: string; onClick: () => void }[] } | null;
  stepped?: { label: string; on: boolean; onClick: () => void }[];
  sections: FpSection[];
  nav?: { back?: () => void; next?: () => void; nextLabel?: string; backLabel?: string; clear?: () => void; clearLabel?: string };
  aside: { title: string; rows: FpRow[]; preview?: string; totalLabel?: string; total?: string; totalSub?: string; notes?: { text: string; tone?: Tone }[]; button: string; busyLabel?: string; busy?: boolean; disabled?: boolean; onSubmit: () => void; secondary?: { label: string; href: string }; disclaimer?: string };
}

/** The shared long-form layout (eyebrow, title, sections, sticky summary) used by the builder, custom orders, bookings, corporate and checkout. */
export function FormPage(p: FpProps) {
  const a = p.aside;
  const off = a.disabled || a.busy;
  return (
    <section className="page-form" data-screen={p.title}>
      <div className="stack g12" style={{ maxWidth: 720 }}>
        {p.crumbs?.length ? (
          <nav aria-label="Breadcrumb" className="row wrap g8 xs">
            {p.crumbs.map((c, i) => <span key={c.href} className="row g8"><Link href={c.href} style={{ color: 'var(--body)' }}>{c.label}</Link>{i < p.crumbs!.length - 1 ? <span className="muted">/</span> : null}</span>)}
          </nav>
        ) : null}
        {p.eyebrow ? <span className="eyebrow">{p.eyebrow}</span> : null}
        <h1 className="h1">{p.title}</h1>
        {p.lead ? <p className="muted" style={{ fontSize: 17, textWrap: 'pretty' }}>{p.lead}</p> : null}
        {p.bullets?.length ? <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '8px 24px' }}>{p.bullets.map((b) => <li key={b} style={{ borderTop: '1px solid var(--hair)', paddingTop: 8, fontSize: 15 }}>{b}</li>)}</ul> : null}
      </div>
      {p.banner ? <Banner tone={p.banner.tone || 'warn'} actions={p.banner.actions}>{p.banner.text}</Banner> : null}
      <div className="two-col">
        <div className="span2 stack" style={{ gap: 36 }}>
          {p.stepped ? (
            <ol aria-label="Steps" className="row wrap g8" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {p.stepped.map((s) => (
                <li key={s.label}><button type="button" aria-current={s.on ? 'step' : undefined} onClick={s.onClick} className={'chip' + (s.on ? ' on' : '')} style={{ minHeight: 40, flexDirection: 'row', fontSize: 14 }}>{s.label}</button></li>
              ))}
            </ol>
          ) : null}
          {p.sections.map((s, i) => (
            <fieldset key={s.key} style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
              <legend style={{ fontFamily: 'var(--font-display)', fontSize: 28, padding: 0, marginBottom: 14 }}>{p.stepped ? '' : `${i + 1}. `}{s.title}</legend>
              {s.desc ? <span className="small muted" style={{ marginTop: -8 }}>{s.desc}</span> : null}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '18px 20px' }}>
                {s.fields.map((f) => <div key={f.key} style={{ minWidth: 0, gridColumn: f.wide ? '1 / -1' : 'auto' }}>{f.node}</div>)}
              </div>
            </fieldset>
          ))}
          {p.nav ? (
            <div className="row wrap g10" style={{ borderTop: '1px solid var(--hair)', paddingTop: 20 }}>
              {p.nav.back ? <button type="button" className="btn btn-outline" onClick={p.nav.back}>← {p.nav.backLabel || 'Back'}</button> : null}
              {p.nav.next ? <button type="button" className="btn btn-primary" onClick={p.nav.next}>{p.nav.nextLabel || 'Next'} →</button> : null}
              {p.nav.clear ? <button type="button" className="link-btn danger" style={{ padding: '0 16px' }} onClick={p.nav.clear}>{p.nav.clearLabel || 'Remove'}</button> : null}
            </div>
          ) : null}
        </div>
        <aside aria-label={a.title} className="summary">
          <h2 className="display" style={{ fontSize: 28 }}>{a.title}</h2>
          <div className="stack">
            {a.rows.map((r, i) => (
              <div key={i} className="sum-row">
                <span className="stack muted"><span>{r.label}</span>{r.sub ? <span className="xs bn">{r.sub}</span> : null}</span>
                <span style={{ textAlign: 'right', color: 'var(--ink)' }}>{r.value}</span>
              </div>
            ))}
          </div>
          {a.preview ? <div className="italic" style={{ background: 'var(--soft)', padding: 14, fontSize: 19 }}>{a.preview}</div> : null}
          {a.total != null ? (
            <div className="stack" style={{ gap: 4 }} aria-live="polite">
              <span className="eyebrow-sm">{a.totalLabel}</span>
              <span className="total">{a.total}</span>
              {a.totalSub ? <span className="xs" style={{ color: 'var(--err-strong)' }}>{a.totalSub}</span> : null}
            </div>
          ) : null}
          {(a.notes || []).map((n) => <Notice key={n.text} tone={n.tone || 'plain'}>{n.text}</Notice>)}
          <button type="button" className="btn btn-rose btn-lg" disabled={off} aria-busy={!!a.busy} onClick={a.onSubmit}>{a.busy ? a.busyLabel || 'Sending…' : a.button}</button>
          {a.secondary ? <Link href={a.secondary.href} className="small" style={{ textAlign: 'center', color: 'var(--ink)' }}>{a.secondary.label}</Link> : null}
          {a.disclaimer ? <span className="xs muted" style={{ textWrap: 'pretty' }}>{a.disclaimer}</span> : null}
        </aside>
      </div>
    </section>
  );
}
