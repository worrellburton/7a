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
import JdSignatureNagModal from './JdSignatureNagModal';
// Temporarily not rendered — see HomeContent.tsx note. Keeping the
// import in source so the re-enable diff is one line.
// import HomeClientsRow from './HomeClientsRow';
import HomeHorsesRow from './HomeHorsesRow';
import HomeMeaningfulCallsRow from './HomeMeaningfulCallsRow';
import HomeWebsiteVisitsRow from './HomeWebsiteVisitsRow';
import HomeWebsiteRequestsRow from './HomeWebsiteRequestsRow';
import HomeSeoActionsRow from './HomeSeoActionsRow';

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
  // JD nag: surfaces a full-screen modal when any pending signature
  // has been waiting >= 3 days. Dismissal lives in sessionStorage so
  // it stays gone for the rest of the tab's session and reappears on
  // the next sign-in.
  const [nagDismissed, setNagDismissed] = useState(false);
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

  // JD nag: pick the oldest pending signature that's been waiting >=
  // 3 days. Computed every render — cheap, depends only on
  // pendingSignatures. Hydrate dismissal from sessionStorage so a
  // mid-session reload does not re-show the modal.
  const NAG_DAYS = 3;
  const nagSignature = (() => {
    const cutoffMs = Date.now() - NAG_DAYS * 24 * 60 * 60 * 1000;
    const overdue = pendingSignatures.filter((p) => new Date(p.sent_at).getTime() <= cutoffMs);
    if (overdue.length === 0) return null;
    overdue.sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime());
    return overdue[0];
  })();
  const nagStorageKey = nagSignature ? `jd-nag-dismissed:${nagSignature.id}` : null;
  useEffect(() => {
    if (!nagStorageKey || typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(nagStorageKey) === '1') setNagDismissed(true);
  }, [nagStorageKey]);

  if (!user) return null;

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'there';
  const nagDays = nagSignature
    ? Math.max(NAG_DAYS, Math.floor((Date.now() - new Date(nagSignature.sent_at).getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  function dismissNag() {
    if (nagStorageKey && typeof window !== 'undefined') {
      window.sessionStorage.setItem(nagStorageKey, '1');
    }
    setNagDismissed(true);
  }

  return (
    <div className="relative flex flex-col min-h-full overflow-hidden">
      {/* Phase 3: ambient backdrop. Three soft warm orbs sit behind
          everything so the glass surfaces have something colorful to
          refract. Pointer-events off so they never trap clicks. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-orange-300/35 blur-[120px]" />
        <div className="absolute top-1/4 -right-20 w-[360px] h-[360px] rounded-full bg-rose-200/40 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 w-[480px] h-[480px] rounded-full bg-amber-200/35 blur-[130px]" />
      </div>

      <div className="px-4 sm:px-6 lg:px-10 pt-4 lg:pt-6 pb-10 space-y-5 lg:space-y-6">

        {/* Phase 4: hero band — one liquid-glass plank.
            Identity (avatar + greeting) on the left, presence
            (Online today + Horses) in the middle on desktop, and
            the two action buttons on the right. The previous
            absolute-positioned floating button cluster lived here
            and overlapped the avatar strip on tight viewports —
            folding it into the band fixes that. */}
        <header
          className={`relative z-30 rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_18px_48px_-22px_rgba(60,48,42,0.32)] transition-all duration-500 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          {/* Top inner sheen — gives the glass a clean specular
              edge without an extra wrapping element on each card. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
          />
          <div className="px-4 sm:px-6 py-4 lg:py-5 space-y-3 lg:space-y-4">

            {/* TOP ROW: identity (avatar + greeting) on the left,
                action buttons on the right. The previous single-row
                grid put the presence strip between identity and the
                buttons, which let the horses scroll into the buttons
                on tight viewports. Splitting into two rows gives the
                horses unconstrained width below. */}
            <div className="flex items-center justify-between gap-3">

            {/* LEFT: avatar + greeting */}
            <div className="flex items-center gap-3 lg:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group relative shrink-0 w-12 h-12 lg:w-14 lg:h-14 rounded-full border-2 border-white shadow-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Change profile picture"
                title="Click to change your profile picture"
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-base font-bold">
                    {(user.user_metadata?.full_name as string || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[8px] font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'var(--font-body)' }}>
                  {uploadingAvatar ? (
                    <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Edit'
                  )}
                </span>
                {uploadingAvatar && (
                  <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="w-3 h-3 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
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
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold text-foreground/45 uppercase tracking-[0.22em]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Welcome back
                </p>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  {firstName}
                </h1>
              </div>
            </div>

            {/* RIGHT (top row): action buttons. Live in the same flex
                row as identity so they never collide with the horses
                strip below — the horses now own a full-width second
                row of their own. */}
            <div className="flex items-center gap-1.5 justify-end shrink-0">
              <button
                onClick={() => setFeatureRequestOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 w-9 h-9 lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 rounded-full bg-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-sm"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Submit a new feature request"
                aria-label="New feature request"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
                <span className="hidden lg:inline">Feature request</span>
              </button>
              <button
                onClick={() => router.push('/app/facilities?new=1')}
                className="inline-flex items-center justify-center gap-1.5 w-9 h-9 lg:w-auto lg:h-auto lg:px-3 lg:py-1.5 rounded-full bg-foreground text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors shadow-sm"
                style={{ fontFamily: 'var(--font-body)' }}
                title="Report a new facilities issue"
                aria-label="New facilities request"
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="hidden lg:inline">New facilities</span>
              </button>
            </div>

            </div> {/* end TOP ROW */}

            {/* BOTTOM ROW: presence — Online today + Horses on the team. */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 min-w-0">
              {recentUsers.length > 0 && (
                <div className="flex items-center gap-2 min-w-0">
                  <p
                    className="text-[10px] font-semibold text-foreground/45 uppercase tracking-[0.18em] shrink-0"
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
                </div>
              )}
              <div className="flex-1 min-w-0">
                <HomeHorsesRow />
              </div>
            </div>

          </div>
        </header>

        {/* Phase 5: at-a-glance pulse — already a glass panel, lifted
            with a deeper shadow + sheen so it reads as the primary
            content area below the hero. */}
        <AtAGlance />

        {/* Phase 6: action stack — pending signatures + signed JD,
            uniform glass cards. Renders only when there's something
            to show; otherwise the space below the pulse stays clean. */}
        {(pendingSignatures.length > 0 || latestSignedJd) && (
          <section className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingSignatures.length > 0 && (
              <div className="md:col-span-2">
                <p
                  className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2 px-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Waiting for your signature
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {pendingSignatures.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/app/sign/${p.id}`)}
                      className="relative w-full text-left rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl px-4 py-3 hover:border-primary/45 hover:shadow-md transition-all flex items-center justify-between gap-3 shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.title}</p>
                        <p className="text-xs text-foreground/55">is waiting to be signed</p>
                      </div>
                      <span className="text-xs font-semibold text-primary whitespace-nowrap">Sign now →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {latestSignedJd && (
              <div className={pendingSignatures.length === 0 ? 'md:col-span-2' : 'md:col-span-2'}>
                <p
                  className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2 px-1"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Your signed job description
                </p>
                {latestSignedJd.pdfUrl ? (
                  <a
                    href={latestSignedJd.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative block rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl px-4 py-3 hover:border-primary/45 hover:shadow-md transition-all shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                    title="Open signed PDF"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                          <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
                        </svg>
                        <span className="text-sm font-semibold text-foreground truncate">{latestSignedJd.title}</span>
                      </div>
                      <span className="uppercase tracking-wider text-[11px] font-bold text-primary/70 shrink-0">PDF</span>
                    </div>
                  </a>
                ) : (
                  <button
                    onClick={() => router.push(`/app/job-descriptions/${latestSignedJd.id}`)}
                    className="relative w-full text-left rounded-2xl border border-white/70 bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur-xl px-4 py-3 hover:border-primary/45 hover:shadow-md transition-all flex items-center justify-between gap-3 shadow-[0_8px_24px_-16px_rgba(60,48,42,0.22)]"
                    style={{ fontFamily: 'var(--font-body)' }}
                    title="Open my signed job description"
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-2xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
                    />
                    <span className="text-sm font-semibold text-foreground truncate">{latestSignedJd.title}</span>
                    <span className="text-xs font-semibold text-primary whitespace-nowrap">Open →</span>
                  </button>
                )}
              </div>
            )}
          </section>
        )}

        {/* Phase 7: Ask Policies — the most-used admin action gets
            the headline glass treatment. AskPolicies handles its own
            internal layout; we wrap it so the surface tone matches
            the rest of the page. */}
        <section className="w-full max-w-xl mx-auto">
          <div className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_14px_40px_-18px_rgba(60,48,42,0.28)] p-2 sm:p-3">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
            />
            <AskPolicies />
          </div>
        </section>

        {/* Phase 8: footer status pill — small glass capsule so the
            WIP notice has the same visual language as everything
            above. */}
        <div className="flex justify-center pt-2">
          <p
            className="inline-flex items-center gap-2 text-[10.5px] text-amber-700/85 rounded-full border border-white/60 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-xl px-3 py-1 shadow-sm"
            role="status"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
            Work in progress — some things might not work yet.
          </p>
        </div>

      </div>

      <FeatureRequestModal open={featureRequestOpen} onClose={() => setFeatureRequestOpen(false)} />
      <WhatsNewButton />

      {nagSignature && !nagDismissed && (
        <JdSignatureNagModal
          signature={{ id: nagSignature.id, title: nagSignature.title, sent_at: nagSignature.sent_at }}
          daysWaiting={nagDays}
          onContinueWithoutSigning={dismissNag}
        />
      )}
    </div>
  );
}

// "At a glance" — wraps the three numeric stat rows (Meaningful
// calls, Website visits, Awaiting response) inside a single warm
// card so they read as one organized panel instead of three
// disconnected strips. Each child still renders its own small
// section header, so labels stay legible. Sub-rows that have
// nothing to show (e.g. Awaiting response when the inbox is
// empty) self-hide; the wrapper still renders so the section
// header stays consistent.
//
// Collapsed by default — the home page already has a lot going on
// above (hero band, presence avatars, horses) and a fully-expanded
// dashboard pushed AskPolicies / blog previews well below the fold.
// User opens this when they want to dig into the numbers.
function AtAGlance() {
  // localStorage-backed collapsed state so the choice sticks across
  // page loads. Default closed; reading 'open' explicitly opts in.
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('home-marketing-glance-state');
      if (stored === 'open') setExpanded(true);
    } catch { /* private mode / SSR */ }
  }, []);
  const toggle = () => {
    setExpanded((v) => {
      const next = !v;
      try {
        window.localStorage.setItem('home-marketing-glance-state', next ? 'open' : 'closed');
      } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <section className="w-full max-w-4xl mx-auto">
      {/* Liquid-glass treatment: heavy backdrop blur, semi-transparent
          white tint, white-haze border, soft drop shadow, and a top
          inner sheen line that catches as a specular highlight.
          Solid-tone fallback for browsers without backdrop-filter. */}
      <div className="relative rounded-3xl border border-white/70 bg-white/45 supports-[backdrop-filter]:bg-white/30 backdrop-blur-2xl shadow-[0_14px_40px_-18px_rgba(60,48,42,0.28)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-3xl bg-gradient-to-r from-transparent via-white/90 to-transparent"
        />

        {/* Header — full-width clickable button so the entire bar
            toggles. Chevron rotates on open. Subtitle hints at what
            the panel contains so the closed state still tells the
            user this is "marketing performance" not generic stats. */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="w-full px-5 sm:px-6 pt-3.5 pb-3 flex items-center justify-between gap-3 text-left rounded-3xl hover:bg-white/30 transition-colors"
        >
          <div className="min-w-0">
            <p
              className="text-[11px] font-bold tracking-[0.22em] uppercase text-foreground/55"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Marketing at a Glance
            </p>
            <p
              className="text-[11px] text-foreground/40 mt-0.5 truncate"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {expanded
                ? 'Today / week / month'
                : 'Calls · Website visits · Forms · SEO actions — tap to expand'}
            </p>
          </div>
          <span
            aria-hidden="true"
            className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/55 supports-[backdrop-filter]:bg-white/40 backdrop-blur border border-white/70 text-foreground/55 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {/* Expandable body. The grid-template-rows 0fr↔1fr trick
            transitions intrinsic height without JS measurement; the
            inner div with overflow-hidden clips content while the
            row shrinks/grows. Rows mount lazily — when collapsed
            we don't render the children, so each row's data fetches
            (GA4, calls, SEO summary) only fire on first expand. */}
        <div
          className="grid transition-[grid-template-rows] duration-400 ease-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            {expanded && (
              <div className="divide-y divide-white/40 pb-1">
                <div className="py-2.5">
                  <HomeMeaningfulCallsRow />
                </div>
                <div className="py-2.5">
                  <HomeWebsiteVisitsRow />
                </div>
                <div className="py-2.5">
                  <HomeWebsiteRequestsRow />
                </div>
                <div className="py-2.5">
                  <HomeSeoActionsRow />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
