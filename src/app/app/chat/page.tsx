import type { Metadata } from 'next';
import ChatContent from './content';

export const metadata: Metadata = {
  title: 'Chat',
};

export default function ChatPage() {
  return <ChatContent />;
}
