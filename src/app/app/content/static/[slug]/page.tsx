import type { Metadata } from 'next';
import { Suspense } from 'react';
import StaticBlogDashboard from './content';

export const metadata: Metadata = {
  title: 'Edit hand-coded blog — Feather',
};

export default async function StaticBlogDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <Suspense fallback={null}>
      <StaticBlogDashboard slug={slug} />
    </Suspense>
  );
}
