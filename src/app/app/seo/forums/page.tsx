import type { Metadata } from 'next';
import PlacementsContent from '../placements/PlacementsContent';

export const metadata: Metadata = {
  title: 'Forums - Feather',
};

// Forum used to point at OutreachContent (status/approval tracker).
// It now logs Forum placements with the simpler Website / Target URL
// / Anchor / Live-link columns shared with PDF, Web 2.0, and Social
// Bookmarks. Old forum-channel rows in seo_outreach_entries stay
// where they are — preserved for record, just no longer surfaced.
export default function ForumsPage() {
  return <PlacementsContent channel="forum" />;
}
