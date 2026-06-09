'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * In-page nav strip used at the top of the Admissions-department
 * pages (Contacts, Partners) so users can hop between
 * sibling surfaces without rounding back through the sidebar.
 * Mirrors the sidebar's icon-then-label affordance. Admissions and
 * Donations were removed from this strip; they're still reachable
 * from the sidebar.
 */

const ITEMS: { path: string; label: string; icon: React.ReactNode }[] = [
  {
    path: '/app/contacts',
    label: 'Contacts',
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
    label: 'Partners',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7" cy="12" r="3" />
        <circle cx="17" cy="12" r="3" />
        <path d="M10 12h4" />
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
