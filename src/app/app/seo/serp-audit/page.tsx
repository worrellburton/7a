import type { Metadata } from 'next';
import SerpAuditContent from './content';

export const metadata: Metadata = {
  title: 'SERP Audit — Patient Portal',
};

export default function SerpAuditPage() {
  return <SerpAuditContent />;
}
