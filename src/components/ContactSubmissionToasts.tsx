'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { MARKETING_ADMISSIONS_DEPT_ID } from '@/lib/website-requests-auth';

// Bottom-right toast stack for new website requests — both contact
// forms (public.contact_submissions) and VOBs (public.vob_requests).
// Mounted globally in PlatformShell so it appears on every authed
// page.
//
// Audience: super admins + Marketing & Admissions dept members. The
// component renders nothing for users outside that audience.
//
// Lifecycle:
//   - On mount, fetches /api/contact-submissions/unseen so any
//     contact-form submission that landed while the user was offline
//     still surfaces.
//   - Subscribes to public.contact_submissions INSERT and
//     public.vob_requests INSERT — new rows pop a toast immediately
//     for everyone in the audience.
//   - Subscribes to public.contact_submission_dismissals INSERT
//     for the current user — dismissing a contact toast on one tab
//     clears it on all other tabs/browsers.
//   - User clicks "Dismiss" on a contact toast → POST to
//     /[id]/dismiss → row writes → realtime confirms and the toast
//     leaves. (Optimistic remove for snappy UX; rollback on error.)
//   - VOB toasts dismiss locally per-session — the component clears
//     them on close and on subsequent UPDATE events that mark the
//     VOB responded or spam upstream.

interface Submission {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  telephone: string | null;
  source: string | null;
  page_url: string | null;
  message: string | null;
}

interface VobToast {
  id: string;
  created_at: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  insurance_provider: string | null;
}

function fullName(s: Submission): string {
  const n = [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
  return n || s.email || 'Anonymous';
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return 'just now';
  if (ms < 60_000) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(ms / 86_400_000);
  return `${days}d ago`;
}

export default function ContactSubmissionToasts() {
  const { user } = useAuth();
  const [audience, setAudience] = useState<boolean | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [items, setItems] = useState<Submission[]>([]);
  const [vobs, setVobs] = useState<VobToast[]>([]);

  // Resolve audience status once we have a user. The check is also
  // done server-side on every API call; this is a client-side
  // short-circuit so non-audience users don't even mount the
  // realtime subscription.
  useEffect(() => {
    if (!user?.id) {
      setAudience(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('is_super_admin, department_id')
        .eq('id', user.id)
        .maybeSingle();
      if (cancelled) return;
      const sa = data?.is_super_admin === true;
      const dept = (data?.department_id as string | null | undefined) ?? null;
      setIsSuperAdmin(sa);
      setDepartmentId(dept);
      setAudience(sa || dept === MARKETING_ADMISSIONS_DEPT_ID);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Initial fetch + realtime subscriptions.
  useEffect(() => {
    if (!user?.id || !audience) return;

    let cancelled = false;
    const refresh = async () => {
      const res = await fetch('/api/contact-submissions/unseen', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (Array.isArray(json.items)) setItems(json.items);
    };
    void refresh();

    // New submission arrives → if it's still "new" (not spam, not
    // responded), prepend to the stack. The audience check is the
    // user's own; the row's eligibility is server-decided on the
    // refresh path.
    const sub = supabase
      .channel(`contact-submissions-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'contact_submissions' },
        (payload) => {
          const row = payload.new as Submission & {
            responded_at?: string | null;
            is_spam?: boolean | null;
          };
          if (row.responded_at || row.is_spam) return;
          setItems((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [
              {
                id: row.id,
                created_at: row.created_at,
                first_name: row.first_name ?? null,
                last_name: row.last_name ?? null,
                email: row.email ?? null,
                telephone: row.telephone ?? null,
                source: row.source ?? null,
                page_url: row.page_url ?? null,
                message: row.message ?? null,
              },
              ...prev,
            ];
          });
        },
      )
      // Cross-tab dismiss sync — when this same user dismisses a
      // submission on another tab/device, drop the toast here too.
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'contact_submission_dismissals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { submission_id: string };
          setItems((prev) => prev.filter((p) => p.id !== row.submission_id));
        },
      )
      // If a submission gets marked responded / spam upstream by a
      // teammate, clear it from the stack here too — UPDATE event
      // catches that.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'contact_submissions' },
        (payload) => {
          const row = payload.new as { id: string; responded_at?: string | null; is_spam?: boolean | null };
          if (row.responded_at || row.is_spam) {
            setItems((prev) => prev.filter((p) => p.id !== row.id));
          }
        },
      )
      // VOB INSERT — pop a separate toast variant so admissions can
      // see a new verification request the moment it lands. Filter
      // server-side eligibility (responded / spam) just like the
      // contact path. No persisted "unseen" backfill: the inbox UI
      // already surfaces those, so we only push live arrivals.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vob_requests' },
        (payload) => {
          const row = payload.new as {
            id: string;
            full_name: string;
            email: string | null;
            phone: string | null;
            insurance_provider: string | null;
            received_at: string;
            responded_at?: string | null;
            spam_at?: string | null;
          };
          if (row.responded_at || row.spam_at) return;
          setVobs((prev) => {
            if (prev.some((p) => p.id === row.id)) return prev;
            return [
              {
                id: row.id,
                created_at: row.received_at,
                full_name: row.full_name,
                email: row.email,
                phone: row.phone,
                insurance_provider: row.insurance_provider,
              },
              ...prev,
            ];
          });
        },
      )
      // VOB UPDATE — clear the toast if the request was marked
      // responded or spam upstream by another teammate.
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'vob_requests' },
        (payload) => {
          const row = payload.new as { id: string; responded_at?: string | null; spam_at?: string | null };
          if (row.responded_at || row.spam_at) {
            setVobs((prev) => prev.filter((p) => p.id !== row.id));
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(sub);
    };
  }, [user?.id, audience]);

  const dismiss = useCallback(async (submissionId: string) => {
    // Optimistic remove for a responsive feel; rollback on error.
    const before = items;
    setItems((prev) => prev.filter((p) => p.id !== submissionId));
    try {
      const res = await fetch(`/api/contact-submissions/${submissionId}/dismiss`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      setItems(before);
    }
  }, [items]);

  if (!user || !audience || (items.length === 0 && vobs.length === 0)) return null;

  // Suppress unused-var so the diff stays clean — we keep the
  // department + super-admin readouts for future ad-hoc filtering
  // (e.g. routing some sources only to admissions).
  void departmentId;
  void isSuperAdmin;

  const dismissVob = (id: string) => setVobs((prev) => prev.filter((p) => p.id !== id));

  return (
    <div
      role="region"
      aria-label="New website-request notifications"
      className="fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm"
    >
      {vobs.map((v) => (
        <VobToastCard key={v.id} vob={v} onDismiss={() => dismissVob(v.id)} />
      ))}
      {items.map((s) => (
        <Toast key={s.id} submission={s} onDismiss={() => void dismiss(s.id)} />
      ))}
    </div>
  );
}

function Toast({ submission, onDismiss }: { submission: Submission; onDismiss: () => void }) {
  const name = fullName(submission);
  const time = relativeTime(submission.created_at);
  const messagePreview =
    submission.message && submission.message.length > 0
      ? submission.message.length > 140
        ? `${submission.message.slice(0, 140)}…`
        : submission.message
      : null;
  return (
    <div
      role="alert"
      className="w-full sm:w-[360px] rounded-2xl border border-primary/30 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden animate-[toast-in_300ms_ease-out]"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <style jsx>{`
        @keyframes toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="h-1"
        style={{
          background:
            'linear-gradient(90deg, #d4794a 0%, #bc6b4a 50%, #a45a3d 100%)',
        }}
      />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary mb-0.5">
              New contact form
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {name}
            </p>
            <p className="text-[11px] text-foreground/55 truncate">
              {submission.email ?? ''}
              {submission.telephone ? ` · ${submission.telephone}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            title="Dismiss"
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-foreground/85 hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {messagePreview && (
          <p className="mt-2 text-[12px] text-foreground/75 leading-snug">
            &ldquo;{messagePreview}&rdquo;
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-wider text-foreground/45">
            {submission.source ? `${submission.source} · ` : ''}{time}
          </p>
          <Link
            href="/app/website-requests"
            className="text-[11px] font-semibold text-primary hover:text-primary-dark transition-colors"
          >
            Open inbox →
          </Link>
        </div>
      </div>
    </div>
  );
}

function VobToastCard({ vob, onDismiss }: { vob: VobToast; onDismiss: () => void }) {
  const time = relativeTime(vob.created_at);
  return (
    <div
      role="alert"
      className="w-full sm:w-[360px] rounded-2xl border border-emerald-300/60 bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden animate-[toast-in_300ms_ease-out]"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <style jsx>{`
        @keyframes toast-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        aria-hidden="true"
        className="h-1"
        style={{
          background:
            'linear-gradient(90deg, #10b981 0%, #059669 50%, #047857 100%)',
        }}
      />
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 mb-0.5">
              New VOB request
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {vob.full_name}
            </p>
            <p className="text-[11px] text-foreground/55 truncate">
              {vob.email ?? ''}
              {vob.phone ? ` · ${vob.phone}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            title="Dismiss"
            className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-foreground/85 hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {vob.insurance_provider && (
          <p className="mt-2 text-[12px] text-foreground/75 leading-snug">
            Insurance: <span className="font-semibold">{vob.insurance_provider}</span>
          </p>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-wider text-foreground/45">
            {time}
          </p>
          <Link
            href="/app/website-requests?tab=vobs"
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            Open VOBs →
          </Link>
        </div>
      </div>
    </div>
  );
}
