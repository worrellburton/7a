'use client';

// My Profile — edits the same `users` row that powers the public team
// page. Includes:
//   - Photo upload (overrides the OAuth avatar)
//   - Bio + favorite quote with optional Claude AI assist
//   - "Favorite part about Seven Arrows" free-text
//   - Cursor color (existing)
//   - Toggle to hide self from the public team page (with a soft
//     confirmation: it really does help to be visible)
//   - Live preview of the team-page card so the member sees exactly
//     how their profile will appear on the public site.

import { useAuth, notifyAvatarChanged } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { supabase } from '@/lib/supabase';
import { formatNameWithCredentials } from '@/lib/displayName';
import { useEffect, useRef, useState } from 'react';

const CURSOR_COLORS: { label: string; value: string }[] = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber', value: '#f59e0b' },
  { label: 'Lime', value: '#84cc16' },
  { label: 'Emerald', value: '#10b981' },
  { label: 'Teal', value: '#14b8a6' },
  { label: 'Cyan', value: '#06b6d4' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Violet', value: '#8b5cf6' },
  { label: 'Pink', value: '#ec4899' },
  { label: 'Rose', value: '#f43f5e' },
];

// Curated "interesting fact" prompts. A blank textarea is paralyzing;
// a prompt is an invitation. Members pick any they like, fill in the
// blank, and can remove them. Keep each prompt short, human, and
// something a visitor would actually enjoy reading.
const FACT_PROMPTS: string[] = [
  "I'm secretly great at…",
  'My go-to comfort food is…',
  'Something that always makes me laugh is…',
  'A book that shaped me is…',
  'My favorite place on earth is…',
  "I'm currently obsessed with…",
  "A skill I'm working on is…",
  "If you asked my friends, they'd say I…",
  'One thing most people don’t know about me is…',
  'My first job was…',
  'The best advice I ever got was…',
  "I can't start the day without…",
  'My spirit animal is…',
  'On my days off, you’ll find me…',
  'A cause close to my heart is…',
];

interface FactEntry {
  prompt: string;
  answer: string;
}

// Safely coerce whatever came back from the DB into FactEntry[] so a
// malformed row never crashes the editor.
function coerceFacts(raw: unknown): FactEntry[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((f) => {
      if (!f || typeof f !== 'object') return null;
      const entry = f as { prompt?: unknown; answer?: unknown };
      return {
        prompt: typeof entry.prompt === 'string' ? entry.prompt : '',
        answer: typeof entry.answer === 'string' ? entry.answer : '',
      } satisfies FactEntry;
    })
    .filter((f): f is FactEntry => !!f && !!f.prompt);
}

function GoogleIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function SparkleIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6L12 2zM19 14l1 2.6 2.6 1-2.6 1L19 21l-1-2.4-2.6-1 2.6-1L19 14zM5 14l.8 2.2 2.2.8-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14z" />
    </svg>
  );
}

// Live preview card — mirrors `TeamGrid` exactly so what the member
// sees here matches what the public site renders.
function TeamCardPreview({
  fullName,
  credentials,
  jobTitle,
  avatarUrl,
}: {
  fullName: string;
  credentials: string;
  jobTitle: string;
  avatarUrl: string | null;
}) {
  const displayName = formatNameWithCredentials(fullName, credentials);
  return (
    <div className="aspect-[4/5] w-full max-w-xs mx-auto relative overflow-hidden rounded-2xl bg-dark-section shadow-md">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/25 text-7xl font-bold">
          {(fullName || '?').charAt(0).toUpperCase()}
        </div>
      )}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.55) 55%, rgba(20,10,6,0.92) 100%)',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <h3
          className="text-white text-xl font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {displayName || 'Your Name'}
        </h3>
        {jobTitle && (
          <p
            className="mt-2 text-white/70 text-[11px] font-semibold tracking-[0.18em] uppercase"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {jobTitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ProfileContent() {
  const { user, session } = useAuth();
  const [fullName, setFullName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [hometown, setHometown] = useState('');
  const [bio, setBio] = useState('');
  const [favoriteQuote, setFavoriteQuote] = useState('');
  const [favoriteSevenArrows, setFavoriteSevenArrows] = useState('');
  const [facts, setFacts] = useState<FactEntry[]>([]);
  const [factsMenuOpen, setFactsMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [publicTeam, setPublicTeam] = useState(true);
  const [cursorColor, setCursorColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiBusy, setAiBusy] = useState<'bio' | 'quote' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [confirmHide, setConfirmHide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Remember which user id we've already loaded profile data for. The
  // auth state flips `user` to a new object reference every time
  // supabase.auth.updateUser runs (e.g. right after an avatar upload
  // syncs to user_metadata) — without this guard the profile data
  // reload races with the DB write and sometimes overwrites the fresh
  // avatar URL with the stale one read from the DB before replication
  // catches up.
  const loadedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || !user) return;
    if (loadedForUserId.current === user.id) return;
    loadedForUserId.current = user.id;
    async function load() {
      // Prefer the full select with the newer columns; if the migration
      // hasn't been applied yet (hometown / interesting_facts missing),
      // PostgREST returns an error instead of rows — fall back to the
      // stable subset so the editor still loads the rest of the profile.
      const FULL =
        'full_name, credentials, job_title, hometown, cursor_color, bio, favorite_quote, favorite_seven_arrows, interesting_facts, avatar_url, public_team';
      const SAFE =
        'full_name, job_title, cursor_color, bio, favorite_quote, favorite_seven_arrows, avatar_url, public_team';

      let data = await db({
        action: 'select',
        table: 'users',
        match: { id: user!.id },
        select: FULL,
      });

      if (!Array.isArray(data)) {
        // eslint-disable-next-line no-console
        console.warn('[profile] falling back to stable select — migration likely pending', data);
        data = await db({
          action: 'select',
          table: 'users',
          match: { id: user!.id },
          select: SAFE,
        });
      }

      if (Array.isArray(data) && data[0]) {
        const row = data[0];
        setFullName(row.full_name || '');
        setCredentials(row.credentials || '');
        setJobTitle(row.job_title || '');
        setHometown(row.hometown || '');
        setCursorColor(row.cursor_color || null);
        setBio(row.bio || '');
        setFavoriteQuote(row.favorite_quote || '');
        setFavoriteSevenArrows(row.favorite_seven_arrows || '');
        setFacts(coerceFacts(row.interesting_facts));
        setAvatarUrl(row.avatar_url || user!.user_metadata?.avatar_url || null);
        setPublicTeam(row.public_team !== false); // default true
      }
      setLoaded(true);
    }
    load();
  }, [session, user]);

  function addFact(prompt: string) {
    if (facts.some((f) => f.prompt === prompt)) return; // no dupes
    setFacts((prev) => [...prev, { prompt, answer: '' }]);
    setFactsMenuOpen(false);
  }
  function updateFact(index: number, answer: string) {
    setFacts((prev) => prev.map((f, i) => (i === index ? { ...f, answer } : f)));
  }
  function removeFact(index: number) {
    setFacts((prev) => prev.filter((_, i) => i !== index));
  }

  async function pickCursorColor(value: string | null) {
    if (!user) return;
    setCursorColor(value);
    window.dispatchEvent(new CustomEvent('cursor-color-change', { detail: { color: value } }));
    await db({
      action: 'update',
      table: 'users',
      data: { cursor_color: value },
      match: { id: user.id },
    });
  }

  async function uploadAvatar(file: File) {
    if (!session?.access_token || !user) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'public-images');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        showToast(json.error || 'Upload failed');
        return;
      }

      // Persist immediately to all three places that drive the avatar
      // visible in the app, so a refresh — or signing out and back in
      // via Google, which used to overwrite the metadata avatar — can't
      // wipe the new photo:
      //   1. users.avatar_url        (canonical, read by AuthProvider)
      //   2. supabase auth metadata  (legacy callers + session display)
      //   3. local component state   (immediate visual update)
      // Then notify AuthProvider so the sidebar/drawer refresh too.
      const updateRes = await db({
        action: 'update',
        table: 'users',
        data: { avatar_url: json.url },
        match: { id: user.id },
      });
      if (updateRes?.error) {
        showToast(`Saved upload but database update failed: ${updateRes.error}`);
      }
      try {
        await supabase.auth.updateUser({ data: { avatar_url: json.url } });
      } catch (err) {
        // Non-fatal — the canonical store is users.avatar_url.
        console.warn('[profile] failed to sync avatar to auth metadata', err);
      }
      setAvatarUrl(json.url);
      notifyAvatarChanged();
      showToast('Photo updated');
    } catch (err) {
      showToast(`Upload failed: ${String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  async function generateAi(kind: 'bio' | 'quote') {
    if (!session?.access_token || !fullName.trim()) {
      showToast('Add your name first so AI knows who to write for.');
      return;
    }
    setAiBusy(kind);
    try {
      const res = await fetch('/api/claude/profile-bio', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          kind,
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim(),
          existing: kind === 'bio' ? bio : favoriteQuote,
          favoriteSevenArrows: favoriteSevenArrows.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.suggestion) {
        showToast(json.error || 'AI suggestion failed');
      } else {
        if (kind === 'bio') setBio(json.suggestion);
        else setFavoriteQuote(json.suggestion);
        showToast('AI suggestion ready — edit it as you like');
      }
    } catch (err) {
      showToast(`AI error: ${String(err)}`);
    } finally {
      setAiBusy(null);
    }
  }

  function attemptHideToggle(next: boolean) {
    if (next === false) {
      // Turning OFF — show confirmation modal first.
      setConfirmHide(true);
    } else {
      setPublicTeam(true);
    }
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);

    // Drop empty-answer facts before persisting so we don't keep rows
    // the member opened and never filled in.
    const cleanFacts = facts
      .map((f) => ({ prompt: f.prompt, answer: f.answer.trim() }))
      .filter((f) => f.answer.length > 0);

    // Note: `job_title` is intentionally omitted from the save
    // payload. It is assigned by admins from the Team page and must
    // not be clobbered by a profile self-save. The read-only display
    // input still reflects whatever the admin set.
    const basePayload: Record<string, unknown> = {
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
      favorite_quote: favoriteQuote.trim() || null,
      favorite_seven_arrows: favoriteSevenArrows.trim() || null,
      avatar_url: avatarUrl || null,
      public_team: publicTeam,
    };
    const fullPayload = {
      ...basePayload,
      credentials: credentials.trim() || null,
      hometown: hometown.trim() || null,
      interesting_facts: cleanFacts,
    };

    let result = await db({
      action: 'update',
      table: 'users',
      data: fullPayload,
      match: { id: user.id },
    });

    // Migration not applied yet? Retry without the new columns so the
    // rest of the profile still saves. We surface a soft warning so the
    // member isn't surprised when their hometown doesn't appear.
    if (result?.error && /hometown|interesting_facts|credentials/i.test(result.error)) {
      // eslint-disable-next-line no-console
      console.warn('[profile] new columns missing — saving stable subset only', result.error);
      result = await db({
        action: 'update',
        table: 'users',
        data: basePayload,
        match: { id: user.id },
      });
    }

    if (result?.error) {
      showToast(`Failed to save: ${result.error}`);
    } else {
      showToast('Profile updated');
      logActivity({
        userId: user.id,
        type: 'user.profile_updated',
        targetKind: 'user',
        targetId: user.id,
        targetLabel: fullName.trim() || user.email || 'Profile',
        targetPath: '/app/profile',
      });
    }
    setSaving(false);
  }

  if (!user) return null;

  const email = user.email || '';
  const provider = user.app_metadata?.provider || 'email';
  const headerAvatar = avatarUrl || user.user_metadata?.avatar_url;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">My Profile</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Manage your account information. Public-team fields appear on{' '}
          <span className="text-foreground/70">/who-we-are/meet-our-team</span>.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8 max-w-5xl">
        {/* Left: form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Avatar + email header */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="relative">
              {headerAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={headerAvatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                  {(fullName || email || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Upload a new photo"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-foreground text-white flex items-center justify-center shadow-md hover:bg-primary transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                  </svg>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = '';
                }}
              />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{fullName || 'Unknown'}</p>
              <p className="text-sm text-foreground/40">{email}</p>
              <span
                className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-warm-bg text-xs font-medium text-foreground/50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {provider === 'google' && <GoogleIcon className="w-3 h-3" />}
                {provider}
              </span>
            </div>
          </div>

          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Credentials</label>
                  <input
                    value={credentials}
                    onChange={(e) => setCredentials(e.target.value)}
                    maxLength={60}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                    placeholder="LMSW, PhD, MD…"
                    aria-describedby="credentials-hint"
                  />
                  <p
                    id="credentials-hint"
                    className="mt-1.5 text-[11px] text-foreground/45"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Renders after your name across the app, e.g. &ldquo;{fullName || 'Your Name'}{credentials.trim() ? `, ${credentials.trim()}` : ', LMSW'}&rdquo;.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Job Title</label>
                <input
                  value={jobTitle}
                  disabled
                  readOnly
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-warm-bg/50 text-foreground/60 cursor-not-allowed"
                  placeholder="Assigned by your admin"
                  aria-describedby="job-title-hint"
                />
                <p
                  id="job-title-hint"
                  className="mt-1.5 text-[11px] text-foreground/45"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Set by your admin on the Team page. Reach out to them if this needs to change.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    value={email}
                    disabled
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-warm-bg/50 text-foreground/50 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Home Town</label>
                  <input
                    value={hometown}
                    onChange={(e) => setHometown(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                    placeholder="e.g. Bisbee, AZ"
                    maxLength={80}
                  />
                </div>
              </div>

              {/* Bio with Claude assist */}
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider">Bio</label>
                  <button
                    type="button"
                    onClick={() => generateAi('bio')}
                    disabled={aiBusy !== null}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {aiBusy === 'bio' ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SparkleIcon />
                    )}
                    {bio ? 'Refine with AI' : 'Write with AI'}
                  </button>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={600}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-y"
                  placeholder="A 2–3 sentence intro. Who you are, what you do at Seven Arrows, what draws you to this work."
                />
                <p className="text-[11px] text-foreground/40 mt-1">{bio.length}/600 — appears on your public team page.</p>
              </div>

              {/* Favorite Seven Arrows */}
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">
                  Favorite Part About Seven Arrows
                </label>
                <textarea
                  value={favoriteSevenArrows}
                  onChange={(e) => setFavoriteSevenArrows(e.target.value)}
                  rows={3}
                  maxLength={400}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-y"
                  placeholder="A specific moment, place, or person — what makes the ranch feel like home for you?"
                />
                <p className="text-[11px] text-foreground/40 mt-1">{favoriteSevenArrows.length}/400</p>
              </div>

              {/* Interesting facts — pick-a-prompt picker. Members see a
                  list of lightweight prompts, pick the ones that fit, and
                  fill in the blank. Easier than a cold "write something
                  interesting about yourself" box. */}
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider">
                    Interesting Facts
                  </label>
                  <button
                    type="button"
                    onClick={() => setFactsMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80"
                    aria-expanded={factsMenuOpen}
                    aria-haspopup="listbox"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    </svg>
                    {factsMenuOpen ? 'Close' : 'Add a prompt'}
                  </button>
                </div>
                <p className="text-xs text-foreground/40 mb-3">
                  Pick a prompt, finish the sentence. Anything you skip stays hidden.
                </p>

                {factsMenuOpen && (
                  <div className="mb-3 rounded-xl border border-gray-200 bg-warm-bg/40 p-3">
                    <div className="flex flex-wrap gap-2">
                      {FACT_PROMPTS.map((p) => {
                        const already = facts.some((f) => f.prompt === p);
                        return (
                          <button
                            key={p}
                            type="button"
                            disabled={already}
                            onClick={() => addFact(p)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                              already
                                ? 'border-gray-200 bg-white text-foreground/30 cursor-not-allowed'
                                : 'border-gray-200 bg-white text-foreground/70 hover:border-primary hover:text-primary'
                            }`}
                            style={{ fontFamily: 'var(--font-body)' }}
                          >
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {facts.length === 0 && !factsMenuOpen && (
                  <button
                    type="button"
                    onClick={() => setFactsMenuOpen(true)}
                    className="w-full rounded-xl border border-dashed border-gray-300 bg-warm-bg/30 py-4 text-sm text-foreground/50 hover:text-primary hover:border-primary transition-colors"
                  >
                    + Pick a prompt to get started
                  </button>
                )}

                <div className="space-y-3">
                  {facts.map((f, i) => (
                    <div
                      key={`${f.prompt}-${i}`}
                      className="rounded-xl border border-gray-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <p
                          className="text-xs font-semibold text-foreground/70"
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          {f.prompt}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeFact(i)}
                          aria-label="Remove this fact"
                          className="text-foreground/30 hover:text-foreground/70 shrink-0"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                      <input
                        value={f.answer}
                        onChange={(e) => updateFact(i, e.target.value)}
                        maxLength={140}
                        placeholder="Your answer"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary focus:outline-none"
                      />
                      <p className="text-[10px] text-foreground/40 mt-1">{f.answer.length}/140</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Favorite quote with Claude assist */}
              <div>
                <div className="flex items-end justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider">Favorite Quote</label>
                  <button
                    type="button"
                    onClick={() => generateAi('quote')}
                    disabled={aiBusy !== null}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50"
                  >
                    {aiBusy === 'quote' ? (
                      <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SparkleIcon />
                    )}
                    Suggest a quote
                  </button>
                </div>
                <textarea
                  value={favoriteQuote}
                  onChange={(e) => setFavoriteQuote(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-y"
                  placeholder='"The wound is the place where the light enters you." — Rumi'
                />
                <p className="text-[11px] text-foreground/40 mt-1">{favoriteQuote.length}/300</p>
              </div>

              {/* Cursor color */}
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5">Cursor Color</label>
                <p className="text-xs text-foreground/40 mb-2">This is the color your cursor shows up as for everyone else in the portal.</p>
                <div className="flex items-center flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => pickCursorColor(null)}
                    aria-label="Auto color"
                    title="Auto"
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-[9px] font-bold uppercase tracking-wider transition-transform hover:scale-110 ${
                      cursorColor === null ? 'border-foreground text-foreground bg-white' : 'border-gray-200 text-foreground/50 bg-white'
                    }`}
                  >
                    A
                  </button>
                  {CURSOR_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => pickCursorColor(c.value)}
                      aria-label={c.label}
                      title={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        cursorColor === c.value ? 'border-foreground' : 'border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>

              {/* Public team toggle */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {publicTeam ? 'Visible on the team page' : 'Hidden from the team page'}
                    </p>
                    <p className="text-xs text-foreground/50 mt-0.5">
                      {publicTeam
                        ? 'You appear at /who-we-are/meet-our-team.'
                        : "You won't appear on the public site."}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={publicTeam}
                    onClick={() => attemptHideToggle(!publicTeam)}
                    className={`shrink-0 relative w-11 h-6 rounded-full transition-colors ${
                      publicTeam ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: publicTeam ? 'translateX(20px)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Right: live team-card preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-3">
            Team page preview
          </p>
          <TeamCardPreview fullName={fullName} credentials={credentials} jobTitle={jobTitle} avatarUrl={avatarUrl} />
          <p className="text-xs text-foreground/40 mt-3 text-center">
            This is exactly how your tile renders at{' '}
            <span className="text-foreground/60">/who-we-are/meet-our-team</span>.
          </p>
        </div>
      </div>

      {/* Hide-from-website confirmation */}
      {confirmHide && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setConfirmHide(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-7 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground mb-2">It would really help to show you</h3>
            <p className="text-sm text-foreground/60 mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              Families considering Seven Arrows trust real faces over stock photos. Your profile helps potential
              clients feel like they know the team before they ever pick up the phone.
              <br />
              <br />
              Are you sure you want to hide yourself from the team page?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setPublicTeam(false);
                  setConfirmHide(false);
                  showToast('Hidden — remember to Save Changes');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-medium text-foreground/70 hover:bg-warm-bg transition-colors"
              >
                Hide me anyway
              </button>
              <button
                type="button"
                onClick={() => setConfirmHide(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
                autoFocus
              >
                Keep me visible
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
