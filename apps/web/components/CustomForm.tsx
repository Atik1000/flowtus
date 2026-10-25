'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { addDays, customEstimate, dhakaNow, fmt, unitLabel, validateCustom } from '@flowtus/core';
import { api, useLang } from '@flowtus/ui';
import { customPrice } from '@/lib/helpers';
import { TX } from '@/lib/text';
import { bind, ff } from './fields';
import { FormPage } from './FormPage';
import { useCatalogue } from './Providers';
import { useForm } from './useForm';
import { useSubmit } from './useSubmit';
import { photoLabel, uploadPhoto, type PhotoState } from './uploads';

interface V { item?: string; qty?: string; date?: string; colours?: string; notes?: string; photo?: PhotoState | null; name?: string; phone?: string; snap?: number | null }

export function CustomForm() {
  const { t, lang } = useLang();
  const router = useRouter();
  const { db } = useCatalogue();
  const form = useForm<V>('custom', {}, { persist: true });
  const sub = useSubmit();
  const v = form.v;
  const item = db.custom.find((c) => c.id === v.item);
  const now = dhakaNow();
  const lead = item ? item.leadDays : 1;
  const est = customEstimate(item, v.qty);
  const qErr = item && String(v.qty || '').trim() ? validateCustom(db, { item: v.item, qty: v.qty, date: addDays(now.date, lead), name: 'xx', phone: '01700000000' }).qty : null;
  const changed = !!item && v.snap !== undefined && v.snap !== item.unitPrice;
  const total = !item ? '—' : est.onRequest ? t(TX.priceOnRequest) : qErr || est.value == null ? '—' : fmt(est.value);
  useEffect(() => { document.title = 'Custom flower orders · FLOWTUS'; }, []);
  const price = (x: number | null | undefined) => (x == null ? 'price on request' : fmt(x));

  const submit = () => sub.run(
    (idem) => api<{ request: { token: string } }>('/requests/custom', { idempotencyKey: idem, body: { item: v.item, qty: v.qty, date: v.date, colours: v.colours, notes: v.notes, photo: v.photo && !v.photo.error ? { id: v.photo.id } : undefined, name: v.name, phone: v.phone, snapPrice: v.snap ?? null } }),
    {
      onOk: (r) => { sub.done(); form.reset({}); router.push(`/request/${r.request.token}`); },
      onErrors: (e) => form.setErrors(e),
      onConflict: (e) => {
        if (e.code !== 'PRICE_CHANGED') return false;
        form.set('snap', e.data.to);
        sub.setBanner({ text: `The unit price changed from ${price(e.data.from)} to ${price(e.data.to)}. Review the new estimate, then send again.`, tone: 'warn' });
        return true;
      },
    },
  );

  return (
    <FormPage
      eyebrow={t(TX.customEyebrow)} title={t(TX.customTitle)}
      lead="Order flowers by the stem, piece or garland for ceremonies and events. You see a live estimate as you go; we then check supply and send a quote."
      banner={sub.banner}
      sections={[
        { key: 'c1', title: 'Flower or product', fields: [ff({ type: 'cards', name: 'item', value: v.item, onChange: (id) => form.setMany({ item: id, snap: db.custom.find((c) => c.id === id)?.unitPrice ?? null }), error: form.errors.item, options: db.custom.map((c) => ({ value: c.id, label: c.name, bn: c.bn, price: customPrice(c, lang) + (c.unitPrice != null && c.priceMode !== 'quote' ? ' (demo)' : ''), disabled: !c.available, reason: 'Not available right now' })) })] },
        { key: 'c2', title: 'Quantity', fields: [ff({ type: 'qty', ...bind(form, 'qty'), label: 'How many?', req: true, unit: item ? unitLabel(item.unit, 2, lang) : '', presets: item ? item.presets : [], hint: item ? `Minimum ${item.min}, maximum ${item.max.toLocaleString('en-US')}${item.multiple > 1 ? `, in bundles of ${item.multiple}` : ''}.` : 'Choose a flower first.' })] },
        { key: 'c3', title: 'Delivery date', fields: [ff({ type: 'date', ...bind(form, 'date'), label: 'Date you need it', req: true, min: addDays(now.date, lead), max: addDays(now.date, db.delivery.customMaxDays), hint: `At least ${lead} day${lead > 1 ? 's' : ''}’ notice for custom orders.` })] },
        { key: 'c4', title: 'Requirements', fields: [
          ff({ type: 'text', ...bind(form, 'colours'), label: 'Colour or design (optional)', ph: 'e.g. deep red, tied in bundles of 10' }),
          ff({ type: 'textarea', ...bind(form, 'notes'), label: 'Notes (optional)', maxLen: 1000, rows: 3 }),
          ff({ type: 'file', name: 'photo', label: 'Reference photo (optional)', fileName: photoLabel(v.photo), error: v.photo?.error || form.errors.photo, onFile: async (f) => form.set('photo', await uploadPhoto(f)) }),
        ] },
        { key: 'c5', title: 'Your details', fields: [ff({ type: 'text', ...bind(form, 'name'), label: 'Your name', req: true, ac: 'name' }), ff({ type: 'tel', ...bind(form, 'phone'), label: 'Phone or WhatsApp', req: true, ph: '017XXXXXXXX', ac: 'tel' })] },
      ]}
      aside={{
        title: 'Your estimate',
        rows: [{ label: 'Item', value: item ? item.name : '—', sub: item?.bn }, { label: 'Quantity', value: item && v.qty && !qErr ? (+v.qty).toLocaleString('en-US') + ' ' + unitLabel(item.unit, +v.qty, lang) : '—' }, { label: 'Price per unit', value: item ? customPrice(item, lang) : '—' }],
        totalLabel: 'Estimated subtotal', total, totalSub: qErr || '',
        notes: [
          changed ? { text: `The price for ${item!.name} changed from ${price(v.snap)} to ${price(item!.unitPrice)} while this form was open. The estimate uses the new price.`, tone: 'warn' as const } : null,
          item && est.confirm ? { text: 'Flower prices change with the market and season. We confirm the final price in your quote.', tone: 'warn' as const } : null,
          item && est.onRequest ? { text: 'This item is priced by our team. You will receive a quote.', tone: 'warn' as const } : null,
          { text: 'Unit prices shown are demonstration values, not actual FLOWTUS prices.' },
        ].filter(Boolean) as any,
        button: 'Send request', busy: sub.busy, onSubmit: submit,
        disclaimer: 'This sends a request, not a confirmed order. We check availability and send you a quote before any payment.',
      }}
    />
  );
}
