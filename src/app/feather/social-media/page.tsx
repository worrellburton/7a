import type { Metadata } from 'next';
import SocialMediaLoader from './Loader';

export const metadata: Metadata = {
  title: 'Social Media — Feather',
};

export default function SocialMediaPage() {
  return <SocialMediaLoader />;
}
