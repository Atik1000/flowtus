'use client';
import { use, useEffect, useState } from 'react';
import { FIELD_DEFS } from '@flowtus/core';
import { Field, api } from '@flowtus/ui';
import { adm, Loading, useLoad } from '@/components/admin';
import { EditorShell, FieldSet, Full, useSave } from '@/components/editor';

export default function ServiceEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useLoad<any>(`/services/${id}`);
  const [areas, setAreas] = useState<any[]>([]);
  const [v, setV] = useState<any>(null);
  const s = useSave();
  useEffect(() => { api('/catalogue').then((c: any) => setAreas(c.areas)).catch(() => {}); }, []);
  useEffect(() => { if (data) setV({ ...data, nameEn: data.name[0], nameBn: data.name[1], packages: data.packages.map((p: any) => ({ ...p, price: String(p.price) })), fromPrice: data.fromPrice == null ? '' : String(data.fromPrice), depositPct: String(data.depositPct), leadDays: String(data.leadDays), maxDays: String(data.maxDays), h0: String(data.hours[0]), h1: String(data.hours[1]), durationHrs: String(data.durationHrs), capacity: data.capacity == null ? '' : String(data.capacity), included: data.included.join('\n'), excluded: data.excluded.join('\n') }); }, [data]);
  if (!v) return <Loading />;
  const f = (k: string, type: any, label: string, o: any = {}) => <Field type={type} name={k} label={label} value={v[k]} onChange={(x) => setV((p: any) => ({ ...p, [k]: x }))} error={s.err(k)} {...o} />;
  const fieldOpts = Object.keys(FIELD_DEFS).map((k) => ({ value: k, label: FIELD_DEFS[k].label[0] }));
  const save = () => s.save(() => adm(`/services/${id}`, { method: 'PUT', body: { ...v, name: [v.nameEn, v.nameBn], hours: [v.h0, v.h1], capacity: v.capacity === '' ? null : v.capacity, fromPrice: v.fromPrice === '' ? null : v.fromPrice } }), 'Service saved.');
  return (
    <EditorShell back="/services" title={v.nameEn} banner={s.banner} onSave={save} busy={s.busy}>
      <FieldSet title="Listing">
        {f('nameEn', 'text', 'Name (English)')}{f('nameBn', 'text', 'Name (বাংলা)')}
        <Full>{f('short', 'textarea', 'Short description', { rows: 2 })}</Full>
        {f('active', 'toggle', 'Taking bookings')}
      </FieldSet>
      <FieldSet title="Pricing">
        {f('priceModel', 'select', 'Price model', { options: [{ value: 'package', label: 'Fixed packages' }, { value: 'from', label: '"From" price' }, { value: 'quote', label: 'Quote on request' }] })}
        {f('fromPrice', 'text', '"From" price (৳)')}{f('depositPct', 'text', 'Deposit %')}
        <Full><Field type="rows" name="packages" label="Packages" value={v.packages} onChange={(x) => setV({ ...v, packages: x })} error={s.err('packages')} cols={[{ k: 'name', ph: 'Package name', flex: 2 }, { k: 'price', ph: 'Price (৳)' }, { k: 'includes', ph: 'What it includes', flex: 3 }]} blank={{ id: '', name: '', price: '', includes: '' }} addLabel="+ Add package" /></Full>
      </FieldSet>
      <FieldSet title="Availability rules">
        {f('leadDays', 'text', 'Minimum notice (days)')}{f('maxDays', 'text', 'Book up to (days ahead)')}{f('h0', 'text', 'Setup earliest hour')}{f('h1', 'text', 'Setup finish by hour')}
        {f('durationHrs', 'text', 'Hours on site')}{f('capacity', 'text', 'Bookings per day (blank = no limit)')}
        <Full>{f('coverage', 'multi', 'Coverage areas', { options: areas.map((a) => ({ value: a.id, label: a.name[0] })) })}</Full>
        {f('partner', 'toggle', 'Delivered with a partner team')}{f('partnerAvailable', 'toggle', 'Partner has confirmed availability')}
      </FieldSet>
      <FieldSet title="Booking form">
        <Full>{f('fields', 'multi', 'Fields shown (name and phone are always included)', { options: fieldOpts })}</Full>
        <Full>{f('req', 'multi', 'Fields required', { options: fieldOpts.filter((o) => v.fields.includes(o.value)) })}</Full>
      </FieldSet>
      <FieldSet title="Page content">
        {f('included', 'textarea', 'Included (one per line)', { rows: 4 })}{f('excluded', 'textarea', 'Not included (one per line)', { rows: 4 })}
        <Full>{f('cancellation', 'textarea', 'Cancellation text', { rows: 3 })}</Full>
      </FieldSet>
    </EditorShell>
  );
}
