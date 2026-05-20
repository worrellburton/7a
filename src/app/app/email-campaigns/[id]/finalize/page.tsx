import type { Metadata } from 'next';
import FinalizeContent from './content';

export const metadata: Metadata = {
  title: 'Finalize and send',
};

export default async function FinalizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FinalizeContent campaignId={id} />;
}
