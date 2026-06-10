import type { Metadata } from 'next';
import AuditContent from './content';

export const metadata: Metadata = {
  title: 'SEO Audit - Feather',
};

export default function AuditPage() {
  return <AuditContent />;
}
