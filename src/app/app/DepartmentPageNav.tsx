'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * In-page nav strip used at the top of the four Admissions-department
 * pages (Admissions, Marketing, BD Partnerships, Donations) so users
 * can hop between sibling surfaces without rounding back through the
 * sidebar. Mirrors the sidebar's icon-then-label affordance.
 */

const ITEMS: { path: string; label: string; icon: React.ReactNode }[] = [
  {
    path: '/app/admissions',
    label: 'Admissions',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5z" />
      </svg>
    ),
  },
  {
    path: '/app/outreach',
    label: 'Marketing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
        <path d="M15 8a4 4 0 0 1 0 8" />
        <path d="M18 5a8 8 0 0 1 0 14" />
      </svg>
    ),
  },
  {
    path: '/app/partnerships',
    label: 'BD Partnerships',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="12" r="3" />
        <circle cx="17" cy="12" r="3" />
        <path d="M10 12h4" />
      </svg>
    ),
  },
  {
    path: '/app/donations',
    label: 'Donations',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" />
      </svg>
    ),
  },
];

export function DepartmentPageNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 flex-wrap">
      {ITEMS.map((item) => {
        const active = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors ${
              active
                ? 'bg-foreground text-white'
                : 'bg-white border border-black/10 text-foreground/65 hover:border-foreground/30 hover:text-foreground'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
