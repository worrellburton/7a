import type { Metadata } from 'next';
import ContentLoader from './Loader';

export const metadata: Metadata = {
  title: 'Content — Feather',
};

export default function ContentPage() {
  return <ContentLoader />;
}
