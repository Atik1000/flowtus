'use client';
import { useCallback, useEffect, useState } from 'react';
import { FLOWS, TONE, expectedAmount, fmt, fmtStamp, paymentStatus, type Kind } from '@flowtus/core';
import { ApiError, Banner, Field, StatusPill, api, useLang, useToast, type Tone } from '@flowtus/ui';
import { useSubmit } from './useSubmit';

/** Loads an order or request by its unguessable token. Returns the record, a loading flag and a reload function. */
export function useRecord<T = any>(path: string) {
  const [rec, setRec] = useState<T | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const load = useCallback(async () => {
    try { setRec(await api<T>(path)); setState('ok'); }
    catch (e) { setState(e instanceof ApiError && e.status === 404 ? 'missing' : 'error'); }
  }, [path]);
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, [load]);
  return { rec, state, load, setRec };
}

export function Stepper({ path, status, small = false }: { path: string[]; status: string; small?: boolean }) {
  const { sl } = useLang();
  const i = path.indexOf(status);
  return (
    <>
      <ol aria-label="Progress" className="steps" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${small ? 90 : 110}px), 1fr))` }}>
        {path.map((x, j) => (
          <li key={x} style={{ color: i >= 0 && j <= i ? 'var(--ink)' : 'var(--muted)', fontSize: small ? 12 : 13 }}>
            <span className="bar" style={{ background: i >= 0 && j <= i ? 'var(--rose)' : 'var(--hair)' }} />
            {sl(x)}
          </li>
        ))}
      </ol>
      {i < 0 ? <span className="small" style={{ color: 'var(--err)' }}>Current status: {sl(status)}</span> : null}
    </>
  );
}

export function NextBox({ text }: { text: string }) {
  const { lang } = useLang();
  return (
    <div className="callout">
      <span className="eyebrow-sm">{lang === 'bn' ? 'এরপর কী হবে' : 'What happens next'}</span>
      <span>{text}</span>
    </div>
  );
}

export function Messages({ list }: { list: { at: number; text: string }[] }) {
  const { lang } = useLang();
  if (!list?.length) return null;
  return (
    <div className="stack g8">
      <h2 className="h3">Updates from FLOWTUS</h2>
      {list.slice().reverse().map((m, i) => <div key={i} className="msg"><span className="xxs muted">{fmtStamp(m.at, lang)}</span><span>{m.text}</span></div>)}
    </div>
  );
}

export function PaymentList({ payments }: { payments: any[] }) {
  const { sl } = useLang();
  if (!payments?.length) return null;
  return (
    <div className="stack g6">
      {payments.map((p) => {
        const tone = TONE(p.status);
        return (
          <div key={p.id} className="row between wrap g12 small" style={{ borderBottom: '1px solid var(--soft-2)', padding: '8px 0' }}>
            <span>{(p.method === 'cod' ? 'Cash' : p.method === 'bkash' ? 'bKash' : 'Nagad')} · {p.txn} · {fmt(p.amount)}{p.status === 'Rejected' && p.reason ? <span style={{ color: 'var(--err)' }}> · {p.reason}</span> : null}</span>
            <span className="pill" style={{ background: tone.bg, color: tone.fg }}>{sl(p.status)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Manual bKash / Nagad payment: instructions appear only once there is something to pay. Nothing is ever auto-verified. */
export function PayBox({ rec, isOrder, token, onChange }: { rec: any; isOrder: boolean; token: string; onChange: () => void }) {
  const toast = useToast();
  const sub = useSubmit();
  const [method, setMethod] = useState('');
  const [txn, setTxn] = useState('');
  const [amount, setAmount] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const due = expectedAmount(rec);
  const closed = ['Cancelled', 'Refund Pending', 'Refunded', 'Declined', 'Unavailable', 'Quote Expired'].includes(rec.status);
  const pending = (rec.payments || []).some((p: any) => p.status === 'Awaiting Verification');
  const methods = isOrder ? [rec.paymentMethod].filter((m: string) => m === 'bkash' || m === 'nagad') : (['bkash', 'nagad'] as const).filter((m) => rec.payInfo[m].enabled);
  const show = !closed && due != null && due > 0 && methods.length > 0 && !pending;
  const m = methods.includes(method as any) ? method : methods[0];
  const name = m === 'bkash' ? 'bKash' : 'Nagad';
  const num = m ? rec.payInfo[m].number : '';
  const q = rec.quotes?.[rec.quotes.length - 1];
  const isDeposit = !isOrder && q && (rec.payments || []).filter((p: any) => p.status === 'Verified').reduce((s: number, p: any) => s + p.amount, 0) < Math.round(((q.items.reduce((s: number, i: any) => s + i.qty * i.amount, 0) + (q.charges || []).reduce((s: number, c: any) => s + c.amount, 0)) * q.depositPct) / 100);

  const submit = () => sub.run(
    () => api(`/${isOrder ? 'orders' : 'requests'}/${token}/payments`, { body: { method: m, txn, amount: amount ?? String(due) } }),
    { onOk: () => { setTxn(''); setAmount(null); toast('Payment reference submitted. We will verify it.'); onChange(); }, onErrors: setErrors },
  );

  return (
    <>
      {show ? (
        <div className="card">
          <h2 className="display" style={{ fontSize: 28 }}>{isOrder ? 'Amount due' : isDeposit ? 'Deposit due' : 'Balance due'}: {fmt(due)}</h2>
          {!isOrder && methods.length > 1 ? <Field type="chips" name="method" label="Method" value={m} onChange={setMethod} options={methods.map((x) => ({ value: x, label: x === 'bkash' ? 'bKash' : 'Nagad' }))} /> : null}
          <div className="stack" style={{ gap: 2 }}>
            <span className="eyebrow-sm" style={{ letterSpacing: '0.12em' }}>Send to ({name})</span>
            <span style={{ fontSize: 18 }}>{num || 'The payment number is being set up. Contact us and we will confirm it.'}</span>
          </div>
          <ol className="muted stack g4" style={{ margin: 0, paddingLeft: 20 }}>
            <li>Open your {name} app and choose Send Money.</li>
            <li>Send {fmt(due)} to the number above. Use reference {rec.number || rec.ref}.</li>
            <li>Enter the transaction ID from the confirmation message below.</li>
          </ol>
          <div role="note" className="note error" style={{ fontSize: 14, padding: '10px 12px' }}>FLOWTUS will never ask for your PIN, OTP or password.</div>
          {sub.banner ? <Banner tone={sub.banner.tone}>{sub.banner.text}</Banner> : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 16 }}>
            <Field type="text" name="txn" label="Transaction ID" req ph="e.g. 9GH4K2LMQ1" value={txn} onChange={(x) => { setTxn(x); setErrors((e) => ({ ...e, txn: '' })); }} error={errors.txn} />
            <Field type="text" name="amount" label="Amount sent (৳)" req value={amount ?? String(due)} onChange={(x) => { setAmount(x); setErrors((e) => ({ ...e, amount: '' })); }} error={errors.amount} />
          </div>
          <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} disabled={sub.busy} onClick={submit}>{sub.busy ? 'Submitting…' : 'Submit payment reference'}</button>
        </div>
      ) : null}
      {pending ? <div className="note warn" style={{ fontSize: 14, padding: '14px 16px' }}>We received your transaction reference and are verifying it. This usually takes a few hours. We never mark a payment as received until we have checked it.</div> : null}
      <PaymentList payments={rec.payments} />
    </>
  );
}

export function StatusHeader({ eyebrow, title, label, number, status, extra }: { eyebrow: string; title: string; label: string; number: string; status: string; extra?: React.ReactNode }) {
  return (
    <div className="stack g12">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="h1-sm" style={{ textWrap: 'balance' }}>{title}</h1>
      <div className="row wrap g10">
        <span style={{ fontSize: 17 }}>{label} <strong style={{ letterSpacing: '0.04em' }}>{number}</strong></span>
        <StatusPill status={status} className="tag" />
        {extra}
      </div>
    </div>
  );
}

export const payTag = (rec: any, label: string) => { const ps = paymentStatus(rec); const tone = TONE(ps); return { ps, tone, label: `${label}: ` }; };
export { FLOWS };
export type { Kind, Tone };
