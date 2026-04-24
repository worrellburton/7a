import type { Metadata } from 'next';
import AuditContent from './content';

export const metadata: Metadata = {
  title: 'GEO Audit - Patient Portal',
};

export default function GeoAuditPage() {
  return <AuditContent />;
}
