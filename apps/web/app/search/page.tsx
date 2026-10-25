import { ListView } from '@/components/ListView';
import { pageContext } from '@/lib/server';

export const metadata = { title: 'Search' };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q || '').trim().toLowerCase().slice(0, 80);
  const { cat } = await pageContext();
  const items = cat.products.filter((p) => !p.archived && !p.wrap && (!q || (p.name + ' ' + p.cat + ' ' + p.occ.join(' ') + ' ' + p.short).toLowerCase().includes(q)));
  return <ListView key={q} title={'Search: ' + (q || 'everything')} chips={[]} shortcuts={false} items={items} occasions={cat.occasions} />;
}
