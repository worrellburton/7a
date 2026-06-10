import type { Metadata } from 'next';
import FinanceContent from './content';

export const metadata: Metadata = {
  title: 'Finance - Feather',
};

export default function FinancePage() {
  return <FinanceContent />;
}
