import type { Metadata } from 'next';
import DraftDetailContent from './content';

export const metadata: Metadata = {
  title: 'Draft — Social Media',
};

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DraftDetailContent id={id} />;
}
