import type { Metadata } from 'next';
import BudgetVsActualsContent from './content';

export const metadata: Metadata = {
  title: 'Budget vs Actuals - Patient Portal',
};

export default function BudgetVsActualsPage() {
  return <BudgetVsActualsContent />;
}
