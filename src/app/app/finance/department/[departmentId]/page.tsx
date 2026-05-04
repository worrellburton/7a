import type { Metadata } from 'next';
import DepartmentBudgetContent from './content';

export const metadata: Metadata = {
  title: 'Department Budget - Patient Portal',
};

export default function DepartmentBudgetPage() {
  return <DepartmentBudgetContent />;
}
