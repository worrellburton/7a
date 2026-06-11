'use client';

import { useAuth, notifyAvatarChanged } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { uploadFile, compressImage, generateAvatarThumbDataUrl } from '@/lib/upload';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import FeatureRequestModal from './kingdom-requests/FeatureRequestModal';
import HomeChatsRow from './HomeChatsRow';
import WhatsNewButton from './WhatsNewButton';
import JdSignatureNagModal from './JdSignatureNagModal';
// Temporarily not rendered — see HomeContent.tsx note. Keeping the
// import in source so the re-enable diff is one line.
// import HomeClientsRow from './HomeClientsRow';
import HomeOnlineOrbit, { type OrbitHorse } from './HomeOnlineOrbit';
import HomeDailyLogsChip from './HomeDailyLogsChip';
import HomeHardwareChip from './HomeHardwareChip';
import HomeMercuryBalanceChip from './HomeMercuryBalanceChip';
import HomeChipCluster from './HomeChipCluster';
import HomeConnect4Nudge from './HomeConnect4Nudge';

interface RecentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  // Pre-rendered 60×60 WebP as a data URL. Populated on upload + by
  // the admin backfill endpoint. Drives the orbit so it paints with
  // zero per-avatar HTTP fetches.
  avatar_thumb: string | null;
  last_sign_in: string | null;
  job_title: string | null;
  last_path: string | null;
  last_seen_at: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  // 'staff' / 'alumni' / 'guest' — drives the staff-vs-alumni
  // ring split on the orbit. Null treated as staff.
  user_kind?: 'staff' | 'alumni' | 'guest' | null;
  // Activity-feed counters, joined in client-side after the user
  // list loads. > 10 today flips the avatar into "on fire" mode in
  // the orbit; the tooltip shows the count + a few recent actions.
  actions_today?: number;
  recent_actions?: Array<{
    type: string;
    target_label: string | null;
    created_at: string;
  }>;
  // Phone-coverage shifts assigned to this user *for today only*,
  // pulled from public.calendar_events where category='phones' and
  // event_date = today (Phoenix time). Drives the phone badge + the
  // "on phones today" tooltip section in HomeOnlineOrbit.
  phones_today?: Array<{
    title: string;          // shift label as stored on the event row
    start_time: string | null;
    end_time: string | null;
  }>;
  // Sobriety data — populated for alumni rows only, sourced from
  // public.alumni_profiles after the users query lands. Only set
  // when the alum has sobriety_public=true. `sobriety_short_label`
  // is a compact "47d / 3mo / 2y" form for the bubble badge;
  // `sobriety_label` is the longer "47 days sober" form used in
  // the tooltip. `last_check_in_at` + `check_in_streak` drive the
  // first-time-seeing-it glow on the avatar bubble and the
  // tooltip's check-in details.
  sobriety_short_label?: string | null;
  sobriety_label?: string | null;
  last_check_in_at?: string | null;
  check_in_streak?: number;
}

interface PendingSignature {
  id: string;
  job_description_id: string;
  sent_at: string;
  title: string;
}

// Phoenix-anchored day count since sobriety_date. Phoenix has no DST,
// so anchoring the start day at midnight Phoenix avoids the off-by-one
// drift that happens when crossing UTC midnight.
function soberDayCount(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const start = Date.parse(`${iso}T00:00:00-07:00`);
  if (!Number.isFinite(start)) return null;
  const days = Math.floor((Date.now() - start) / 86_400_000);
  return days < 0 ? null : days;
}

function soberShortLabel(iso: string | null | undefined): string | null {
  const days = soberDayCount(iso);
  if (days == null) return null;
  if (days === 0) return '1d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

function soberLongLabel(iso: string | null | undefined): string | null {
  const days = soberDayCount(iso);
  if (days == null) return null;
  if (days === 0) return 'Day 1 sober';
  if (days < 30) return `${days} days sober`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} ${m === 1 ? 'month' : 'months'} sober`;
  }
  const y = Math.floor(days / 365);
  return `${y} ${y === 1 ? 'year' : 'years'} sober`;
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
  const { user, session, userKind } = useAuth();
  const { pages } = usePagePermissions();
  const router = useRouter();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentAlumni, setRecentAlumni] = useState<RecentUser[]>([]);
  const [horses, setHorses] = useState<OrbitHorse[]>([]);
  const [pendingSignatures, setPendingSignatures] = useState<PendingSignature[]>([]);
  const [signedJds, setSignedJds] = useState<Array<{ id: string; title: string; pdfUrl: string | null }>>([]);
  const [loaded, setLoaded] = useState(false);
  const [featureRequestOpen, setFeatureRequestOpen] = useState(false);
  // Combined "+" menu in the hero: holds the Feature request and
  // New facilities entry points. Single round button to reduce
  // hero-band visual weight.
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!addMenuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!addMenuRef.current) return;
      if (!addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAddMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [addMenuOpen]);
  // JD nag: surfaces a full-screen modal when any pending signature
  // has been waiting >= 3 days. Dismissal lives in sessionStorage so
  // it stays gone for the rest of the tab's session and reappears on
  // the next sign-in.
  const [nagDismissed, setNagDismissed] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  // When it's the user's turn in a Connect-4 match, the
  // HomeConnect4Nudge surfaces a floating "Your move" pill +
  // reports the opponent's user_id up to here so the orbit
  // below can pulse that avatar.
  const [c4OpponentId, setC4OpponentId] = useState<string | null>(null);

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
      // Inline 60×60 WebP for the home orbit so it paints without a
      // per-avatar HTTP fetch. Generated from the same compressed
      // buffer we just uploaded — null on browser failure is fine,
      // the orbit falls back to avatar_url.
      const thumb = await generateAvatarThumbDataUrl(compressed);
      await db({
        action: 'update',
        table: 'users',
        data: { avatar_url: url, avatar_thumb: thumb },
        match: { id: user.id },
      });
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
    map.set('/feather/profile', 'My Profile');
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return (path: string | null): string | null => {
      if (!path) return null;
      // Any job-description view (list or detail) always reads as "Job Descriptions".
      if (path.startsWith('/feather/job-descriptions') || path.startsWith('/feather/jd/') || path === '/feather/jd') {
        return 'Job Descriptions';
      }
      if (path.startsWith('/feather/sign/')) return 'Job Descriptions';
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

  // Horse roster — sits in the inner ring of the Online-today orbit
  // so the team's animals are always present alongside the people.
  // Each horse is enriched with its most recent weight + feed log so
  // the orbit's hover tooltip can show "Weight · Last fed · Weighed"
  // without each tooltip having to query its own logs on hover.
  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    (async () => {
      const [hs, ws, fs] = await Promise.all([
        db({
          action: 'select',
          table: 'equine',
          select: 'id, name, image_url, age, weight, works_in, rideable',
          order: { column: 'name', ascending: true },
        }).catch(() => []),
        // Equine weight + feed logs grow unbounded. The dashboard only
        // needs the LATEST per horse, so cap to the last 60 days +
        // 2000 rows — that fits ~15-20 horses with multiple daily
        // entries each and lops gigabytes of egress over time.
        (async () => {
          const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
          const { data } = await supabase
            .from('equine_weight_logs')
            .select('horse_id, weight_lbs, logged_at')
            .gte('logged_at', since)
            .order('logged_at', { ascending: false })
            .limit(2000);
          return data ?? [];
        })().catch(() => []),
        (async () => {
          const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
          const { data } = await supabase
            .from('equine_feed_logs')
            .select('horse_id, feed_type, amount, unit, logged_at')
            .gte('logged_at', since)
            .order('logged_at', { ascending: false })
            .limit(2000);
          return data ?? [];
        })().catch(() => []),
      ]);
      if (cancelled || !Array.isArray(hs)) return;

      // Build "latest by horse" maps from the already-newest-first
      // ordered logs — first hit wins, so no need to sort.
      const lastWeight = new Map<string, { weight_lbs: number | null; logged_at: string }>();
      for (const w of (Array.isArray(ws) ? ws : []) as Array<{ horse_id: string; weight_lbs: number | null; logged_at: string }>) {
        if (!lastWeight.has(w.horse_id)) lastWeight.set(w.horse_id, w);
      }
      const lastFeed = new Map<string, { feed_type: string | null; amount: number | null; unit: string | null; logged_at: string }>();
      for (const f of (Array.isArray(fs) ? fs : []) as Array<{ horse_id: string; feed_type: string | null; amount: number | null; unit: string | null; logged_at: string }>) {
        if (!lastFeed.has(f.horse_id)) lastFeed.set(f.horse_id, f);
      }

      const enriched: OrbitHorse[] = (hs as Array<{
        id: string;
        name: string;
        image_url: string | null;
        age: number | null;
        weight: number | null;
        works_in: string | null;
        rideable: string | null;
      }>).map((h) => {
        const w = lastWeight.get(h.id) ?? null;
        const f = lastFeed.get(h.id) ?? null;
        return {
          id: h.id,
          name: h.name,
          image_url: h.image_url,
          age: h.age,
          weight: h.weight,
          works_in: h.works_in,
          rideable: h.rideable,
          last_weight_lbs: w?.weight_lbs ?? null,
          last_weighed_at: w?.logged_at ?? null,
          last_feed_amount: f?.amount ?? null,
          last_feed_unit: f?.unit ?? null,
          last_feed_type: f?.feed_type ?? null,
          last_fed_at: f?.logged_at ?? null,
        };
      });
      setHorses(enriched);
    })();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;
    async function fetchRecentUsers() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      // Filter server-side instead of downloading the whole users
      // table. The orbit only ever renders people who signed in
      // today, but the old query selected EVERY row — including each
      // one's base64 avatar_thumb — and threw most of it away
      // client-side. With the org growing that was megabytes of
      // payload to paint a few dozen bubbles. Backed by the
      // users(last_sign_in desc) index from the perf migration.
      const { data, error: usersErr } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, avatar_thumb, last_sign_in, last_seen_at, last_path, job_title, status, user_kind')
        .gte('last_sign_in', today.toISOString())
        // Hide users who aren't allowed in: on_hold or denied. Treat
        // a missing status as active so older rows before the
        // migration still render.
        .or('status.is.null,status.eq.active')
        .order('last_sign_in', { ascending: false });
      if (cancelled || usersErr || !Array.isArray(data)) {
        setTimeout(() => setLoaded(true), 100);
        return;
      }
      const filtered = data as RecentUser[];
      // Split staff vs. alumni so the orbit can render them as
      // separate rings (alumni become the outermost ring around
      // employees + horses). user_kind null defaults to staff so
      // legacy rows from before the column existed still appear
      // on the employee ring.
      const staff = filtered.filter((u) => u.user_kind !== 'alumni');
      const alumni = filtered.filter((u) => u.user_kind === 'alumni');
      setRecentUsers(staff);
      setRecentAlumni(alumni);
      setTimeout(() => setLoaded(true), 100);

      // Side fetch: alumni_profiles for the alumni on the ring so each
      // bubble can render a sobriety badge + the tooltip can show
      // last-check-in details. RLS on alumni_profiles allows any
      // signed-in user to read sobriety fields the alum opted in to
      // share (sobriety_public), plus the per-row check-in fields.
      // Failure is non-fatal — the orbit just loses the badge.
      if (alumni.length > 0) {
        void (async () => {
          const { data: profiles, error: profErr } = await supabase
            .from('alumni_profiles')
            .select('user_id, sobriety_date, sobriety_public, last_check_in_at, check_in_streak')
            .in('user_id', alumni.map((a) => a.id));
          if (cancelled || profErr || !Array.isArray(profiles)) return;
          type ProfileRow = {
            user_id: string;
            sobriety_date: string | null;
            sobriety_public: boolean | null;
            last_check_in_at: string | null;
            check_in_streak: number | null;
          };
          const byId = new Map<string, ProfileRow>();
          for (const p of profiles as ProfileRow[]) byId.set(p.user_id, p);
          setRecentAlumni((prev) =>
            prev.map((a) => {
              const p = byId.get(a.id);
              if (!p) return a;
              const sobrietyOk = p.sobriety_public === true && !!p.sobriety_date;
              return {
                ...a,
                sobriety_short_label: sobrietyOk ? soberShortLabel(p.sobriety_date) : null,
                sobriety_label: sobrietyOk ? soberLongLabel(p.sobriety_date) : null,
                last_check_in_at: p.last_check_in_at,
                check_in_streak: typeof p.check_in_streak === 'number' ? p.check_in_streak : 0,
              };
            }),
          );
        })();
      }

      // Second pass: pull today's activity_log rows and join them
      // onto the recent users. The orbit uses these counts to flip
      // an avatar into "on fire" mode (> 10 actions today) and the
      // shared tooltip lists the most recent ones so admins can see
      // *why* a teammate is highlighted. Done as a separate fetch
      // (and merged after) so the orbit renders immediately and the
      // counts trickle in without blocking the avatars.
      // Scope to the users actually on the orbit and cap the rows —
      // a busy day org-wide can produce thousands of log entries,
      // but the tooltip only ever shows counts + the 5 most recent
      // per person. Backed by activity_log(user_id, created_at desc)
      // from the perf migration.
      const orbitIds = filtered.map((u) => u.id);
      const { data: activityRows, error: activityErr } = await supabase
        .from('activity_log')
        .select('user_id, type, target_label, created_at')
        .gte('created_at', today.toISOString())
        .in('user_id', orbitIds)
        .order('created_at', { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (activityErr || !Array.isArray(activityRows)) return;
      const counts: Record<string, number> = {};
      const recents: Record<string, RecentUser['recent_actions']> = {};
      for (const r of activityRows as Array<{
        user_id: string | null;
        type: string;
        target_label: string | null;
        created_at: string;
      }>) {
        if (!r.user_id) continue;
        counts[r.user_id] = (counts[r.user_id] ?? 0) + 1;
        const list = recents[r.user_id] ?? (recents[r.user_id] = []);
        if (list.length < 5) {
          list.push({ type: r.type, target_label: r.target_label, created_at: r.created_at });
        }
      }
      setRecentUsers((prev) =>
        prev.map((u) => ({
          ...u,
          actions_today: counts[u.id] ?? 0,
          recent_actions: recents[u.id] ?? [],
        })),
      );

      // Third pass: pull today's phones-coverage events from
      // calendar_events. Same calendar that powers /app/calendar's
      // Phones tab — `category='phones'` discriminates phones rows
      // from regular team events. event_date is a calendar date in
      // Phoenix time (no tz on the column), so we match against
      // today's Phoenix YYYY-MM-DD. Each event's title carries the
      // shift label ("Phones — Day / Evening / Morning"); start_time
      // and end_time are the resolved hours.
      const phoenixToday = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Phoenix',
      });
      const { data: phoneRows, error: phoneErr } = await supabase
        .from('calendar_events')
        .select('subject_id, title, start_time, end_time')
        .eq('event_date', phoenixToday)
        .eq('subject_kind', 'user')
        .eq('category', 'phones');
      if (cancelled || phoneErr || !Array.isArray(phoneRows)) return;
      const phonesByUser: Record<string, RecentUser['phones_today']> = {};
      for (const r of phoneRows as Array<{
        subject_id: string | null;
        title: string;
        start_time: string | null;
        end_time: string | null;
      }>) {
        if (!r.subject_id) continue;
        const list = phonesByUser[r.subject_id] ?? (phonesByUser[r.subject_id] = []);
        list.push({
          title: r.title,
          start_time: r.start_time,
          end_time: r.end_time,
        });
      }
      setRecentUsers((prev) =>
        prev.map((u) => ({
          ...u,
          phones_today: phonesByUser[u.id] ?? [],
        })),
      );
    }
    fetchRecentUsers();
    return () => {
      cancelled = true;
    };
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
      // Single round-trip for all pending JDs instead of one fetch
      // per signature. Was an N+1 — a user with 5 pending JDs hit
      // /api/db 5 times sequentially before the nag modal could
      // render.
      const jobIds = Array.from(new Set(pending.map((p) => p.job_description_id)));
      const { data: jobRows } = await supabase
        .from('job_descriptions')
        .select('id, title')
        .in('id', jobIds);
      if (cancelled) return;
      const titleById = new Map(
        ((jobRows ?? []) as Array<{ id: string; title: string }>).map((j) => [j.id, j.title]),
      );
      const merged: PendingSignature[] = pending
        .map((p) => {
          const title = titleById.get(p.job_description_id);
          if (!title) return null;
          return { id: p.id, job_description_id: p.job_description_id, sent_at: p.sent_at, title };
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
    async function loadSignedJds() {
      const sigs = await db({
        action: 'select',
        table: 'jd_signatures',
        match: { signer_user_id: user!.id },
        select: 'id, job_description_id, signed_at, pdf_storage_path',
        order: { column: 'signed_at', ascending: false },
      }).catch(() => []);
      if (cancelled || !Array.isArray(sigs)) return;
      // Most-recent signed copy wins per job_description_id, so an
      // old superseded version doesn't clutter the header.
      const signedRows = (sigs as Array<{ job_description_id: string; signed_at: string | null; pdf_storage_path: string | null }>)
        .filter((s) => !!s.signed_at);
      const latestByJob = new Map<string, { pdfUrl: string | null }>();
      for (const s of signedRows) {
        if (!latestByJob.has(s.job_description_id)) {
          latestByJob.set(s.job_description_id, { pdfUrl: s.pdf_storage_path || null });
        }
      }
      const jobIds = Array.from(latestByJob.keys());
      if (jobIds.length === 0) {
        setSignedJds([]);
        return;
      }
      const { data: jdRows } = await supabase
        .from('job_descriptions')
        .select('id, title')
        .in('id', jobIds);
      if (cancelled) return;
      const titleById = new Map(
        ((jdRows ?? []) as Array<{ id: string; title: string }>).map((j) => [j.id, j.title]),
      );
      // Preserve the signed-at order from the original query.
      const seen = new Set<string>();
      const ordered: Array<{ id: string; title: string; pdfUrl: string | null }> = [];
      for (const s of signedRows) {
        if (seen.has(s.job_description_id)) continue;
        seen.add(s.job_description_id);
        const title = titleById.get(s.job_description_id);
        if (!title) continue;
        ordered.push({ id: s.job_description_id, title, pdfUrl: s.pdf_storage_path || null });
      }
      setSignedJds(ordered);
    }
    loadSignedJds();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  // The user's CURRENT role — users.job_title, the same field the
  // Team page edits. The header used to show the titles of JDs the
  // user had SIGNED, which goes stale the moment their role changes
  // on the team page (e.g. promoted from Clinical Director to
  // Executive Director but the header kept greeting the old title).
  const [myRole, setMyRole] = useState<{ title: string; jdId: string | null } | null>(null);
  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    async function loadMyRole() {
      const { data: meRow } = await supabase
        .from('users')
        .select('job_title')
        .eq('id', user!.id)
        .maybeSingle();
      if (cancelled) return;
      const title = ((meRow?.job_title as string | null) || '').trim();
      if (!title) {
        setMyRole(null);
        return;
      }
      // Link the role to its JD when one exists — JDs and users are
      // associated by title throughout the app (see the JD page's
      // assignedUsers). ilike with no wildcards = case-insensitive
      // exact match.
      const { data: jdRows } = await supabase
        .from('job_descriptions')
        .select('id')
        .ilike('title', title)
        .is('archived_at', null)
        .limit(1);
      if (cancelled) return;
      setMyRole({ title, jdId: (jdRows?.[0] as { id: string } | undefined)?.id ?? null });
    }
    loadMyRole();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  // Signed copy of the CURRENT role's JD, if any — lets the header
  // title deep-link to the signed PDF like the old list did.
  const signedMatchForRole = myRole
    ? signedJds.find((j) => j.title.trim().toLowerCase() === myRole.title.toLowerCase()) ?? null
    : null;

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
    // `isolation: isolate` scopes the negative z-index used by the
    // ambient backdrop + the mobile log-rain layer to this stacking
    // context so they stay BEHIND home-content elements rather than
    // disappearing behind the body's background.
    <div data-home-no-scroll className="relative flex flex-col min-h-full overflow-x-clip isolation-auto" style={{ isolation: 'isolate' }}>
      {/* Phase 3: ambient backdrop. Three soft warm orbs sit behind
          everything so the glass surfaces have something colorful to
          refract. Pointer-events off so they never trap clicks. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-orange-300/35 blur-[120px]" />
        <div className="absolute top-1/4 -right-20 w-[360px] h-[360px] rounded-full bg-rose-200/40 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 w-[480px] h-[480px] rounded-full bg-amber-200/35 blur-[130px]" />
      </div>

      {/* Wrapper height = viewport height (1px subtracted to defeat
          a Chrome subpixel rounding quirk that otherwise produces a
          1px stray scrollbar). The old lg: divisor of `/0.82` was
          compensating for an `app-shell { zoom: 0.82 }` rule that
          got dropped in 41bfd939 — without that zoom, dividing the
          viewport by 0.82 produced a ~122vh container, and the
          overflow-hidden then clipped the daily-logs chip + mission
          tagline out of frame. Uniform 100svh across breakpoints
          restores the one-viewport home page. */}
      <div className="relative flex-1 flex flex-col h-[calc(100svh-1px)] max-h-[calc(100svh-1px)] overflow-hidden px-4 sm:px-6 lg:px-10 py-3 lg:py-6">

        {/* Phase 4: hero — no glass card; the avatar/greeting and the
            create-menu button float on the page background. The hero
            is absolutely positioned at lg+ so the centerpiece (orbit
            + ask policies) can use the full vertical space below for
            true vertical centering. On mobile we drop back to normal
            document flow so the welcome stacks above the orbit
            instead of overlapping it. */}
        <header
          className={`relative lg:absolute lg:top-6 lg:left-10 lg:right-10 z-30 transition-all duration-500 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          }`}
        >
          <div className="px-4 sm:px-6 py-2 lg:py-3">

            {/* TOP ROW: identity (avatar + greeting) on the left,
                action button on the right. */}
            <div className="flex items-center justify-between gap-3">

            {/* LEFT: avatar + greeting. Tagged with
                data-shift-on-sidebar so it slides 12rem to the right
                while the sidebar rail is hovered (rail expands from
                w-16 → w-64, exactly that delta) — keeps the welcome
                from being covered by the expanded sidebar overlay.
                The shift CSS lives in globals.css. */}
            <div data-shift-on-sidebar className="flex items-center gap-3 lg:gap-4 min-w-0">
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
                {myRole ? (
                  /* Current role from the Team page (users.job_title) —
                     always in sync with what admins set there. Links to
                     the signed PDF when one exists, else the JD page. */
                  <div
                    className="mt-0.5 text-[11px] text-foreground/55 leading-snug"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {signedMatchForRole?.pdfUrl ? (
                      <a
                        href={signedMatchForRole.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground hover:underline underline-offset-2"
                      >
                        {myRole.title}
                      </a>
                    ) : myRole.jdId ? (
                      <button
                        type="button"
                        onClick={() => router.push(`/feather/job-descriptions/${myRole.jdId}`)}
                        className="hover:text-foreground hover:underline underline-offset-2"
                      >
                        {myRole.title}
                      </button>
                    ) : (
                      <span>{myRole.title}</span>
                    )}
                  </div>
                ) : signedJds.length > 0 && (
                  <div
                    className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[11px] text-foreground/55 leading-snug"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {signedJds.map((jd, i) => (
                      <span key={jd.id} className="inline-flex items-baseline">
                        {i > 0 && <span aria-hidden className="mr-1.5 text-foreground/30">·</span>}
                        {jd.pdfUrl ? (
                          <a
                            href={jd.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-foreground hover:underline underline-offset-2"
                          >
                            {jd.title}
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => router.push(`/feather/job-descriptions/${jd.id}`)}
                            className="hover:text-foreground hover:underline underline-offset-2"
                          >
                            {jd.title}
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right cluster — pending-signature pill + create (+)
                button. The signed-JD titles live inline under the
                user's name in the left cluster so the right side
                stays focused on action items. */}
            <div className={`shrink-0 flex items-center gap-2 ${userKind === 'alumni' ? 'hidden' : ''}`}>
            {/* Pending-signature pill — amber, urgent. If multiple
                pending, only the first title shows; count chip
                indicates the rest. */}
            {pendingSignatures.length > 0 && (
              <button
                type="button"
                onClick={() => router.push(`/feather/sign/${pendingSignatures[0].id}`)}
                title={pendingSignatures.length === 1
                  ? `Sign: ${pendingSignatures[0].title}`
                  : `${pendingSignatures.length} job descriptions waiting for your signature — open the first.`}
                aria-label={`${pendingSignatures.length} pending signature${pendingSignatures.length === 1 ? '' : 's'} — open ${pendingSignatures[0].title}`}
                className="inline-flex items-center gap-1.5 h-9 lg:h-10 pl-3 pr-3.5 rounded-full bg-amber-100/85 border border-amber-300 text-amber-900 hover:bg-amber-100 hover:border-amber-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 max-w-[14rem] sm:max-w-xs"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-4 h-4 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                <span className="text-[12px] font-semibold truncate">
                  Sign: {pendingSignatures[0].title}
                </span>
                {pendingSignatures.length > 1 && (
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-700 text-white text-[10px] font-bold tabular-nums">
                    {pendingSignatures.length}
                  </span>
                )}
              </button>
            )}
            {/* Right-cluster info chips. On desktop they render
                inline (Mercury balance · daily logs · hardware
                check-in). On mobile the cluster collapses into a
                single dot-menu trigger so the WELCOME BACK headline
                isn't crowded; tapping the trigger opens a dropdown
                with all the chips stacked. The chips themselves
                only render once — the cluster swaps layout via
                class toggles. */}
            <HomeChipCluster>
              {/* Mercury 7A bank-balance pill — super-admin only.
                  RLS on mercury_accounts hides the read for everyone
                  else, and the component itself returns null when
                  !isSuperAdmin so a non-super-admin doesn't even pay
                  the mount cost. */}
              <HomeMercuryBalanceChip />
              {/* Daily logs circle — compact 36-40px round button
                  that links to /app/logs; flips to a glowing amber 🔥
                  when today clears the all-time record. */}
              <HomeDailyLogsChip variant="circle" />
              {/* Hardware check-in chip — same 36-40px round shape,
                  shows how many hardware rows are assigned to the
                  signed-in user; clicking opens the per-row "looks
                  good / isn't right" check-in. Auto-hides when
                  count == 0. */}
              <HomeHardwareChip />
            </HomeChipCluster>
            <div ref={addMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAddMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={addMenuOpen}
                className="inline-flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-foreground text-white hover:bg-foreground/85 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                title="Create"
                aria-label="Create"
              >
                <svg
                  className={`w-4 h-4 lg:w-4.5 lg:h-4.5 transition-transform duration-200 ${addMenuOpen ? 'rotate-45' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              {addMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/70 bg-white/85 supports-[backdrop-filter]:bg-white/70 backdrop-blur-xl shadow-[0_18px_40px_-18px_rgba(60,48,42,0.35)] overflow-hidden z-40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <button
                    role="menuitem"
                    onClick={() => { setAddMenuOpen(false); setFeatureRequestOpen(true); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-primary/10 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                      </svg>
                    </span>
                    <span className="uppercase tracking-wider text-[11px]">Feature request</span>
                  </button>
                  <div aria-hidden="true" className="h-px bg-white/60" />
                  <button
                    role="menuitem"
                    onClick={() => { setAddMenuOpen(false); router.push('/feather/facilities?new=1'); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-foreground hover:bg-foreground/10 transition-colors"
                  >
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-foreground text-white shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                    <span className="uppercase tracking-wider text-[11px]">New facilities</span>
                  </button>
                </div>
              )}
            </div>
            </div> {/* end toggle + create cluster */}

            </div> {/* end TOP ROW */}

            {/* Chats strip — Everybody + DM threads with unread
                badges, one tap from the top of home. */}
            <div className="mt-3">
              <HomeChatsRow />
            </div>

          </div>
        </header>

        {/* Centerpiece — flex-1 so it eats the leftover vertical space
            between the absolutely-positioned hero (top) and the WIP
            footer pill (bottom). The orbit is absolute-positioned to
            this column's geometric centre (see below) so the 7A
            medallion always lands dead-centre. The remaining children
            (Connect-4 nudge, action stack) flow with `justify-end` so
            they stack at the bottom of the centerpiece instead of
            colliding with the absolutely-positioned orbit. */}
        <div className="relative flex-1 flex flex-col items-stretch justify-end gap-4 sm:gap-6 lg:gap-8 mt-2 lg:mt-0">

        {/* Centered, slowly-rotating ring of teammates active in the
            last 24 hours, with the horse roster orbiting in the inner
            ring. See HomeOnlineOrbit.tsx for the anatomy + animation.
            Mobile: fixed-positioned so it pins to the visible
            viewport's centre. Desktop: absolute-positioned to the
            centerpiece's geometric centre so the 7A medallion sits
            dead-centre regardless of how many siblings (Connect-4
            nudge, signature stack, etc.) flow below it — leaving the
            orbit in normal flex flow lets sibling height push the
            orbit upward off the visual centre, which is exactly the
            bug we kept hitting. `pointer-events-none` on the section
            so the click-through area around the orbit doesn't block
            anything below; the inner content opts back in to clicks. */}
        {recentUsers.length > 0 && (
          <section className="z-50 w-full max-w-4xl mx-auto py-2 fixed sm:absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="pointer-events-auto flex flex-col items-center gap-3">
              <HomeOnlineOrbit users={recentUsers} alumni={recentAlumni} horses={horses} pathLabelFor={pathLabel} highlightUserId={c4OpponentId} />
              {/* The mobile daily-logs chip used to sit inside this
                  fixed orbit section, right below the ring. That
                  pulled the section's centre down (so the 7A medallion
                  drifted above true viewport-centre) and put the chip
                  near the "Also here" presence pill (bottom-20),
                  causing visual collision. It's now rendered as its
                  own fixed element further down, anchored above the
                  pill so the two never overlap. */}
            </div>
          </section>
        )}

        <HomeConnect4Nudge onOpponentChange={setC4OpponentId} />

        {/* Phase 6: action stack — pending signatures only.
            Signed JDs live inline under the user's name in the
            header so the orbit isn't visually crashed by a wide
            card sitting on top of it. */}
        {pendingSignatures.length > 0 && (
          <section className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
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
                    onClick={() => router.push(`/feather/sign/${p.id}`)}
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
          </section>
        )}

        </div> {/* end centerpiece */}

        {/* The desktop in-flow daily-logs chip used to live here, and
            a separate mobile-only fixed chip lived just above the
            "Also here" pill. Both are gone — the chip now sits in
            the home header next to the + button (see the right
            cluster of <header> above) so the same surface works on
            every breakpoint and the centerpiece stays uncluttered. */}

        {/* Mission tagline — closes the home page with a quiet brand
            anchor below the team orbit. DESKTOP ONLY: on phones the
            one-viewport layout pushed it up under the globally-fixed
            "Also here" presence pill (PageViewers.tsx) and the two
            overlapped, so the tagline is hidden below lg. */}
        <section
          aria-label="Mission tagline"
          className="hidden lg:flex w-full max-w-4xl mx-auto pt-2 pb-28 sm:pb-24 px-4 flex-col items-center text-center"
        >
          <p
            className="text-[10px] font-semibold tracking-[0.28em] uppercase text-foreground/45 mb-1.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Seven Arrows
          </p>
          <h2
            className="text-xl lg:text-2xl font-semibold text-foreground/80 leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
            aria-label="Moving the mission forward"
          >
            {Array.from('Moving the mission forward').map((ch, i) => (
              <span
                key={i}
                aria-hidden
                className="sa-wave-letter"
                style={{ ['--i' as string]: i }}
              >
                {ch === ' ' ? ' ' : ch}
              </span>
            ))}
          </h2>
        </section>

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

