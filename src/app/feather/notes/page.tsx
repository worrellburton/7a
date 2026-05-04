import type { Metadata } from 'next';
import NotesContent from './content';

export const metadata: Metadata = {
  title: 'Notes - Patient Portal',
};

export default function NotesPage() {
  return <NotesContent />;
}
