import { notFound } from 'next/navigation';
import { ListView } from '@/components/ListView';
import { pageContext } from '@/lib/server';

export default async function Occasion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { cat, t } = await pageContext();
  const o = cat.occasions.find((x) => x.id === id);
  if (!o) notFound();
  const items = cat.products.filter((p) => !p.archived && p.occ.includes(id) && !p.wrap);
  return <ListView key={id} title={t(o.name)} intro={`Flowers and gifts for ${o.name[0].toLowerCase()}. Every product here is the same item you will find in the main shop.`} chips={[]} shortcuts={false} items={items} occasions={cat.occasions} />;
}
