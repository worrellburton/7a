import type { Metadata } from 'next';
import NewEmailCampaignContent from './content';

export const metadata: Metadata = {
  title: 'New email campaign',
};

export default function NewEmailCampaignPage() {
  return <NewEmailCampaignContent />;
}
