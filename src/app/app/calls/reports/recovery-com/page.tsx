import type { Metadata } from 'next';
import RecoveryComReportContent from './content';

export const metadata: Metadata = {
  title: 'Recovery.com Performance Report - Patient Portal',
};

export default function RecoveryComReportPage() {
  return <RecoveryComReportContent />;
}
