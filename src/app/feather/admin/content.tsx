'use client';

// Admin hub — landing page that links out to every platform-config
// surface (formerly five top-level pages). Each card jumps to its
// own subroute under /app/admin/<sub>; the page metadata + per-route
// guards still live on the subroute itself, so this index is just
// nav + a one-line description per surface.

import Link from 'next/link';

interface AdminPage {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PAGES: AdminPage[] = [
  {
    href: '/feather/admin/pages',
    title: 'Pages',
    description: 'Manage which pages each department + role can see, and pin them to the sidebar or popup menu.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      </svg>
    ),
  },
  {
    href: '/feather/admin/incoming-users',
    title: 'Incoming Users',
    description: 'Triage new sign-ins: classify staff vs. external, assign departments, and grant first access.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7l9 6 9-6" />
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
  },
  {
    href: '/feather/admin/departments',
    title: 'Departments',
    description: 'Add or rename departments, set their colour + display order, and toggle their visibility in the sidebar.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21V7l9-4 9 4v14" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    href: '/feather/admin/apis',
    title: 'APIs',
    description: 'Configure third-party integrations + secrets exposed to the platform.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
        <circle cx="8" cy="6" r="1.5" />
        <circle cx="16" cy="12" r="1.5" />
        <circle cx="8" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    href: '/feather/alumni-roster',
    title: 'Alumni',
    description: 'The full alumni roster: profiles, sobriety dates, check-in streaks, and contact opt-ins.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/feather/admin/user-permissions',
    title: 'User Permissions',
    description: 'Per-user overrides + access groups: grant or block individual pages, beyond the department defaults.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

export default function AdminContent() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1100px] mx-auto pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 sm:mb-8">
        <h1 className="text-lg font-semibold text-foreground tracking-tight">Admin</h1>
        <p className="text-sm text-foreground/55 mt-0.5">
          Platform configuration. These surfaces govern who can see what.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PAGES.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group rounded-xl border border-black/10 bg-white p-4 hover:border-primary/35 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                {p.icon}
              </span>
              <h2 className="text-base font-semibold text-foreground">{p.title}</h2>
            </div>
            <p className="mt-2.5 text-[13px] text-foreground/60 leading-relaxed">{p.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
