import PageContent from './content';

// Hidden preview at /app/preview/jd-nag — not registered in the
// pages list, so it won't appear in the sidebar. Reachable by URL
// only. Renders the JD signature nag modal with dummy data so we
// can iterate on the design without needing a real overdue
// signature on the account.

export default function Page() {
  return <PageContent />;
}
