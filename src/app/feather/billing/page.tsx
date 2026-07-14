import type { Metadata } from 'next';
import BillingContent from './content';

export const metadata: Metadata = {
  title: 'Billing · Super admin',
};

export default function BillingPage() {
  return <BillingContent />;
}
