'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiError, Field, api, useLang } from '@flowtus/ui';
import { TX } from '@/lib/text';

export function TrackForm() {
  const { t } = useLang();
  const router = useRouter();
  const [ref, setRef] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const find = async () => {
    if (busy || locked) return;
    setBusy(true);
    setMsg('');
    try {
      const r = await api<{ type: 'order' | 'request'; token: string }>('/track', { body: { ref, phone } });
      router.push(r.type === 'order' ? `/order/${r.token}` : `/request/${r.token}`);
    } catch (e) {
      const err = e as ApiError;
      setMsg(err.message);
      if (err.status === 429 || /Too many/.test(err.message)) { setLocked(true); setTimeout(() => setLocked(false), 60_000); }
    } finally { setBusy(false); }
  };
  return (
    <section style={{ maxWidth: 520, margin: '0 auto', padding: '64px 24px 96px' }} className="stack g20">
      <h1 className="display" style={{ fontSize: 44, lineHeight: 1 }}>{t(TX.trackTitle)}</h1>
      <p className="muted">{t(TX.trackLead)}</p>
      {msg ? <div role="alert" className="note error" style={{ fontSize: 14, padding: '12px 14px' }}>{msg}</div> : null}
      <Field type="text" name="ref" label="Order or request reference" ph="e.g. FLW-261024-AB3D or BK-…" req value={ref} onChange={setRef} />
      <Field type="tel" name="phone" label="Phone number used" ph="017XXXXXXXX" req value={phone} onChange={setPhone} />
      <button type="button" className="btn btn-rose btn-lg" disabled={locked || busy} onClick={find}>{t(TX.find)}</button>
    </section>
  );
}
