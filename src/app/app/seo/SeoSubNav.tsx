'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Top-of-page tab strip for the SEO area. Three "live" tabs at the
// top — Actions, Directories, Site audit — plus a WIP dropdown that
// hides every other sub-page so admins still have a way to reach
// the in-progress views without flooding the visual nav.

interface Tab {
  href: string;
  label: string;
  hint?: string;
  /** When set to "fire", the tab gets an animated ember glow. Used to
   *  pull the eye to the Actions list — that's where new SEO work
   *  enters the system, so it benefits from being visually loud. */
  flair?: 'fire';
}

const PRIMARY_TABS: Tab[] = [
  { href: '/app/seo/actions', label: 'Actions', hint: 'Submit + track SEO action items', flair: 'fire' },
  { href: '/app/seo/directories', label: 'Directories', hint: 'Off-site listings to claim' },
  { href: '/app/seo/audit', label: 'Site audit', hint: 'On-page issues' },
];

const WIP_TABS: Tab[] = [
  { href: '/app/seo', label: 'Overview', hint: 'Search Console summary' },
  { href: '/app/seo/backlinks', label: 'Backlinks', hint: 'Semrush link profile' },
  { href: '/app/seo/refdomains', label: 'Ref. domains', hint: 'Authority Score histogram' },
  { href: '/app/seo/local', label: 'Local pack', hint: 'Map-pack rank across markets' },
  { href: '/app/seo/questions', label: 'Questions', hint: 'PAA content backlog' },
  { href: '/app/seo/discover', label: 'Discover', hint: 'Autocomplete keyword discovery' },
  { href: '/app/seo/competitors', label: 'Competitors', hint: 'Top-10 SERP churn week-over-week' },
  { href: '/app/seo/media', label: 'Media', hint: 'Images + videos with optimize batch' },
  { href: '/app/seo/information', label: 'Information', hint: 'Canonical NAP / business info' },
  { href: '/app/seo/redirects', label: 'Redirects', hint: '301/302 manager' },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === '/app/seo') return pathname === '/app/seo';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SeoSubNav() {
  const pathname = usePathname() ?? '/app/seo';
  const wipActive = WIP_TABS.some((t) => isTabActive(pathname, t.href));
  const [wipOpen, setWipOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside-click + Escape so the dropdown behaves like a
  // proper menu rather than a stuck inline panel.
  useEffect(() => {
    if (!wipOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setWipOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setWipOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [wipOpen]);

  return (
    <div className="sticky top-0 z-10 -mx-8 mb-6 bg-warm-bg/80 px-8 py-2 backdrop-blur-md border-b border-black/5">
      {/* Keyframes scoped to SeoSubNav so every page that imports the
          nav gets the fire-glow animation without each page having to
          register it themselves. */}
      <style jsx global>{`
        @keyframes seo-fire-glow {
          0%, 100% {
            box-shadow:
              0 0 6px rgba(255, 120, 40, 0.55),
              0 0 14px rgba(255, 70, 20, 0.35);
          }
          50% {
            box-shadow:
              0 0 12px rgba(255, 160, 70, 0.85),
              0 0 28px rgba(255, 90, 30, 0.55);
          }
        }
        @keyframes seo-fire-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .seo-fire-tab {
          background-image: linear-gradient(
            120deg,
            #f43f5e 0%,
            #f97316 35%,
            #fb923c 55%,
            #fbbf24 100%
          );
          background-size: 200% 200%;
          animation:
            seo-fire-glow 2.4s ease-in-out infinite,
            seo-fire-shift 4s ease-in-out infinite;
        }
      `}</style>

      <div className="overflow-x-auto no-scrollbar" ref={wrapperRef}>
        <div className="inline-flex gap-1 items-center">
          {PRIMARY_TABS.map((t) => {
            const isActive = isTabActive(pathname, t.href);

            if (t.flair === 'fire') {
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  title={t.hint}
                  className={`seo-fire-tab inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap text-white transition-transform ${
                    isActive ? 'ring-2 ring-white/60 scale-[1.02]' : 'hover:scale-[1.03]'
                  }`}
                >
                  <FlameGlyph />
                  {t.label}
                </Link>
              );
            }

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

          {/* WIP dropdown — surfaces every in-progress SEO sub-page
              without crowding the primary strip. Highlights when the
              current path is on a WIP route so the user can tell
              they're 'inside' the dropdown. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setWipOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={wipOpen}
              title="Work-in-progress SEO views"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap transition-colors ${
                wipActive
                  ? 'bg-foreground text-white shadow-sm'
                  : 'text-foreground/60 hover:text-foreground hover:bg-white'
              }`}
            >
              WIP
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {wipOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 min-w-[220px] rounded-lg border border-black/10 bg-white shadow-lg py-1 z-20"
              >
                {WIP_TABS.map((t) => {
                  const isActive = isTabActive(pathname, t.href);
                  return (
                    <Link
                      key={t.href}
                      href={t.href}
                      title={t.hint}
                      role="menuitem"
                      onClick={() => setWipOpen(false)}
                      className={`block px-3 py-1.5 text-[12px] font-medium ${
                        isActive
                          ? 'bg-foreground/5 text-foreground'
                          : 'text-foreground/70 hover:bg-warm-bg/60 hover:text-foreground'
                      }`}
                    >
                      {t.label}
                      {t.hint ? (
                        <span className="block text-[10px] text-foreground/40 mt-0.5">{t.hint}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlameGlyph() {
  return (
    <svg className="w-3.5 h-3.5 drop-shadow" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1.5 3 5 4.5 5 8.5 0 1.6-.7 3-1.7 4 .5-2.3-1.5-3.5-2.3-5C12 12 10.5 14 12 17c-2.5-.5-4-2.7-4-5.5 0-3.5 4-4.5 4-9.5z" />
      <path d="M7 14.5c0 4 3 7 5 7 2.5 0 5-2.5 5-5.5 0-1.5-.7-2.7-1.7-3.5.6 2-.9 4-3.3 4-2 0-3.5-1.5-3.5-3 0-.7.2-1.3.5-2-1.3.7-2 2-2 3z" />
    </svg>
  );
}
