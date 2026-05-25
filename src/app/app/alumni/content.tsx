'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import AlumniProfileEditor from './_components/AlumniProfileEditor';

// Alumni hub · entry point for the portal.
//
// Six tiles down + a "Edit my alumni profile" button up top.
// Tiles are the canonical sub-route map (see /docs or the planning
// notes). Hub is intentionally light — most depth lives on the
// sub-pages so the welcome surface stays scannable.

const TILES: Array<{
  href: string;
  label: string;
  blurb: string;
  emoji: string;
  tone: string;
}> = [
  { href: '/app/alumni/map',           label: 'Alumni map',         blurb: 'Find an alum near you — opt-in pins, bios, what they’re available for.',                emoji: '🗺️', tone: 'from-sky-50 to-white border-sky-200/70' },
  { href: '/app/alumni/peer-support',  label: 'Peer support list',  blurb: 'The phone list maintained at weekly meetings. Call. Be called.',                            emoji: '📞', tone: 'from-emerald-50 to-white border-emerald-200/70' },
  { href: '/app/alumni/meetups',       label: 'Reunions & meetups', blurb: 'Annual reunion + regional mini-reunions. RSVPs and surveys.',                               emoji: '🤝', tone: 'from-amber-50 to-white border-amber-200/70' },
  { href: '/app/alumni/scholarships',  label: 'Scholarships',       blurb: 'Continuing-care, education, and sober-living awards. How to apply.',                        emoji: '🎓', tone: 'from-violet-50 to-white border-violet-200/70' },
  { href: '/app/alumni/resources',     label: 'Recovery resources', blurb: 'Books, free webinars, therapy groups, hobbies. Submitted by alumni.',                       emoji: '📚', tone: 'from-rose-50 to-white border-rose-200/70' },
  { href: '/app/alumni/stories',       label: 'Voices & talks',     blurb: 'Alumni milestones + overcoming-challenge stories, and continuing-ed talks from staff.',     emoji: '✍️', tone: 'from-orange-50 to-white border-orange-200/70' },
];

export default function AlumniHubContent() {
  const { user } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Alumni portal</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-2xl">
          The alumni community lives here. Find each other on the map, share what helped, read what staff are
          publishing, and submit your own milestones to the newsletter. Everything visible to other alumni is
          opt-in — your profile starts private.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
          >
            ✎ Edit my alumni profile
          </button>
          <Link
            href="/app/alumni/map"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-black/10 bg-white text-foreground/75 text-[12px] font-semibold hover:bg-warm-bg/60"
          >
            See the map →
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`group block rounded-2xl border bg-gradient-to-br ${t.tone} p-5 hover:-translate-y-0.5 hover:shadow-md transition-all`}
          >
            <p className="text-2xl mb-2" aria-hidden="true">{t.emoji}</p>
            <p className="text-[16px] font-bold text-foreground group-hover:text-primary transition-colors" style={{ fontFamily: 'var(--font-display)' }}>
              {t.label}
            </p>
            <p className="mt-1 text-[12.5px] text-foreground/60 leading-snug">{t.blurb}</p>
          </Link>
        ))}
      </div>

      {editorOpen && (
        <AlumniProfileEditor onClose={() => setEditorOpen(false)} />
      )}
    </div>
  );
}
