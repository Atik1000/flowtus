'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEPTS } from '@flowtus/core';
import { Field, api } from '@flowtus/ui';
import { adm, Loading, useLoad } from '@/components/admin';
import { EditorShell, FieldSet, Full, useSave } from '@/components/editor';

const BLANK = { name: '', dept: 'flowers', cat: 'rose-bouquets', short: '', description: '', composition: '', care: '', occ: [] as string[], variants: [{ id: '', name: 'Standard', price: '', available: true }], maxQty: '10', leadDays: '0', available: true, featured: false, addons: false, builder: false, builderExtra: false, wrap: false, archived: false };

export default function ProductEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isNew = id === 'new';
  const router = useRouter();
  const { data } = useLoad<any>(isNew ? null : `/products/${id}`);
  const [occData, setOccData] = useState<any>(null);
  useEffect(() => { api('/catalogue').then(setOccData).catch(() => {}); }, []);
  const [v, setV] = useState<any>(isNew ? BLANK : null);
  const s = useSave();
  useEffect(() => { if (data) setV({ ...data, variants: data.variants.map((x: any) => ({ ...x, price: x.price == null ? '' : String(x.price) })), maxQty: String(data.maxQty), leadDays: String(data.leadDays) }); }, [data]);
  if (!v) return <Loading />;
  const set = (k: string, val: any) => setV((o: any) => ({ ...o, [k]: val }));
  const f = (k: string, type: any, label: string, o: any = {}) => <Field type={type} name={k} label={label} value={v[k]} onChange={(x) => set(k, x)} error={s.err(k)} {...o} />;
  const occasions: { id: string; name: [string, string] }[] = (occData && occData.occasions) || [];
  const save = async () => {
    const body = { ...v, variants: v.variants.map((x: any) => ({ ...x, price: x.price === '' ? null : x.price })) };
    const r = await s.save(() => adm(isNew ? '/products' : `/products/${id}`, { method: isNew ? 'POST' : 'PUT', body }), 'Product saved. Existing orders keep the prices they were placed at.');
    if (r && isNew) router.replace(`/products/${r.id}`);
  };
  return (
    <EditorShell back="/products" title={isNew ? 'New product' : v.name} banner={s.banner} onSave={save} busy={s.busy}>
      <FieldSet title="Basics">
        {f('name', 'text', 'Name')}
        {f('dept', 'select', 'Department', { options: Object.keys(DEPTS).map((d) => ({ value: d, label: DEPTS[d].name[0] })), onChange: (x: string) => setV((o: any) => ({ ...o, dept: x, cat: DEPTS[x].cats[0][0] })) })}
        {f('cat', 'select', 'Category', { options: (DEPTS[v.dept]?.cats || []).map((c) => ({ value: c[0], label: c[1] })) })}
        <Full>{f('short', 'text', 'Short description')}</Full>
        <Full>{f('description', 'textarea', 'About this piece', { rows: 3 })}</Full>
        {f('composition', 'text', 'What is included')}{f('care', 'text', 'Care')}
      </FieldSet>
      <FieldSet title="Sizes and prices">
        <Full><Field type="rows" name="variants" label="Variants (leave price blank for price on request)" value={v.variants} onChange={(x) => set('variants', x)} error={s.err('variants')} cols={[{ k: 'name', ph: 'Size or variant', flex: 2 }, { k: 'price', ph: 'Price (৳)' }]} blank={{ id: '', name: '', price: '', available: true }} toggleKey="available" toggleLabel="Available" addLabel="+ Add variant" /></Full>
        {f('maxQty', 'text', 'Max quantity per order')}{f('leadDays', 'text', 'Notice needed (days)')}
      </FieldSet>
      <FieldSet title="Where it appears">
        <Full>{f('occ', 'multi', 'Occasions', { options: occasions.map((o) => ({ value: o.id, label: o.name[0] })) })}</Full>
        {f('available', 'toggle', 'Available to order')}{f('featured', 'toggle', 'Featured on the home page')}{f('addons', 'toggle', 'Offer add-on extras')}
        {f('builder', 'toggle', 'Offer as flowers in the gift builder')}{f('builderExtra', 'toggle', 'Offer as an extra in the gift builder')}{f('wrap', 'toggle', 'This is a wrapping option')}
        {f('archived', 'toggle', 'Archived (removed from the store; carts show it as no longer sold)')}
      </FieldSet>
    </EditorShell>
  );
}
