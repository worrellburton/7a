import type { Metadata } from 'next';
import CompanyContent from './content';

export const metadata: Metadata = {
  title: 'Company — Outreach',
};

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CompanyContent slug={slug} />;
}
