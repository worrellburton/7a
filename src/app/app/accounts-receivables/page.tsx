import type { Metadata } from 'next';
import AccountsReceivablesContent from './content';

export const metadata: Metadata = {
  title: 'Accounts Receivables - Patient Portal',
};

export default function AccountsReceivablesPage() {
  return <AccountsReceivablesContent />;
}
