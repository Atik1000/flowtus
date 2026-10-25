import { notFound } from 'next/navigation';
import { InfoPage } from '@/components/InfoPage';
import { pageContext } from '@/lib/server';

export default async function Policy({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const { cat, t } = await pageContext();
  const p = cat.settings.policies[key];
  if (!p) notFound();
  return <InfoPage active={key} title={t(p.title)} draft={!p.approved}><p style={{ fontSize: 17, maxWidth: 680 }}>{p.text}</p></InfoPage>;
}
