'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Inner sub-tab strip for the Backlinks parent tab. Renders on both
// /app/seo/backlinks (Semrush link profile) and /app/seo/directories
// (citation tracker) so admins can toggle between the two without
// leaving the primary tab. Visual style is intentionally lighter
// than SeoSubNav so the hierarchy reads as primary → secondary.

interface InnerTab {
  href: string;
  label: string;
  hint: string;
}

const INNER_TABS: InnerTab[] = [
  // Directories first — that's where day-to-day work happens
  // (claiming + tracking citations); Backlinks is a quieter
  // Semrush snapshot that admins glance at less often. The four
  // outreach trackers (press releases / guest posts / comments /
  // forums) follow, each one a manual list of prospects we're
  // working through with a per-row chat thread.
  { href: '/app/seo/directories', label: 'Directories', hint: 'Off-site listings to claim' },
  { href: '/app/seo/backlinks', label: 'Backlinks', hint: 'Semrush link profile' },
  { href: '/app/seo/press-releases', label: 'Press releases', hint: 'Press release placements + pitches' },
  { href: '/app/seo/guest-posts', label: 'Guest posts', hint: 'Guest-post outreach + placements' },
  { href: '/app/seo/comments', label: 'Comment', hint: 'Comment placements on relevant articles' },
  { href: '/app/seo/forums', label: 'Forum', hint: 'Forum threads we are contributing to' },
];

export default function LinksSubNav() {
  const pathname = usePathname() ?? '/app/seo/backlinks';
  return (
    <nav
      aria-label="Backlinks sub-navigation"
      className="mb-4 flex items-center gap-1 border-b border-black/10 -mt-2"
    >
      {INNER_TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            title={t.hint}
            className={`relative px-3 py-2 text-[13px] font-medium transition-colors ${
              active
                ? 'text-primary'
                : 'text-foreground/55 hover:text-foreground/85'
            }`}
            aria-current={active ? 'page' : undefined}
          >
            {t.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
