import type { Metadata } from 'next';
import EmailCampaignsContent from './content';

export const metadata: Metadata = {
  title: 'Email Campaigns',
};

export default function EmailCampaignsPage() {
  return <EmailCampaignsContent />;
}
