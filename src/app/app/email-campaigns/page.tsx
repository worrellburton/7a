import type { Metadata } from 'next';
import EmailCampaignsLoader from './Loader';

export const metadata: Metadata = {
  title: 'Email Campaigns',
};

export default function EmailCampaignsPage() {
  return <EmailCampaignsLoader />;
}
