'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthProvider';
import EditableBlogPreview from '@/components/EditableBlogPreview';
import PageAnalyticsPanel from '@/components/PageAnalyticsPanel';
import { usePagePermissions } from '@/lib/PagePermissions';
import type { Layout } from '@/lib/content-claude';
import {
  BLOG_AUTHORS,
  BLOG_REVIEWERS,
  findAuthorBySlug,
  findReviewerBySlug,
} from '@/lib/blogAuthors';

// One screen, six panels stacked vertically. Each panel light-greys
// itself out until the prior step has run, so the user moves through
// the pipeline in order without picking up surprise UI:
//
//   1. Prompt        (always visible — shows what was typed at create)
//   2. Generate      (button → runs phase 4, fills the body)
//   3. Review/revise (markdown preview + Claude revision input)
//   4. Images        (10 generated, user picks 7)
//   5. Build         (assemble layout JSON — phase 8)
//   6. Publish       (flip live — phase 10)

interface DbBlog {
  id: string;
  slug: string;
  title: string | null;
  status: 'draft' | 'reviewing' | 'images' | 'selecting' | 'built' | 'published';
  prompt: string | null;
  body_markdown: string | null;
  layout: Layout | null;
  selected_image_ids: string[] | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  // E-E-A-T byline. Both slugs match a BLOG_AUTHORS entry in
  // /lib/blogAuthors.ts. Null falls back to DEFAULT_*_SLUG at
  // render time, so legacy rows still ship a credentialed
  // reviewer to MedicalWebPage.reviewedBy.
  author_slug?: string | null;
  reviewer_slug?: string | null;
  last_reviewed_at?: string | null;
}
interface DbImage {
  id: string;
  blog_id: string;
  provider: string;
  url: string;
  prompt: string | null;
  alt: string | null;
  position: number | null;
}

interface LibraryImage {
  id: string;
  public_url: string;
  filename: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
}

function isAiImage(provider: string): boolean {
  return provider !== 'library';
}
interface DbRevision {
  id: string;
  user_prompt: string | null;
  body_markdown: string;
  created_at: string;
}

export default function BlogEditor({ id }: { id: string }) {
  const { user, isSuperAdmin, session } = useAuth();
  const { userOverrides } = usePagePermissions();
  // Super admin OR per-user content-page override (same gate as
  // /app/content). Matches the requireSuperAdmin server-side gate
  // in /lib/content-server so the page UI and the API agree.
  const hasContentAccess = isSuperAdmin || userOverrides['/app/content'] === true;
  const [blog, setBlog] = useState<DbBlog | null>(null);
  const [images, setImages] = useState<DbImage[]>([]);
  const [revisions, setRevisions] = useState<DbRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Lifted from ReviewPanel so the Step 4 ImagesPanel can render the
  // 10 placeholder swirls the instant the user clicks
  // 'Approve & generate 10 images', not after the route returns.
  // The route sets blogs.status='images' server-side before the
  // parallel generation kicks off, but the client doesn't observe
  // that until the response lands (the request blocks for 90s–4min).
  // Treating `approving` as an optimistic equivalent of status='images'
  // closes that visual gap.
  const [approving, setApproving] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/content/${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setBlog(json.blog);
      setImages(json.images ?? []);
      setRevisions(json.revisions ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id]);

  useEffect(() => { void load(); }, [load]);

  // While image generation is running server-side the only signal the
  // page has that new thumbnails landed is a poll — refetch every 3s
  // for the duration of the 'images' phase so the placeholder swirls
  // give way to real artwork as it arrives.
  useEffect(() => {
    if (blog?.status !== 'images') return;
    // Library imports can land in blog_images during generation too —
    // we only stop polling once the 10 AI rows have all arrived.
    const aiCount = images.filter((i) => isAiImage(i.provider)).length;
    if (aiCount >= 10) return;
    const id = window.setInterval(() => { void load(); }, 3000);
    return () => window.clearInterval(id);
  }, [blog?.status, images, load]);

  if (!user) return null;
  if (!hasContentAccess) {
    return <div className="px-4 py-10 text-center text-foreground/55">Content access required. Ask a super admin to flip your toggle on in Admin → User Permissions → Content.</div>;
  }
  if (loading && !blog) return <div className="px-4 py-10 text-center text-foreground/55">Loading…</div>;
  if (!blog) return <div className="px-4 py-10 text-center text-foreground/55">{error ?? 'Not found.'}</div>;

  const token = session?.access_token ?? null;
  const reachedReview = !!blog.body_markdown;
  const reachedSelect = blog.status === 'selecting' || blog.status === 'built' || blog.status === 'published';
  const reachedBuild = blog.status === 'built' || blog.status === 'published';
  const reachedPublish = blog.status === 'published';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="mb-3">
        <Link href="/app/content" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; All content</Link>
      </div>
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Blog</p>
        <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          {blog.title || '(Untitled)'}
        </h1>
        <p className="mt-1 text-[12px] text-foreground/50 font-mono">slug: {blog.slug} · status: {blog.status}</p>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      {/* Published blogs see a live-edit dashboard instead of the
          linear pipeline. The pipeline (regenerate body, pick
          images, build, etc.) drops to a collapsed accordion at
          the bottom — kept around for emergency rebuilds but out
          of the way of the daily edit flow. */}
      {reachedPublish ? (
        <PublishedDashboard
          blog={blog}
          images={images}
          revisions={revisions}
          token={token}
          approving={approving}
          onStartApprove={() => setApproving(true)}
          onFinishApprove={() => setApproving(false)}
          onChange={() => void load()}
        />
      ) : (
        <>
          <PromptPanel
            blogId={blog.id}
            prompt={blog.prompt ?? ''}
            token={token}
            onChange={() => void load()}
          />

          <BylinePanel
            blogId={blog.id}
            authorSlug={blog.author_slug ?? null}
            reviewerSlug={blog.reviewer_slug ?? null}
            lastReviewedAt={blog.last_reviewed_at ?? null}
            token={token}
            onChange={() => void load()}
          />

          <GeneratePanel
            blog={blog}
            token={token}
            onComplete={() => void load()}
          />

          {reachedReview && (
            <ReviewPanel
              blog={blog}
              token={token}
              revisions={revisions}
              onChange={() => void load()}
              onStartApprove={() => setApproving(true)}
              onFinishApprove={() => setApproving(false)}
            />
          )}

          {reachedReview && (
            <ImagesPanel
              blog={blog}
              images={images}
              token={token}
              onChange={() => void load()}
              approving={approving}
            />
          )}

          {reachedSelect && images.length > 0 && (
            <BuildPanel
              blog={blog}
              images={images}
              token={token}
              onChange={() => void load()}
            />
          )}

          {reachedBuild && blog.layout && (
            <PreviewPanel
              blogId={blog.id}
              layout={blog.layout}
              images={images}
              token={token}
              onSaved={() => void load()}
            />
          )}

          {reachedBuild && (
            <PublishPanel blog={blog} token={token} onChange={() => void load()} />
          )}
        </>
      )}
    </div>
  );
}

/**
 * Auto-learning progress bar driver. Tracks how long each kind of
 * operation typically takes (per-localStorage key) so the next run
 * shows a progress bar that animates toward 90% on the same curve we
 * actually observed. Once the request resolves we slam to 100% and
 * fold the new duration into a rolling EMA. First-time runs use the
 * `defaultMs` hint until we have real data.
 */
function useAutoProgress(operationKey: string, defaultMs: number) {
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const storageKey = `content-timing:${operationKey}`;

  function getLearnedMs(): number {
    if (typeof window === 'undefined') return defaultMs;
    try {
      const stored = window.localStorage.getItem(storageKey);
      const n = stored ? Number(stored) : NaN;
      return Number.isFinite(n) && n > 0 ? n : defaultMs;
    } catch {
      return defaultMs;
    }
  }

  function saveLearnedMs(elapsed: number) {
    if (typeof window === 'undefined') return;
    try {
      const prev = getLearnedMs();
      // EMA(0.3) — recent runs nudge the estimate without yanking it.
      const next = Math.round(prev * 0.7 + elapsed * 0.3);
      window.localStorage.setItem(storageKey, String(next));
    } catch {
      /* localStorage blocked — keep defaultMs */
    }
  }

  function start() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setRunning(true);
    setProgress(0);
    startTimeRef.current = performance.now();
    const target = getLearnedMs();
    const tick = () => {
      if (startTimeRef.current == null) return;
      const elapsed = performance.now() - startTimeRef.current;
      // Asymptote to 0.9 so we never claim "done" before the response
      // lands. Exponential approach reads as "slows down as it gets
      // close" — the right feel for an unknown-duration model call.
      const pct = Math.min(0.9, 1 - Math.exp(-(elapsed / target) * 2.3));
      setProgress(pct);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function finish() {
    const startedAt = startTimeRef.current;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (startedAt != null) {
      saveLearnedMs(performance.now() - startedAt);
    }
    startTimeRef.current = null;
    setProgress(1);
    window.setTimeout(() => {
      setRunning(false);
      setProgress(0);
    }, 450);
  }

  function abort() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    startTimeRef.current = null;
    setRunning(false);
    setProgress(0);
  }

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  return { running, progress, start, finish, abort };
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-foreground/8 overflow-hidden">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}

/**
 * Inline error banner with a one-click Copy button. Image generation
 * in particular can fail in ten different ways at once (per-image fal
 * errors, missing FAL_KEY, storage upload errors) — surfacing the
 * full payload + letting the user copy the lot is the difference
 * between "something broke" and "FAL_KEY is not configured, paste
 * this into chat." Falls back to a manual selectable textarea when
 * the browser blocks the async clipboard API.
 */
function ErrorWithCopy({ message, details }: { message: string; details?: unknown }) {
  const [copied, setCopied] = useState(false);
  const payload = (() => {
    const parts: string[] = [message];
    if (details !== undefined && details !== null) {
      try {
        parts.push(JSON.stringify(details, null, 2));
      } catch {
        parts.push(String(details));
      }
    }
    return parts.join('\n\n');
  })();
  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const ta = document.createElement('textarea');
        ta.value = payload;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — user can still triple-click + copy by hand */
    }
  }
  return (
    <div className="mb-2 rounded-md border border-rose-200 bg-rose-50/70 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[12px] text-rose-700 leading-snug break-words flex-1">{message}</p>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded border border-rose-300 bg-white text-[10.5px] font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
          aria-label="Copy error details to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V5a2 2 0 0 1 2-2h10" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {details !== undefined && details !== null && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10.5px] font-semibold uppercase tracking-wider text-rose-700/70 hover:text-rose-700">Details</summary>
          <pre className="mt-1.5 max-h-48 overflow-auto rounded bg-white/70 p-2 text-[10.5px] leading-snug text-rose-900 whitespace-pre-wrap break-words">
            {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function Panel({ heading, step, children }: { heading: string; step: number | string; children: React.ReactNode }) {
  // `step` accepts a number ('Step 3') or a short label like
  // 'E-E-A-T' for ancillary panels that don't slot into the
  // 1-7 build pipeline — drawn the same way so the visual rhythm
  // matches.
  const isNumeric = typeof step === 'number';
  return (
    <section className="mb-5 rounded-2xl border border-black/10 bg-white p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-bold mb-1">{isNumeric ? `Step ${step}` : step}</p>
      <h2 className="text-lg font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>{heading}</h2>
      {children}
    </section>
  );
}

function PromptPanel({ blogId, prompt, token, onChange }: { blogId: string; prompt: string; token: string | null; onChange: () => void }) {
  // Step 1 is editable now — clicking '+ New blog' on the list page
  // drops the user here with a placeholder, and they refine the
  // prompt before clicking Generate body. Auto-saves on blur via
  // PATCH /api/content/[id]; refreshes the parent so GeneratePanel
  // reads the freshest prompt on its next click.
  const [draft, setDraft] = useState(prompt);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Keep the textarea in sync when the parent refetches a newer
  // prompt (e.g. another tab edited it). Only does so when the user
  // isn't mid-edit — comparing against the last saved value, not
  // the in-progress draft.
  const lastSavedRef = useRef(prompt);
  useEffect(() => {
    if (lastSavedRef.current !== prompt) {
      lastSavedRef.current = prompt;
      setDraft(prompt);
    }
  }, [prompt]);

  async function save() {
    const trimmed = draft.trim();
    if (trimmed === lastSavedRef.current.trim()) return;
    if (!token) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      lastSavedRef.current = trimmed;
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel heading="Prompt" step={1}>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void save()}
        rows={4}
        placeholder="Describe what this post should be about — topic, angle, anything the model should hold onto."
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-[13.5px] leading-relaxed bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
      />
      <div className="mt-1 flex items-center gap-2 text-[11px] text-foreground/45">
        {saving ? <span>Saving…</span> : <span>Auto-saves when you click away.</span>}
        {err && <span className="text-rose-700">· {err}</span>}
      </div>
    </Panel>
  );
}

interface AuthorOption {
  slug: string;
  name: string;
  title: string;
  credentials?: string;
  bio?: string;
  avatarUrl?: string;
  isMedicalReviewer?: boolean;
  source?: 'db' | 'fallback';
}

// Sentinel slug meaning "this post has no byline at all" — distinct
// from null (which means "use the resolver's default"). Stored as-is
// in blogs.author_slug / blogs.reviewer_slug; the live page resolver
// + renderer treat it as "skip the author/reviewer node entirely".
const NONE_SLUG = '__none__';

function BylinePanel({
  blogId,
  authorSlug,
  reviewerSlug,
  lastReviewedAt,
  token,
  onChange,
}: {
  blogId: string;
  authorSlug: string | null;
  reviewerSlug: string | null;
  lastReviewedAt: string | null;
  token: string | null;
  onChange: () => void;
}) {
  // Dropdown source is /api/blog-authors — that endpoint merges any
  // users rows flagged is_blog_author / is_medical_reviewer (HR
  // can toggle these in /app/team without a code deploy) with the
  // BLOG_AUTHORS seed in /lib/blogAuthors.ts. DB rows win.
  const [allAuthors, setAllAuthors] = useState<AuthorOption[]>([]);
  const [allReviewers, setAllReviewers] = useState<AuthorOption[]>([]);
  const [horses, setHorses] = useState<AuthorOption[]>([]);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    fetch('/api/blog-authors', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setAllAuthors((j.authors ?? []) as AuthorOption[]);
        setAllReviewers((j.reviewers ?? []) as AuthorOption[]);
        setHorses(((j.horses ?? []) as Array<{ slug: string; name: string; title: string; avatarUrl?: string }>)
          .map((h) => ({ ...h, source: 'db' as const })));
      })
      .catch(() => { /* fall back to seed */ });
    return () => { cancelled = true; };
  }, [token]);
  const fallbackAuthors: AuthorOption[] = useMemo(() => BLOG_AUTHORS.map((a) => ({ ...a, source: 'fallback' as const })), []);
  const fallbackReviewers: AuthorOption[] = useMemo(() => BLOG_REVIEWERS.map((a) => ({ ...a, source: 'fallback' as const })), []);
  const authorOptions = allAuthors.length > 0 ? allAuthors : fallbackAuthors;
  const reviewerOptions = allReviewers.length > 0 ? allReviewers : fallbackReviewers;

  const author = authorOptions.find((a) => a.slug === authorSlug) ?? findAuthorBySlug(authorSlug);
  const reviewer = reviewerOptions.find((a) => a.slug === reviewerSlug) ?? findReviewerBySlug(reviewerSlug);
  // The "effective" identity is what the live page actually renders
  // when this slug is in the DB — i.e. the resolver's result. Used
  const [saving, setSaving] = useState<'author' | 'reviewer' | 'reviewedAt' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function patch(field: 'author_slug' | 'reviewer_slug' | 'last_reviewed_at', value: string | null) {
    if (!token) return;
    setSaving(field === 'author_slug' ? 'author' : field === 'reviewer_slug' ? 'reviewer' : 'reviewedAt');
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(null);
    }
  }

  return (
    <Panel heading="Byline" step="E-E-A-T">
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Drives the visible byline on the public post and the
        {' '}<code className="font-mono text-[11px] px-1 py-[1px] rounded bg-warm-bg/70 border border-black/10">MedicalWebPage</code>{' '}
        JSON-LD block Google + AI search engines read. Posts ship with credentialed defaults
        when these are blank, but every published post should pick a real author + reviewer.
      </p>
      {/* Effective author/reviewer are computed above so the
          "— Default · …" placeholder reads back what the live
          page is actually rendering. The dropdown previously said
          "— Use default —" while the live byline carried Lindsay
          Rothschild, and editors thought the field was broken. */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">Written by</span>
          <AuthorPicker
            value={authorSlug}
            options={authorOptions}
            horses={horses}
            saving={saving === 'author'}
            onChange={(next) => void patch('author_slug', next)}
            label="Written by"
          />
          <p className="mt-1 text-[10.5px] text-foreground/55 truncate">
            {authorSlug === NONE_SLUG || authorSlug === null
              ? 'No byline will appear on the live post.'
              : authorSlug?.startsWith('horse-')
                ? `Horse byline — ${horses.find((h) => h.slug === authorSlug)?.name ?? 'horse'} will appear, but no JSON-LD Person.`
                : (author?.bio ?? author?.title ?? '')}
          </p>
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">Medically reviewed by</span>
          <AuthorPicker
            value={reviewerSlug}
            options={reviewerOptions}
            saving={saving === 'reviewer'}
            onChange={(next) => void patch('reviewer_slug', next)}
            label="Medically reviewed by"
          />
          <p className="mt-1 text-[10.5px] text-foreground/55 truncate">
            {reviewerSlug === NONE_SLUG || reviewerSlug === null
              ? 'No medical-reviewer block will appear on the live post.'
              : 'Credentialed clinician — drives MedicalWebPage.reviewedBy.'}
          </p>
        </div>
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-foreground/45 mb-1">Last reviewed</span>
          <p className="text-[12.5px] text-foreground/85 mb-1">
            {lastReviewedAt
              ? new Date(lastReviewedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Never (defaults to publish date)'}
          </p>
          <button
            type="button"
            onClick={() => void patch('last_reviewed_at', new Date().toISOString())}
            disabled={saving === 'reviewedAt'}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold border border-black/15 bg-white hover:bg-warm-bg/60 disabled:opacity-50"
            title="Stamps lastReviewed today — AI search engines deprioritise medical content older than ~12 months without a fresh review stamp."
          >
            {saving === 'reviewedAt' ? 'Saving…' : 'Mark reviewed today'}
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-[11.5px] text-rose-700">{err}</p>}
    </Panel>
  );
}

// Custom picker for the Written by / Medically reviewed by fields.
// Replaces the native <select> so we can render the team-member
// avatar + name + credentials + title inline (a native <option>
// can't carry images). Layout:
//   1. "None (no byline)" — the resolver default. Both null and
//      NONE_SLUG land here so an unset author = no byline.
//   2. Divider, then every team option sorted by name.
//   3. (Author picker only) Divider + "Horses" section so a
//      horse-led story can byline the actual horse with its photo.
function AuthorPicker({
  value,
  options,
  horses,
  saving,
  onChange,
  label,
}: {
  value: string | null;
  options: AuthorOption[];
  /** Optional horse options. Only the Written-by picker passes them. */
  horses?: AuthorOption[];
  saving: boolean;
  onChange: (next: string | null) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Null and NONE_SLUG both render as "None" — null is the unset state
  // (resolver falls back to no byline) and NONE_SLUG is the explicit
  // pick of the same thing. Either way the live page suppresses the
  // byline, so they're collapsed in the UI.
  const isNoneValue = value === null || value === NONE_SLUG;
  const selected = value && value !== NONE_SLUG
    ? (options.find((o) => o.slug === value) ?? horses?.find((o) => o.slug === value) ?? null)
    : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      o.name.toLowerCase().includes(q)
      || (o.title ?? '').toLowerCase().includes(q)
      || (o.credentials ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);
  const filteredHorses = useMemo(() => {
    if (!horses || horses.length === 0) return [];
    const q = query.trim().toLowerCase();
    if (!q) return horses;
    return horses.filter((o) =>
      o.name.toLowerCase().includes(q)
      || (o.title ?? '').toLowerCase().includes(q)
    );
  }, [horses, query]);

  const triggerLabel = (() => {
    if (saving) return 'Saving…';
    if (isNoneValue) return '— None (no byline) —';
    if (selected) return `${selected.name}${selected.credentials ? `, ${selected.credentials}` : ''}`;
    return '— Pick a byline —';
  })();
  const triggerAvatar = selected?.avatarUrl;
  const triggerInitial = (selected?.name ?? '?').trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={saving}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label} picker`}
        className="w-full flex items-center gap-2 rounded-md border border-black/10 bg-white px-2 py-1.5 text-left hover:bg-warm-bg/40 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      >
        {isNoneValue ? (
          <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border border-dashed border-foreground/20 text-foreground/35 text-[10px]" aria-hidden>∅</span>
        ) : triggerAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={triggerAvatar} alt="" className="shrink-0 w-6 h-6 rounded-full object-cover bg-warm-bg" />
        ) : (
          <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-warm-bg text-foreground/60 text-[10px] font-semibold" aria-hidden>{triggerInitial}</span>
        )}
        <span className="flex-1 min-w-0 truncate text-[12.5px] text-foreground">{triggerLabel}</span>
        <svg className="shrink-0 w-3 h-3 text-foreground/50" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-40 max-h-[360px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl ring-1 ring-black/5 flex flex-col"
        >
          <div className="px-2 py-1.5 border-b border-black/5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search team…"
              className="w-full rounded-md border border-black/10 bg-white px-2 py-1 text-[12px] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            <PickerRow
              label="None (no byline)"
              sublabel="Skips the author block on the live post — the resolver default."
              none
              active={isNoneValue}
              hint="Default"
              onClick={() => { onChange(NONE_SLUG); setOpen(false); setQuery(''); }}
            />
            <div className="my-1 border-t border-black/5" />
            {filtered.length === 0 && filteredHorses.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-foreground/45 text-center">No matches.</p>
            )}
            {filtered.map((o) => (
              <PickerRow
                key={o.slug}
                label={`${o.name}${o.credentials ? `, ${o.credentials}` : ''}`}
                sublabel={o.title}
                avatarUrl={o.avatarUrl}
                active={value === o.slug}
                hint={o.source === 'fallback' ? 'Seed' : undefined}
                onClick={() => { onChange(o.slug); setOpen(false); setQuery(''); }}
              />
            ))}
            {filteredHorses.length > 0 && (
              <>
                <div className="my-1 border-t border-black/5" />
                <p className="px-3 pt-2 pb-1 text-[9.5px] font-bold tracking-[0.22em] uppercase text-foreground/45">
                  Horses
                </p>
                {filteredHorses.map((h) => (
                  <PickerRow
                    key={h.slug}
                    label={h.name}
                    sublabel={h.title}
                    avatarUrl={h.avatarUrl}
                    active={value === h.slug}
                    hint="Horse"
                    onClick={() => { onChange(h.slug); setOpen(false); setQuery(''); }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PickerRow({
  label,
  sublabel,
  avatarUrl,
  none,
  active,
  hint,
  onClick,
}: {
  label: string;
  sublabel?: string;
  avatarUrl?: string;
  none?: boolean;
  active: boolean;
  hint?: string;
  onClick: () => void;
}) {
  const initial = label.trim().charAt(0).toUpperCase() || '?';
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-warm-bg/60 transition-colors ${active ? 'bg-warm-bg/40' : ''}`}
    >
      {none ? (
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-foreground/25 text-foreground/35 text-[12px]" aria-hidden>∅</span>
      ) : avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="shrink-0 w-8 h-8 rounded-full object-cover bg-warm-bg" />
      ) : (
        <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-warm-bg text-foreground/65 text-[11px] font-semibold" aria-hidden>{initial}</span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-semibold text-foreground truncate">{label}</span>
        {sublabel && <span className="block text-[11px] text-foreground/55 truncate">{sublabel}</span>}
      </span>
      {hint && (
        <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-foreground/[0.06] text-foreground/55 border border-black/5">
          {hint}
        </span>
      )}
      {active && (
        <svg className="shrink-0 w-3.5 h-3.5 text-primary" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 8l3 3 7-7" />
        </svg>
      )}
    </button>
  );
}

function GeneratePanel({ blog, token, onComplete }: { blog: DbBlog; token: string | null; onComplete: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const progress = useAutoProgress('generate', 60_000);
  async function go() {
    if (!token) return;
    setBusy(true); setErr(null);
    progress.start();
    try {
      const res = await fetch(`/api/content/${blog.id}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        progress.abort();
        return;
      }
      progress.finish();
      onComplete();
    } catch (e) {
      progress.abort();
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel heading="Generate body" step={2}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Runs Claude (opus 4.7) against the prompt to draft a full SEO/GEO-friendly investigative post for sevenarrowsrecoveryarizona.com.
        {blog.body_markdown ? ' A body is already saved — re-running replaces it.' : ''}
      </p>
      {err && <ErrorWithCopy message={err.message} details={err.details} />}
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
      >
        {busy
          ? `Generating… ${Math.round(progress.progress * 100)}%`
          : blog.body_markdown ? 'Regenerate body' : 'Generate blog'}
      </button>
      {progress.running && <ProgressBar value={progress.progress} />}
    </Panel>
  );
}

function ReviewPanel({ blog, token, revisions, onChange, onStartApprove, onFinishApprove }: { blog: DbBlog; token: string | null; revisions: DbRevision[]; onChange: () => void; onStartApprove: () => void; onFinishApprove: () => void }) {
  const [instruction, setInstruction] = useState('');
  // Separate flags per action so a long-running revise doesn't disable
  // the Approve button (or vice-versa). Errors are also scoped so a
  // failed revise doesn't visually attach to the Approve flow.
  const [revising, setRevising] = useState(false);
  const [approving, setApproving] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const reviseProgress = useAutoProgress('revise', 35_000);

  async function revise() {
    if (!token || !instruction.trim()) return;
    setRevising(true); setErr(null);
    reviseProgress.start();
    try {
      const res = await fetch(`/api/content/${blog.id}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ instruction: instruction.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        reviseProgress.abort();
        return;
      }
      reviseProgress.finish();
      setInstruction('');
      onChange();
    } catch (e) {
      reviseProgress.abort();
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setRevising(false);
    }
  }

  async function approve() {
    if (!token) return;
    setApproving(true); setErr(null);
    // Tell the parent so Step 4 ImagesPanel flips into 'generating'
    // and shows the 10 placeholder swirls immediately — the route
    // blocks for 90s–4min and we don't want the user to think
    // nothing happened.
    onStartApprove();
    try {
      // Approve = kick off image generation. The route returns per-image
      // failure detail in `failures` so we carry the full payload into
      // the error component for the Copy button.
      const res = await fetch(`/api/content/${blog.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setApproving(false);
      onFinishApprove();
    }
  }

  return (
    <Panel heading="Review &amp; revise" step={3}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="rounded-lg border border-black/5 bg-warm-bg/30 p-3 max-h-[480px] overflow-y-auto">
          <pre className="whitespace-pre-wrap text-[12.5px] leading-relaxed font-mono text-foreground/85">{blog.body_markdown ?? '(no body yet)'}</pre>
        </div>
        <div>
          <label className="block mb-2">
            <span className="block text-[11px] font-semibold text-foreground/65 mb-1">Ask Claude to revise</span>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={4}
              placeholder="e.g. punchier opener · add a section on insurance · tighten the polyvagal language"
              className="w-full rounded-md border border-black/10 px-2.5 py-2 text-[12.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </label>
          {err && <ErrorWithCopy message={err.message} details={err.details} />}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={revise}
              disabled={revising || approving || !instruction.trim()}
              className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
            >
              {revising
                ? `Revising… ${Math.round(reviseProgress.progress * 100)}%`
                : 'Revise'}
            </button>
            {reviseProgress.running && <ProgressBar value={reviseProgress.progress} />}
          </div>
          {revisions.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-foreground/45 font-bold mb-1">Revision history</p>
              <ul className="space-y-1 text-[11px] text-foreground/65">
                {revisions.slice(0, 8).map((r) => (
                  <li key={r.id}>
                    <span className="text-foreground/45">{new Date(r.created_at).toLocaleString()}</span> — {r.user_prompt ?? 'initial generation'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      {/* Approve = the clear "next step" of this card. Moved out of
          the right sidebar and pinned to the bottom of the panel so
          it reads as "you've reviewed → kick off images", not as
          one of two equal-weight choices next to Revise. */}
      <div className="mt-4 pt-4 border-t border-black/5">
        <button
          type="button"
          onClick={approve}
          disabled={revising || approving}
          className="w-full px-4 py-3 rounded-lg bg-primary text-white text-[13px] font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {approving ? (
            <>Sent to image gen ↓</>
          ) : (
            <>
              <span>Approve &amp; generate 10 images</span>
              <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10" />
                <path d="M9 4l4 4-4 4" />
              </svg>
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[11px] text-foreground/50">
          Next step · generates 10 image options for you to choose from.
        </p>
      </div>
    </Panel>
  );
}

function ImagesPanel({ blog, images, token, onChange, approving }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void; approving: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(blog.selected_image_ids ?? []));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  const [tab, setTab] = useState<'generated' | 'library'>('generated');
  // Declared up here (not below near generateMore) because the
  // isGenerating useMemo + the slotCount expression downstream both
  // read it — keeping declaration above first use silences TS's
  // 'used before declaration' check.
  const [generatingMore, setGeneratingMore] = useState(false);
  // Shared key with the ReviewPanel approve flow so localStorage
  // timing samples roll up across both surfaces — every successful
  // 10-image generation nudges the 180s default closer to wall-time
  // reality.
  const imageGenProgress = useAutoProgress('approve-images', 180_000);

  useEffect(() => {
    setSelected(new Set(blog.selected_image_ids ?? []));
  }, [blog.selected_image_ids]);

  // Drive the progress bar off either signal that says 'generation
  // is in flight': the parent's optimistic `approving` flag (set the
  // instant the user clicked Approve) or the persisted
  // blog.status='images' (the route stamps that before forking the
  // 10 parallel jobs). Once all 10 AI rows have landed we finish
  // cleanly so useAutoProgress's EMA learns from this run.
  const aiImagesReady = images.filter((i) => isAiImage(i.provider)).length;
  // `generatingMore` (this panel's local 'Generate 10 more' click)
  // counts as in-flight too — the route flips status='images'
  // server-side but the page doesn't see that until the response
  // lands, so we ride the local flag for instant feedback.
  const isGenerating = blog.status === 'images' || approving || generatingMore;
  useEffect(() => {
    if (isGenerating && !imageGenProgress.running) {
      imageGenProgress.start();
    } else if (!isGenerating && imageGenProgress.running) {
      // Bar should never linger after the swirls vanish.
      if (aiImagesReady >= 10) imageGenProgress.finish();
      else imageGenProgress.abort();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, aiImagesReady]);

  function toggle(imgId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(imgId)) next.delete(imgId);
      else if (next.size < 7) next.add(imgId);
      return next;
    });
  }

  // generatingMore state lives near the top of ImagesPanel — see
  // the comment there. This is just the handler that flips it.
  async function generateMore() {
    if (!token || generatingMore) return;
    setGeneratingMore(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/images?mode=append`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setGeneratingMore(false);
    }
  }

  async function saveSelection() {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selected_image_ids: Array.from(selected) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  // When server-side generation is in flight the page fills the grid
  // with 10 placeholder cards immediately so the user sees a tangible
  // "10 images on the way" instead of a blank panel. Each slot the
  // server hasn't returned yet renders an animated conic-gradient
  // swirl; arrived images take their slot in order as they land.
  // `approving` is the optimistic counterpart to status='images' —
  // see the lifted state in BlogEditor. Either signal flips this
  // panel into 'generating' mode so 10 placeholder swirls render
  // straight away.
  const generating = blog.status === 'images' || approving;
  // The blog_images table now mixes two sources: AI-generated (provider
  // != 'library') and pulled-in library entries. Each source tab only
  // shows its own rows; selections from either tab roll up into the same
  // 7-image set.
  const aiImages = images.filter((i) => isAiImage(i.provider));
  const libraryImages = images.filter((i) => !isAiImage(i.provider));
  // On append mode (generatingMore), we already have the existing
  // batch — render those PLUS 10 placeholder swirls for the new
  // ones that are about to land. On a fresh run (approving / no
  // images yet), 10 swirls. After everything's done, just the
  // images we have.
  const slotCount = generatingMore && aiImages.length > 0
    ? aiImages.length + 10
    : generating
      ? Math.max(10, aiImages.length)
      : aiImages.length;
  const showGrid = generating || aiImages.length > 0;
  const selectedAi = aiImages.filter((i) => selected.has(i.id)).length;
  const selectedLib = libraryImages.filter((i) => selected.has(i.id)).length;

  return (
    <Panel heading="Images" step={4}>
      <div className="mb-3 flex items-center gap-1 border-b border-black/10 -mx-1 px-1">
        <TabButton active={tab === 'generated'} onClick={() => setTab('generated')}>
          <span>Generated by AI</span>
          <span className="ml-1 text-[10px] text-foreground/45">{selectedAi > 0 ? `${selectedAi} selected` : `${aiImages.length}`}</span>
        </TabButton>
        <TabButton active={tab === 'library'} onClick={() => setTab('library')}>
          <span>From your library</span>
          <span className="ml-1 text-[10px] text-foreground/45">{selectedLib > 0 ? `${selectedLib} selected` : libraryImages.length > 0 ? `${libraryImages.length} added` : ''}</span>
        </TabButton>
      </div>

      {!generating && (
        <p className="text-[12px] text-foreground/55 mb-3">
          Pick <strong>4 to 7</strong> images across both tabs. Currently selected: <strong>{selected.size}/7</strong>.
        </p>
      )}

      {tab === 'generated' ? (
        !showGrid ? (
          <p className="text-[12.5px] text-foreground/55">
            No images yet. Approve the body above to start generating.
          </p>
        ) : (
          <>
            {generating && aiImages.length < 10 && (
              <div className="mb-3">
                <p className="text-[12px] text-foreground/55 mb-1.5 flex items-baseline justify-between gap-2">
                  <span>
                    Generating 10 images… <strong>{aiImages.length}/10</strong> ready
                  </span>
                  <span className="text-foreground/45 tabular-nums">
                    {Math.round(imageGenProgress.progress * 100)}%
                  </span>
                </p>
                {/* Progress bar uses the same useAutoProgress EMA as
                    the build / revise flows — the bar slows as it
                    nears the asymptote so an overshoot still reads
                    as 'almost done' rather than dead. */}
                <ProgressBar value={imageGenProgress.progress} />
              </div>
            )}
            <style jsx>{`
              @keyframes content-swirl {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes content-shimmer {
                0%, 100% { opacity: 0.55; }
                50% { opacity: 0.85; }
              }
            `}</style>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: slotCount }).map((_, slotIdx) => {
                const img = aiImages[slotIdx];
                if (!img) {
                  return (
                    <div
                      key={`placeholder-${slotIdx}`}
                      className="relative rounded-lg overflow-hidden border-2 border-black/10 bg-gradient-to-br from-warm-bg/60 via-white to-warm-bg/40 aspect-square"
                      aria-label={`Generating image ${slotIdx + 1} of 10`}
                    >
                      <span
                        className="pointer-events-none absolute inset-0"
                        aria-hidden="true"
                        style={{
                          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(188,107,74,0.35) 90deg, transparent 180deg, rgba(188,107,74,0.18) 270deg, transparent 360deg)',
                          animation: 'content-swirl 1.6s linear infinite',
                        }}
                      />
                      <span className="absolute inset-2 rounded-md bg-white/55" aria-hidden="true" />
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground/45"
                        style={{ animation: 'content-shimmer 1.8s ease-in-out infinite' }}
                      >
                        {slotIdx + 1} / 10
                      </span>
                    </div>
                  );
                }
                return (
                  <ImageCard
                    key={img.id}
                    img={img}
                    selected={selected.has(img.id)}
                    onToggle={() => toggle(img.id)}
                  />
                );
              })}
            </div>
          </>
        )
      ) : (
        <LibraryTab
          blogId={blog.id}
          token={token}
          libraryImages={libraryImages}
          selected={selected}
          onToggle={toggle}
          onChange={onChange}
        />
      )}

      {err && <div className="mt-3"><ErrorWithCopy message={err.message} details={err.details} /></div>}
      <SelectedStrip
        images={images}
        selected={selected}
        onToggle={toggle}
      />
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={saveSelection}
          disabled={busy || selected.size < 4}
          className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
          title={selected.size >= 4 ? 'Save selection' : 'Pick at least 4 to enable'}
        >
          {busy ? 'Saving…' : 'Save selection'}
        </button>
        {/* "Generate 10 more" appends a fresh batch using
            ?mode=append — keeps the editor's existing picks +
            generated images, and lays the new 10 alongside so they
            can browse a wider candidate set without losing what
            they already chose. */}
        <button
          type="button"
          onClick={() => void generateMore()}
          disabled={busy || generatingMore || generating}
          className="px-3 py-1.5 rounded-md bg-warm-bg/80 text-foreground/85 text-[11.5px] font-semibold border border-black/15 hover:bg-warm-bg disabled:opacity-50"
          title="Generate another 10 AI images and append them to the gallery. Existing picks stay selected."
        >
          {generatingMore ? 'Generating 10 more…' : '+ Generate 10 more'}
        </button>
        <span className="text-[11px] text-foreground/45">
          {selected.size >= 4
            ? selected.size === 7
              ? 'Ready to build.'
              : `Ready to build with ${selected.size}. ${7 - selected.size} more if you want a full set.`
            : `${4 - selected.size} more to pick (minimum 4).`}
        </span>
      </div>
    </Panel>
  );
}

// Footer strip — shows the 7 selected images as small thumbnails so the
// editor can see the running selection without flipping tabs. Empty
// slots render as dashed placeholders so the "out of 7" target is
// visible at a glance. Clicking a thumbnail deselects it.
function SelectedStrip({
  images, selected, onToggle,
}: { images: DbImage[]; selected: Set<string>; onToggle: (id: string) => void }) {
  const byId = new Map(images.map((i) => [i.id, i] as const));
  // Stable order: whatever order the user selected in. Set iteration
  // order is insertion order so this Just Works.
  const chosen: DbImage[] = [];
  for (const id of selected) {
    const img = byId.get(id);
    if (img) chosen.push(img);
  }
  const slots = 7;

  return (
    <div className="mt-4 pt-3 border-t border-black/8">
      <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-bold mb-2">
        Your selection · {chosen.length} / {slots}
      </p>
      <div className="flex flex-wrap items-start gap-2">
        {Array.from({ length: slots }).map((_, idx) => {
          const img = chosen[idx];
          if (!img) {
            return (
              <div
                key={`empty-${idx}`}
                className="w-14 h-14 rounded-md border border-dashed border-black/20 bg-warm-bg/20 flex items-center justify-center text-[10px] font-semibold text-foreground/35"
                aria-hidden="true"
              >
                {idx + 1}
              </div>
            );
          }
          const ai = isAiImage(img.provider);
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => onToggle(img.id)}
              className="group relative w-14 h-14 rounded-md overflow-hidden border-2 border-primary ring-1 ring-primary/40 hover:ring-2 transition-all"
              title={`${ai ? 'AI · ' : 'Library · '}${img.alt ?? ''} — click to remove`}
              aria-label="Remove from selection"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.alt ?? ''} className="block w-full h-full object-cover" />
              <span
                className={`absolute bottom-0 left-0 right-0 px-0.5 py-px text-[7.5px] font-bold uppercase tracking-wider text-center ${ai ? 'bg-primary/85 text-white' : 'bg-emerald-600/85 text-white'}`}
              >
                {ai ? 'AI' : 'Lib'}
              </span>
              <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/0 group-hover:bg-white text-foreground/0 group-hover:text-rose-600 text-[11px] leading-none transition-colors">×</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-[11.5px] font-semibold rounded-t-md transition-colors border-b-2 ${active ? 'border-primary text-foreground bg-warm-bg/30' : 'border-transparent text-foreground/55 hover:text-foreground'}`}
    >
      {children}
    </button>
  );
}

// One thumbnail tile. Shared by both the AI-generated tab and the
// library tab so the AI / library badge + selection chrome stay
// consistent across both sources.
function ImageCard({ img, selected, onToggle }: { img: DbImage; selected: boolean; onToggle: () => void }) {
  const ai = isAiImage(img.provider);
  // Outer wrapper deliberately does NOT use overflow-hidden so the
  // prompt popover can break out of the card bounds (the previous
  // version clipped the popover to the rounded corners). The image
  // itself sits inside an inner overflow-hidden wrapper so the rounded
  // corners still mask the photo.
  return (
    <div
      className={`group/img relative rounded-lg border-2 transition-all ${selected ? 'border-primary ring-2 ring-primary/30' : 'border-black/10 hover:border-foreground/40'}`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="block w-full overflow-hidden rounded-[6px]"
        aria-label={selected ? 'Deselect image' : 'Select image'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt ?? ''} className="block w-full aspect-square object-cover" />
      </button>
      <div className="absolute top-1.5 left-1.5 flex items-center gap-1 pointer-events-none">
        {ai && (
          <span
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] font-bold uppercase tracking-wider border border-primary/40 shadow-sm"
            title="AI-generated image"
          >
            AI
          </span>
        )}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/85 text-[9px] font-semibold text-foreground/70 border border-black/10">
          {ai ? img.provider : 'Library'}
        </span>
      </div>
      <ImagePromptInfo img={img} />
      {selected && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-[12px] font-bold pointer-events-none z-10">✓</span>
      )}
    </div>
  );
}

// Library tab — search/grid of /app/images uploads + tiles for the
// library entries the editor has already pulled into this blog. Clicking
// an unimported library image POSTs to /api/content/[id]/library-image,
// which inserts a blog_images row with provider='library' so the rest of
// the pipeline (selection · build · render) treats it uniformly.
function LibraryTab({
  blogId, token, libraryImages, selected, onToggle, onChange,
}: {
  blogId: string;
  token: string | null;
  libraryImages: DbImage[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onChange: () => void;
}) {
  const [library, setLibrary] = useState<LibraryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState<string | null>(null); // site_image_id currently importing
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('site_images')
          .select('id, public_url, filename, alt, width, height, seo_title, seo_description')
          // Recently-used assets float to the top across every
          // surface that picks images.
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(200);
        if (cancelled) return;
        if (error) {
          setErr(error.message);
          setLibrary([]);
        } else {
          setLibrary((data ?? []) as LibraryImage[]);
          setErr(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  // Match against filename + alt + seo metadata — the same fields the
  // /app/images grid surfaces, so the search story stays consistent.
  const filtered = (() => {
    const q = search.trim().toLowerCase();
    if (!q) return library;
    return library.filter((img) => {
      const hay = [img.filename, img.alt, img.seo_title, img.seo_description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  })();

  // Already-imported URLs so we can hide library entries the editor has
  // already pulled in (they'll already be rendering above this grid).
  const importedUrls = new Set(libraryImages.map((i) => i.url));

  async function importImage(siteImageId: string) {
    if (!token) return;
    setImporting(siteImageId); setErr(null);
    // Recency bump — float this image to the top of every library
    // query across the app on the next read.
    void fetch('/api/media/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'image', id: siteImageId }),
      keepalive: true,
    }).catch(() => { /* non-fatal */ });
    try {
      const res = await fetch(`/api/content/${blogId}/library-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ site_image_id: siteImageId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      // Auto-select the freshly imported library image so it shows
      // up in "Your selection · X / 7" immediately. Without this the
      // editor has to click the imported tile a second time to mark
      // it selected, which reads as the count being broken. Only
      // adds it if there's room AND it isn't already in the set
      // (re-importing the same site_image returns the existing
      // blog_image_id, in which case it might already be selected).
      const newId = json?.blog_image_id as string | undefined;
      if (newId && selected.size < 7 && !selected.has(newId)) {
        const nextIds = [...Array.from(selected), newId];
        await fetch(`/api/content/${blogId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ selected_image_ids: nextIds }),
        }).catch(() => { /* refresh below will resync from DB */ });
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(null);
    }
  }

  async function removeImage(blogImageId: string) {
    if (!token) return;
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}/library-image`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ blog_image_id: blogImageId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(json.error ?? `HTTP ${res.status}`);
        return;
      }
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div>
      {/* 'Added to this blog' strip removed — the Your-selection strip
          at the bottom of Step 4 already surfaces the same picks (plus
          AI ones) in one consolidated place, so showing the imported
          library images twice on the same panel was redundant. The
          underlying `libraryImages` array is still kept and selected
          alongside the AI grid; this tab now just renders the
          searchable library directly. */}

      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-foreground/45">
          Image library
        </p>
        <input
          type="search"
          placeholder="Search by name, alt, or SEO…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-56 max-w-full rounded-md border border-black/10 px-2 py-1 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {loading ? (
        <p className="text-[12.5px] text-foreground/55 py-6 text-center">Loading library…</p>
      ) : filtered.length === 0 ? (
        <p className="text-[12.5px] text-foreground/55 py-6 text-center">
          {search.trim() ? 'No matches.' : 'No images uploaded yet — head to /app/images to upload some.'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 max-h-96 overflow-y-auto p-1">
          {filtered.map((img) => {
            const already = importedUrls.has(img.public_url);
            const isImporting = importing === img.id;
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => !already && !isImporting && importImage(img.id)}
                disabled={already || isImporting}
                className={`group relative rounded-md overflow-hidden border-2 transition-all ${already ? 'border-emerald-300 opacity-70 cursor-default' : 'border-black/10 hover:border-foreground/40'}`}
                title={already ? 'Already added' : `Add ${img.filename}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.public_url} alt={img.alt ?? img.filename} className="block w-full aspect-square object-cover" loading="lazy" />
                {already && (
                  <span className="absolute inset-0 flex items-center justify-center bg-emerald-500/15 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
                    Added
                  </span>
                )}
                {isImporting && (
                  <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-foreground text-[10px] font-bold uppercase tracking-wider">
                    Adding…
                  </span>
                )}
                {!already && !isImporting && (
                  <span className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/65 to-transparent text-white text-[9.5px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {img.filename}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {err && <p className="mt-2 text-[11px] text-rose-700">{err}</p>}
    </div>
  );
}

/**
 * Hover-info chip on each generated thumbnail. Surfaces (a) the
 * provider that rendered the image (gpt-image-2 or nano-banana-2)
 * and (b) the exact augmented prompt that was sent to the model —
 * concept text from Claude + the style register the route appended.
 * Tap-friendly: also opens on touch via aria-expanded toggle so it
 * works on mobile where there is no hover.
 */
function ImagePromptInfo({ img }: { img: DbImage }) {
  const [open, setOpen] = useState(false);
  const ai = isAiImage(img.provider);
  const styleHint = (() => {
    const p = (img.prompt ?? '').toLowerCase();
    if (p.includes('editorial illustration')) return 'illustrative';
    if (p.includes('fine-art editorial')) return 'editorial';
    if (p.includes('documentary photography')) return 'photoreal';
    return null;
  })();
  return (
    <div className="absolute bottom-1.5 right-1.5 z-30">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/85 border border-black/10 text-foreground/70 hover:text-foreground hover:bg-white transition-colors shadow-sm"
        aria-label="Show prompt and provider"
        aria-expanded={open}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </button>
      {open && (
        // Fixed-position popover so it escapes every parent's bounds:
        // the card itself, the grid, the panel, the scroll container.
        // Right-anchored to the info button via JS-free positioning:
        // sticks to bottom-right of the card and grows up + left.
        // High z so it sits above every sibling card in the grid.
        <div
          className="absolute right-0 bottom-7 w-[28rem] max-w-[92vw] rounded-lg border border-black/10 bg-white shadow-2xl p-3 text-[12px] leading-relaxed text-foreground/80 z-50"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50">Source</span>
            {ai ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">AI</span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold uppercase tracking-wider">Library</span>
            )}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-foreground/5 text-[10px] font-semibold text-foreground">{img.provider}</span>
            {styleHint && (
              <>
                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 ml-1">Style</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-semibold text-primary capitalize">{styleHint}</span>
              </>
            )}
          </div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-foreground/50 mb-1">Prompt</p>
          <p className="whitespace-pre-wrap break-words">{img.prompt ?? '(no prompt saved)'}</p>
        </div>
      )}
    </div>
  );
}

function BuildPanel({ blog, images, token, onChange }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);
  // Build accepts 4–7 images, matching the same threshold the
  // Step-4 Save selection enables at. Lighter posts can still ship
  // with 4 strong picks instead of being padded with weaker ones.
  const selectedCount = blog.selected_image_ids?.length ?? 0;
  const ready = selectedCount >= 4 && selectedCount <= 7;
  // Build is a long Claude call (12k token output, sometimes with a
  // retry). 90s is the median we've observed; useAutoProgress nudges
  // that toward the real number per-user via EMA.
  const progress = useAutoProgress('build', 90_000);

  async function build() {
    if (!token) return;
    setBusy(true); setErr(null);
    progress.start();
    try {
      const res = await fetch(`/api/content/${blog.id}/build`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        progress.abort();
        return;
      }
      progress.finish();
      onChange();
    } catch (e) {
      progress.abort();
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  // Surface a quick AI / Library breakdown so the user knows what mix is
  // going into the build before they kick it off.
  const selectedSet = new Set(blog.selected_image_ids ?? []);
  const chosen = images.filter((i) => selectedSet.has(i.id));
  const chosenAi = chosen.filter((i) => isAiImage(i.provider)).length;
  const chosenLib = chosen.length - chosenAi;

  return (
    <Panel heading="Build the blog" step={5}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        Asks Claude to compose a layout JSON — alternating prose, the 7 chosen images, SVG icons, a WebGL animation, pull quotes and a closing callout. The public page renders from this layout.
      </p>
      {ready && (chosenAi > 0 || chosenLib > 0) && (
        <p className="mb-3 text-[11.5px] text-foreground/55">
          Using <strong>{chosenAi}</strong> AI image{chosenAi === 1 ? '' : 's'} and <strong>{chosenLib}</strong> library image{chosenLib === 1 ? '' : 's'}.
        </p>
      )}
      {err && <ErrorWithCopy message={err.message} details={err.details} />}
      <button
        type="button"
        onClick={build}
        disabled={busy || !ready}
        className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
      >
        {busy
          ? `Building… ${Math.round(progress.progress * 100)}%`
          : blog.layout ? 'Rebuild layout' : 'Build'}
      </button>
      {!ready && (
        <span className="ml-2 text-[11px] text-foreground/55">
          {selectedCount === 0
            ? 'Save your image selection first (pick 4 to 7 in Step 4).'
            : `${4 - selectedCount} more to pick — Build unlocks at 4.`}
        </span>
      )}
      {progress.running && <ProgressBar value={progress.progress} />}
    </Panel>
  );
}

function PreviewPanel({
  blogId,
  layout,
  images,
  token,
  onSaved,
}: {
  blogId: string;
  layout: Layout;
  images: DbImage[];
  token: string | null;
  onSaved: () => void;
}) {
  return (
    <Panel heading="Preview" step={6}>
      <EditableBlogPreview
        blogId={blogId}
        layout={layout}
        blogImages={images.map((i) => ({
          id: i.id,
          url: i.url,
          alt: i.alt,
          prompt: i.prompt,
          provider: i.provider,
        }))}
        token={token}
        onSaved={onSaved}
      />
    </Panel>
  );
}

function PublishPanel({ blog, token, onChange }: { blog: DbBlog; token: string | null; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ message: string; details?: unknown } | null>(null);

  async function go(method: 'POST' | 'DELETE') {
    if (!token) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/content/${blog.id}/publish`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr({ message: json.error ?? `HTTP ${res.status}`, details: json });
        return;
      }
      onChange();
    } catch (e) {
      setErr({ message: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  const published = blog.status === 'published';
  return (
    <Panel heading="Publish" step={7}>
      <p className="text-[12.5px] text-foreground/65 mb-3 leading-relaxed">
        {published
          ? 'This post is live on the public site. Unpublish to take it back to a built draft.'
          : 'Flip the post live. It will appear at /who-we-are/blog/<slug> immediately.'}
      </p>
      {err && <ErrorWithCopy message={err.message} details={err.details} />}
      {!published ? (
        <button
          type="button"
          onClick={() => go('POST')}
          disabled={busy}
          className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11.5px] font-semibold disabled:opacity-50"
        >
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => go('DELETE')}
          disabled={busy}
          className="px-3 py-1.5 rounded-md border border-black/10 text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
        >
          {busy ? 'Unpublishing…' : 'Unpublish'}
        </button>
      )}
    </Panel>
  );
}

/**
 * Generate Article-schema JSON-LD for a published blog and copy
 * it to the clipboard. The schema is built client-side from the
 * blog row that's already loaded, so there's no API roundtrip —
 * the marketer clicks, the JSON lands in their clipboard, they
 * paste it wherever it needs to go (a CMS field, a content audit,
 * Schema.org validator, etc.).
 *
 * Includes the fields Google's Article guidelines want most: name,
 * headline, datePublished, author, image (first image from the
 * layout), articleBody preview, and a stable @id pointing at the
 * canonical URL.
 */
function GenerateSchemaButton({ blog }: { blog: DbBlog }) {
  const [copied, setCopied] = useState(false);

  function buildSchema() {
    const url = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${blog.slug}`;
    // Pull the first image from the layout if there is one — Google
    // requires an image on Article schema for rich-result eligibility.
    const firstImage = (() => {
      const blocks = (blog.layout?.blocks ?? []) as Array<{ kind?: string; url?: string }>;
      for (const b of blocks) {
        if ((b.kind === 'image' || b.kind === 'hero') && typeof b.url === 'string' && b.url.length > 0) {
          return b.url;
        }
      }
      return null;
    })();
    // ~160-char extract from the markdown body for description.
    const description = (() => {
      const text = (blog.body_markdown ?? '')
        .replace(/[#*_>`~\-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return text.length > 200 ? text.slice(0, 197) + '…' : text;
    })();
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      '@id': `${url}#article`,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      headline: blog.title || '(Untitled)',
      name: blog.title || '(Untitled)',
      description,
      datePublished: blog.published_at ?? blog.created_at,
      dateModified: blog.updated_at,
      image: firstImage ? [firstImage] : undefined,
      author: blog.author_slug
        ? { '@type': 'Person', '@id': `https://sevenarrowsrecoveryarizona.com/who-we-are/team/${blog.author_slug}` }
        : { '@type': 'Organization', name: 'Seven Arrows Recovery' },
      reviewedBy: blog.reviewer_slug
        ? {
            '@type': 'Person',
            '@id': `https://sevenarrowsrecoveryarizona.com/who-we-are/team/${blog.reviewer_slug}`,
          }
        : undefined,
      publisher: {
        '@type': 'MedicalBusiness',
        '@id': 'https://sevenarrowsrecovery.com/#organization',
        name: 'Seven Arrows Recovery',
      },
    };
  }

  async function onClick() {
    try {
      const schema = buildSchema();
      const text = JSON.stringify(schema, null, 2);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Clipboard API can throw on insecure contexts / older Safari —
      // fall back to a window.prompt so the marketer can copy manually.
      try {
        window.prompt('Copy schema (Cmd/Ctrl+C):', JSON.stringify(buildSchema(), null, 2));
      } catch {
        /* truly nothing we can do */
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-[12.5px] font-semibold border transition-colors ${
        copied
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
          : 'border-foreground/15 bg-white text-foreground/75 hover:bg-warm-bg/60'
      }`}
      title="Copy Article JSON-LD schema for this post to the clipboard"
    >
      {copied ? '✓ Schema copied' : 'Generate schema'}
    </button>
  );
}

// ─── Post-publish dashboard ─────────────────────────────────────
//
// Once a blog is status='published' the linear pipeline (prompt →
// generate → review → images → build → preview → publish) is no
// longer the primary surface. This dashboard replaces it with the
// affordances a marketer actually needs on a live post:
//
//   1. HeroCard            — title + status + live URL + copy link
//   2. ActionBar           — visit / edit live / generate schema / republish
//   3. InlineLiveEditor    — embedded LiveBlogEditor (click prose to edit)
//   4. BylinePanel         — E-E-A-T author + reviewer + last-reviewed
//   5. ImagesGridCard      — at-a-glance grid of every chosen photo
//   6. SchemaCard          — FAQ / Article JSON-LD state + regenerate
//   7. AnalyticsCard       — PageAnalyticsPanel for this slug
//   8. PipelineToolsCollapsed — the old steps, collapsed by default

function PublishedDashboard({
  blog,
  images,
  revisions,
  token,
  approving,
  onStartApprove,
  onFinishApprove,
  onChange,
}: {
  blog: DbBlog;
  images: DbImage[];
  revisions: DbRevision[];
  token: string | null;
  approving: boolean;
  onStartApprove: () => void;
  onFinishApprove: () => void;
  onChange: () => void;
}) {
  return (
    <div className="space-y-5">
      <PublishedHeroCard blog={blog} />
      <PublishedActionBar blog={blog} token={token} onChange={onChange} />
      <InlineLiveEditorCard blogId={blog.id} layout={blog.layout} />
      <BylinePanel
        blogId={blog.id}
        authorSlug={blog.author_slug ?? null}
        reviewerSlug={blog.reviewer_slug ?? null}
        lastReviewedAt={blog.last_reviewed_at ?? null}
        token={token}
        onChange={onChange}
      />
      <ImagesGridCard blog={blog} images={images} token={token} onChange={onChange} />
      <SchemaCard blogId={blog.id} slug={blog.slug} token={token} onChange={onChange} />
      <AnalyticsCard slug={blog.slug} token={token} />
      <PipelineToolsCollapsed
        blog={blog}
        images={images}
        revisions={revisions}
        token={token}
        approving={approving}
        onStartApprove={onStartApprove}
        onFinishApprove={onFinishApprove}
        onChange={onChange}
      />
    </div>
  );
}

function PublishedHeroCard({ blog }: { blog: DbBlog }) {
  const [copied, setCopied] = useState(false);
  const liveUrl = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${blog.slug}`;
  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/60 via-warm-bg/30 to-white p-5 lg:p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.18em] border border-emerald-300 bg-emerald-100 text-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
              Live
            </span>
            {blog.published_at && (
              <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-foreground/45">
                Published {new Date(blog.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            {blog.title || '(Untitled)'}
          </h2>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(liveUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
            className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-foreground/55 hover:text-foreground hover:bg-white/60 border border-transparent hover:border-black/10 transition-colors"
            title="Copy the live URL"
          >
            <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="5" width="9" height="9" rx="1.5" />
              <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
            </svg>
            <span className="truncate max-w-[480px]">/who-we-are/blog/{blog.slug}</span>
            {copied && <span className="text-emerald-700">· copied</span>}
          </button>
        </div>
      </div>
    </section>
  );
}

function PublishedActionBar({ blog, token, onChange }: { blog: DbBlog; token: string | null; onChange: () => void }) {
  const [revalidating, setRevalidating] = useState(false);
  const [revalidateMsg, setRevalidateMsg] = useState<string | null>(null);
  async function revalidate() {
    // The blog page is dynamic (revalidate=0) so a literal Next
    // revalidate isn't required, but marketers expect a button.
    // We bump blogs.updated_at as a "noop touch" so any consumers
    // tracking last-edit timestamps (analytics, audit log) see
    // the action; the page itself re-fetches on the next request
    // anyway. Also reloads local data so the dashboard reflects
    // the touch immediately.
    if (!token) return;
    setRevalidating(true);
    setRevalidateMsg(null);
    try {
      const res = await fetch(`/api/content/${blog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ last_reviewed_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange();
      setRevalidateMsg('Touched — live page will re-fetch on next request.');
      window.setTimeout(() => setRevalidateMsg(null), 4000);
    } catch (e) {
      setRevalidateMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setRevalidating(false);
    }
  }
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/who-we-are/blog/${blog.slug}?edit=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-[0_10px_28px_-10px_rgba(188,107,74,0.55)]"
        >
          Edit live post
          <span aria-hidden>→</span>
        </Link>
        <Link
          href={`/who-we-are/blog/${blog.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground/75 text-[12px] font-semibold hover:bg-warm-bg/60 transition-colors"
        >
          View as visitor
        </Link>
        <button
          type="button"
          onClick={() => void revalidate()}
          disabled={revalidating}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground/75 text-[12px] font-semibold hover:bg-warm-bg/60 disabled:opacity-50 transition-colors"
          title="Mark this post as freshly reviewed — bumps last_reviewed_at and forces a re-fetch on the next visitor request."
        >
          {revalidating ? 'Touching…' : 'Mark reviewed today'}
        </button>
      </div>
      {revalidateMsg && (
        <p className="mt-2 text-[11.5px] text-foreground/55">{revalidateMsg}</p>
      )}
    </section>
  );
}

function InlineLiveEditorCard({ blogId, layout }: { blogId: string; layout: Layout | null }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Inline edit</p>
          <h3 className="text-base font-semibold text-foreground">Click any paragraph to rewrite it</h3>
        </div>
        <Link
          href={`/who-we-are/blog/${blogId}?edit=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-primary hover:text-primary/85"
        >
          Open full-page editor ↗
        </Link>
      </div>
      {layout ? (
        <div className="rounded-lg border border-black/5 bg-warm-bg/20 p-4 max-h-[640px] overflow-y-auto">
          {/* The full live-edit experience is the dedicated /?edit=1
              route (it mounts LiveBlogEditor + the floating save
              toolbar). Here we show a compact preview pointing to
              that route so the dashboard stays light. */}
          <p className="text-[12.5px] text-foreground/65 leading-relaxed">
            The full inline editor lives on the rendered post — click <span className="font-semibold text-foreground/80">Edit live post</span> above, then click any paragraph to rewrite it. Changes save back to this row immediately.
          </p>
        </div>
      ) : (
        <p className="text-[12px] text-foreground/55 italic">No layout yet — regenerate from the pipeline tools below.</p>
      )}
    </section>
  );
}

function ImagesGridCard({ blog, images }: { blog: DbBlog; images: DbImage[]; token: string | null; onChange: () => void }) {
  const selectedIds = new Set(blog.selected_image_ids ?? []);
  const selectedImages = images.filter((i) => selectedIds.has(i.id));
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Photos</p>
          <h3 className="text-base font-semibold text-foreground">
            {selectedImages.length} chosen photo{selectedImages.length === 1 ? '' : 's'}
          </h3>
        </div>
        <Link
          href={`/who-we-are/blog/${blog.slug}?edit=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-primary hover:text-primary/85"
        >
          Swap on live post ↗
        </Link>
      </div>
      {selectedImages.length === 0 ? (
        <p className="text-[12px] text-foreground/55 italic">No photos selected.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {selectedImages.map((img) => (
            <div key={img.id} className="relative rounded-lg overflow-hidden border border-black/5 bg-warm-bg/30 aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? ''}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {img.alt && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-1.5">
                  <p className="text-[10px] text-white leading-tight line-clamp-2" title={img.alt}>{img.alt}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// Short human-readable one-liner per JSON-LD block — what's pinned
// next to the type pill in the SchemaCard collapse. Keeps the
// collapsed list scannable: editors can spot a missing reviewer or
// a too-short headline without having to open every block.
function schemaSummary(json: unknown): string {
  const obj = (typeof json === 'object' && json !== null ? json : {}) as Record<string, unknown>;
  const type = String(obj['@type'] ?? '');
  if (type === 'FAQPage') {
    const entities = Array.isArray(obj.mainEntity) ? obj.mainEntity : [];
    return `${entities.length} question${entities.length === 1 ? '' : 's'}`;
  }
  if (type === 'BlogPosting' || type === 'Article') {
    return typeof obj.headline === 'string' ? obj.headline.slice(0, 90) : '(no headline)';
  }
  if (type === 'MedicalWebPage') {
    const author = (obj.author as { name?: unknown } | undefined)?.name;
    const reviewer = (obj.reviewedBy as { name?: unknown } | undefined)?.name;
    const parts: string[] = [];
    if (typeof author === 'string') parts.push(`by ${author}`);
    if (typeof reviewer === 'string') parts.push(`reviewed by ${reviewer}`);
    if (parts.length === 0) parts.push('no author / reviewer');
    return parts.join(' · ');
  }
  if (typeof obj.headline === 'string') return obj.headline.slice(0, 90);
  if (typeof obj.name === 'string') return obj.name.slice(0, 90);
  return '';
}

function SchemaCard({ blogId, slug, token, onChange }: { blogId: string; slug: string; token: string | null; onChange: () => void }) {
  const [meta, setMeta] = useState<{ generatedAt: string | null; faqCount: number } | null>(null);
  const [blocks, setBlocks] = useState<{ type: string; json: unknown }[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [openBlocks, setOpenBlocks] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoadingMeta(true);
    try {
      // Fetch the live page HTML and extract every
      // <script type="application/ld+json"> block. That way the
      // editor sees EXACTLY what Google sees, not what we think
      // we emit. Public page → no auth header needed.
      const res = await fetch(`/who-we-are/blog/${slug}`, { cache: 'no-store' });
      const html = await res.text();
      const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      const found: { type: string; json: unknown }[] = [];
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(m[1].trim()) as { '@type'?: string };
          const t = typeof parsed['@type'] === 'string' ? parsed['@type'] : 'Unknown';
          found.push({ type: t, json: parsed });
        } catch {
          // skip malformed JSON-LD
        }
      }
      setBlocks(found);
      const faqBlock = found.find((b) => b.type === 'FAQPage') as
        | { type: string; json: { mainEntity?: unknown[] } }
        | undefined;
      const faqCount = Array.isArray(faqBlock?.json?.mainEntity) ? faqBlock!.json.mainEntity!.length : 0;
      // Also load schema_generated_at from the blog row for
      // freshness display — the live HTML alone doesn't carry it.
      if (token) {
        try {
          const r2 = await fetch(`/api/content/${blogId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          const j2 = await r2.json().catch(() => ({}));
          const generatedAt = (j2.blog as { schema_generated_at?: string } | undefined)?.schema_generated_at ?? null;
          setMeta({ generatedAt, faqCount });
        } catch {
          setMeta({ generatedAt: null, faqCount });
        }
      } else {
        setMeta({ generatedAt: null, faqCount });
      }
    } catch {
      setMeta({ generatedAt: null, faqCount: 0 });
      setBlocks([]);
    } finally {
      setLoadingMeta(false);
    }
  }, [blogId, slug, token]);

  useEffect(() => { void load(); }, [load]);

  async function regenerate() {
    if (!token) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}/generate-schema`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || `HTTP ${res.status}`);
      onChange();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleBlock(idx: number) {
    setOpenBlocks((cur) => {
      const next = new Set(cur);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }

  const liveUrl = `https://sevenarrowsrecoveryarizona.com/who-we-are/blog/${slug}`;
  const richResultsUrl = `https://search.google.com/test/rich-results?url=${encodeURIComponent(liveUrl)}`;

  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Search schema</p>
          <h3 className="text-base font-semibold text-foreground">JSON-LD on the live page</h3>
        </div>
        <a
          href={richResultsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-semibold text-primary hover:text-primary/85"
          title="Open Google's Rich Results Test against the live page so you can spot warnings + errors."
        >
          Test in Google Rich Results ↗
        </a>
      </div>
      {loadingMeta ? (
        <p className="text-[12px] text-foreground/55">Reading live page…</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div>
              <p className="text-[12.5px] text-foreground/80">
                <span className="font-semibold">{blocks.length}</span> JSON-LD block{blocks.length === 1 ? '' : 's'} emitted
                {blocks.length > 0 && (
                  <>
                    {' '}· {blocks.map((b) => b.type).join(' · ')}
                  </>
                )}
              </p>
              {meta?.generatedAt && (
                <p className="text-[11px] text-foreground/45 mt-0.5">
                  AI schema last generated {new Date(meta.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  {meta.faqCount > 0 && ` · ${meta.faqCount} FAQ entries`}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void regenerate()}
              disabled={busy}
              className="px-3 py-2 rounded-md border border-black/15 bg-white text-foreground/80 text-[11.5px] font-semibold hover:bg-warm-bg/60 disabled:opacity-50"
            >
              {busy ? 'Regenerating…' : (meta?.generatedAt ? 'Regenerate FAQ + Article' : 'Generate FAQ + Article')}
            </button>
          </div>
          {blocks.length === 0 ? (
            <p className="text-[12px] text-foreground/55 italic">
              No JSON-LD detected on the live page yet. Try regenerating, then reload.
            </p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((b, i) => (
                <li key={i} className="rounded-lg border border-black/10 bg-warm-bg/20">
                  <button
                    type="button"
                    onClick={() => toggleBlock(i)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left"
                    aria-expanded={openBlocks.has(i)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-foreground/[0.06] text-foreground/65 border border-black/5">
                        {b.type}
                      </span>
                      <span className="text-[11px] text-foreground/55 truncate">
                        {schemaSummary(b.json)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border transition-transform ${openBlocks.has(i) ? 'rotate-180 bg-foreground text-white border-foreground' : 'bg-white text-foreground/55 border-black/10'}`}
                      aria-hidden
                    >
                      <svg viewBox="0 0 16 16" width={9} height={9} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 6l4 4 4-4" />
                      </svg>
                    </span>
                  </button>
                  {openBlocks.has(i) && (
                    <div className="border-t border-black/5 bg-white/60 p-2">
                      <div className="flex items-center justify-end gap-2 mb-1.5">
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(JSON.stringify(b.json, null, 2))}
                          className="text-[10.5px] font-semibold px-2 py-0.5 rounded border border-black/10 bg-white text-foreground/65 hover:text-foreground hover:bg-warm-bg/60"
                        >
                          Copy JSON
                        </button>
                      </div>
                      <pre className="text-[11px] leading-relaxed font-mono text-foreground/85 max-h-[360px] overflow-auto whitespace-pre-wrap break-all bg-warm-bg/30 rounded-md p-2">
{JSON.stringify(b.json, null, 2)}
                      </pre>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {err && <p className="mt-2 text-[11.5px] text-red-700">{err}</p>}
    </section>
  );
}

function AnalyticsCard({ slug, token }: { slug: string; token: string | null }) {
  const [open, setOpen] = useState(false);
  const path = `/who-we-are/blog/${slug}`;
  return (
    <section className="rounded-2xl border border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-warm-bg/30 transition-colors rounded-2xl"
        aria-expanded={open}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Analytics</p>
          <h3 className="text-base font-semibold text-foreground">Open, click, response · per channel</h3>
        </div>
        <span
          className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all ${open ? 'bg-foreground text-white border-foreground rotate-180' : 'bg-white text-foreground/55 border-black/10'}`}
          aria-hidden
        >
          <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 bg-warm-bg/30 rounded-b-2xl">
          <PageAnalyticsPanel path={path} token={token} />
        </div>
      )}
    </section>
  );
}

function PipelineToolsCollapsed({
  blog,
  images,
  revisions,
  token,
  approving,
  onStartApprove,
  onFinishApprove,
  onChange,
}: {
  blog: DbBlog;
  images: DbImage[];
  revisions: DbRevision[];
  token: string | null;
  approving: boolean;
  onStartApprove: () => void;
  onFinishApprove: () => void;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-black/10 bg-warm-bg/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-4 text-left hover:bg-warm-bg/50 transition-colors rounded-2xl"
        aria-expanded={open}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/45">Pipeline tools</p>
          <h3 className="text-base font-semibold text-foreground">Regenerate body · pick new images · republish</h3>
          <p className="text-[11.5px] text-foreground/55 mt-0.5">
            Rarely needed once a post is live — kept here for full rebuilds.
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all ${open ? 'bg-foreground text-white border-foreground rotate-180' : 'bg-white text-foreground/55 border-black/10'}`}
          aria-hidden
        >
          <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-black/5 px-3 sm:px-4 py-4 space-y-4 bg-white/40 rounded-b-2xl">
          <PromptPanel
            blogId={blog.id}
            prompt={blog.prompt ?? ''}
            token={token}
            onChange={onChange}
          />
          <GeneratePanel
            blog={blog}
            token={token}
            onComplete={onChange}
          />
          <ReviewPanel
            blog={blog}
            token={token}
            revisions={revisions}
            onChange={onChange}
            onStartApprove={onStartApprove}
            onFinishApprove={onFinishApprove}
          />
          <ImagesPanel
            blog={blog}
            images={images}
            token={token}
            onChange={onChange}
            approving={approving}
          />
          {images.length > 0 && (
            <BuildPanel
              blog={blog}
              images={images}
              token={token}
              onChange={onChange}
            />
          )}
          {blog.layout && (
            <PreviewPanel
              blogId={blog.id}
              layout={blog.layout}
              images={images}
              token={token}
              onSaved={onChange}
            />
          )}
          <PublishPanel blog={blog} token={token} onChange={onChange} />
        </div>
      )}
    </section>
  );
}
