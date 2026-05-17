'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { EPISODES, episodeHref } from '@/lib/episodes';
import PageAnalyticsPanel from '@/components/PageAnalyticsPanel';

// /app/content — super-admin-only blog pipeline.
//
// Lists every blog — DB-backed posts (created via the AI pipeline)
// and the hand-coded posts that live under /who-we-are/blog/<slug>/
// or at the top level — in one merged list sorted by episode number
// (newest first). Drafts / in-progress AI posts that don't have an
// episode number yet float to the top.
//
// "New blog" opens an inline form that asks for a one-paragraph
// prompt + optional title; submit creates a draft row and routes to
// /app/content/<id> where the user generates → reviews → picks
// images → builds → publishes.
//
// Deletion: only AI-pipeline posts can be deleted at runtime
// (DELETE /api/content/<id> drops the row + cascades revisions +
// images). Hand-coded posts live in source files — the row's delete
// button is disabled with an inline note pointing the dev at the
// `src/lib/episodes.ts` index + the per-page `content.tsx`. Every
// delete is gated behind a confirm modal that spells out the SEO
// cost; the always-visible banner up top points users at the
// visibility toggle as the SEO-safe alternative.

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

// Unified shape so the merged list renders both kinds of post through
// one branch. `kind` decides whether the delete button is wired to
// the AI delete endpoint or disabled with the source-file note.
type MergedRow =
  | {
      kind: 'ai';
      key: string;            // stable React key + analytics expand key
      id: string;             // DB row id
      slug: string;
      title: string;
      subtitle: string;
      episodeNumber: number | null;
      sortKey: number;        // higher renders first
      path: string;
      status: DbBlog['status'];
      updatedAt: string;
    }
  | {
      kind: 'static';
      key: string;
      slug: string;
      title: string;
      subtitle: string;
      episodeNumber: number;
      sortKey: number;
      path: string;
      sourcePath: string;
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
  // Delete-confirm target. Holds the row about to be deleted so the
  // modal can read its title / slug for the warning copy. `null`
  // closes the modal.
  const [deleteTarget, setDeleteTarget] = useState<MergedRow | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Merge AI + hand-coded into one list. Sort order:
  //   1. Drafts / in-progress AI posts (no episode number yet) come
  //      first, sorted by updated_at desc so the freshest WIP is at
  //      the top of the page.
  //   2. Everything with an episode number (published AI + hand-
  //      coded) follows in descending episode order (newest blog ep
  //      first).
  // The combined sortKey trick keeps the unified `.sort()` simple.
  const merged: MergedRow[] = useMemo(() => {
    // SAFE_INTEGER base lets drafts sit above ep #s without colliding
    // with realistic numbers. Subtracting an updated_at timestamp
    // inside that range preserves "newest WIP first".
    const DRAFT_BASE = Number.MAX_SAFE_INTEGER / 2;

    const aiRows: MergedRow[] = rows.map((r) => {
      const epNum = aiEpisodeNumber.get(r.id) ?? null;
      const updatedMs = new Date(r.updated_at).getTime();
      // Drafts: DRAFT_BASE + (updated/1000) so newer = higher.
      // Published AI: just use episode number.
      const sortKey = epNum ?? DRAFT_BASE + updatedMs / 1000;
      return {
        kind: 'ai',
        key: r.id,
        id: r.id,
        slug: r.slug,
        title: r.title || '(Untitled)',
        subtitle: `${r.slug} · updated ${new Date(r.updated_at).toLocaleDateString()}`,
        episodeNumber: epNum,
        sortKey,
        path: `/who-we-are/blog/${r.slug}`,
        status: r.status,
        updatedAt: r.updated_at,
      };
    });

    const staticRows: MergedRow[] = EPISODES.map((ep) => {
      const path = episodeHref(ep.slug);
      return {
        kind: 'static',
        key: `static:${ep.slug}`,
        slug: ep.slug,
        title: ep.title,
        subtitle: `src/app/(site)${path.startsWith('/who-we-are/blog/') ? path : path}/content.tsx`,
        episodeNumber: ep.number,
        sortKey: ep.number,
        path,
        sourcePath: `src/app/(site)${path.startsWith('/who-we-are/blog/') ? path : path}/content.tsx`,
      };
    });

    return [...aiRows, ...staticRows].sort((a, b) => b.sortKey - a.sortKey);
  }, [rows, aiEpisodeNumber]);

  // Confirmed delete handler — only AI rows reach here (the delete
  // button on static rows is disabled). Optimistically drops the row
  // from local state, calls DELETE, reloads on success, restores on
  // failure.
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleteTarget.kind !== 'ai') return;
    if (!session?.access_token) return;
    setDeleting(true);
    const snapshot = rows;
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    try {
      const res = await fetch(`/api/content/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setDeleteTarget(null);
      void load();
    } catch (e) {
      setRows(snapshot);
      setError(`Couldn't delete "${deleteTarget.title}": ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, session?.access_token, rows, load]);

  if (!user) return null;
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-xs uppercase tracking-[0.22em] text-foreground/45 mb-2">Marketing &amp; Admissions</p>
        <h1 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'var(--font-display)' }}>Content</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold mb-1">Super-admin only.</p>
          <p>Publishing on the Seven Arrows blog is restricted to super admins.</p>
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
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-foreground text-white text-xs font-semibold uppercase tracking-wider hover:bg-foreground/85 transition-colors"
        >
          <span aria-hidden>+</span>
          New blog
        </button>
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

      {/* Always-visible SEO note. Anchors the page so users see the
          cost of editing / deleting before they click anything. The
          delete confirm modal repeats the warning at the moment of
          action so it can't be missed. */}
      <SeoNotice />

      <section>
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
          {loading ? (
            <div className="px-4 py-6 text-[13px] text-foreground/50">Loading…</div>
          ) : merged.length === 0 ? (
            <div className="px-4 py-8 text-center text-[13px] text-foreground/50">
              No blogs yet. Click <strong>New blog</strong> to start one.
            </div>
          ) : (
            <ul className="divide-y divide-black/5">
              {merged.map((row) => {
                const hidden = !!visibility[row.slug];
                const expanded = analyticsFor === row.key;
                const episodeLabel = row.episodeNumber ? `Episode ${row.episodeNumber}` : null;
                return (
                  <li key={row.key}>
                    <BlogRow
                      title={row.title}
                      subtitle={row.subtitle}
                      subtitleMono={row.kind === 'static'}
                      episodeLabel={episodeLabel}
                      href={row.kind === 'ai' ? `/app/content/${row.id}` : undefined}
                      externalHref={row.kind === 'static' ? row.path : undefined}
                      statusBadge={
                        row.kind === 'ai' ? (
                          <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_TONES[row.status]}`}>
                            {STATUS_LABELS[row.status]}
                          </span>
                        ) : null
                      }
                      hidden={hidden}
                      onToggleHidden={() => void toggleHidden(row.slug, !hidden)}
                      analyticsOpen={expanded}
                      onToggleAnalytics={() => setAnalyticsFor(expanded ? null : row.key)}
                      canDelete={row.kind === 'ai'}
                      onDelete={() => setDeleteTarget(row)}
                    />
                    {expanded && (
                      <div className="border-t border-black/5 bg-warm-bg/30">
                        <PageAnalyticsPanel
                          path={row.path}
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

      {deleteTarget && (
        <DeleteConfirmModal
          row={deleteTarget}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          onHideInstead={
            deleteTarget.kind === 'ai'
              ? () => {
                  const slug = deleteTarget.slug;
                  setDeleteTarget(null);
                  void toggleHidden(slug, true);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function SeoNotice() {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-[12.5px] text-amber-900 leading-relaxed">
      <p className="font-semibold mb-1 flex items-center gap-1.5">
        <WarningIcon />
        Changes here affect SEO
      </p>
      <p>
        Renaming a slug or deleting a published post breaks Google&apos;s
        page index, drops the URL from search results, and dead-ends every
        backlink pointing to it. To take a post off public listings without
        breaking the URL, use the <strong>visibility toggle</strong> — the
        URL keeps working and rankings stay intact.
      </p>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
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
  analyticsOpen,
  onToggleAnalytics,
  canDelete,
  onDelete,
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
  analyticsOpen: boolean;
  onToggleAnalytics: () => void;
  canDelete: boolean;
  onDelete: () => void;
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
      <VisibilityToggle hidden={hidden} onChange={onToggleHidden} />
      <button
        type="button"
        onClick={onDelete}
        disabled={!canDelete}
        title={canDelete
          ? 'Delete this post (irreversible — breaks SEO)'
          : 'Hand-coded posts live in source files. Remove the entry from src/lib/episodes.ts + delete the page.tsx / content.tsx to drop it, or use the visibility toggle to hide.'}
        aria-label={`Delete ${title}`}
        className={`shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md border text-[12px] transition-colors ${canDelete
          ? 'text-rose-600 border-rose-200 hover:bg-rose-50 hover:border-rose-300'
          : 'text-foreground/25 border-black/5 cursor-not-allowed'}`}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
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

function DeleteConfirmModal({
  row,
  busy,
  onCancel,
  onConfirm,
  onHideInstead,
}: {
  row: MergedRow;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onHideInstead?: () => void;
}) {
  const isStatic = row.kind === 'static';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-foreground/40" onClick={onCancel}>
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-labelledby="content-delete-title"
      >
        <div className="px-5 pt-5 pb-3 border-b border-black/5">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-rose-600 mb-1 flex items-center gap-1.5">
            <WarningIcon />
            Destructive action
          </p>
          <h2 id="content-delete-title" className="text-base font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Delete &ldquo;{row.title}&rdquo;?
          </h2>
        </div>
        <div className="px-5 py-4 space-y-3 text-[12.5px] text-foreground/75 leading-relaxed">
          {isStatic ? (
            <>
              <p>
                <strong>Hand-coded posts can&apos;t be deleted from this
                screen.</strong> The page lives in source files — to take it
                down a dev needs to remove the entry from{' '}
                <code className="font-mono text-[11.5px] bg-foreground/[0.06] px-1 py-0.5 rounded">src/lib/episodes.ts</code>{' '}
                and delete the matching{' '}
                <code className="font-mono text-[11.5px] bg-foreground/[0.06] px-1 py-0.5 rounded">{row.kind === 'static' ? row.sourcePath : ''}</code>{' '}
                folder.
              </p>
              <SeoCostList path={row.path} />
              <p>
                To take it off the public listings without breaking SEO, close
                this dialog and flip the green <strong>visibility toggle</strong>{' '}
                instead. The URL keeps working, Google keeps indexing it.
              </p>
            </>
          ) : (
            <>
              <p>
                This permanently drops the blog row, its generated images, and
                its revision history. There is <strong>no undo</strong>.
              </p>
              <SeoCostList path={row.path} />
              <p>
                If you just want to take the post off public listings while
                keeping the URL alive, click <strong>Hide instead</strong>{' '}
                below. The visibility toggle keeps SEO intact.
              </p>
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-black/5 bg-warm-bg/30 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
          >
            Cancel
          </button>
          {onHideInstead && (
            <button
              type="button"
              onClick={onHideInstead}
              disabled={busy}
              className="px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-50 text-[11.5px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              Hide instead
            </button>
          )}
          {!isStatic && (
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-[11.5px] font-semibold hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SeoCostList({ path }: { path: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[11.5px] text-amber-900">
      <p className="font-semibold mb-1.5 flex items-center gap-1.5">
        <WarningIcon />
        SEO consequences
      </p>
      <ul className="list-disc pl-4 space-y-0.5">
        <li>
          <code className="font-mono text-[11px]">{path}</code> starts returning 404 — search results pointing here dead-end.
        </li>
        <li>Backlinks from other sites stop conveying authority and start hurting it.</li>
        <li>Google removes the URL from its index after the next crawl cycle; rankings won&apos;t come back if you republish under the same slug.</li>
        <li>Search Console will flag the page as an error in its coverage report.</li>
        <li>Historical analytics for the path stay in GA4 but no new pageviews accrue.</li>
      </ul>
    </div>
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
