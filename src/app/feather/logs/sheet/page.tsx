import type { Metadata } from 'next';
import LogSheetContent from './content';

export const metadata: Metadata = {
  title: 'Log sheet',
};

export default function LogSheetPage() {
  return <LogSheetContent />;
}
