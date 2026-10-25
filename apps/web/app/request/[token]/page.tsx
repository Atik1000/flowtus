import { RequestStatus } from '@/components/RequestStatus';
export const metadata = { title: 'Your request', robots: { index: false } };
export default async function Request({ params }: { params: Promise<{ token: string }> }) { return <RequestStatus token={(await params).token} />; }
