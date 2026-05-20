'use client';

// Email Campaigns — index page. Lists past campaigns so a marketer
// can pick up where they left off or audit recent sends, and offers
// a single "Start a new campaign" entry point that drops them into
// the build flow at /app/email-campaigns/new.
//
// The flow lives across:
//   /app/email-campaigns           (this page — list + new)
//   /app/email-campaigns/new       (Phase 3 — build)
//   /app/email-campaigns/[id]/recipients  (Phase 6-7 — pick recipients)
//   /app/email-campaigns/[id]/finalize    (Phase 9-10 — review + send)

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CampaignRow {
  id: string;
  prompt: string;
  generated_subject: string | null;
  status: string;
  sent_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  recipients: 'Choosing recipients',
  finalizing: 'Ready to send',
  sending: 'Sending…',
  sent: 'Sent',
  failed: 'Failed',
};

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-warm-bg/60 text-foreground/70 border-black/10',
  recipients: 'bg-amber-50 text-amber-800 border-amber-200',
  finalizing: 'bg-amber-50 text-amber-800 border-amber-200',
  sending: 'bg-sky-50 text-sky-800 border-sky-200',
  sent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

export default function EmailCampaignsContent() {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('email_campaigns')
        .select('id, prompt, generated_subject, status, sent_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;
      setRows((data ?? []) as CampaignRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Marketing · Email Campaigns
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Build outbound campaigns
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Describe what you want to say, drop in images, optionally feature a blog or staff member, and Claude builds a polished HTML email you can iterate before picking recipients.
          </p>
        </div>
        <Link
          href="/app/email-campaigns/new"
          className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          + Start a new campaign
        </Link>
      </header>

      <section className="rounded-2xl border border-black/10 bg-white">
        <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Recent campaigns
          </p>
          {!loading && (
            <span className="text-[11px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
              {rows.length} {rows.length === 1 ? 'campaign' : 'campaigns'}
            </span>
          )}
        </header>
        {loading ? (
          <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
            Loading…
          </p>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-[13px] text-foreground/55 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
              No campaigns yet. Build the first one.
            </p>
            <Link
              href="/app/email-campaigns/new"
              className="inline-flex items-center px-3 py-1.5 rounded-md border border-primary/30 bg-primary/5 text-primary text-[11.5px] font-semibold hover:bg-primary/10"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              + Start a new campaign
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {rows.map((c) => {
              const subject = c.generated_subject?.trim() || c.prompt?.trim().slice(0, 80) || 'Untitled campaign';
              const tone = STATUS_TONE[c.status] ?? STATUS_TONE.draft;
              const resumeHref =
                c.status === 'sent'
                  ? `/app/email-campaigns/${c.id}/finalize`
                  : c.status === 'finalizing' || c.status === 'sending' || c.status === 'failed'
                  ? `/app/email-campaigns/${c.id}/finalize`
                  : c.status === 'recipients'
                  ? `/app/email-campaigns/${c.id}/recipients`
                  : `/app/email-campaigns/new?id=${c.id}`;
              return (
                <li key={c.id}>
                  <Link
                    href={resumeHref}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-warm-bg/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>
                        {subject}
                      </p>
                      <p className="text-[11.5px] text-foreground/55 truncate mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                        {c.sent_at ? `Sent ${formatRelative(c.sent_at)}` : `Started ${formatRelative(c.created_at)}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${tone}`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const diffMs = Date.now() - t;
  const m = Math.round(diffMs / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}
