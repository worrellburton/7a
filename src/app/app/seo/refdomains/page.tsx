import type { Metadata } from 'next';
import RefDomainsContent from './content';

export const metadata: Metadata = {
  title: 'Referring Domains - Patient Portal',
};

export default function RefDomainsPage() {
  return <RefDomainsContent />;
}
