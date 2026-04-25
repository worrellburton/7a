'use client';

import { useAuth, notifyAvatarChanged } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { uploadFile, compressImage } from '@/lib/upload';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import FeatureRequestModal from './kingdom-requests/FeatureRequestModal';
import AskPolicies from './AskPolicies';
import WhatsNewButton from './WhatsNewButton';
import HomeClientsRow from './HomeClientsRow';
import HomeHorsesRow from './HomeHorsesRow';
import HomeMeaningfulCallsRow from './HomeMeaningfulCallsRow';
import HomeWebsiteRequestsRow from './HomeWebsiteRequestsRow';

interface RecentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
  job_title: string | null;
  last_path: string | null;
  last_seen_at: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
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
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Load avatar from users table (falls back to auth metadata)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const rows = await db({ action: 'select', table: 'users', match: { id: user.id }, select: 'avatar_url' });
      if (cancelled) return;
      if (Array.isArray(rows) && rows[0]?.avatar_url) {
        setAvatarUrl(rows[0].avatar_url as string);
      } else if (user.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url as string);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.user_metadata?.avatar_url]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!user?.id || !e.target.files?.length) return;
    const file = e.target.files[0];
    e.target.value = ''; // allow selecting the same file again
    setUploadingAvatar(true);
    try {
      const compressed = await compressImage(file, { maxEdge: 800 });
      const { url, error } = await uploadFile(compressed);
      if (!url) {
        console.error('Avatar upload failed:', error);
        return;
      }
      await db({ action: 'update', table: 'users', data: { avatar_url: url }, match: { id: user.id } });
      await supabase.auth.updateUser({ data: { avatar_url: url } });
      setAvatarUrl(url);
      // Tell every avatar surface (sidebar, mobile drawer) that the
      // canonical users.avatar_url just changed.
      notifyAvatarChanged();
    } finally {
      setUploadingAvatar(false);
    }
  }

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
      const data = await db({ action: 'select', table: 'users', select: 'id, full_name, avatar_url, last_sign_in, last_seen_at, last_path, job_title, status', order: { column: 'last_sign_in', ascending: false } });
      if (Array.isArray(data)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setRecentUsers(
          data.filter(
            (u: RecentUser) =>
              // Hide users who aren't allowed in: on_hold or denied. Treat
              // a missing status as active so older rows before the
              // migration still render.
              (u.status == null || u.status === 'active') &&
              u.last_sign_in &&
              new Date(u.last_sign_in) >= today,
          ),
        );
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
    <div className="flex flex-col min-h-full relative">
      {/* New facilities request — upper right on desktop. On mobile the
          parent shell already has a sticky top bar, so we keep this button
          inline (top-3) and shrink the label to an icon-only pill. */}
      <div className="absolute top-3 right-3 lg:top-5 lg:right-5 z-10 flex items-center gap-2">
        <button
          onClick={() => setFeatureRequestOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm"
          style={{ fontFamily: 'var(--font-body)' }}
          title="Submit a new feature request"
          aria-label="New feature request"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
          <span className="hidden sm:inline">Feature request</span>
          <span className="sm:hidden">Feature</span>
        </button>
        <button
          onClick={() => router.push('/app/facilities?new=1')}
          className="inline-flex items-center gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-full bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors shadow-sm"
          style={{ fontFamily: 'var(--font-body)' }}
          title="Report a new facilities issue"
          aria-label="New facilities request"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="hidden sm:inline">New facilities request</span>
          <span className="sm:hidden">Facilities</span>
        </button>
      </div>

      {/* Online today — centered at the top of the dashboard. */}
      {recentUsers.length > 0 && (
        <div
          className={`flex flex-col items-center justify-center gap-2 px-4 sm:px-6 lg:px-10 pt-6 transition-all duration-500 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <p
            className="text-[10px] font-semibold text-foreground/40 uppercase tracking-[0.18em]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Online today
          </p>
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
                  className={`relative group shrink-0 ${navTarget ? 'cursor-pointer' : ''}`}
                  title={navTarget ? `Go to ${viewing}` : undefined}
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.full_name || ''}
                      className={`w-9 h-9 rounded-full border-2 object-cover transition-transform hover:scale-110 hover:z-10 ${
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
                  <div className="hidden md:block absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 text-left">
                    <p className="font-semibold text-white">{u.full_name || 'User'}</p>
                    {u.job_title && <p className="text-white/90">{u.job_title}</p>}
                    <p className="text-white/80">{online ? 'Online now' : `Last active ${timeAgo(u.last_sign_in)}`}</p>
                    {viewing && <p className="text-emerald-300">Viewing {viewing}{navTarget ? ' — click to jump' : ''}</p>}
                  </div>
                </Wrapper>
              );
            })}
          </div>
          <div className="mt-6 w-full">
            <HomeClientsRow />
          </div>
          <div className="mt-6 w-full">
            <HomeHorsesRow />
          </div>
          <div className="mt-6 w-full">
            <HomeMeaningfulCallsRow />
          </div>
          <div className="mt-6 w-full">
            <HomeWebsiteRequestsRow />
          </div>
        </div>
      )}

      {/* If there's no "Online today" row (empty state), still show clients + horses */}
      {recentUsers.length === 0 && (
        <div className="px-4 sm:px-6 lg:px-10 pt-6 space-y-6">
          <HomeClientsRow />
          <HomeHorsesRow />
          <HomeMeaningfulCallsRow />
          <HomeWebsiteRequestsRow />
        </div>
      )}

      {/* Centered welcome */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="group relative w-20 h-20 rounded-full border-2 border-white shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Change profile picture"
            title="Click to change your profile picture"
          >
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                {(user.user_metadata?.full_name as string || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'var(--font-body)' }}>
              {uploadingAvatar ? (
                <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Change'
              )}
            </span>
            {uploadingAvatar && (
              <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              </span>
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-center px-4">
            Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'there'}
          </h1>
        </div>
        {pendingSignatures.length > 0 && (
          <div className="w-full max-w-md mx-auto flex flex-col gap-2 px-4 sm:px-6">
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

        {/* My signed job description — shown right above What's new. */}
        {latestSignedJd && (
          <div className="w-full max-w-md mx-auto flex flex-col gap-2 px-4 sm:px-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
              Your signed job description
            </p>
            {latestSignedJd.pdfUrl ? (
              <a
                href={latestSignedJd.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl border border-gray-100 px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Open signed PDF"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-foreground truncate">{latestSignedJd.title}</span>
                </div>
                <span className="uppercase tracking-wider text-[11px] font-bold text-primary/70 shrink-0">PDF</span>
              </a>
            ) : (
              <button
                onClick={() => router.push(`/app/job-descriptions/${latestSignedJd.id}`)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all flex items-center justify-between gap-3"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Open my signed job description"
              >
                <span className="text-sm font-semibold text-foreground truncate">{latestSignedJd.title}</span>
                <span className="text-xs font-medium text-primary whitespace-nowrap">Open →</span>
              </button>
            )}
          </div>
        )}

        {/* Policy Q&A — replaces the inline update log; the log now lives in
            a floating "What's new" popup in the lower-right. */}
        <AskPolicies />
      </div>

      {/* Work-in-progress notice — pinned to the bottom of the dashboard. */}
      <div className="px-4 sm:px-6 lg:px-10 pb-6">
        <div
          className="mx-auto max-w-2xl rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-2.5 flex items-center justify-center gap-2.5 text-amber-900 shadow-sm"
          role="status"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <p className="text-xs sm:text-sm text-center" style={{ fontFamily: 'var(--font-body)' }}>
            This is a work in progress and is constantly being updated — some things might not work yet.
          </p>
        </div>
      </div>

      <FeatureRequestModal open={featureRequestOpen} onClose={() => setFeatureRequestOpen(false)} />
      <WhatsNewButton />
    </div>
  );
}
