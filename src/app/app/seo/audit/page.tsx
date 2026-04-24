import type { Metadata } from 'next';
import AuditContent from './content';

export const metadata: Metadata = {
  title: 'SEO Audit - Patient Portal',
};

export default function AuditPage() {
  return <AuditContent />;
}
