'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FIELD_DEFS, FIELD_SECTION, FORM_SECTIONS, addDays, dhakaNow, fmt, fmtDate, serviceEstimate, type Service } from '@flowtus/core';
import { api, useLang } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { bind, ff } from './fields';
import { FormPage, type FpField } from './FormPage';
import { useCatalogue } from './Providers';
import { useForm } from './useForm';
import { useSubmit } from './useSubmit';
import { photoLabel, uploadPhoto, type PhotoState } from './uploads';

type Check = { error: string | null; warn?: string[] } | null;

/** One booking form for every service. Fields and required fields come from the service's configuration (editable in the admin). */
export function BookForm({ serviceId }: { serviceId: string }) {
  const { t, lang } = useLang();
  const router = useRouter();
  const { db } = useCatalogue();
  const svc = db.services.find((s) => s.id === serviceId) as Service;
  const form = useForm<Record<string, any>>('book:' + serviceId, {}, { persist: true });
  const sub = useSubmit();
  const v = form.v;
  const [check, setCheck] = useState<Check>(null);
  const [dupOk, setDupOk] = useState(false);
  const now = dhakaNow();
  useEffect(() => { document.title = `${svc.name[0]} · Request a booking · FLOWTUS`; }, [svc.name]);

  // Live availability (date, hours, area, blocks and capacity) from the server; the reason is shown verbatim.
  const probe = JSON.stringify({ d: v.date, t: v.time, a: v.area, i: v.indoor });
  useEffect(() => {
    if (!v.date) { setCheck(null); return; }
    const ctl = new AbortController();
    const timer = setTimeout(() => {
      api<Check>('/availability/service', { body: { serviceId, fields: { date: v.date, time: v.time, area: v.area, indoor: v.indoor } }, signal: ctl.signal }).then(setCheck).catch(() => {});
    }, 300);
    return () => { clearTimeout(timer); ctl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [probe, serviceId]);

  const field = (k: string): FpField | null => {
    const def = FIELD_DEFS[k];
    if (!def) return null;
    const req = svc.req.includes(k);
    const p: any = { type: def.type, ...bind(form, k), label: t(def.label), req, ph: def.ph, maxLen: def.maxLen, rows: def.rows, ac: def.ac, options: def.options?.map((o) => (typeof o === 'string' ? o : { ...o })) };
    if (k === 'date') { p.min = addDays(now.date, svc.leadDays); p.max = addDays(now.date, svc.maxDays); p.hint = `At least ${svc.leadDays} days’ notice.`; }
    if (k === 'time') p.hint = `Start between ${svc.hours[0]}:00 and ${svc.hours[1] - svc.durationHrs}:00. Setup takes about ${svc.durationHrs} hours.`;
    if (k === 'package') p.options = [...svc.packages.map((x) => ({ value: x.id, label: x.name, sub: x.includes, price: fmt(x.price) + ' (demo)' })), { value: 'custom', label: 'Custom design', sub: 'Tell us what you have in mind and we will quote.', price: 'Quote' }];
    if (k === 'area') {
      p.options = [...svc.coverage.map((id) => db.areas.find((a) => a.id === id)).filter(Boolean).map((a) => ({ value: a!.id, label: t(a!.name) })), { value: 'outside', label: 'Another area' }];
      p.hint = 'This service covers ' + svc.coverage.map((id) => db.areas.find((a) => a.id === id)?.name[0] || id).join(', ') + '.';
      p.ph = 'Choose area';
    }
    if (k === 'address' && svc.fields.includes('handover')) p.hint = 'Needed if we deliver to you or the venue.';
    if (k === 'photo') { delete p.value; p.fileName = photoLabel(v.photo); p.error = (v.photo as PhotoState | undefined)?.error || form.errors.photo; p.onFile = async (f: File | null) => form.set('photo', await uploadPhoto(f)); }
    return ff(p, k);
  };

  const groups: Record<string, FpField[]> = {};
  svc.fields.forEach((k) => { const g = FIELD_SECTION[k] || 'what'; const f = field(k); if (f) (groups[g] = groups[g] || []).push(f); });
  const sections = FORM_SECTIONS.filter((x) => groups[x[0]]).map((x) => ({ key: x[0], title: t(x[1]), fields: groups[x[0]] }));
  const est = serviceEstimate(svc, v);
  const pk = svc.packages.find((p) => p.id === v.package);
  const groupLabel = t(svc.group === 'wedding' ? TX.weddingTitle : TX.eventsTitle);
  const notes: { text: string; tone?: 'warn' | 'error' | 'ok' }[] = [];
  if (!svc.active) notes.push({ text: 'This service is not taking bookings right now.', tone: 'error' });
  if (check?.error) notes.push({ text: check.error, tone: 'error' });
  else if (check) { notes.push({ text: 'This date looks available. Final availability is confirmed by our team after review.', tone: 'ok' }); (check.warn || []).forEach((w) => notes.push({ text: w, tone: 'warn' })); }
  if (svc.depositPct) notes.push({ text: `A ${svc.depositPct}% deposit is requested after you approve the quote. The balance is due as stated in the quote.` });
  notes.push({ text: 'Package prices are demonstration values until FLOWTUS confirms them.' });

  const submit = () => sub.run(
    (idem) => {
      const fields: Record<string, any> = {};
      Object.entries(v).forEach(([k, val]) => { if (!k.startsWith('_') && k !== 'photo') fields[k] = val; });
      if (v.photo && !v.photo.error) fields.photo = { id: v.photo.id };
      return api<{ request: { token: string } }>(`/requests/bookings/${serviceId}`, { idempotencyKey: idem, body: { fields, allowDuplicate: dupOk } });
    },
    {
      onOk: (r) => { sub.done(); form.reset({}); router.push(`/request/${r.request.token}`); },
      onErrors: (e) => form.setErrors(e),
      onConflict: (e) => {
        if (e.code !== 'DUPLICATE') return false;
        sub.setBanner({
          text: `You already sent a request for this service on this date (${e.data.ref}, ${e.data.status}). Sending another may double-book.`, tone: 'warn',
          actions: [{ label: 'View existing request', onClick: () => router.push(`/request/${e.data.token}`) }, { label: 'Send as a separate request', onClick: () => { setDupOk(true); sub.setBanner({ text: 'Press Send booking request again to submit a separate request.', tone: 'warn' }); } }],
        });
        return true;
      },
    },
  );

  return (
    <FormPage
      eyebrow={groupLabel} title={t(svc.name)} lead={svc.short} banner={sub.banner}
      crumbs={[{ label: groupLabel, href: svc.group === 'wedding' ? '/wedding' : '/events' }, { label: t(svc.name), href: `/service/${svc.id}` }]}
      sections={sections}
      aside={{
        title: 'Booking request',
        rows: [{ label: 'Service', value: t(svc.name) }, ...(pk ? [{ label: 'Package', value: pk.name }] : v.package === 'custom' ? [{ label: 'Package', value: 'Custom design' }] : []), { label: 'Date', value: v.date ? fmtDate(v.date, lang) : '—' }, ...(svc.fields.includes('time') ? [{ label: 'Time', value: v.time || '—' }] : [])],
        totalLabel: 'Estimate', total: est.value != null ? (est.from ? 'From ' : '') + fmt(est.value) : 'Quote required', notes,
        button: 'Send booking request', busyLabel: 'Sending request…', busy: sub.busy, disabled: !svc.active, onSubmit: submit,
        disclaimer: 'This is a booking request, not a confirmed booking. We check the date and team, then send you a quote.',
      }}
    />
  );
}
