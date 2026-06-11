import type { Metadata } from 'next';
import PeerSupportContent from './content';

export const metadata: Metadata = { title: 'Peer support · Feather' };

export default function PeerSupportPage() {
  return <PeerSupportContent />;
}
