'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { EPISODES, episodeHref } from '@/lib/episodes';
import PageAnalyticsPanel from '@/components/PageAnalyticsPanel';
import { usePagePermissions } from '@/lib/PagePermissions';

// /app/content — super-admin-only blog pipeline.
//
// Lists every blog: DB-backed posts (created via the AI pipeline) +
// the seven hand-coded posts that already live under
// /who-we-are/blog/<slug>/ (those are read-only here; the row links
// to the file path so a dev can open the TSX directly).
//
// "New blog" opens an inline form that asks for a one-paragraph
// prompt + optional title; submit creates a draft row and routes to
// /app/content/<id> where the user generates → reviews → picks
// images → builds → publishes.

interface DbBlog {
  id: string;
  slug: string;
  title: string | null;
  status: 'draft' | 'reviewing' | 'images' | 'selecting' | 'built' | 'published';
  prompt: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  created_by: string | null;
  // Joined by /api/content from public.users for the row authorship
  // strip. Both stay null when the user has been deleted (FK is
  // ON DELETE SET NULL since the 20260520_user_delete_fk_set_null
  // migration).
  creator_name?: string | null;
  creator_avatar_url?: string | null;
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
  const { userOverrides } = usePagePermissions();
  // A teammate has full content-pipeline access when they're a
  // super admin OR when /app/admin/user-permissions → Content tab
  // has flipped the toggle on for them (writes a per-user
  // user_page_permissions row, which the requireSuperAdmin gate
  // in /lib/content-server also honours so create/edit/publish
  // API calls go through). Mirrors the same logic on /app/content/[id].
  const hasContentAccess = isSuperAdmin || userOverrides['/app/content'] === true;
  const router = useRouter();
  const [rows, setRows] = useState<DbBlog[]>([]);
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Used to disable the "+ New blog" button while the create-and-route
  // POST is in flight so a second click doesn't spawn a second draft.
  const [creating, setCreating] = useState(false);
  const [analyticsFor, setAnalyticsFor] = useState<string | null>(null);
  // List (default) vs. board/grouped view. Persisted in localStorage
  // so a marketer's preferred layout sticks across visits. Hydrated
  // in an effect (not useState initializer) to avoid an SSR/client
  // mismatch on the persisted value.
  const [view, setView] = useState<'list' | 'board'>('list');
  // Top-level tab strip: 'roadmap' (editorial calendar of blog
  // concepts) sits above 'pipeline' (the existing list + board
  // surface). Persisted to localStorage so the marketer's last
  // choice survives a refresh — same pattern as the view toggle.
  const [tab, setTab] = useState<'roadmap' | 'pipeline'>('roadmap');
  useEffect(() => {
    try {
      const t = localStorage.getItem('sa-content:tab');
      if (t === 'roadmap' || t === 'pipeline') setTab(t);
    } catch { /* ignore */ }
  }, []);
  const chooseTab = useCallback((t: 'roadmap' | 'pipeline') => {
    setTab(t);
    try { localStorage.setItem('sa-content:tab', t); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      const v = localStorage.getItem('sa-content:view');
      if (v === 'board' || v === 'list') setView(v);
    } catch { /* localStorage unavailable — keep default */ }
  }, []);
  const chooseView = useCallback((v: 'list' | 'board') => {
    setView(v);
    try { localStorage.setItem('sa-content:view', v); } catch { /* ignore */ }
  }, []);

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
  // the admin sees is the same the public site computes. Recomputes
  // on every `rows` change, so when an AI post is deleted the
  // remaining published rows shift down into the next episode number
  // automatically — no DB column to renumber.
  const aiEpisodeNumber = useMemo(() => {
    const maxStatic = EPISODES.reduce((m, e) => Math.max(m, e.number), 0);
    const published = rows
      .filter((r) => r.status === 'published' && r.published_at)
      .sort((a, b) => (a.published_at! < b.published_at! ? -1 : 1));
    const map = new Map<string, number>();
    published.forEach((r, idx) => map.set(r.id, maxStatic + idx + 1));
    return map;
  }, [rows]);

  // Create a fresh draft and route straight to its detail page —
  // no inline form, no prompt question on this list page. The
  // prompt is now editable in Step 1 of the detail page so the
  // marketer can think + edit + regenerate without round-tripping
  // back here. POST accepts an empty body now (DEFAULT_PROMPT
  // placeholder lands on the row) so the response always carries
  // an id we can route into.
  const createBlog = useCallback(async () => {
    if (!session?.access_token || creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      const id = (json as { id?: string }).id;
      if (!id) throw new Error('Create succeeded but no id returned.');
      router.push(`/app/content/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCreating(false);
    }
  }, [session?.access_token, creating, router]);

  // Delete an AI-pipeline post. Confirms first (the route also
  // cascades blog_revisions + blog_images), drops the row from local
  // state on success so the list reshuffles instantly, and the
  // episode-number memo above re-runs to renumber the remaining
  // published posts. Hand-coded posts have no Delete affordance —
  // they're .tsx files, not DB rows.
  // Per-row in-flight tracker for "Generate schema". Stays scoped to
  // the row so a second row can fire while the first is still running.
  const [schemaBusy, setSchemaBusy] = useState<Set<string>>(new Set());

  const generateSchema = useCallback(async (id: string, title: string) => {
    if (!session?.access_token) return;
    setSchemaBusy((cur) => new Set(cur).add(id));
    setError(null);
    try {
      const res = await fetch(`/api/content/${id}/generate-schema`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? `HTTP ${res.status}`);
      const faqs = ((json as { schema?: { faq?: unknown[] } }).schema?.faq ?? []).length;
      setError(null);
      alert(`Schema generated for "${title}" — ${faqs} FAQ${faqs === 1 ? '' : 's'} + Article block live on next page revalidation.`);
    } catch (e) {
      setError(`Couldn't generate schema for "${title}": ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSchemaBusy((cur) => {
        const next = new Set(cur);
        next.delete(id);
        return next;
      });
    }
  }, [session?.access_token]);

  const deleteBlog = useCallback(async (id: string, title: string) => {
    if (!session?.access_token) return;
    if (!confirm(`Delete "${title}"? This also removes its revisions and generated images. Cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/content/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setRows((cur) => cur.filter((r) => r.id !== id));
      if (analyticsFor === id) setAnalyticsFor(null);
      setError(null);
    } catch (e) {
      setError(`Couldn't delete blog: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [session?.access_token, analyticsFor]);

  if (!user) return null;
  if (!hasContentAccess) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Content access required.</p>
          <p>Ask a super admin to flip your toggle on in <strong>Admin → User Permissions → Content</strong>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-foreground/50 mb-1">Marketing &amp; Admissions</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
          <p className="mt-1 text-sm text-foreground/60">Every blog on the site, plus the AI pipeline to draft new ones.</p>
        </div>
        {tab === 'pipeline' && (
        <div className="flex items-center gap-2">
          {/* List / board view toggle. List is the default; board
              groups items into Draft / In progress / Published columns. */}
          <div className="inline-flex items-center rounded-lg border border-black/15 bg-white p-0.5" role="group" aria-label="View">
            <button
              type="button"
              onClick={() => chooseView('list')}
              aria-pressed={view === 'list'}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${view === 'list' ? 'bg-foreground text-white' : 'text-foreground/55 hover:text-foreground/80'}`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => chooseView('board')}
              aria-pressed={view === 'board'}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors ${view === 'board' ? 'bg-foreground text-white' : 'text-foreground/55 hover:text-foreground/80'}`}
            >
              Board
            </button>
          </div>
          <Link
            href="/app/content/analytics"
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-black/15 bg-white text-foreground/75 text-xs font-semibold uppercase tracking-wider hover:bg-warm-bg/60 transition-colors"
            title="Cross-blog performance overview: top performers, channels, countries, devices."
          >
            <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13V7" />
              <path d="M8 13V3" />
              <path d="M13 13V9" />
              <path d="M1.5 13.5h13" />
            </svg>
            Analytics
          </Link>
          <button
            type="button"
            onClick={() => void createBlog()}
            disabled={creating || !session?.access_token}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors disabled:opacity-50"
          >
            <span aria-hidden>+</span>
            {creating ? 'Creating…' : 'New blog'}
          </button>
        </div>
        )}
      </header>

      {/* Top-level tabs · Roadmap is the editorial calendar of
          concepts the team wants to write; Pipeline is the existing
          list/board surface of in-flight blogs. */}
      <div className="border-b border-gray-100 mb-5 flex gap-1" style={{ fontFamily: 'var(--font-body)' }}>
        {([
          { id: 'roadmap' as const, label: 'Roadmap' },
          { id: 'pipeline' as const, label: 'Pipeline' },
        ]).map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => chooseTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-foreground/55 hover:text-foreground/80'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

      {tab === 'roadmap' && <RoadmapTab />}

      {tab === 'pipeline' && view === 'board' && (
        <ContentBoard rows={rows} aiEpisodeNumber={aiEpisodeNumber} loading={loading} />
      )}

      {tab === 'pipeline' && view === 'list' && (<>
      {/* In development = every AI-pipeline row whose status is not
          yet 'published'. Hand-coded posts are live-by-definition,
          so they never land here. */}
      {(() => {
        const draftRows = rows.filter((r) => r.status !== 'published');
        return (
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-[0.18em] text-foreground/55 font-bold mb-2">
              In development
              {!loading && draftRows.length > 0 && (
                <span className="ml-2 text-foreground/35">· {draftRows.length}</span>
              )}
            </h2>
            <p className="text-[11.5px] text-foreground/50 mb-2">
              Drafts on the AI pipeline — prompt → generate → review → images → build → publish. Hidden from the public site until you hit publish.
            </p>
            <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              {loading ? (
                <div className="px-4 py-6 text-[13px] text-foreground/50">Loading…</div>
              ) : draftRows.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-foreground/50">
                  Nothing in development. Click <strong>New blog</strong> to start one.
                </div>
              ) : (
                <ul className="divide-y divide-black/5">
                  {draftRows.map((r) => {
                    const path = `/who-we-are/blog/${r.slug}`;
                    const hidden = !!visibility[r.slug];
                    const expanded = analyticsFor === r.id;
                    return (
                      <li key={r.id}>
                        <BlogRow
                          title={r.title || '(Untitled)'}
                          subtitle={`${r.slug} · updated ${new Date(r.updated_at).toLocaleDateString()}`}
                          episodeLabel={null}
                          href={`/app/content/${r.id}`}
                          externalHref={undefined}
                          statusBadge={(
                            <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_TONES[r.status]}`}>
                              {STATUS_LABELS[r.status]}
                            </span>
                          )}
                          hidden={hidden}
                          onToggleHidden={() => void toggleHidden(r.slug, !hidden)}
                          toggleDisabled
                          analyticsOpen={expanded}
                          onToggleAnalytics={() => setAnalyticsFor(expanded ? null : r.id)}
                          onDelete={() => void deleteBlog(r.id, r.title || '(Untitled)')}
                          onGenerateSchema={() => void generateSchema(r.id, r.title || '(Untitled)')}
                          generatingSchema={schemaBusy.has(r.id)}
                          creatorName={r.creator_name ?? null}
                          creatorAvatarUrl={r.creator_avatar_url ?? null}
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
        );
      })()}

      {/* Published = AI-pipeline rows with status='published' AND
          every hand-coded episode (always live). Sorted newest-first
          by published_at / episode.publishedAt so the section reads
          as a single chronological feed regardless of origin. */}
      {(() => {
        type PublishedItem =
          | { kind: 'ai'; row: DbBlog; epNum: number | undefined; sortKey: number }
          | { kind: 'static'; ep: typeof EPISODES[number]; sortKey: number };
        const aiPublished = rows
          .filter((r) => r.status === 'published')
          .map<PublishedItem>((r) => ({
            kind: 'ai',
            row: r,
            epNum: aiEpisodeNumber.get(r.id),
            sortKey: r.published_at ? new Date(r.published_at).getTime() : new Date(r.updated_at).getTime(),
          }));
        const staticPublished = EPISODES.map<PublishedItem>((ep) => ({
          kind: 'static',
          ep,
          sortKey: new Date(ep.publishedAt).getTime(),
        }));
        const items: PublishedItem[] = [...aiPublished, ...staticPublished].sort((a, b) => b.sortKey - a.sortKey);
        return (
          <section>
            <h2 className="text-xs uppercase tracking-[0.18em] text-foreground/55 font-bold mb-2">
              Published
              {!loading && items.length > 0 && (
                <span className="ml-2 text-foreground/35">· {items.length}</span>
              )}
            </h2>
            <p className="text-[11.5px] text-foreground/50 mb-2">
              Live on the site. Hand-coded posts (the earlier .tsx-backed ones) and AI-pipeline posts share one feed here, sorted newest first.
            </p>
            <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
              <ul className="divide-y divide-black/5">
                {items.map((item) => {
                  if (item.kind === 'ai') {
                    const r = item.row;
                    const epNum = item.epNum;
                    const path = `/who-we-are/blog/${r.slug}`;
                    const hidden = !!visibility[r.slug];
                    const expanded = analyticsFor === r.id;
                    return (
                      <li key={r.id}>
                        <BlogRow
                          title={r.title || '(Untitled)'}
                          subtitle={`${r.slug} · updated ${new Date(r.updated_at).toLocaleDateString()}`}
                          episodeLabel={epNum ? `Episode ${epNum}` : null}
                          href={`/app/content/${r.id}`}
                          externalHref={`/who-we-are/blog/${r.slug}`}
                          statusBadge={(
                            <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_TONES[r.status]}`}>
                              {STATUS_LABELS[r.status]}
                            </span>
                          )}
                          hidden={hidden}
                          onToggleHidden={() => void toggleHidden(r.slug, !hidden)}
                          toggleDisabled={false}
                          analyticsOpen={expanded}
                          onToggleAnalytics={() => setAnalyticsFor(expanded ? null : r.id)}
                          onDelete={() => void deleteBlog(r.id, r.title || '(Untitled)')}
                          onGenerateSchema={() => void generateSchema(r.id, r.title || '(Untitled)')}
                          generatingSchema={schemaBusy.has(r.id)}
                          creatorName={r.creator_name ?? null}
                          creatorAvatarUrl={r.creator_avatar_url ?? null}
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
                  }
                  const ep = item.ep;
                  const path = episodeHref(ep.slug);
                  const hidden = !!visibility[ep.slug];
                  const expanded = analyticsFor === `static:${ep.slug}`;
                  return (
                    <li key={`static-${ep.slug}`}>
                      <BlogRow
                        title={ep.title}
                        subtitle={`src/app/(site)${path.startsWith('/who-we-are/blog/') ? path : path}/content.tsx`}
                        subtitleMono
                        episodeLabel={`Episode ${ep.number}`}
                        href={`/app/content/static/${ep.slug}`}
                        externalHref={path}
                        hidden={hidden}
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
        );
      })()}
      </>)}
    </div>
  );
}

// Board / grouped view. Three columns mapped from the blog pipeline's
// real status set (there is no "scheduled" status for blogs):
//   • Draft        — status 'draft' (and any unknown/missing status)
//   • In progress  — 'reviewing' | 'images' | 'selecting' | 'built'
//   • Published    — status 'published' AI rows + every static episode
// Column accents honor the requested palette: sage published, copper
// in-progress, muted gray draft. Read-only board (cards link to the
// editor); all the row actions stay in the list view.
const BOARD_COLUMNS = [
  { key: 'draft', label: 'Draft', accent: '#8a8a86', tint: 'rgba(138,138,134,0.10)' },
  { key: 'progress', label: 'In progress', accent: '#b87333', tint: 'rgba(184,115,51,0.10)' },
  { key: 'published', label: 'Published', accent: '#7a8b6f', tint: 'rgba(122,139,111,0.12)' },
] as const;
type BoardColKey = (typeof BOARD_COLUMNS)[number]['key'];

function columnForStatus(status: string | null | undefined): BoardColKey {
  if (status === 'published') return 'published';
  if (status === 'reviewing' || status === 'images' || status === 'selecting' || status === 'built') return 'progress';
  return 'draft'; // 'draft' + anything unknown/missing
}

interface BoardCard {
  key: string;
  title: string;
  href: string;
  dateLabel: string;
  chipLabel: string;
  episodeLabel: string | null;
}

function ContentBoard({
  rows,
  aiEpisodeNumber,
  loading,
}: {
  rows: DbBlog[];
  aiEpisodeNumber: Map<string, number>;
  loading: boolean;
}) {
  const columns = useMemo(() => {
    const buckets: Record<BoardColKey, BoardCard[]> = { draft: [], progress: [], published: [] };
    // AI-pipeline rows.
    for (const r of rows) {
      const col = columnForStatus(r.status);
      const epNum = aiEpisodeNumber.get(r.id);
      const dateLabel = r.status === 'published' && r.published_at
        ? `Published ${new Date(r.published_at).toLocaleDateString()}`
        : `Updated ${new Date(r.updated_at).toLocaleDateString()}`;
      buckets[col].push({
        key: r.id,
        title: r.title || '(Untitled)',
        href: `/app/content/${r.id}`,
        dateLabel,
        chipLabel: STATUS_LABELS[r.status] ?? 'Draft',
        episodeLabel: epNum ? `Episode ${epNum}` : null,
      });
    }
    // Static hand-coded episodes are always published.
    for (const ep of EPISODES) {
      buckets.published.push({
        key: `static-${ep.slug}`,
        title: ep.title,
        href: `/app/content/static/${ep.slug}`,
        dateLabel: `Published ${new Date(ep.publishedAt).toLocaleDateString()}`,
        chipLabel: 'Published',
        episodeLabel: `Episode ${ep.number}`,
      });
    }
    // Newest-ish first within each column (published already carry a
    // date; in-dev sort by recency of update isn't available on the
    // card, so we keep insertion order which is the API's newest-first).
    return buckets;
  }, [rows, aiEpisodeNumber]);

  if (loading) {
    return <p className="text-[13px] text-foreground/50 italic py-8">Loading…</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {BOARD_COLUMNS.map((col) => {
        const cards = columns[col.key];
        return (
          <section key={col.key} className="rounded-2xl border border-black/10 bg-warm-bg/30 overflow-hidden flex flex-col">
            <header
              className="px-3 py-2.5 flex items-center justify-between border-b"
              style={{ borderColor: col.accent + '33', background: col.tint }}
            >
              <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: col.accent }}>
                <span className="w-2 h-2 rounded-full" style={{ background: col.accent }} aria-hidden />
                {col.label}
              </span>
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: col.accent }}>{cards.length}</span>
            </header>
            <div className="p-2 space-y-2 min-h-[80px]">
              {cards.length === 0 ? (
                <p className="text-[11.5px] text-foreground/40 italic text-center py-6">Nothing here.</p>
              ) : (
                cards.map((c) => (
                  <Link
                    key={c.key}
                    href={c.href}
                    className="block rounded-xl border border-black/10 bg-white px-3 py-2.5 hover:border-black/25 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-2 min-w-0">{c.title}</p>
                      <span
                        className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider"
                        style={{ color: col.accent, background: col.tint, border: `1px solid ${col.accent}33` }}
                      >
                        {c.chipLabel}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[10.5px] text-foreground/50">
                      {c.episodeLabel && <span className="font-semibold text-foreground/45">{c.episodeLabel}</span>}
                      <span>{c.dateLabel}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        );
      })}
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
  onToggleHidden,
  toggleDisabled = false,
  analyticsOpen,
  onToggleAnalytics,
  onDelete,
  onGenerateSchema,
  generatingSchema = false,
  creatorName,
  creatorAvatarUrl,
}: {
  title: string;
  subtitle: string;
  subtitleMono?: boolean;
  episodeLabel: string | null;
  href?: string;
  externalHref?: string;
  statusBadge?: React.ReactNode;
  hidden: boolean;
  onToggleHidden: () => void;
  /** When true, the visibility toggle renders in a muted disabled
   *  state and is non-interactive. Used for blogs whose status
   *  isn't 'published' yet — hiding/showing has no meaning until
   *  the post actually has a live URL to hide. */
  toggleDisabled?: boolean;
  analyticsOpen: boolean;
  onToggleAnalytics: () => void;
  // Only AI-pipeline rows get a Delete affordance; hand-coded posts
  // are .tsx files and live outside the DB, so onDelete is undefined
  // for those rows and the button doesn't render.
  onDelete?: () => void;
  // AI-pipeline rows expose a "Generate schema" action — Claude reads
  // the post body and writes FAQPage + Article JSON-LD into
  // blogs.schema_json so the live page emits richer structured data.
  // Hand-coded rows skip this; they ship their own static JSON-LD.
  onGenerateSchema?: () => void;
  generatingSchema?: boolean;
  // Author byline. Hand-coded rows don't carry these so the avatar
  // tile is skipped — the row stays in the same shape as before.
  creatorName?: string | null;
  creatorAvatarUrl?: string | null;
}) {
  const initial = (creatorName ?? '').trim().charAt(0).toUpperCase() || '?';
  return (
    // Mobile: stack the title block above the action cluster so the
    // row breathes vertically instead of fighting for horizontal
    // space (the title was truncating to 'What t...' and the
    // status pill was overlapping the byline).
    // sm+: keep the inline single-row layout the desktop UI expects.
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 hover:bg-warm-bg/40 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          {episodeLabel && (
            <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-foreground/[0.06] text-foreground/55 border border-black/5">
              {episodeLabel}
            </span>
          )}
          {href ? (
            <Link href={href} className="font-semibold text-foreground text-[14px] hover:underline break-words sm:truncate min-w-0">{title}</Link>
          ) : (
            <span className="font-semibold text-foreground text-[14px] break-words sm:truncate min-w-0">{title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {(creatorName || creatorAvatarUrl) && (
            <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-foreground/55">
              {creatorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creatorAvatarUrl} alt="" className="w-4 h-4 rounded-full object-cover bg-warm-bg" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-warm-bg flex items-center justify-center text-[8px] font-semibold text-foreground/55" aria-hidden="true">{initial}</span>
              )}
              <span className="truncate max-w-[140px]">{creatorName || 'Unknown'}</span>
              <span className="text-foreground/30">·</span>
            </span>
          )}
          <p className={`text-[11.5px] text-foreground/55 truncate ${subtitleMono ? 'font-mono' : ''}`}>{subtitle}</p>
        </div>
      </div>
      {/* Right-side cluster — status pill stays visible; everything
          else folds into a 3-dot menu so the row stays calm even
          when six affordances are technically available. */}
      <div className="flex items-center gap-2 shrink-0 sm:justify-end">
        {statusBadge}
        <RowActionsMenu
          title={title}
          analyticsOpen={analyticsOpen}
          onToggleAnalytics={onToggleAnalytics}
          externalHref={externalHref}
          hidden={hidden}
          onToggleHidden={onToggleHidden}
          toggleDisabled={toggleDisabled}
          onDelete={onDelete}
          onGenerateSchema={onGenerateSchema}
          generatingSchema={generatingSchema}
        />
      </div>
    </div>
  );
}

// 3-dot dropdown that consolidates Analytics / View / Visibility /
// Generate schema / Delete into one trigger. Closes on outside click
// or Escape. Anchored to the trigger via absolute positioning so it
// stays inside the row card and reads top-down on mobile too.
function RowActionsMenu({
  title,
  analyticsOpen,
  onToggleAnalytics,
  externalHref,
  hidden,
  onToggleHidden,
  toggleDisabled,
  onDelete,
  onGenerateSchema,
  generatingSchema,
}: {
  title: string;
  analyticsOpen: boolean;
  onToggleAnalytics: () => void;
  externalHref?: string;
  hidden: boolean;
  onToggleHidden: () => void;
  toggleDisabled: boolean;
  onDelete?: () => void;
  onGenerateSchema?: () => void;
  generatingSchema: boolean;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('[data-row-menu]')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = !hidden && !toggleDisabled;

  return (
    <div className="relative" data-row-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${title}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-black/10 bg-white text-foreground/65 hover:text-foreground hover:bg-warm-bg/60 transition-colors"
      >
        <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true" fill="currentColor">
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="8" cy="8" r="1.4" />
          <circle cx="13" cy="8" r="1.4" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-56 rounded-lg border border-black/10 bg-white shadow-lg ring-1 ring-black/5 py-1 text-[13px]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => { onToggleAnalytics(); setOpen(false); }}
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-warm-bg/60 text-foreground/80"
          >
            <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13V7" />
              <path d="M8 13V3" />
              <path d="M13 13V9" />
              <path d="M1.5 13.5h13" />
            </svg>
            <span className="flex-1">{analyticsOpen ? 'Hide analytics' : 'Analytics'}</span>
          </button>
          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-warm-bg/60 text-foreground/80"
            >
              <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2h4v4" />
                <path d="M14 2L6 10" />
                <path d="M13 9v4a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1h4" />
              </svg>
              <span className="flex-1">View on site</span>
            </a>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => { if (!toggleDisabled) { onToggleHidden(); setOpen(false); } }}
            disabled={toggleDisabled}
            title={
              toggleDisabled
                ? 'Publish this post first — visibility only matters once it has a live URL'
                : visible
                  ? 'Visible on the public site — click to hide'
                  : 'Hidden from public listings — click to show'
            }
            className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-warm-bg/60 text-foreground/80 disabled:text-foreground/35 disabled:hover:bg-transparent"
          >
            <span
              aria-hidden
              className={`shrink-0 relative inline-flex items-center h-4 w-7 rounded-full transition-colors ${
                toggleDisabled ? 'bg-foreground/10' : visible ? 'bg-emerald-500' : 'bg-foreground/20'
              }`}
            >
              <span
                className={`absolute top-0.5 inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                  visible ? 'translate-x-[14px]' : 'translate-x-0.5'
                }`}
              />
            </span>
            <span className="flex-1">
              {toggleDisabled ? 'Visibility (publish first)' : visible ? 'Hide from site' : 'Show on site'}
            </span>
          </button>
          {onGenerateSchema && (
            <button
              type="button"
              role="menuitem"
              onClick={() => { onGenerateSchema(); setOpen(false); }}
              disabled={generatingSchema}
              className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-warm-bg/60 text-foreground/80 disabled:opacity-60"
              title="Use Claude to generate FAQPage + Article JSON-LD from the post body"
            >
              <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 3.5h11v9h-11z" />
                <path d="M5 6h6M5 8h6M5 10h4" />
              </svg>
              <span className="flex-1">{generatingSchema ? 'Generating schema…' : 'Generate schema'}</span>
            </button>
          )}
          {onDelete && (
            <>
              <div className="my-1 border-t border-black/5" />
              <button
                type="button"
                role="menuitem"
                onClick={() => { onDelete(); setOpen(false); }}
                className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-rose-50 text-rose-700"
                title="Delete this blog (cascades to revisions + generated images)"
              >
                <svg viewBox="0 0 16 16" width={13} height={13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 4h10" />
                  <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
                  <path d="M4.5 4l.5 8.5A1.5 1.5 0 006.5 14h3a1.5 1.5 0 001.5-1.5L11.5 4" />
                  <path d="M7 7v4M9 7v4" />
                </svg>
                <span className="flex-1">Delete blog</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VisibilityToggle({ hidden, onChange, disabled = false }: { hidden: boolean; onChange: () => void; disabled?: boolean }) {
  // ON = visible on public site. OFF = hidden from listings.
  // Color: emerald when visible, foreground/15 when hidden.
  // When `disabled` (blog isn't published yet) we force the OFF
  // visual + skip the click handler entirely — visibility is a
  // post-publish concept so a green "showing" toggle on a draft
  // is misleading.
  const visible = !hidden && !disabled;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onChange}
      tabIndex={disabled ? -1 : 0}
      title={
        disabled
          ? 'Publish this post first — visibility only matters once it has a live URL'
          : visible
            ? 'Visible on the public site — click to hide'
            : 'Hidden from public listings — click to show'
      }
      className={`shrink-0 relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${
        disabled ? 'bg-foreground/10 cursor-not-allowed' : visible ? 'bg-emerald-500' : 'bg-foreground/20'
      }`}
    >
      <span className="sr-only">{disabled ? 'Not yet published' : visible ? 'Visible' : 'Hidden'}</span>
      <span
        className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          visible ? 'translate-x-[18px]' : 'translate-x-0.5'
        } ${disabled ? 'opacity-70' : ''}`}
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

// =============================================================================
// RoadmapTab — editorial calendar of blog concepts that haven't been
// built yet. Each row is a working title + target keyword + intent +
// target date; the "Build" button on each row hits
// /api/content/roadmap/[id]/build which spins up a real blogs row
// with the title prepopulated and routes the user into the build flow.
//
// Once a row's been built the Build button morphs into "Open" and
// the row shows the blog's current pipeline status (Draft / Built /
// Published) so the marketer can see at a glance which concepts are
// done.
// =============================================================================

interface RoadmapRow {
  id: string;
  position: number;
  working_title: string;
  target_keyword: string | null;
  est_volume: number | null;
  intent: string | null;
  target_date: string | null;
  blog_id: string | null;
  blog_status: string | null;
  blog_slug: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function RoadmapTab() {
  const { session } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<RoadmapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  // Inline add-row form state.
  const [addTitle, setAddTitle] = useState('');
  const [addDate, setAddDate] = useState('');
  const [addBusy, setAddBusy] = useState(false);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/content/roadmap', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Could not load roadmap.');
        return;
      }
      setRows((json.rows ?? []) as RoadmapRow[]);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);
  useEffect(() => { void load(); }, [load]);

  const updateField = useCallback(async (id: string, patch: Partial<RoadmapRow>) => {
    if (!session?.access_token) return;
    // Optimistic local update so the cell doesn't flicker.
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setBusyId(id);
    try {
      const res = await fetch(`/api/content/roadmap/${id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        // Roll back by reloading the row from the server.
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }, [session?.access_token, load]);

  const addRow = useCallback(async () => {
    if (!session?.access_token) return;
    const title = addTitle.trim();
    if (!title) return;
    setAddBusy(true);
    try {
      const res = await fetch('/api/content/roadmap', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          working_title: title,
          target_date: addDate || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(typeof j.error === 'string' ? j.error : 'Could not add concept.');
        return;
      }
      setAddTitle('');
      setAddDate('');
      await load();
    } finally {
      setAddBusy(false);
    }
  }, [session?.access_token, addTitle, addDate, load]);

  const build = useCallback(async (row: RoadmapRow) => {
    if (!session?.access_token) return;
    // If the row already has a linked blog, just navigate over.
    if (row.blog_id) {
      router.push(`/app/content/${row.blog_id}`);
      return;
    }
    setBuildingId(row.id);
    try {
      const res = await fetch(`/api/content/roadmap/${row.id}/build`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.id) {
        setError(typeof json.error === 'string' ? json.error : 'Could not start build.');
        return;
      }
      router.push(`/app/content/${json.id}`);
    } finally {
      setBuildingId(null);
    }
  }, [session?.access_token, router]);

  const remove = useCallback(async (id: string) => {
    if (!session?.access_token) return;
    if (!window.confirm('Remove this blog concept from the roadmap? (The linked blog, if any, stays.)')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/content/roadmap/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setRows((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId(null);
    }
  }, [session?.access_token]);

  return (
    <section className="rounded-2xl border border-black/10 bg-white overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
      <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Editorial roadmap</p>
          <p className="text-[12.5px] text-foreground/55 mt-0.5">Blog concepts queued for the AI pipeline. Click Build on any row to start a new draft from that title.</p>
        </div>
        {!loading && (
          <span className="text-[11px] text-foreground/45 shrink-0">{rows.length} {rows.length === 1 ? 'concept' : 'concepts'}</span>
        )}
      </header>

      {loading ? (
        <p className="px-4 py-10 text-[12.5px] text-foreground/55 italic text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-warm-bg/40 text-[10px] uppercase tracking-wider text-foreground/55">
              <tr>
                <th className="w-10 text-left px-3 py-2.5 font-semibold border-b border-black/10">#</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10">Working title</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-48 hidden md:table-cell">Target keyword</th>
                <th className="text-right px-3 py-2.5 font-semibold border-b border-black/10 w-20 hidden md:table-cell">Volume</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-44 hidden lg:table-cell">Intent</th>
                <th className="text-left px-3 py-2.5 font-semibold border-b border-black/10 w-36">Target date</th>
                <th className="text-right px-3 py-2.5 font-semibold border-b border-black/10 w-32">Action</th>
                <th className="text-right px-2 py-2.5 font-semibold border-b border-black/10 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {rows.map((r) => {
                const built = !!r.blog_id;
                const status = r.blog_status;
                const statusLabel =
                  status === 'published' ? 'Published'
                  : status === 'built' ? 'Built'
                  : status === 'images' ? 'Images'
                  : status === 'selecting' ? 'Selecting'
                  : status === 'reviewing' ? 'Reviewing'
                  : status === 'draft' ? 'In progress'
                  : null;
                const statusTone =
                  status === 'published' ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : built ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-foreground/[0.05] text-foreground/55 border-foreground/10';
                const isBuilding = buildingId === r.id;
                return (
                  <tr key={r.id} className="align-top hover:bg-warm-bg/30">
                    <td className="px-3 py-3 text-[11px] tabular-nums text-foreground/45">{r.position}</td>
                    <td className="px-3 py-3">
                      <input
                        type="text"
                        defaultValue={r.working_title}
                        onBlur={(e) => {
                          const next = e.target.value.trim();
                          if (next && next !== r.working_title) void updateField(r.id, { working_title: next });
                        }}
                        className="w-full text-[13px] font-semibold text-foreground bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-1 -mx-1.5 -my-1"
                      />
                      {statusLabel && (
                        <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${statusTone}`}>
                          {statusLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell">
                      <input
                        type="text"
                        defaultValue={r.target_keyword ?? ''}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== r.target_keyword) void updateField(r.id, { target_keyword: next });
                        }}
                        placeholder="—"
                        className="w-full text-[12.5px] text-foreground/75 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-1 -mx-1.5 -my-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums hidden md:table-cell">
                      <input
                        type="number"
                        min={0}
                        defaultValue={r.est_volume ?? ''}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          const next = raw === '' ? null : Number(raw);
                          if (next !== r.est_volume) void updateField(r.id, { est_volume: Number.isFinite(next) ? next : null });
                        }}
                        placeholder="—"
                        className="w-full text-right text-[12.5px] text-foreground/75 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-1 -mx-1.5 -my-1"
                      />
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell">
                      <input
                        type="text"
                        defaultValue={r.intent ?? ''}
                        onBlur={(e) => {
                          const next = e.target.value.trim() || null;
                          if (next !== r.intent) void updateField(r.id, { intent: next });
                        }}
                        placeholder="—"
                        className="w-full text-[12px] text-foreground/65 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-1 -mx-1.5 -my-1"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        defaultValue={r.target_date ?? ''}
                        onChange={(e) => {
                          const next = e.target.value || null;
                          if (next !== r.target_date) void updateField(r.id, { target_date: next });
                        }}
                        className="w-full text-[12px] text-foreground/75 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 rounded px-1.5 py-1 -mx-1.5 -my-1"
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void build(r)}
                        disabled={isBuilding}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 ${
                          built
                            ? 'border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
                            : 'bg-foreground text-white hover:bg-foreground/85'
                        }`}
                      >
                        {isBuilding ? 'Starting…' : built ? 'Open →' : 'Build'}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => void remove(r.id)}
                        disabled={busyId === r.id}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/40 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Remove from roadmap"
                        aria-label="Remove from roadmap"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Inline add-row form. Pinned at the bottom so adding
                  a concept doesn't disturb the existing scroll
                  position. */}
              <tr className="bg-warm-bg/20">
                <td className="px-3 py-3 text-[11px] text-foreground/40">+</td>
                <td className="px-3 py-3">
                  <input
                    type="text"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && addTitle.trim().length > 0) void addRow();
                    }}
                    placeholder="New blog concept title…"
                    className="w-full text-[13px] text-foreground bg-white border border-black/10 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </td>
                <td className="px-3 py-3 hidden md:table-cell" colSpan={3} />
                <td className="px-3 py-3">
                  <input
                    type="date"
                    value={addDate}
                    onChange={(e) => setAddDate(e.target.value)}
                    className="w-full text-[12px] text-foreground/75 bg-white border border-black/10 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void addRow()}
                    disabled={!addTitle.trim() || addBusy}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-foreground text-white hover:bg-foreground/85 transition-colors disabled:opacity-50"
                  >
                    {addBusy ? 'Adding…' : 'Add'}
                  </button>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
