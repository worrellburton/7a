'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { EPISODES, episodeHref } from '@/lib/episodes';
import PageAnalyticsPanel from '@/components/PageAnalyticsPanel';

// /app/content — blog pipeline list view.
//
// Lists every blog: DB-backed posts (created via the AI pipeline) +
// the seven hand-coded posts that already live under
// /who-we-are/blog/<slug>/ (those are read-only here; the row links
// to the file path so a dev can open the TSX directly).
//
// Browse is open to every signed-in user so non-super admins can see
// the pipeline. Write actions — "New blog", visibility toggle, and the
// per-post editor link into /app/content/[id] — only render for super
// admins, and the matching /api/content/* endpoints still enforce
// requireSuperAdmin server-side.

interface DbBlog {
  id: string;
  slug: string;
  title: string | null;
  status: 'draft' | 'reviewing' | 'images' | 'selecting' | 'built' | 'published';
  prompt: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

const STATUS_LABELS: Record<DbBlog['status'], string> = {
  draft: 'Draft',
  reviewing: 'Reviewing',
  images: 'Generating images',
  selecting: 'Selecting images',
  built: 'Built',
  published: 'Published',
};
const STATUS_TONES: Record<DbBlog['status'], string> = {
  draft: 'bg-foreground/5 text-foreground/60 border-foreground/15',
  reviewing: 'bg-amber-50 text-amber-700 border-amber-200',
  images: 'bg-sky-50 text-sky-700 border-sky-200',
  selecting: 'bg-sky-50 text-sky-700 border-sky-200',
  built: 'bg-violet-50 text-violet-700 border-violet-200',
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ContentLanding() {
  const { user, isSuperAdmin, session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<DbBlog[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [analyticsFor, setAnalyticsFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const [rowsRes, visRes] = await Promise.all([
        fetch('/api/content', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }),
        fetch('/api/content/visibility', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }),
      ]);
      const rowsJson = await rowsRes.json();
      if (!rowsRes.ok) throw new Error(rowsJson.error ?? `HTTP ${rowsRes.status}`);
      setRows(rowsJson.rows ?? []);
      const visJson = await visRes.json().catch(() => ({}));
      if (visRes.ok) {
        const map: Record<string, boolean> = {};
        for (const r of (visJson.rows ?? []) as Array<{ slug: string; hidden: boolean }>) {
          map[r.slug] = r.hidden;
        }
        setVisibility(map);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  // Optimistic toggle: flip local state immediately, then PUT.
  // Revert on failure so the switch doesn't lie to the user.
  const toggleHidden = useCallback(async (slug: string, hidden: boolean) => {
    if (!session?.access_token) return;
    setVisibility((cur) => ({ ...cur, [slug]: hidden }));
    try {
      const res = await fetch('/api/content/visibility', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ slug, hidden }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      setVisibility((cur) => ({ ...cur, [slug]: !hidden }));
      setError(`Couldn't update visibility for "${slug}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [session?.access_token]);

  // Episode number map for AI-pipeline posts. Mirrors
  // getPublishedBlogEpisodes() in src/lib/episodes.ts so the number
  // the admin sees is the same the public site computes.
  const aiEpisodeNumber = useMemo(() => {
    const maxStatic = EPISODES.reduce((m, e) => Math.max(m, e.number), 0);
    const published = rows
      .filter((r) => r.status === 'published' && r.published_at)
      .sort((a, b) => (a.published_at! < b.published_at! ? -1 : 1));
    const map = new Map<string, number>();
    published.forEach((r, idx) => map.set(r.id, maxStatic + idx + 1));
    return map;
  }, [rows]);

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
          <p className="mt-1 text-sm text-foreground/60">Every blog on the site, plus the AI pipeline to draft new ones.</p>
        </div>
        {isSuperAdmin && (
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors"
          >
            <span aria-hidden>+</span>
            New blog
          </button>
        )}
      </header>

      {showCreate && (
        <NewBlogForm
          token={session?.access_token ?? null}
          onCancel={() => setShowCreate(false)}
          onCreated={(id) => router.push(`/app/content/${id}`)}
        />
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.18em] text-foreground/55 font-bold mb-2">AI-pipeline posts</h2>
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-[13px] text-foreground/50">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-foreground/50">
              No AI-pipeline posts yet. Click <strong>New blog</strong> to start one.
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {rows.map((r) => {
                const path = `/who-we-are/blog/${r.slug}`;
                const epNum = aiEpisodeNumber.get(r.id);
                const hidden = !!visibility[r.slug];
                const expanded = analyticsFor === r.id;
                return (
                  <li key={r.id}>
                    <BlogRow
                      title={r.title || '(Untitled)'}
                      subtitle={`${r.slug} · updated ${new Date(r.updated_at).toLocaleDateString()}`}
                      episodeLabel={epNum ? `Episode ${epNum}` : null}
                      // Non-super admins can't enter the editor; for
                      // them, fall back to the public post URL so the
                      // row title is still a useful affordance.
                      href={isSuperAdmin ? `/app/content/${r.id}` : undefined}
                      externalHref={isSuperAdmin ? undefined : (r.status === 'published' ? path : undefined)}
                      statusBadge={(
                        <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_TONES[r.status]}`}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      )}
                      hidden={hidden}
                      canWrite={isSuperAdmin}
                      onToggleHidden={() => void toggleHidden(r.slug, !hidden)}
                      analyticsOpen={expanded}
                      onToggleAnalytics={() => setAnalyticsFor(expanded ? null : r.id)}
                    />
                    {expanded && (
                      <div className="border-t border-black/5 bg-warm-bg/30">
                        <PageAnalyticsPanel
                          path={path}
                          token={session?.access_token ?? null}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-[0.18em] text-foreground/55 font-bold mb-2">Hand-coded posts</h2>
        <p className="text-[11.5px] text-foreground/50 mb-2">These predate the AI pipeline. Body text is edited via the source files; the visibility toggle and analytics work the same as AI posts.</p>
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          <ul className="divide-y divide-black/5">
            {EPISODES.map((ep) => {
              const path = episodeHref(ep.slug);
              const hidden = !!visibility[ep.slug];
              const expanded = analyticsFor === `static:${ep.slug}`;
              return (
                <li key={ep.slug}>
                  <BlogRow
                    title={ep.title}
                    subtitle={`src/app/(site)${path.startsWith('/who-we-are/blog/') ? path : path}/content.tsx`}
                    subtitleMono
                    episodeLabel={`Episode ${ep.number}`}
                    externalHref={path}
                    hidden={hidden}
                    canWrite={isSuperAdmin}
                    onToggleHidden={() => void toggleHidden(ep.slug, !hidden)}
                    analyticsOpen={expanded}
                    onToggleAnalytics={() => setAnalyticsFor(expanded ? null : `static:${ep.slug}`)}
                  />
                  {expanded && (
                    <div className="border-t border-black/5 bg-warm-bg/30">
                      <PageAnalyticsPanel
                        path={path}
                        token={session?.access_token ?? null}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}

function BlogRow({
  title,
  subtitle,
  subtitleMono,
  episodeLabel,
  href,
  externalHref,
  statusBadge,
  hidden,
  canWrite = true,
  onToggleHidden,
  analyticsOpen,
  onToggleAnalytics,
}: {
  title: string;
  subtitle: string;
  subtitleMono?: boolean;
  episodeLabel: string | null;
  href?: string;
  externalHref?: string;
  statusBadge?: React.ReactNode;
  hidden: boolean;
  /** When false, hides the visibility toggle. Read-only callers (non-
   *  super admins) still see the row + analytics; toggling publish
   *  visibility is gated to super admins server-side as well. */
  canWrite?: boolean;
  onToggleHidden: () => void;
  analyticsOpen: boolean;
  onToggleAnalytics: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-warm-bg/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {episodeLabel && (
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-foreground/[0.06] text-foreground/55 border border-black/5">
              {episodeLabel}
            </span>
          )}
          {href ? (
            <Link href={href} className="font-semibold text-foreground truncate text-[14px] hover:underline">{title}</Link>
          ) : (
            <span className="font-semibold text-foreground truncate text-[14px]">{title}</span>
          )}
        </div>
        <p className={`text-[11.5px] text-foreground/55 truncate ${subtitleMono ? 'font-mono' : ''}`}>{subtitle}</p>
      </div>
      {statusBadge}
      <button
        type="button"
        onClick={onToggleAnalytics}
        className={`shrink-0 text-[10.5px] font-semibold border rounded-md px-2 py-1 transition-colors ${analyticsOpen ? 'bg-foreground text-white border-foreground' : 'text-foreground/65 hover:text-foreground border-black/10 hover:bg-warm-bg/60'}`}
        aria-expanded={analyticsOpen}
      >
        Analytics
      </button>
      {externalHref && (
        <a
          href={externalHref}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[10.5px] font-semibold text-foreground/65 hover:text-foreground border border-black/10 rounded-md px-2 py-1"
        >
          View
        </a>
      )}
      {canWrite && <VisibilityToggle hidden={hidden} onChange={onToggleHidden} />}
    </div>
  );
}

function VisibilityToggle({ hidden, onChange }: { hidden: boolean; onChange: () => void }) {
  // ON = visible on public site. OFF = hidden from listings.
  // Color: emerald when visible, foreground/15 when hidden.
  const visible = !hidden;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      onClick={onChange}
      title={visible ? 'Visible on the public site — click to hide' : 'Hidden from public listings — click to show'}
      className={`shrink-0 relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${visible ? 'bg-emerald-500' : 'bg-foreground/20'}`}
    >
      <span className="sr-only">{visible ? 'Visible' : 'Hidden'}</span>
      <span
        className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${visible ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function NewBlogForm({ token, onCancel, onCreated }: { token: string | null; onCancel: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!token) return;
    if (!prompt.trim()) { setErr('Add a paragraph first.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim() || undefined, prompt: prompt.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      onCreated(json.id as string);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-black/10 bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-foreground/55 font-bold mb-2">New blog</p>
      <label className="block mb-3">
        <span className="block text-[11px] font-semibold text-foreground/65 mb-1">Working title (optional)</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Why polyvagal theory matters in early recovery"
          className="w-full rounded-md border border-black/10 px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      <label className="block mb-3">
        <span className="block text-[11px] font-semibold text-foreground/65 mb-1">Prompt — one paragraph describing the blog you want</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          placeholder="A long paragraph explaining the angle, audience, and what the reader should walk away knowing…"
          className="w-full rounded-md border border-black/10 px-2.5 py-2 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </label>
      {err && <p className="mb-2 text-[12px] text-rose-700">{err}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create draft'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md border border-black/10 text-[11.5px] font-semibold text-foreground/65 hover:bg-warm-bg/60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Silence "supabase imported but never used" lint warning — kept in
// scope so future iterations can subscribe to realtime blogs changes
// without re-importing.
void supabase;
