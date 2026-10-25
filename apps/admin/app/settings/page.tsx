'use client';
import { useEffect, useState } from 'react';
import { Field } from '@flowtus/ui';
import { adm, Loading, useLoad, useMe } from '@/components/admin';
import { EditorShell, FieldSet, Full, useSave } from '@/components/editor';

export default function Settings() {
  const me = useMe();
  const { data } = useLoad<any>(me.role === 'owner' ? '/settings' : null);
  const [v, setV] = useState<any>(null);
  const [reset, setReset] = useState(false);
  const s = useSave();
  useEffect(() => { if (data) setV(JSON.parse(JSON.stringify(data))); }, [data]);
  if (me.role !== 'owner') return <div className="panel">Only the owner can change payment and policy settings.</div>;
  if (!v) return <Loading />;
  const f = (k: string, type: any, label: string, o: any = {}) => <Field type={type} name={k} label={label} value={v[k]} onChange={(x) => setV((p: any) => ({ ...p, [k]: x }))} error={s.err(k)} {...o} />;
  const pay = (m: 'cod' | 'bkash' | 'nagad', k: string, type: any, label: string, err = '') => <Field type={type} name={m + k} label={label} value={v.pay[m][k]} error={s.err(err)} onChange={(x) => setV((p: any) => ({ ...p, pay: { ...p.pay, [m]: { ...p.pay[m], [k]: x } } }))} />;
  return (
    <EditorShell back="/" title="Settings" banner={s.banner} busy={s.busy} onSave={() => s.save(() => adm('/settings', { method: 'PUT', body: v }), 'Settings saved.')}
      extra={<button type="button" className="btn btn-danger" onClick={async () => { if (!reset) { setReset(true); return; } await s.save(() => adm('/demo/reset', { method: 'POST', body: { confirm: 'RESET' } }), 'Demo data reset.'); setReset(false); window.location.reload(); }}>{reset ? 'Press again to wipe orders and reset' : 'Reset demo data'}</button>}>
      <FieldSet title="Storefront">
        <Full>{f('announcement', 'text', 'Announcement bar')}</Full>
        {f('phone', 'tel', 'Phone')}{f('whatsapp', 'tel', 'WhatsApp')}{f('email', 'email', 'Email')}{f('instagram', 'text', 'Instagram')}{f('facebook', 'text', 'Facebook')}
      </FieldSet>
      <FieldSet title="Payment methods">
        {pay('cod', 'enabled', 'toggle', 'Cash on delivery', 'codOn')}
        {pay('bkash', 'enabled', 'toggle', 'bKash (manual)')}{pay('bkash', 'number', 'tel', 'bKash merchant number', 'bkashNum')}
        {pay('nagad', 'enabled', 'toggle', 'Nagad (manual)')}{pay('nagad', 'number', 'tel', 'Nagad merchant number', 'nagadNum')}
        <Full><span className="xs muted">Numbers are shown to a customer only after an order is placed or a quote is approved. Payments are never auto-verified.</span></Full>
      </FieldSet>
      <FieldSet title="Policies (customers see a Draft badge until approved)">
        {Object.entries(v.policies).map(([k, p]: [string, any]) => (
          <Full key={k}>
            <Field type="textarea" name={'pt_' + k} label={p.title[0]} rows={3} value={p.text} onChange={(x) => setV((o: any) => ({ ...o, policies: { ...o.policies, [k]: { ...p, text: x } } }))} />
            <Field type="toggle" name={'pa_' + k} label={`Approved by the owner: ${p.title[0]}`} value={p.approved} onChange={(x) => setV((o: any) => ({ ...o, policies: { ...o.policies, [k]: { ...p, approved: x } } }))} />
          </Full>
        ))}
      </FieldSet>
      <FieldSet title="FAQ">
        <Full><Field type="rows" name="faqs" label="Questions" value={v.faqs} onChange={(x) => setV({ ...v, faqs: x })} cols={[{ k: 'q', ph: 'Question', flex: 2 }, { k: 'a', ph: 'Answer', flex: 4 }]} blank={{ q: '', a: '' }} addLabel="+ Add question" /></Full>
        {f('faqApproved', 'toggle', 'FAQ approved by the owner')}
      </FieldSet>
    </EditorShell>
  );
}
