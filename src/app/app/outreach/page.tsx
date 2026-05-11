import type { Metadata } from 'next';
import ContactsContent from './content';

export const metadata: Metadata = {
  title: 'Outreach',
};

export default function ContactsPage() {
  return <ContactsContent />;
}
