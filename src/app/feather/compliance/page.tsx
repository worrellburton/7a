import type { Metadata } from 'next';
import ComplianceContent from './content';

export const metadata: Metadata = {
  title: 'Compliance - Patient Portal',
};

export default function CompliancePage() {
  return <ComplianceContent />;
}
