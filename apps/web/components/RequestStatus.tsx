'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FIELD_DEFS, FLOWS, TONE, fmt, fmtDate, quoteTotals, unitLabel, currentQuote } from '@flowtus/core';
import { Banner, Field, api, useLang, useToast } from '@flowtus/ui';
import { NEXT, TX } from '@/lib/text';
import { waHref } from '@/lib/helpers';
import { useCatalogue } from './Providers';
import { Messages, NextBox, PayBox, StatusHeader, Stepper, useRecord } from './status-parts';
import { useSubmit } from './useSubmit';

const QSTATE: Record<string, string> = { pending: 'Waiting for your approval', approved: 'Approved', declined: 'Changes requested', superseded: 'Replaced by a newer revision', expired: 'Expired' };

export function RequestStatus({ token }: { token: string }) {
  const { t, lang, sl } = useLang();
  const toast = useToast();
  const { db, cat } = useCatalogue();
  const { rec, state, load } = useRecord<{ request: any }>(`/requests/${token}`);
  const [confirming, setConfirming] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const resSub = useSubmit();
  const [last, setLast] = useState<{ ref?: string; token?: string }>({});
  useEffect(() => { try { setLast(JSON.parse(localStorage.getItem('flowtus-v2-last') || '{}')); } catch { /* ignore */ } }, []);

  if (state === 'loading') return <section className="page-narrow"><span className="muted">Loading your request…</span></section>;
  if (state !== 'ok' || !rec) {
    return (
      <section className="page-narrow">
        <div className="stack g14" style={{ alignItems: 'flex-start' }}>
          <h1 className="display" style={{ fontSize: 44 }}>{state === 'error' ? 'We could not load this request' : 'Request not found'}</h1>
          <p className="muted">{state === 'error' ? 'Check your connection and try again.' : last.token === token ? `Your request ${last.ref} was saved, but this page could not load it. Use Track an order with that reference and your phone.` : 'We could not find this request. Check the link, or use Track an order.'}</p>
          <Link href="/track" className="btn btn-rose">{t(TX.track)}</Link>
        </div>
      </section>
    );
  }
  const r = rec.request;
  const d = r.data;
  const q = currentQuote(r);
  const qt = q ? quoteTotals(q) : null;
  const svc = db.services.find((x) => x.id === r.serviceId);
  const kind = r.kind as 'custom' | 'booking' | 'corporate';
  const val = (x: any) => (Array.isArray(x) ? x.join(', ') : x && typeof x === 'object' ? x.name : String(x ?? ''));
  let rows: [string, string][] = [];
  if (kind === 'custom') rows = [['Item', `${d.itemName} · ${d.bn}`], ['Quantity', `${Number(d.qty).toLocaleString('en-US')} ${unitLabel(d.unit, d.qty, lang)}`], ['Unit price when requested', d.unitPrice == null || d.priceMode === 'quote' ? 'Price on request' : fmt(d.unitPrice)], ['Estimate (not a final price)', d.estimate == null ? 'Price on request' : fmt(d.estimate)], ['Needed by', fmtDate(d.date, lang)], ...(d.colours ? [['Colour / design', d.colours] as [string, string]] : []), ...(d.notes ? [['Notes', d.notes] as [string, string]] : []), ...(d.photo ? [['Reference photo', d.photo.name] as [string, string]] : [])];
  else if (kind === 'booking') rows = [['Service', r.serviceName], ...(svc ? svc.fields : Object.keys(d)).filter((k: string) => !['name', 'phone'].includes(k) && d[k] !== '' && d[k] != null && !(Array.isArray(d[k]) && !d[k].length)).map((k: string): [string, string] => [FIELD_DEFS[k]?.label[0] || k, k === 'date' ? fmtDate(d[k], lang) : k === 'package' ? (r.snapshot.package ? r.snapshot.package.name : 'Custom design') : k === 'area' ? (db.areas.find((a) => a.id === d[k])?.name[0] || d[k]) : val(d[k])]), ['Estimate (not a final price)', r.snapshot.estimate != null ? fmt(r.snapshot.estimate) : 'Quote required']];
  else rows = [['Business', r.customer.company], ['Order type', d.orderType], ['Items', d.qty], ['Schedule', d.mode === 'Recurring' ? `${d.freq} · ${d.duration}` : 'One-time'], ['Start', fmtDate(d.start, lang)], ['Address', d.address], ...(d.invoice ? [['Billing', d.billing || 'Formal quotation and invoice requested'] as [string, string]] : [])];

  const canRespond = !!q && q.approval === 'pending' && ['Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval'].includes(r.status);
  const canRes = kind === 'booking' && ['Quote Sent', 'Awaiting Customer Approval', 'Awaiting Deposit', 'Confirmed', 'Rescheduled'].includes(r.status);
  const early = ['New Request', 'Checking Availability', 'Reviewing', 'Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval', 'Awaiting Revised Quote', 'Quote Expired', 'Awaiting Deposit', 'Approved', 'Payment/Deposit', 'Reschedule Requested'].includes(r.status);
  const act = async (path: string, body: any, ok: string) => { try { await api(`/requests/${token}/${path}`, { body }); toast(ok); load(); } catch (e: any) { toast(e.message); } };
  const reschedule = () => resSub.run(() => api(`/requests/${token}/reschedule`, { body: { date: resDate, time: resTime } }), { onOk: () => { setResDate(''); setResTime(''); toast('Reschedule requested. We will confirm the new date.'); load(); }, onErrors: () => {} });
  const qTone = TONE(q?.approval === 'approved' ? 'Approved' : q?.approval === 'expired' ? 'Quote Expired' : 'Awaiting Customer Approval');
  const stl = (s: string) => TONE(s === 'Delivered' ? 'Delivered' : s === 'Scheduled' ? 'Confirmed' : s === 'Missed' || s === 'Needs new date' ? 'Partner Issue' : 'Cancelled');

  return (
    <section className="page-narrow">
      <StatusHeader eyebrow={{ custom: 'Custom order', booking: 'Service booking', corporate: 'Corporate' }[kind]} title={kind === 'custom' ? 'Custom flower request' : kind === 'booking' ? r.serviceName : 'Business request'} label="Reference" number={r.ref} status={r.status} />
      <span className="small muted">This is a request, not a confirmed order or booking. Keep the reference; you can open this page again from Track an order.</span>
      <Stepper path={FLOWS[kind].path} status={r.status} small />
      <NextBox text={(NEXT[r.status] || '') + (r.status === 'Cancelled' && r.cancelReason ? ' ' + r.cancelReason + '.' : '')} />
      {q && qt ? (
        <div className="card">
          <div className="row between wrap g12" style={{ alignItems: 'baseline' }}>
            <h2 className="display" style={{ fontSize: 28 }}>Quote {q.ref}</h2>
            <span className="pill" style={{ background: qTone.bg, color: qTone.fg }}>{QSTATE[q.approval]}</span>
          </div>
          {q.rev > 1 ? <span className="small" style={{ color: 'var(--warn)', background: 'var(--warn-bg)', padding: '8px 12px' }}>Revision {q.rev}. This replaces earlier quotes.</span> : null}
          <div className="stack">
            {q.items.map((i: any, j: number) => <div key={j} className="line"><span>{i.desc} × {i.qty}</span><span>{fmt(i.qty * i.amount)}</span></div>)}
            {q.charges.map((c: any, j: number) => <div key={'c' + j} className="line muted"><span>{c.desc}</span><span>{fmt(c.amount)}</span></div>)}
            <div className="row between g12" style={{ padding: '12px 0 4px', fontSize: 20 }}><span>{t(TX.total)}</span><span>{fmt(qt.total)}</span></div>
            {qt.deposit > 0 ? <><div className="row between small muted"><span>Deposit ({q.depositPct}%) to confirm</span><span>{fmt(qt.deposit)}</span></div><div className="row between small muted"><span>Remaining balance</span><span>{fmt(qt.balance)}</span></div></> : null}
          </div>
          <span className="small">Valid until {fmtDate(q.validUntil, lang)}</span>
          {q.included ? <div className="small"><strong style={{ fontWeight: 500 }}>{t(TX.included)}:</strong> {q.included}</div> : null}
          {q.excluded ? <div className="small"><strong style={{ fontWeight: 500 }}>{t(TX.excluded)}:</strong> {q.excluded}</div> : null}
          {q.terms ? <div className="xs muted">{q.terms}</div> : null}
          {canRespond ? (
            <div className="stack g12" style={{ borderTop: '1px solid var(--hair)', paddingTop: 14 }}>
              <button type="button" className="btn btn-rose" style={{ alignSelf: 'flex-start' }} onClick={() => act('quote/respond', { accept: true }, 'Quote approved. Thank you.')}>Approve this quote</button>
              <Field type="textarea" name="change" label="What would you like to change?" rows={2} value={changeNote} onChange={setChangeNote} />
              <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => act('quote/respond', { accept: false, reason: changeNote }, 'We will send a revised quote.')}>Ask for changes</button>
            </div>
          ) : null}
          {r.quotes.length > 1 ? <details><summary className="small muted">Earlier revisions</summary><div className="stack g4 xs muted" style={{ marginTop: 8 }}>{r.quotes.slice(0, -1).reverse().map((x: any) => <span key={x.ref}>{x.ref} · {fmt(quoteTotals(x).total)} · {x.approval}</span>)}</div></details> : null}
        </div>
      ) : <div className="note warn" style={{ fontSize: 14, padding: '12px 14px' }}>An estimate is not a final price or a confirmed booking. You will receive a written quote.</div>}
      <PayBox rec={r} isOrder={false} token={token} onChange={load} />
      <div className="stack g10">
        <h2 className="h3">Your request</h2>
        {rows.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
      </div>
      {r.schedule?.length ? (
        <div className="stack g8">
          <h2 className="h3">Delivery schedule</h2>
          {r.schedule.map((x: any) => { const tn = stl(x.status); return <div key={x.id} className="row between wrap g12" style={{ borderBottom: '1px solid var(--soft-2)', padding: '8px 0', fontSize: 15 }}><span>{fmtDate(x.date, lang)} <span className="xs muted">{x.note}</span></span><span className="pill" style={{ background: tn.bg, color: tn.fg }}>{x.status}</span></div>; })}
        </div>
      ) : null}
      {canRes ? (
        <details className="card" style={{ padding: '18px 20px' }}>
          <summary style={{ fontSize: 16 }}>Request a different date</summary>
          <div className="stack g14" style={{ marginTop: 14 }}>
            <span className="small muted">Your current date stays booked until we confirm the change. A new date may change the quote.</span>
            {resSub.banner ? <Banner tone={resSub.banner.tone}>{resSub.banner.text}</Banner> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
              <Field type="date" name="resdate" label="New date" value={resDate} onChange={setResDate} />
              {svc?.fields.includes('time') ? <Field type="time" name="restime" label="New time (optional)" value={resTime} onChange={setResTime} /> : null}
            </div>
            <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={resSub.busy} onClick={reschedule}>Request this date</button>
          </div>
        </details>
      ) : null}
      <Messages list={r.messages} />
      <div className="row wrap g10" style={{ borderTop: '1px solid var(--hair)', paddingTop: 20 }}>
        <a href={waHref(cat.settings.whatsapp, 'Hello FLOWTUS, about my request ' + r.ref)} target="_blank" rel="noopener" className="btn btn-outline btn-sm">{cat.settings.whatsapp ? 'WhatsApp us about this' : 'Contact us'}</a>
        {early ? (
          confirming ? (
            <span className="row wrap g8"><span className="small">Cancel this request?</span><button type="button" className="btn btn-danger-solid btn-sm" onClick={() => { setConfirming(false); act('cancel', {}, 'Your request has been cancelled.'); }}>Yes, cancel</button><button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirming(false)}>Keep it</button></span>
          ) : <button type="button" className="link-btn danger" style={{ padding: '0 18px', fontSize: 16 }} onClick={() => setConfirming(true)}>Cancel this request</button>
        ) : null}
      </div>
      <span className="sr-only">{sl(r.status)}</span>
    </section>
  );
}
