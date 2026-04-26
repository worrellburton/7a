'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Top-of-page tab strip for the SEO area, mirroring the SectionNav
// pattern in /app/analytics. Each entry points at its own route
// (we don't collapse into a single page — keeps the URL clean and
// each sub-page can keep server data fetches that match its
// concerns), but the strip stays consistent across them so there's
// always one click between Overview / Backlinks / Redirects /
// Site audit no matter where you start.

const TABS: { href: string; label: string; hint?: string }[] = [
  { href: '/app/seo', label: 'Overview', hint: 'Search Console summary' },
  { href: '/app/seo/backlinks', label: 'Backlinks', hint: 'Semrush link profile' },
  { href: '/app/seo/refdomains', label: 'Ref. domains', hint: 'Authority Score histogram' },
  { href: '/app/seo/redirects', label: 'Redirects', hint: '301/302 manager' },
  { href: '/app/seo/audit', label: 'Site audit', hint: 'On-page issues' },
];

export default function SeoSubNav() {
  const pathname = usePathname() ?? '/app/seo';
  return (
    <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-10 mb-6 bg-warm-bg/80 px-4 sm:px-6 lg:px-10 py-2 backdrop-blur-md border-b border-black/5">
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex gap-1">
          {TABS.map((t) => {
            // Exact match for the index page; prefix-match for sub-
            // routes so nested URLs (/app/seo/backlinks/foo) still
            // highlight Backlinks.
            const isActive =
              t.href === '/app/seo'
                ? pathname === '/app/seo'
                : pathname === t.href || pathname.startsWith(`${t.href}/`);
            return (
              <Link
                key={t.href}
                href={t.href}
                title={t.hint}
                className={`px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-foreground text-white shadow-sm'
                    : 'text-foreground/60 hover:text-foreground hover:bg-white'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
