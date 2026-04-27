import type { Metadata } from 'next';
import ActionsContent from './content';

export const metadata: Metadata = {
  title: 'SEO Actions',
};

export default function SeoActionsPage() {
  return <ActionsContent />;
}
