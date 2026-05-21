import type { Metadata } from 'next';
import RecipientsContent from './content';

export const metadata: Metadata = {
  title: 'Pick recipients',
};

export default async function RecipientsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RecipientsContent campaignId={id} />;
}
