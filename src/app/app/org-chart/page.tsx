import type { Metadata } from 'next';
import OrgChartContent from './content';

export const metadata: Metadata = {
  title: 'Org Chart - Patient Portal',
};

export default function OrgChartPage() {
  return <OrgChartContent />;
}
