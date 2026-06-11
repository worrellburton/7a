import type { Metadata } from 'next';
import OrgChartContent from './content';

export const metadata: Metadata = {
  title: 'Org Chart - Feather',
};

export default function OrgChartPage() {
  return <OrgChartContent />;
}
