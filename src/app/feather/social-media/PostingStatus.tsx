'use client';

// Shared read of the global posting kill switch (app_flags
// `social_posting_enabled`, surfaced via /api/social-media/posting-toggle).
// The header toggle owns WRITES; everything else just needs to KNOW whether
// posting is live so it can warn before a build/schedule that can't send.

import { useEffect, useState } from 'react';

export function usePostingEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetch('/api/social-media/posting-toggle', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setEnabled(!!j.enabled); })
      .catch(() => { /* unknown — leave null, callers treat as "not paused" */ });
    return () => { cancelled = true; };
  }, []);
  return enabled;
}

// Amber inline banner shown wherever a user might build or queue a post
// while posting is globally paused, so they learn here instead of at the
// 423 the POST route returns.
export function PostingPausedBanner({ className = '' }: { className?: string }) {
  const enabled = usePostingEnabled();
  if (enabled !== false) return null;
  return (
    <div className={`rounded-xl border border-amber-300 bg-amber-50/80 px-3.5 py-2.5 flex items-start gap-2.5 ${className}`} role="status">
      <svg className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8.48 14.7A2 2 0 003.53 21h16.94a2 2 0 001.72-3.04l-8.48-14.7a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-[12px] text-amber-900 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
        <strong>Posting is paused.</strong> You can build and save drafts, but nothing will publish or schedule until posting is switched back on at the top of Social Media.
      </p>
    </div>
  );
}
