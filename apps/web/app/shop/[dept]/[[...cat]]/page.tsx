import { notFound } from 'next/navigation';
import { DEPTS } from '@flowtus/core';
import { ListView } from '@/components/ListView';
import { pageContext } from '@/lib/server';

const INTRO: Record<string, string> = {
  flowers: 'Bouquets, arrangements and garlands, made fresh in Dhaka.',
  gifts: 'Gift boxes and flower combinations, ready to send.',
  extras: 'Cards, teddy bears, balloons and chocolates to add to any order.',
  wedding: 'Ready-made garlands and floral accessories. For made-to-measure pieces, request a custom quote.',
};

export default async function Shop({ params }: { params: Promise<{ dept: string; cat?: string[] }> }) {
  const { dept, cat: catParts } = await params;
  const catId = catParts?.[0];
  const { cat, lang, t } = await pageContext();
  const D = DEPTS[dept];
  if (!D || (catParts && catParts.length > 1)) notFound();
  if (catId && !D.cats.find((x) => x[0] === catId)) notFound();
  const c = D.cats.find((x) => x[0] === catId);
  const items = cat.products.filter((p) => !p.archived && p.dept === dept && !p.wrap && (!catId || p.cat === catId));
  const chips = [{ key: 'all', label: 'All', href: `/shop/${dept}`, on: !catId }, ...D.cats.map((x) => ({ key: x[0], label: lang === 'bn' ? x[2] : x[1], href: `/shop/${dept}/${x[0]}`, on: catId === x[0] }))];
  return <ListView key={dept + '/' + (catId || '')} title={c ? (lang === 'bn' ? c[2] : c[1]) : t(D.name)} intro={INTRO[dept]} chips={chips} shortcuts={dept === 'flowers'} items={items} occasions={cat.occasions} />;
}
