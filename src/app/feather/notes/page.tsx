import type { Metadata } from 'next';
import NotesContent from './content';

export const metadata: Metadata = {
  title: 'Notes - Feather',
};

export default function NotesPage() {
  return <NotesContent />;
}
