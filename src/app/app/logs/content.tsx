'use client';

// Dedicated full-screen rain page. The home chip ("Daily logs · N")
// links here. We render HomeLogRain with enabled=true so the
// existing physics + tooltip layer takes over the screen — no
// orbit to share with, no centerpiece to constrain. A small
// header floats up top with the count, and a back link returns
// to /app.

import Link from 'next/link';
import { useState } from 'react';
import HomeLogRain from '../HomeLogRain';

export default function LogsContent() {
  // Local count mirror so the header headline tracks the rain
  // layer's own count callback.
  const [count, setCount] = useState(0);

  return (
    <div className="relative min-h-[calc(100vh-3rem)] overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      {/* The rain layer renders fixed inset-0 (mobile) / absolute
          inset-0 inside its parent (desktop). We give it a tall
          relative container so the desktop physics layer has room
          to fall through. */}
      <div className="absolute inset-0">
        <HomeLogRain enabled={true} onCountChange={setCount} />
      </div>

      {/* Header band sits above the rain. z-10 keeps it clear of the
          pile; pointer-events lets it scroll/click as normal. */}
      <header className="relative z-10 px-4 sm:px-8 lg:px-12 pt-8 sm:pt-12 max-w-4xl mx-auto text-center">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45 mb-2">
          Marketing &amp; Admissions
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Daily logs <span className="text-primary">today</span>
        </h1>
        <p className="mt-2 text-[12.5px] text-foreground/55 max-w-md mx-auto">
          One 🪵 for every touchpoint logged today — phone, in-person,
          text, email, new contact, or field fill. Hover any log to see
          who made it and which contact it was.
        </p>
        <p className="mt-3 text-[28px] tabular-nums font-semibold text-emerald-700" style={{ fontFamily: 'var(--font-display)' }}>
          {count}
        </p>
        <p className="mt-1 text-[10.5px] uppercase tracking-[0.18em] text-foreground/45">
          {count === 1 ? 'log so far' : 'logs so far'}
        </p>

        <div className="mt-4 inline-flex">
          <Link
            href="/app"
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-foreground/75 text-[11px] font-semibold uppercase tracking-wider hover:bg-warm-bg/60"
          >
            ← Back to home
          </Link>
        </div>
      </header>
    </div>
  );
}
