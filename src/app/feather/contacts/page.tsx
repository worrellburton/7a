import type { Metadata } from 'next';
import ContactsContent from './content';

export const metadata: Metadata = {
  title: 'Contacts',
};

export default function ContactsPage() {
  return <ContactsContent />;
}
