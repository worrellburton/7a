import type { Metadata } from 'next';
import IntakePaperworkContent from './content';

export const metadata: Metadata = {
  title: 'Intake Paperwork - Feather',
};

export default function IntakePaperworkPage() {
  return <IntakePaperworkContent />;
}
