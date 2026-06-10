import type { Metadata } from 'next';
import RecoveryComReportContent from './content';

export const metadata: Metadata = {
  title: 'Recovery.com Performance Report - Feather',
};

export default function RecoveryComReportPage() {
  return <RecoveryComReportContent />;
}
