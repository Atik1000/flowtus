'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UNITS } from '@flowtus/core';
import { Field } from '@flowtus/ui';
import { adm, Loading, useLoad } from '@/components/admin';
import { EditorShell, FieldSet, Full, useSave } from '@/components/editor';

const BLANK = { name: '', bn: '', type: 'Flower', unit: 'stem', unitPrice: '', priceMode: 'confirm', min: '1', max: '100', multiple: '1', presets: '', available: true, seasonal: false, leadDays: '1' };

export default function CustomEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { data } = useLoad<any>(isNew ? null : `/custom/${id}`);
  const [v, setV] = useState<any>(isNew ? BLANK : null);
  const s = useSave();
  useEffect(() => { if (data) setV({ ...data, unitPrice: data.unitPrice == null ? '' : String(data.unitPrice), min: String(data.min), max: String(data.max), multiple: String(data.multiple), leadDays: String(data.leadDays), presets: data.presets.join(', ') }); }, [data]);
  if (!v) return <Loading />;
  const f = (k: string, type: any, label: string, o: any = {}) => <Field type={type} name={k} label={label} value={v[k]} onChange={(x) => setV((p: any) => ({ ...p, [k]: x }))} error={s.err(k)} {...o} />;
  const save = async () => {
    const r = await s.save(() => adm(isNew ? '/custom' : `/custom/${id}`, { method: isNew ? 'POST' : 'PUT', body: v }), 'Custom item saved. Open request forms will show the price change.');
    if (r && isNew) router.replace(`/custom/${r.id}`);
  };
  return (
    <EditorShell back="/custom" title={isNew ? 'New custom item' : v.name} banner={s.banner} onSave={save} busy={s.busy}>
      <FieldSet title="Item">
        {f('name', 'text', 'Name')}{f('bn', 'text', 'Name in Bangla')}{f('type', 'select', 'Type', { options: ['Flower', 'Garland', 'Bouquet'] })}
        {f('unit', 'select', 'Sold by', { options: Object.keys(UNITS) })}
      </FieldSet>
      <FieldSet title="Price">
        {f('priceMode', 'select', 'Price handling', { options: [{ value: 'fixed', label: 'Fixed unit price' }, { value: 'confirm', label: 'Estimate, confirmed in the quote' }, { value: 'quote', label: 'Price on request (quote only)' }] })}
        {f('unitPrice', 'text', 'Unit price (৳) — blank for price on request')}
      </FieldSet>
      <FieldSet title="Limits">
        {f('min', 'text', 'Minimum')}{f('max', 'text', 'Maximum')}{f('multiple', 'text', 'Sold in bundles of')}{f('leadDays', 'text', 'Notice needed (days)')}
        <Full>{f('presets', 'text', 'Quick quantities (comma separated)')}</Full>
        {f('available', 'toggle', 'Available')}{f('seasonal', 'toggle', 'Seasonal (shows a market-price note)')}
      </FieldSet>
    </EditorShell>
  );
}
