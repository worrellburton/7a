import type { Metadata } from 'next';
import DepartmentBudgetContent from './content';

export const metadata: Metadata = {
  title: 'Department Budget - Feather',
};

export default function DepartmentBudgetPage() {
  return <DepartmentBudgetContent />;
}
