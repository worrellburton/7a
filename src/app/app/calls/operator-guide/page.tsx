import type { Metadata } from 'next';
import OperatorGuideContent from './content';

export const metadata: Metadata = {
  title: 'Operator Guide — Calls',
};

export default function OperatorGuidePage() {
  return <OperatorGuideContent />;
}
