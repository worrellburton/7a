import type { Metadata } from 'next';
import ContactsLoader from './Loader';

export const metadata: Metadata = {
  title: 'Outreach',
};

export default function ContactsPage() {
  return <ContactsLoader />;
}
