import type { Metadata } from 'next';
import CompetitorsContent from './content';

export const metadata: Metadata = {
  title: 'Competitors',
};

export default function SeoCompetitorsPage() {
  return <CompetitorsContent />;
}
