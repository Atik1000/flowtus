'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { FIELD_DEFS, addDays, dhakaNow, fmt, fmtDate, quoteTotals, currentQuote, unitLabel } from '@flowtus/core';
import { Field, StatusPill } from '@flowtus/ui';
import { adm, History, Kv, Loading, Panel, Thread, useAct, useLoad, useMe } from '@/components/admin';

const KIND: Record<string, string> = { custom: 'Custom order', booking: 'Service booking', corporate: 'Corporate' };
const val = (x: any) => (Array.isArray(x) ? x.join(', ') : x && typeof x === 'object' ? x.name : String(x ?? ''));

/** Starting point for the quote editor: from the current quote, or pre-filled from the request. */
function draftFor(r: any, svc: any) {
  const now = dhakaNow();
  const q = currentQuote(r);
  if (q && q.approval !== 'superseded') return { items: q.items.map((i: any) => ({ desc: i.desc, qty: String(i.qty), amount: String(i.amount) })), charges: q.charges.map((c: any) => ({ desc: c.desc, amount: String(c.amount) })), depositPct: String(q.depositPct), validUntil: addDays(now.date, 3), included: q.included, excluded: q.excluded, terms: q.terms };
  let items: any[] = [], charges: any[] = [];
  if (r.kind === 'custom') items = [{ desc: `${r.data.itemName} (${unitLabel(r.data.unit, 2)})`, qty: String(r.data.qty), amount: r.data.unitPrice == null ? '' : String(r.data.unitPrice) }];
  else if (r.kind === 'booking') { items = [{ desc: r.snapshot.package ? `${r.serviceName} — ${r.snapshot.package.name}` : `${r.serviceName} — custom design`, qty: '1', amount: r.snapshot.package ? String(r.snapshot.package.price) : r.snapshot.estimate != null ? String(r.snapshot.estimate) : '' }]; charges = [{ desc: 'Installation and transport', amount: '0' }]; }
  else items = [{ desc: r.data.orderType + (r.data.mode === 'Recurring' ? ' (per delivery)' : ''), qty: '1', amount: '' }];
  return { items, charges, depositPct: String(svc ? svc.depositPct : 0), validUntil: addDays(now.date, 3), included: svc ? svc.included.join('; ') : '', excluded: svc ? svc.excluded.join('; ') : '', terms: '' };
}

export default function RequestDetail({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = use(params);
  const { data, error, reload } = useLoad<any>(`/requests/${ref}`);
  const { act, busy } = useAct(reload);
  const me = useMe();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [team, setTeam] = useState<string | null>(null);
  const [q, setQ] = useState<any>(null);
  const [terms, setTerms] = useState<any>({ freq: 'Weekly', count: '4', start: addDays(dhakaNow().date, 3) });
  useEffect(() => { if (data && !q) setQ(draftFor(data.rec, data.service)); }, [data, q]);
  if (!data || !q) return <Loading error={error} />;
  const r = data.rec;
  const quote = currentQuote(r);
  const post = (path: string, body: any = {}) => adm(`/requests/${ref}/${path}`, { method: 'POST', body });
  const svc = data.service;
  const canQuote = me.role === 'owner' && ['New Request', 'Checking Availability', 'Reviewing', 'Quote Sent', 'Proposal Sent', 'Awaiting Customer Approval', 'Awaiting Revised Quote', 'Quote Expired'].includes(r.status);
  const canRecord = me.role === 'owner' && quote && quote.approval === 'pending';
  const draftTotal = (() => { const it = q.items.reduce((s: number, i: any) => s + (+i.qty || 0) * (+i.amount || 0), 0); const ch = q.charges.reduce((s: number, c: any) => s + (+c.amount || 0), 0); const t = it + ch; return `Draft total ${fmt(t)} · deposit ${fmt(Math.round((t * (+q.depositPct || 0)) / 100))}`; })();
  const details: [string, string][] = r.kind === 'custom'
    ? [['Item', `${r.data.itemName} · ${r.data.bn}`], ['Quantity', `${r.data.qty} ${unitLabel(r.data.unit, r.data.qty)}`], ['Estimate', r.data.estimate == null ? 'Price on request' : fmt(r.data.estimate)], ['Needed by', fmtDate(r.data.date)], ['Colour / design', r.data.colours], ['Notes', r.data.notes]]
    : r.kind === 'booking'
      ? [['Service', r.serviceName], ...(svc?.fields || []).filter((k: string) => !['name', 'phone', 'photo'].includes(k) && r.data[k] !== '' && r.data[k] != null).map((k: string): [string, string] => [FIELD_DEFS[k]?.label[0] || k, k === 'date' ? fmtDate(r.data[k]) : val(r.data[k])]), ['Estimate', r.snapshot.estimate != null ? fmt(r.snapshot.estimate) : 'Quote required']] as [string, string][]
      : [['Business', r.customer.company], ['Order type', r.data.orderType], ['Items', r.data.qty], ['Schedule', r.data.mode === 'Recurring' ? `${r.data.freq} · ${r.data.duration}` : 'One-time'], ['Start', fmtDate(r.data.start)], ['Address', r.data.address], ['Billing', r.data.invoice ? r.data.billing || 'Formal quotation and invoice' : '']];
  const send = () => act(() => post('quote', q), 'Quote sent to the customer.');

  return (
    <>
      <Link href="/requests" className="small">← Requests &amp; bookings</Link>
      <div className="stack g6">
        <span className="eyebrow-sm">{KIND[r.kind]}</span>
        <div className="row wrap g12"><h1 className="display" style={{ fontSize: 36 }}>{r.ref}</h1><StatusPill status={r.status} className="tag" /><span className="xs muted">{data.payStatus}</span></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 20, alignItems: 'start' }}>
        <div className="stack g20">
          <Panel title="Customer"><Kv w={140} k="Name" v={r.customer.name} /><Kv w={140} k="Phone" v={r.customer.phone} />{r.customer.email ? <Kv w={140} k="Email" v={r.customer.email} /> : null}</Panel>
          <Panel title="Request details (snapshot)">
            {details.filter((d) => d[1]).map(([k, v]) => <Kv key={k} w={140} k={k} v={v} />)}
            {data.photo ? <Kv w={140} k="Reference photo" v={<a href={data.photo.url} target="_blank" rel="noopener">{data.photo.name} (signed link, 10 min)</a>} /> : null}
          </Panel>
          <Panel title="Availability">
            {data.avail ? <div className={'note ' + (data.avail.ok ? 'ok' : 'error')} style={{ fontSize: 14, padding: '10px 12px' }}>{data.avail.text}</div> : <span className="xs muted">Availability checks apply to service bookings.</span>}
            {r.kind !== 'corporate' ? <>
              <Field type="select" name="team" label="Team or partner" ph="Unassigned" value={team ?? r.team ?? ''} onChange={setTeam} options={data.teams.map((t: any) => t.name)} />
              <button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => act(() => post('team', { team: team ?? r.team }), 'Assignment saved.')}>Save assignment</button>
            </> : null}
          </Panel>
          {canQuote ? (
            <Panel title="Quote editor">
              <Field type="rows" name="items" label="Lines" value={q.items} onChange={(v) => setQ({ ...q, items: v })} cols={[{ k: 'desc', ph: 'Description', flex: 3 }, { k: 'qty', ph: 'Qty' }, { k: 'amount', ph: 'Unit price (৳)' }]} blank={{ desc: '', qty: '1', amount: '' }} addLabel="+ Add line" />
              <Field type="rows" name="charges" label="Extra charges" value={q.charges} onChange={(v) => setQ({ ...q, charges: v })} cols={[{ k: 'desc', ph: 'Charge (e.g. transport)', flex: 3 }, { k: 'amount', ph: 'Amount (৳)' }]} blank={{ desc: '', amount: '' }} addLabel="+ Add charge" />
              <div className="form-grid">
                <Field type="text" name="dep" label="Deposit %" value={q.depositPct} onChange={(v) => setQ({ ...q, depositPct: v })} />
                <Field type="date" name="valid" label="Valid until" min={dhakaNow().date} value={q.validUntil} onChange={(v) => setQ({ ...q, validUntil: v })} />
                <div className="full"><Field type="textarea" name="inc" label="Included" rows={2} value={q.included} onChange={(v) => setQ({ ...q, included: v })} /></div>
                <div className="full"><Field type="textarea" name="exc" label="Not included" rows={2} value={q.excluded} onChange={(v) => setQ({ ...q, excluded: v })} /></div>
                <div className="full"><Field type="textarea" name="terms" label="Terms" rows={3} value={q.terms} onChange={(v) => setQ({ ...q, terms: v })} /></div>
              </div>
              <span style={{ fontSize: 15 }}>{draftTotal}</span>
              <button type="button" className="btn btn-rose" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={send}>Send quote to customer</button>
              <span className="xxs muted">Sending a new quote replaces any pending one. The customer must approve it again.</span>
            </Panel>
          ) : null}
          {r.quotes.length ? (
            <Panel title="Quote revisions">
              {r.quotes.map((x: any) => <div key={x.ref} className="row between wrap g10 small" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 6 }}><span>{x.ref} · {fmt(quoteTotals(x).total)} · deposit {x.depositPct}% · valid to {fmtDate(x.validUntil)}</span><span className="pill" style={{ background: 'var(--soft-2)' }}>{x.approval}{x.approvedVia ? ` (${x.approvedVia})` : ''}</span></div>)}
              {canRecord ? <button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => act(() => post('quote/record', { accept: true }), 'Approval recorded.')}>Record customer approval (phone / WhatsApp)</button> : null}
            </Panel>
          ) : null}
          {r.payments.length ? (
            <Panel title="Payments">
              {r.payments.map((p: any) => (
                <div key={p.id} className="stack g6 small" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 8 }}>
                  <div className="row between wrap g10"><span>{p.method} · {p.txn} · {fmt(p.amount)}</span><StatusPill status={p.status} /></div>
                  {p.mismatch ? <span className="note error" style={{ padding: '6px 10px' }}>Amount mismatch: customer sent {fmt(p.amount)}, expected {fmt(p.expected)}.</span> : null}
                  {p.status === 'Awaiting Verification' ? <div className="row g8"><button type="button" className="btn btn-sage btn-xs" disabled={busy} onClick={() => act(() => post(`payments/${p.id}/verify`), 'Payment verified.')}>Verify</button><button type="button" className="btn btn-danger btn-xs" disabled={busy} onClick={() => act(() => post(`payments/${p.id}/reject`, { reason }), 'Payment rejected.')}>Reject (uses status note)</button></div> : null}
                </div>
              ))}
              {data.expected != null ? <span className="xs muted">Still due: {fmt(data.expected)}</span> : null}
            </Panel>
          ) : null}
          {me.role === 'owner' && r.kind === 'corporate' && quote?.approval === 'approved' && !r.schedule ? (
            <Panel title="Confirm recurring terms">
              <span className="small muted">Future deliveries are created only when you confirm these terms. Dates that fall on blocked days are flagged.</span>
              <div className="form-grid">
                <Field type="select" name="freq" label="Frequency" value={terms.freq} onChange={(v) => setTerms({ ...terms, freq: v })} options={['Weekly', 'Fortnightly', 'Monthly']} />
                <Field type="text" name="count" label="Number of deliveries" value={terms.count} onChange={(v) => setTerms({ ...terms, count: v })} />
                <Field type="date" name="start" label="First delivery" min={dhakaNow().date} value={terms.start} onChange={(v) => setTerms({ ...terms, start: v })} />
              </div>
              <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={() => act(() => post('terms', terms), 'Schedule created.')}>Confirm terms and create schedule</button>
            </Panel>
          ) : null}
          {r.schedule?.length ? (
            <Panel title="Delivery schedule">
              {r.schedule.map((d: any) => (
                <div key={d.id} className="stack g6 small" style={{ borderTop: '1px solid var(--soft-2)', paddingTop: 8 }}>
                  <div className="row between wrap g10"><span>{fmtDate(d.date)} · {fmt(d.price)} <span style={{ color: 'var(--err)' }}>{d.note}</span></span><span>{d.status}</span></div>
                  {!['Delivered', 'Cancelled'].includes(d.status) ? <div className="row wrap g6">{['Delivered', 'Partial', 'Missed', 'Skipped'].map((s) => <button key={s} type="button" className="btn btn-outline btn-xs" style={{ minHeight: 36, padding: '0 10px', fontSize: 13, borderColor: 'var(--input)' }} disabled={busy} onClick={() => act(() => post(`deliveries/${d.id}`, { status: s }), `Marked ${s.toLowerCase()}.`)}>{s}</button>)}</div> : null}
                </div>
              ))}
            </Panel>
          ) : null}
        </div>
        <div className="stack g20">
          <Panel title="Status">
            <Field type="text" name="reason" label="Note (used for cancel, decline, reject, etc.)" value={reason} onChange={setReason} />
            <div className="row wrap g8">
              {data.allowed.map((to: string) => <button key={to} type="button" className={'btn btn-xs ' + (['Cancelled', 'Declined', 'Unavailable'].includes(to) ? 'btn-danger' : 'btn-outline')} disabled={busy} title={data.ownerOnly.includes(to) && me.role !== 'owner' ? 'Owner only' : ''} onClick={() => act(() => post('transition', { to, note: reason }), `Moved to ${to}.`)}>→ {to}</button>)}
            </div>
            <span className="xxs muted">Confirmation checks the approved quote, verified deposit and remaining capacity at the moment you press it.</span>
          </Panel>
          <Thread title="Internal notes" list={r.notes} field={<><Field type="textarea" name="note" rows={3} value={note} onChange={setNote} /><button type="button" className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={async () => { if (await act(() => post('notes', { text: note }), 'Note added.')) setNote(''); }}>Add note</button></>} />
          <Thread title="Customer messages" list={r.messages} field={<><Field type="textarea" name="msg" rows={3} value={msg} onChange={setMsg} /><button type="button" className="btn btn-primary btn-xs" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={async () => { if (await act(() => post('messages', { text: msg }), 'Posted to customer.')) setMsg(''); }}>Post to customer</button></>} />
          <History list={r.history} />
        </div>
      </div>
    </>
  );
}
