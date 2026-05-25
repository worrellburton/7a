import type { Metadata } from 'next';
import MeetupsContent from './content';

export const metadata: Metadata = { title: 'Reunions & meetups · Feather' };

export default function MeetupsPage() {
  return <MeetupsContent />;
}
