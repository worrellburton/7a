import type { Metadata } from 'next';
import PlacementsContent from '../placements/PlacementsContent';

export const metadata: Metadata = {
  title: 'Social bookmarks - Feather',
};

export default function SocialBookmarksPage() {
  return <PlacementsContent channel="social_bookmark" />;
}
