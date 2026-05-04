'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Inner sub-tab strip for the Backlinks parent tab. Renders on both
// /feather/seo/backlinks (Semrush link profile) and /feather/seo/directories
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
  // Semrush snapshot that admins glance at less often.
  { href: '/feather/seo/directories', label: 'Directories', hint: 'Off-site listings to claim' },
  { href: '/feather/seo/backlinks', label: 'Backlinks', hint: 'Semrush link profile' },
];

export default function LinksSubNav() {
  const pathname = usePathname() ?? '/feather/seo/backlinks';
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
