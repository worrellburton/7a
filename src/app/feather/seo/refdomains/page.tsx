import type { Metadata } from 'next';
import RefDomainsContent from './content';

export const metadata: Metadata = {
  title: 'Referring Domains - Feather',
};

export default function RefDomainsPage() {
  return <RefDomainsContent />;
}
