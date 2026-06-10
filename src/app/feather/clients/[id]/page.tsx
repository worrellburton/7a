import type { Metadata } from 'next';
import ClientChartContent from './content';

export const metadata: Metadata = {
  title: 'Client Chart',
};

export default async function ClientChartPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientChartContent id={id} />;
}
