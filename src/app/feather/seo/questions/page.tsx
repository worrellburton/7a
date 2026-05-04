import type { Metadata } from 'next';
import QuestionsContent from './content';

export const metadata: Metadata = {
  title: 'PAA Questions',
};

export default function SeoQuestionsPage() {
  return <QuestionsContent />;
}
