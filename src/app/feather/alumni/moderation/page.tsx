import type { Metadata } from 'next';
import ModerationContent from './content';

export const metadata: Metadata = { title: 'Alumni moderation · Feather' };

export default function ModerationPage() {
  return <ModerationContent />;
}
