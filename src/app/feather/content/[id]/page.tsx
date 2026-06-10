import type { Metadata } from 'next';
import { Suspense } from 'react';
import BlogEditor from './content';

export const metadata: Metadata = {
  title: 'Edit blog — Feather',
};

export default async function BlogEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <BlogEditor id={id} />
    </Suspense>
  );
}
