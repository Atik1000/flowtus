import { notFound } from 'next/navigation';
import { BookForm } from '@/components/BookForm';
import { getCatalogue } from '@/lib/server';

export const metadata = { title: 'Request a booking' };

export default async function Book({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = await getCatalogue();
  if (!cat.services.some((s) => s.id === id)) notFound();
  return <BookForm serviceId={id} />;
}
