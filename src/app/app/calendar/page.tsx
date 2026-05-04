import type { Metadata } from 'next';
import CalendarContent from './content';

export const metadata: Metadata = {
  title: 'Calendar',
};

export default function CalendarPage() {
  return <CalendarContent />;
}
