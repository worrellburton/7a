import type { Metadata } from 'next';
import OverviewContent from './content';

export const metadata: Metadata = {
  title: 'Overview - Website Requests - Patient Portal',
};

export default function WebsiteRequestsPage() {
  return <OverviewContent />;
}
