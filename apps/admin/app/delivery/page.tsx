'use client';
import { useEffect, useState } from 'react';
import { Field } from '@flowtus/ui';
import { adm, Loading, useLoad } from '@/components/admin';
import { EditorShell, FieldSet, Full, useSave } from '@/components/editor';

export default function Delivery() {
  const { data } = useLoad<any>('/delivery');
  const [v, setV] = useState<any>(null);
  const s = useSave();
  useEffect(() => { if (data) setV({ areas: data.areas.map((a: any) => ({ id: a.id, name: a.name[0], bn: a.name[1], fee: String(a.fee), delivery: a.delivery })), slots: data.slots.map((x: any) => ({ ...x, start: String(x.start), cap: String(x.cap) })), sameDay: data.sameDay, cutoffHour: String(data.cutoffHour), leadHours: String(data.leadHours), maxDaysAhead: String(data.maxDaysAhead), customMaxDays: String(data.customMaxDays) }); }, [data]);
  if (!v) return <Loading />;
  const f = (k: string, type: any, label: string, o: any = {}) => <Field type={type} name={k} label={label} value={v[k]} onChange={(x) => setV((p: any) => ({ ...p, [k]: x }))} error={s.err(k)} {...o} />;
  return (
    <EditorShell back="/" title="Delivery & areas" banner={s.banner} busy={s.busy} onSave={() => s.save(() => adm('/delivery', { method: 'PUT', body: v }), 'Delivery settings saved.')}>
      <FieldSet title="Areas and fees">
        <Full><Field type="rows" name="areas" label="Delivery areas (installation coverage is set per service)" value={v.areas} onChange={(x) => setV({ ...v, areas: x })} error={s.err('areas')} cols={[{ k: 'name', ph: 'Area', flex: 2 }, { k: 'bn', ph: 'বাংলা', flex: 2 }, { k: 'fee', ph: 'Fee (৳)' }]} blank={{ id: '', name: '', bn: '', fee: '0', delivery: true }} toggleKey="delivery" toggleLabel="Delivers here" addLabel="+ Add area" /></Full>
      </FieldSet>
      <FieldSet title="Delivery windows">
        <Full><Field type="rows" name="slots" label="Windows" value={v.slots} onChange={(x) => setV({ ...v, slots: x })} error={s.err('slots')} cols={[{ k: 'label', ph: 'Label e.g. 10:00 – 13:00', flex: 3 }, { k: 'start', ph: 'Start hour' }, { k: 'cap', ph: 'Capacity' }]} blank={{ id: '', label: '', start: '10', cap: '8', enabled: true }} toggleKey="enabled" toggleLabel="Offered" addLabel="+ Add window" /></Full>
      </FieldSet>
      <FieldSet title="Rules">
        {f('sameDay', 'toggle', 'Offer same-day delivery')}{f('cutoffHour', 'text', 'Same-day cut-off hour (24h)')}{f('leadHours', 'text', 'Hours of notice before a window')}
        {f('maxDaysAhead', 'text', 'Delivery orders up to (days ahead)')}{f('customMaxDays', 'text', 'Custom orders up to (days ahead)')}
      </FieldSet>
    </EditorShell>
  );
}
