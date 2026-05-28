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
        <div className="flex items-center gap-2">
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
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-800">{error}</div>
      )}

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
