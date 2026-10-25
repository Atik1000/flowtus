import { OrderStatus } from '@/components/OrderStatus';
export const metadata = { title: 'Your order', robots: { index: false } };
export default async function Order({ params }: { params: Promise<{ token: string }> }) { return <OrderStatus token={(await params).token} />; }
