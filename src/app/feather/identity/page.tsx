import type { Metadata } from 'next';
import IdentityContent from './content';

export const metadata: Metadata = {
  title: 'Identity · Feather',
  description:
    'Seven Arrows Recovery program identity — who we are, how we treat, what we believe.',
};

export default function IdentityPage() {
  return <IdentityContent />;
}
