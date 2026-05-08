import type { Metadata } from 'next';
import AuditContent from './content';

export const metadata: Metadata = {
  title: 'GEO Audit - Feather',
};

export default function GeoAuditPage() {
  return <AuditContent />;
}
