'use client';

import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface RecentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
  job_title: string | null;
  last_path: string | null;
  last_seen_at: string | null;
}

interface PendingSignature {
  id: string;
  job_description_id: string;
  sent_at: string;
  title: string;
}

function isOnlineNow(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 6 * 60 * 1000;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomeContent() {
  const { user, session } = useAuth();
  const { pages } = usePagePermissions();
  const router = useRouter();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignature[]>([]);
  const [latestSignedJd, setLatestSignedJd] = useState<{ id: string; title: string; pdfUrl: string | null } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Map /app/... path → friendly label ("Calendar", "Org Chart", etc.)
  const pathLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pages) map.set(p.path, p.label);
    map.set('/app/profile', 'My Profile');
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return (path: string | null): string | null => {
      if (!path) return null;
      // Any job-description view (list or detail) always reads as "Job Descriptions".
      if (path.startsWith('/app/job-descriptions') || path.startsWith('/app/jd/') || path === '/app/jd') {
        return 'Job Descriptions';
      }
      if (path.startsWith('/app/sign/')) return 'Job Descriptions';
      if (map.has(path)) return map.get(path)!;
      // Fall back to last segment if it's a nested route we don't know.
      const segments = path.split('/').filter(Boolean);
      // Strip any trailing id-like segments (UUIDs, numeric) so we don't end up with "Fe0383a4 Fa86..."
      while (segments.length > 0) {
        const tail = segments[segments.length - 1];
        if (uuidRe.test(tail) || /^\d+$/.test(tail)) segments.pop();
        else break;
      }
      // After stripping, try the parent route again.
      const parent = '/' + segments.join('/');
      if (map.has(parent)) return map.get(parent)!;
      const last = segments[segments.length - 1];
      if (!last) return null;
      return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    };
  }, [pages]);

  useEffect(() => {
    if (!session?.access_token) return;
    async function fetchRecentUsers() {
      const data = await db({ action: 'select', table: 'users', select: 'id, full_name, avatar_url, last_sign_in, last_seen_at, last_path, job_title', order: { column: 'last_sign_in', ascending: false } });
      if (Array.isArray(data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setRecentUsers(data.filter((u: RecentUser) => u.last_sign_in && new Date(u.last_sign_in) >= today));
      }
      setTimeout(() => setLoaded(true), 100);
    }
    fetchRecentUsers();
  }, [session]);

  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    async function fetchPending() {
      const sigs = await db({
        action: 'select',
        table: 'jd_signatures',
        match: { signer_user_id: user!.id },
        select: 'id, job_description_id, sent_at, signed_at',
        order: { column: 'sent_at', ascending: false },
      }).catch(() => []);
      if (cancelled || !Array.isArray(sigs)) return;
      const pending = (sigs as Array<{ id: string; job_description_id: string; sent_at: string; signed_at: string | null }>).filter(
        (s) => !s.signed_at
      );
      if (pending.length === 0) {
        setPendingSignatures([]);
        return;
      }
      const jobs = await Promise.all(
        pending.map((p) =>
          db({ action: 'select', table: 'job_descriptions', match: { id: p.job_description_id }, select: 'id, title' })
            .then((r) => (Array.isArray(r) && r.length > 0 ? (r[0] as { id: string; title: string }) : null))
            .catch(() => null)
        )
      );
      if (cancelled) return;
      const merged: PendingSignature[] = pending
        .map((p, i) => {
          const j = jobs[i];
          if (!j) return null;
          return { id: p.id, job_description_id: p.job_description_id, sent_at: p.sent_at, title: j.title };
        })
        .filter((x): x is PendingSignature => x !== null);
      setPendingSignatures(merged);
    }
    fetchPending();
    return () => {
      cancelled = true;
    };
  }, [session, user?.id]);

  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    async function loadLatestSigned() {
      const sigs = await db({
        action: 'select',
        table: 'jd_signatures',
        match: { signer_user_id: user!.id },
        select: 'id, job_description_id, signed_at, pdf_storage_path',
        order: { column: 'signed_at', ascending: false },
      }).catch(() => []);
      if (cancelled || !Array.isArray(sigs)) return;
      const signed = (sigs as Array<{ job_description_id: string; signed_at: string | null; pdf_storage_path: string | null }>).find((s) => !!s.signed_at);
      if (!signed) return;
      const jd = await db({
        action: 'select',
        table: 'job_descriptions',
        match: { id: signed.job_description_id },
        select: 'id, title',
      }).catch(() => null);
      if (cancelled) return;
      if (Array.isArray(jd) && jd.length > 0) {
        const row = jd[0] as { id: string; title: string };
        setLatestSignedJd({ id: row.id, title: row.title, pdfUrl: signed.pdf_storage_path || null });
      }
    }
    loadLatestSigned();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  if (!user) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Active-now avatars — centered at the top of the dashboard. */}
      {recentUsers.length > 0 && (
        <div
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-10 pt-6 transition-all duration-500 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <div className="flex -space-x-2">
            {recentUsers.map((u) => {
              const online = isOnlineNow(u.last_seen_at || u.last_sign_in);
              const viewing = online ? pathLabel(u.last_path) : null;
              const navTarget = online && u.last_path && u.last_path.startsWith('/app') ? u.last_path : null;
              const Wrapper: 'button' | 'div' = navTarget ? 'button' : 'div';
              return (
                <Wrapper
                  key={u.id}
                  onClick={navTarget ? () => router.push(navTarget) : undefined}
                  className={`relative group ${navTarget ? 'cursor-pointer' : ''}`}
                  title={navTarget ? `Go to ${viewing}` : undefined}
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.full_name || ''}
                      className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 hover:z-10 ${
                        online ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'border-white'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 hover:z-10 ${
                        online ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] bg-primary text-white' : 'border-white bg-primary text-white'
                      }`}
                    >
                      {(u.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-left">
                    <p className="font-semibold text-white">{u.full_name || 'User'}</p>
                    {u.job_title && <p className="text-white/90">{u.job_title}</p>}
                    <p className="text-white/80">{online ? 'Online now' : `Last active ${timeAgo(u.last_sign_in)}`}</p>
                    {viewing && <p className="text-emerald-300">Viewing {viewing}{navTarget ? ' — click to jump' : ''}</p>}
                  </div>
                </Wrapper>
              );
            })}
          </div>
        </div>
      )}

      {/* Centered welcome */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'there'}
          </h1>
          {latestSignedJd && (
            latestSignedJd.pdfUrl ? (
              <a
                href={latestSignedJd.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full border border-primary/30 bg-primary/5 text-base font-semibold text-primary hover:bg-primary/10 hover:shadow-sm transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Open signed PDF"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                </svg>
                <span className="truncate max-w-[420px]">{latestSignedJd.title}</span>
                <span className="uppercase tracking-wider text-[11px] font-bold text-primary/70">PDF</span>
              </a>
            ) : (
              <button
                onClick={() => router.push(`/app/job-descriptions/${latestSignedJd.id}`)}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-gray-200 bg-white text-base font-semibold text-foreground/80 hover:border-primary/40 hover:text-primary transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Open my signed job description"
              >
                {latestSignedJd.title}
              </button>
            )
          )}
        </div>
        {pendingSignatures.length > 0 && (
          <div className="w-full max-w-md flex flex-col gap-2 px-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Waiting for your signature
            </p>
            {pendingSignatures.map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/app/sign/${p.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                  <p className="text-xs text-foreground/50">is waiting to be signed</p>
                </div>
                <span className="text-xs font-medium text-primary whitespace-nowrap">Sign now →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
