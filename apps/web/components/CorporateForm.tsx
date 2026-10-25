'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { addDays, dhakaNow, fmtDate } from '@flowtus/core';
import { api, useLang } from '@flowtus/ui';
import { TX } from '@/lib/text';
import { bind, ff } from './fields';
import { FormPage } from './FormPage';
import { useCatalogue } from './Providers';
import { useForm } from './useForm';
import { useSubmit } from './useSubmit';

export function CorporateForm() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { db } = useCatalogue();
  const form = useForm<Record<string, any>>('corp', {}, { persist: true });
  const sub = useSubmit();
  const v = form.v;
  const rec = v.mode === 'Recurring';
  const now = dhakaNow();
  useEffect(() => { document.title = 'Corporate & bulk orders · FLOWTUS'; }, []);
  const b = (k: string) => bind(form, k);
  const areas = [...db.areas.filter((a) => a.delivery).map((a) => ({ value: a.id, label: t(a.name) })), { value: 'outside', label: 'Another area' }];
  const f = (k: string, type: any, label: string, o: any = {}) => ff({ type, ...b(k), label, ...o });

  const submit = () => sub.run(
    (idem) => api<{ request: { token: string } }>('/requests/corporate', { idempotencyKey: idem, body: v }),
    { onOk: (r) => { sub.done(); form.reset({}); router.push(`/request/${r.request.token}`); }, onErrors: (e) => form.setErrors(e) },
  );

  return (
    <FormPage
      eyebrow="Corporate & bulk" title={t(TX.corpTitle)} lead={t(TX.corpLead)} banner={sub.banner}
      bullets={['Reception, lobby and office flowers', 'Client, employee and festival gift boxes', 'Opening ceremonies and corporate events', 'Recurring weekly, fortnightly or monthly supply']}
      sections={[
        { key: 'k1', title: 'Your business', fields: [f('company', 'text', 'Business name', { req: true }), f('name', 'text', 'Contact person', { req: true, ac: 'name' }), f('phone', 'tel', 'Phone or WhatsApp', { req: true, ph: '017XXXXXXXX' }), f('email', 'email', 'Email (optional)', { ac: 'email' })] },
        { key: 'k2', title: 'What you need', fields: [f('orderType', 'chips', 'Order type', { req: true, options: ['Office flowers', 'Reception & lobby', 'Hotel & restaurant', 'Corporate gift boxes', 'Client gifts', 'Employee gifts', 'Opening ceremony', 'Bulk flower supply', 'Corporate event flowers'] }), f('qty', 'textarea', 'Items and quantities', { req: true, rows: 3, ph: 'e.g. 2 reception arrangements and 6 desk vases' })] },
        { key: 'k3', title: 'Schedule', fields: [
          f('mode', 'chips', 'One-time or recurring', { req: true, options: ['One-time', 'Recurring'] }),
          f('start', 'date', rec ? 'First delivery date' : 'Delivery date', { req: true, min: addDays(now.date, 2) }),
          ...(rec ? [f('freq', 'chips', 'How often', { req: true, options: ['Weekly', 'Fortnightly', 'Monthly'] }), f('duration', 'chips', 'For how long', { req: true, options: ['1 month', '3 months', '6 months', '12 months'] })] : []),
          f('slot', 'select', 'Preferred window', { ph: 'Any time', options: db.delivery.slots.filter((s) => s.enabled).map((s) => ({ value: s.id, label: s.label })) }),
        ] },
        { key: 'k4', title: 'Delivery & billing', fields: [
          f('area', 'select', 'Area', { req: true, ph: 'Choose area', options: areas }), f('address', 'textarea', 'Business address', { req: true, rows: 2 }),
          f('invoice', 'toggle', 'We need a formal quotation and invoice'), ...(v.invoice ? [f('billing', 'text', 'Billing name, BIN or TIN (optional)')] : []), f('notes', 'textarea', 'Anything else (optional)', { rows: 3, maxLen: 1000 }),
        ] },
      ]}
      aside={{
        title: 'Request summary',
        rows: [{ label: 'Type', value: v.orderType || '—' }, { label: 'Schedule', value: v.mode ? (rec ? (v.freq || 'Recurring') + (v.duration ? ' · ' + v.duration : '') : 'One-time') : '—' }, { label: 'Starts', value: v.start ? fmtDate(v.start, lang) : '—' }],
        notes: [rec ? { text: 'Recurring deliveries begin only after you approve our proposal and we confirm the schedule in writing. Prices can change between periods only by a revised, approved quote.', tone: 'warn' as const } : null, { text: 'We reply with a formal quotation. Nothing is charged until you approve it.' }].filter(Boolean) as any,
        button: 'Send business request', busyLabel: 'Sending request…', busy: sub.busy, onSubmit: submit,
      }}
    />
  );
}
