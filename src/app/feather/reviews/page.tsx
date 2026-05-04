import type { Metadata } from 'next';
import ReviewsContent from './content';

export const metadata: Metadata = {
  title: 'Reviews - Patient Portal',
};

export default function ReviewsPage() {
  return <ReviewsContent />;
}
