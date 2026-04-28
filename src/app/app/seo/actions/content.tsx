'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import { uploadActionScreenshot } from '@/lib/seo/actionScreenshots';
import { useAuth } from '@/lib/AuthProvider';

// SEO Actions — free-form admin todo list. Anyone with admin access
// can submit an action ("redirect /old → /new", "request backlink from
// X", "fix broken link on home page"), pick a priority + category,
// and the team works through them. Status cycles open → in_progress
// → done; submit form is sticky at the top of the list.
//
// The fire-glow Actions tab in SeoSubNav signals where this lives;
// the page itself is bordered by a subtle ember glow on the hero so
// the visual association carries through.

type Status = 'open' | 'in_progress' | 'done' | 'wontfix';
type Priority = 'low' | 'medium' | 'high';

interface Action {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: Priority;
  status: Status;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_by_avatar_url: string | null;
  screenshot_urls: string[];
  source_directory_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<Status, string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  wontfix: "Won't fix",
};

const STATUS_TONE: Record<Status, string> = {
  open: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  wontfix: 'bg-foreground/5 text-foreground/55 border-black/10 hover:bg-foreground/10',
};

const STATUS_CYCLE: Record<Status, Status> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'open',
  wontfix: 'open',
};

const PRIORITY_TONE: Record<Priority, string> = {
  high: 'bg-rose-100 text-rose-800 border-rose-300',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  low: 'bg-foreground/5 text-foreground/55 border-black/10',
};

// Seven SEO-specific categories. Each carries its own SVG glyph
// shown in the category dropdown + on each action card. The `value`
// is what gets persisted to `category`; the `label` is what the user
// sees. Order is intentional — most-used at the top.
type CategoryValue =
  | 'on-page'
  | 'off-page'
  | 'technical'
  | 'content'
  | 'local'
  | 'analytics'
  | 'other';

interface CategoryDef {
  value: CategoryValue;
  label: string;
  description: string;
  /** Tailwind tone for the chip background + text. */
  tone: string;
  /** SVG path drawn at 16×16 — keep monochrome (currentColor). */
  icon: React.ReactNode;
}

const CATEGORIES: CategoryDef[] = [
  {
    value: 'on-page',
    label: 'On-page',
    description: 'Title tags, meta, headings, internal links',
    tone: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    value: 'off-page',
    label: 'Off-page',
    description: 'Backlinks, outreach, citations',
    tone: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5" />
      </svg>
    ),
  },
  {
    value: 'technical',
    label: 'Technical',
    description: 'Redirects, sitemap, schema, performance',
    tone: 'bg-foreground/5 text-foreground/65 border-black/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5z" />
      </svg>
    ),
  },
  {
    value: 'content',
    label: 'Content',
    description: 'New pages, FAQ blocks, blog posts',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z" />
      </svg>
    ),
  },
  {
    value: 'local',
    label: 'Local',
    description: 'GBP, citations, NAP, map pack',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    value: 'analytics',
    label: 'Analytics',
    description: 'GA4, Search Console, attribution',
    tone: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Anything else',
    tone: 'bg-foreground/5 text-foreground/55 border-black/10',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4" />
      </svg>
    ),
  },
];

const CATEGORY_BY_VALUE: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c]),
);

export default function ActionsContent() {
  const { user, isSuperAdmin } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mirrors the RLS policy on seo_actions: a row can be deleted /
  // updated by the user who submitted it OR by any super-admin.
  // Used to hide the trash button on rows the current user can't
  // remove anyway, so the UI doesn't look broken on click.
  const canModify = useCallback(
    (a: Action) => Boolean(isSuperAdmin || (user?.id && a.submitted_by === user.id)),
    [isSuperAdmin, user?.id],
  );

  // Submit form — one message textarea (title + description merged)
  // plus a category + priority. The API still stores the message in
  // the `title` column; the schema now allows up to 4000 chars there.
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [submitting, setSubmitting] = useState(false);
  // Screenshots queued for the next submit. Each entry is an
  // already-uploaded URL; uploads happen the moment a file is
  // picked so a slow connection doesn't bottleneck the click.
  const [pendingShots, setPendingShots] = useState<string[]>([]);
  const [uploadingShot, setUploadingShot] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);

  // Filter + search. The chip row + view-mode toggle were removed
  // in a recent UI pass — both pin to constants so the existing
  // filter / view branching keeps compiling without exhaustively
  // re-checking literal types. Search still filters live.
  type FilterValue = 'active' | 'all' | Status;
  type ViewValue = 'list' | 'table' | 'spreadsheet';
  const filter = 'all' as FilterValue;
  const view = 'list' as ViewValue;
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/actions', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setActions((json.actions ?? []) as Action[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const original = message.trim();
    if (!original) return;
    await postAction(original);
  }

  // Posts the chosen action title and clears form state. Submitting
  // an action is now a *log of completed SEO work*, so we default
  // status to 'done' — every row renders in the green completed state
  // with no per-row toggle to flip it back open.
  async function postAction(title: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category: category.trim() || null,
          priority,
          status: 'done',
          screenshot_urls: pendingShots,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      const created = json.action as Action;
      setActions((prev) => [created, ...prev]);
      setMessage('');
      setCategory('');
      setPriority('medium');
      setPendingShots([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  // Push every selected file through the storage helper in parallel.
  // Errors on individual files surface as a banner but the rest still
  // upload — half a batch is better than nothing.
  async function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files);
    if (list.length === 0) return;
    setShotError(null);
    setUploadingShot(true);
    const uploaded: string[] = [];
    const errors: string[] = [];
    await Promise.all(
      list.map(async (f) => {
        try {
          const r = await uploadActionScreenshot(f);
          uploaded.push(r.url);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }),
    );
    setPendingShots((prev) => [...prev, ...uploaded].slice(0, 12));
    if (errors.length > 0) {
      setShotError(errors.join(' · '));
    }
    setUploadingShot(false);
  }

  function removePendingShot(url: string) {
    setPendingShots((prev) => prev.filter((u) => u !== url));
  }

  // Drag-and-drop state — only true while a drag is hovering the
  // form, drives the dashed-glow outline so the drop target is
  // discoverable.
  const [isDragging, setIsDragging] = useState(false);

  function onDragOver(e: React.DragEvent<HTMLFormElement>) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDragging(true);
    }
  }
  function onDragLeave(e: React.DragEvent<HTMLFormElement>) {
    // Only clear when the drag actually leaves the form, not when it
    // crosses an inner child's boundary.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }
  // Paste-to-upload — Cmd+V / Ctrl+V on the textarea (or anywhere
  // inside the form) drops any clipboard images into the queue.
  function onPaste(e: React.ClipboardEvent<HTMLFormElement>) {
    const files: File[] = [];
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f && f.type.startsWith('image/')) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void handleFiles(files);
    }
  }

  async function patchAction(id: string, body: Partial<Pick<Action, 'status' | 'priority' | 'title' | 'description' | 'category'>>) {
    // Optimistic — flip locally first, then reconcile with the
    // server's authoritative copy on success / revert on failure.
    const before = actions;
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, ...body } : a)));
    try {
      const res = await fetch(`/api/seo/actions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
      setActions((prev) => prev.map((a) => (a.id === id ? (json.action as Action) : a)));
    } catch (e) {
      setActions(before);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function deleteAction(id: string) {
    if (!confirm('Delete this action? This cannot be undone.')) return;
    const before = actions;
    setActions((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(`/api/seo/actions/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
    } catch (e) {
      setActions(before);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return actions.filter((a) => {
      if (filter === 'active' && (a.status === 'done' || a.status === 'wontfix')) return false;
      if (filter !== 'active' && filter !== 'all' && a.status !== filter) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q) ||
        (a.category ?? '').toLowerCase().includes(q) ||
        (a.submitted_by_name ?? '').toLowerCase().includes(q)
      );
    });
  }, [actions, filter, query]);

  const counts = useMemo(() => {
    const c: Record<Status | 'all' | 'active', number> = {
      all: actions.length,
      active: actions.filter((a) => a.status === 'open' || a.status === 'in_progress').length,
      open: 0,
      in_progress: 0,
      done: 0,
      wontfix: 0,
    };
    for (const a of actions) c[a.status] += 1;
    return c;
  }, [actions]);

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <FireGlowKeyframes />

      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/app/seo"
              className="text-xs font-semibold text-foreground/40 hover:text-primary uppercase tracking-wider inline-flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              SEO
            </Link>
          </div>
          <h1
            className="text-2xl font-bold text-foreground inline-flex items-center gap-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <FlameIcon className="w-6 h-6 text-orange-500" />
            Actions
          </h1>
          <p className="mt-1 text-sm text-foreground/60 max-w-2xl">
            What needs to get done on SEO this week. Submit anything —
            broken redirects, missing schema, content gaps, outreach
            asks. Click a status pill to cycle through Open → In
            progress → Done.
          </p>
        </div>
      </header>

      <SeoSubNav />

      {/* Submit form — bordered with a soft amber→rose glow so it
          reads as the "input" area and ties to the fire-glow tab.
          Drag-and-drop or paste an image anywhere on the form to
          attach a screenshot without the file picker. */}
      <form
        onSubmit={submit}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onPaste={onPaste}
        className={`relative mb-6 rounded-2xl bg-white p-5 border transition-colors ${
          isDragging ? 'border-orange-500 ring-2 ring-orange-300/40' : 'border-orange-200'
        }`}
        style={{
          boxShadow: isDragging
            ? '0 0 0 1px rgba(255,140,40,0.35), 0 12px 40px -10px rgba(255,90,30,0.55)'
            : '0 0 0 1px rgba(255,140,40,0.12), 0 8px 30px -12px rgba(255,90,30,0.35)',
        }}
      >
        {isDragging ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-orange-50/85 pointer-events-none text-orange-700 text-sm font-semibold"
          >
            Drop to attach
          </div>
        ) : null}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Submit an action — what, why, links, anything that helps the next person pick this up."
          rows={3}
          maxLength={4000}
          className="block w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 resize-y"
        />

        {/* Screenshot drop zone — a visible, click-or-drag-or-paste
            target so the affordance reads even when nothing is being
            dragged. The form-level drag handlers higher up still
            catch drops anywhere on the form, but most users hover
            over the drop zone first because it's where the icon
            says "drop". The label wraps the whole panel so click
            anywhere opens the file picker. */}
        <label
          className={`mt-3 flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-[12px] cursor-pointer transition-colors ${
            uploadingShot
              ? 'border-orange-300 bg-orange-50/40 text-orange-500 cursor-wait'
              : 'border-orange-300/70 bg-orange-50/30 text-orange-700 hover:bg-orange-50 hover:border-orange-400'
          }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="font-semibold">
            {uploadingShot
              ? 'Uploading…'
              : 'Drop screenshots here, paste, or click to attach'}
          </span>
          <span className="text-[10.5px] text-orange-700/70">
            PNG / JPG · up to 12 files · 10 MB each
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void handleFiles(e.target.files);
              // Reset so picking the same file twice still triggers
              // the change handler.
              e.target.value = '';
            }}
          />
        </label>

        {/* Thumbs of files already queued for this submit, with × to
            remove individual attachments before the user clicks
            Submit. Renders only when there's at least one. */}
        {pendingShots.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {pendingShots.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="attached screenshot"
                  className="w-14 h-14 object-cover rounded-md border border-black/10"
                />
                <button
                  type="button"
                  onClick={() => removePendingShot(url)}
                  title="Remove this screenshot"
                  aria-label="Remove screenshot"
                  className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-foreground text-white text-[10px] hover:bg-rose-600"
                >
                  ×
                </button>
              </div>
            ))}
            <span className="text-[10px] text-foreground/45">
              {pendingShots.length} attached · max 12
            </span>
          </div>
        )}
        {shotError ? (
          <p className="text-[11px] text-rose-700 mt-1">{shotError}</p>
        ) : null}
        {/* Submit row — category + Submit only. Priority drops to
            the row-level controls in the table view; new submissions
            default to medium and are easy to bump after the fact. */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 mt-3">
          <input
            list="seo-action-categories"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
          />
          <datalist id="seo-action-categories">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 text-white text-sm font-semibold shadow-sm hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 mb-4">
          <strong>Couldn&apos;t complete that:</strong> {error}
        </div>
      ) : null}

      {/* Search-only — filter chips and view-mode toggle were
          removed per request. The default filter is "all" and the
          default view is the compact list table; status filtering
          is still available by clicking the per-row status pill to
          cycle through values. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions…"
          className="ml-auto text-sm rounded-md border border-black/10 bg-white px-3 py-2 w-72 max-w-full"
        />
      </div>

      {loading ? (
        <p className="text-sm text-foreground/55 py-8 text-center">Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-warm-bg/40 p-10 text-center">
          <p className="text-sm text-foreground/60">
            {actions.length === 0
              ? 'No actions yet. Submit the first one above.'
              : 'No actions match the current filter.'}
          </p>
        </div>
      ) : view === 'table' ? (
        // Grouped tables — one ActionTable per non-empty status,
        // with a section header for each. Lets the team scan
        // Open / In progress / Done as separate panels rather than
        // one mixed list.
        <ActionTableGroups
          rows={visible}
          onPatch={(id, body) => patchAction(id, body)}
          onDelete={(id) => deleteAction(id)}
          canDelete={canModify}
        />
      ) : view === 'spreadsheet' ? (
        <ActionSpreadsheet
          rows={visible}
          onPatch={(id, body) => patchAction(id, body)}
          onDelete={(id) => deleteAction(id)}
          canDelete={canModify}
        />
      ) : (
        // List view — a single compact spreadsheet-style table with
        // every row in time order, identical shape to the Table mode
        // but ungrouped. The card-based render previously here was
        // verbose; this keeps the same data dense + scannable.
        <ActionTable
          rows={visible}
          onPatch={(id, body) => patchAction(id, body)}
          onDelete={(id) => deleteAction(id)}
          canDelete={canModify}
        />
      )}

    </div>
  );
}

/**
 * Compact table render for the action list. Title truncates, every
 * other column stays narrow + tabular-nums where possible. Click a
 * row to open the source action card (TODO when modal lands); for
 * now the priority + status cells remain interactive in place. The
 * delete button shows as a trash icon at the end of the row.
 */
function ActionTable({
  rows,
  onPatch,
  onDelete,
  canDelete,
}: {
  rows: Action[];
  onPatch: (id: string, body: Partial<Pick<Action, 'status' | 'priority' | 'title' | 'description' | 'category'>>) => void;
  onDelete: (id: string) => void;
  canDelete: (a: Action) => boolean;
}) {
  // Currently-hovered screenshot URL — used to render the centered
  // popup overlay below. Null when nothing is hovered. State lives
  // here so the overlay sits outside any single row's overflow box.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  return (
    <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
      <table className="w-full text-sm">
        <thead className="bg-warm-bg/50 text-[11px] uppercase tracking-wider text-foreground/55">
          <tr>
            <th className="text-left px-4 py-3 font-semibold border-b border-black/10">Title</th>
            <th className="text-left px-4 py-3 font-semibold border-b border-black/10 w-44">Screenshots</th>
            <th className="text-left px-4 py-3 font-semibold border-b border-black/10 w-32">Category</th>
            <th className="text-left px-4 py-3 font-semibold border-b border-black/10 w-44">Submitted</th>
            <th className="text-right px-4 py-3 font-semibold border-b border-black/10 w-12" aria-label="Actions" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {rows.map((a) => {
            const cat = a.category ? CATEGORY_BY_VALUE[a.category] : null;
            const completed = a.status === 'done' || a.status === 'wontfix';
            return (
              <tr key={a.id} className="bg-emerald-50/40 hover:bg-emerald-50/70 transition-colors">
                <td className="px-4 py-4 align-top">
                  <EditableTitle
                    value={a.title}
                    canEdit={canDelete(a)}
                    onCommit={(next) => onPatch(a.id, { title: next })}
                  />
                </td>
                <td className="px-4 py-4 align-top">
                  {a.screenshot_urls.length === 0 ? (
                    <span className="text-foreground/35 text-[12px]">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {a.screenshot_urls.slice(0, 4).map((url) => (
                        <a
                          key={url}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseEnter={() => setPreviewUrl(url)}
                          onMouseLeave={() => setPreviewUrl((cur) => (cur === url ? null : cur))}
                          onFocus={() => setPreviewUrl(url)}
                          onBlur={() => setPreviewUrl((cur) => (cur === url ? null : cur))}
                          className="block w-12 h-12 rounded-md overflow-hidden border border-black/10 hover:ring-2 hover:ring-orange-300/60 transition"
                          title="Click to open original; hover to enlarge"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="screenshot" className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {a.screenshot_urls.length > 4 ? (
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-md border border-dashed border-black/15 text-[10px] text-foreground/55 font-semibold">
                          +{a.screenshot_urls.length - 4}
                        </span>
                      ) : null}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  {cat ? (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${cat.tone}`}
                      title={cat.description}
                    >
                      <span className="w-3 h-3 shrink-0">{cat.icon}</span>
                      {cat.label}
                    </span>
                  ) : a.category ? (
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-warm-bg/70 text-foreground/55 border border-black/5">
                      {a.category}
                    </span>
                  ) : (
                    <span className="text-foreground/35 text-[12px]">—</span>
                  )}
                </td>
                <td className="px-4 py-4 align-top">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={a.submitted_by_name}
                      src={a.submitted_by_avatar_url}
                      tooltip={
                        a.submitted_by_name
                          ? `${a.submitted_by_name} · ${new Date(a.created_at).toLocaleString()}`
                          : new Date(a.created_at).toLocaleString()
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-foreground/80 truncate">
                        {a.submitted_by_name ?? '—'}
                      </p>
                      <p className="text-[10px] text-foreground/45 truncate">
                        {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 align-top text-right">
                  {canDelete(a) ? (
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-red-600 hover:bg-red-50"
                      aria-label="Delete action"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                      </svg>
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Centered hover preview — fixed-position overlay so it
          escapes the table's overflow box. Renders only while a
          thumbnail is hovered. Click anywhere on the backdrop to
          dismiss; pointer-events stay disabled so hovering the
          overlay itself doesn't keep it pinned. */}
      {previewUrl ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="relative max-w-[80vw] max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Grouped table view — same compact-row shape as ActionTable, but
 * one separate table per status with a small section header above
 * each. Empty groups are dropped entirely so the page doesn't show
 * empty "Done · 0" panels.
 */
const STATUS_GROUP_ORDER: Status[] = ['open', 'in_progress', 'done', 'wontfix'];

function ActionTableGroups({
  rows,
  onPatch,
  onDelete,
  canDelete,
}: {
  rows: Action[];
  onPatch: (id: string, body: Partial<Pick<Action, 'status' | 'priority' | 'title' | 'description' | 'category'>>) => void;
  onDelete: (id: string) => void;
  canDelete: (a: Action) => boolean;
}) {
  const groups = STATUS_GROUP_ORDER
    .map((s) => ({ status: s, rows: rows.filter((r) => r.status === s) }))
    .filter((g) => g.rows.length > 0);
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-black/5 bg-warm-bg/40 p-10 text-center">
        <p className="text-sm text-foreground/60">No actions match the current filter.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.status}>
          <div className="flex items-baseline gap-2 mb-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-foreground/55">
              {STATUS_LABELS[g.status]}
            </h3>
            <span className="text-[11px] text-foreground/40 tabular-nums">· {g.rows.length}</span>
          </div>
          <ActionTable
            rows={g.rows}
            onPatch={onPatch}
            onDelete={onDelete}
            canDelete={canDelete}
          />
        </section>
      ))}
    </div>
  );
}

/**
 * Spreadsheet view — every row is editable in place. Title + category
 * are text inputs that commit on blur or Enter; priority + status
 * stay as inline selects. Zebra-striped, no padding waste, designed
 * for triage-style mass edits where a card view would be too noisy.
 */
function ActionSpreadsheet({
  rows,
  onPatch,
  onDelete,
  canDelete,
}: {
  rows: Action[];
  onPatch: (id: string, body: Partial<Pick<Action, 'status' | 'priority' | 'title' | 'description' | 'category'>>) => void;
  onDelete: (id: string) => void;
  canDelete: (a: Action) => boolean;
}) {
  return (
    <div className="overflow-hidden border border-black/10 rounded-xl bg-white">
      <table className="w-full text-[12.5px]">
        <thead className="bg-warm-bg/60 text-[10px] uppercase tracking-wider text-foreground/55">
          <tr>
            <th className="text-left px-2 py-1.5 font-semibold border-b border-black/10">Title</th>
            <th className="text-left px-2 py-1.5 font-semibold border-b border-black/10 w-28">Category</th>
            <th className="text-left px-2 py-1.5 font-semibold border-b border-black/10 w-32">Submitted</th>
            <th className="text-right px-2 py-1.5 font-semibold border-b border-black/10 w-8" aria-label="Delete" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <SpreadsheetRow
              key={a.id}
              a={a}
              striped={i % 2 === 1}
              onPatch={(body) => onPatch(a.id, body)}
              onDelete={() => onDelete(a.id)}
              canDelete={canDelete(a)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SpreadsheetRow({
  a,
  striped,
  onPatch,
  onDelete,
  canDelete,
}: {
  a: Action;
  striped: boolean;
  onPatch: (body: Partial<Pick<Action, 'status' | 'priority' | 'title' | 'category'>>) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [title, setTitle] = useState(a.title);
  const [category, setCategory] = useState(a.category ?? '');
  const completed = a.status === 'done' || a.status === 'wontfix';

  // Keep local state in sync when the parent re-syncs from server.
  useEffect(() => { setTitle(a.title); }, [a.title]);
  useEffect(() => { setCategory(a.category ?? ''); }, [a.category]);

  function commitTitle() {
    const next = title.trim();
    if (next.length === 0 || next === a.title) return;
    onPatch({ title: next });
  }
  function commitCategory() {
    const next = category.trim();
    if (next === (a.category ?? '')) return;
    onPatch({ category: next || null });
  }

  return (
    <tr className={`${striped ? 'bg-emerald-50/30' : 'bg-emerald-50/60'} hover:bg-emerald-50/80 transition-colors`}>
      <td className="px-2 py-1 align-top">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
            if (e.key === 'Escape') setTitle(a.title);
          }}
          className="w-full bg-transparent px-1 py-0.5 rounded text-[12.5px] focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-300/60 text-foreground"
        />
      </td>
      <td className="px-2 py-1 align-top">
        <input
          list="seo-action-categories"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onBlur={commitCategory}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            if (e.key === 'Escape') setCategory(a.category ?? '');
          }}
          placeholder="—"
          className="w-full bg-transparent px-1 py-0.5 rounded text-[11.5px] text-foreground/75 focus:outline-none focus:bg-white focus:ring-1 focus:ring-orange-300/60"
        />
      </td>
      <td className="px-2 py-1 align-top">
        <div className="flex items-center gap-1.5 min-w-0">
          <Avatar
            name={a.submitted_by_name}
            src={a.submitted_by_avatar_url}
            tooltip={
              a.submitted_by_name
                ? `${a.submitted_by_name} · ${new Date(a.created_at).toLocaleString()}`
                : new Date(a.created_at).toLocaleString()
            }
          />
          <span className="truncate text-[11px] text-foreground/65">
            {a.submitted_by_name ?? '—'}
          </span>
        </div>
      </td>
      <td className="px-2 py-1 align-top text-right">
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center w-6 h-6 rounded text-foreground/35 hover:text-red-600 hover:bg-red-50"
            aria-label="Delete action"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
            </svg>
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function ActionCard({
  a,
  onCycle,
  onPriority,
  onDelete,
  canDelete,
}: {
  a: Action;
  onCycle: () => void;
  onPriority: (p: Priority) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const completed = a.status === 'done' || a.status === 'wontfix';
  return (
    <li
      className={`rounded-2xl border bg-white p-4 ${
        completed ? 'border-black/5 opacity-75' : 'border-black/10'
      }`}
    >
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
        <Avatar
          name={a.submitted_by_name}
          src={a.submitted_by_avatar_url}
          tooltip={
            a.submitted_by_name
              ? `${a.submitted_by_name} · ${new Date(a.created_at).toLocaleString()}`
              : new Date(a.created_at).toLocaleString()
          }
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-[15px] font-semibold text-foreground ${
                completed ? 'line-through decoration-foreground/40' : ''
              }`}
            >
              {a.title}
            </h3>
            <span
              className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider border ${PRIORITY_TONE[a.priority]}`}
              title="Priority — click the chip below to change"
            >
              {a.priority}
            </span>
            {a.category ? (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-warm-bg/70 text-foreground/55 border border-black/5">
                {a.category}
              </span>
            ) : null}
          </div>
          {a.description ? (
            <p className="text-sm text-foreground/70 mt-1.5 whitespace-pre-wrap">{a.description}</p>
          ) : null}
          {a.screenshot_urls.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {a.screenshot_urls.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-14 h-14 rounded-md overflow-hidden border border-black/10 hover:ring-2 hover:ring-orange-300/60 transition"
                    title="Open screenshot in new tab"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="screenshot" className="w-full h-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] text-foreground/45 mt-2">
            Submitted{' '}
            {a.submitted_by_name ? (
              <>by <span className="font-medium text-foreground/65">{a.submitted_by_name}</span></>
            ) : (
              'by someone'
            )}{' '}
            · {new Date(a.created_at).toLocaleString()}
            {a.completed_at ? <> · completed {new Date(a.completed_at).toLocaleDateString()}</> : null}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <select
            value={a.priority}
            onChange={(e) => onPriority(e.target.value as Priority)}
            className="text-[11px] rounded-md border border-black/10 bg-white px-1.5 py-1 text-foreground/70"
            aria-label="Change priority"
            title="Change priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button
            type="button"
            onClick={onCycle}
            className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-colors ${STATUS_TONE[a.status]}`}
            title="Cycle status"
          >
            {STATUS_LABELS[a.status]}
          </button>
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-foreground/45 hover:text-red-600 hover:bg-red-50"
              aria-label="Delete action"
              title="Delete"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Three-density view toggle for the action list. Mirrors the
 * pattern teams use in BI dashboards: roomy cards by default,
 * compact rows for triage, ultra-dense rows for spreadsheet-style
 * editing. State is in-memory — no persistence needed since admins
 * pick a density per visit, not per session.
 */
function ViewModeToggle({
  value,
  onChange,
}: {
  value: 'list' | 'table' | 'spreadsheet';
  onChange: (v: 'list' | 'table' | 'spreadsheet') => void;
}) {
  const opts: { id: 'list' | 'table' | 'spreadsheet'; label: string; icon: React.ReactNode }[] = [
    {
      id: 'list',
      label: 'List',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      ),
    },
    {
      id: 'table',
      label: 'Table',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      ),
    },
    {
      id: 'spreadsheet',
      label: 'Spreadsheet',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="1" />
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="11" x2="21" y2="11" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="3" y1="19" x2="21" y2="19" />
          <line x1="9" y1="3" x2="9" y2="21" />
          <line x1="15" y1="3" x2="15" y2="21" />
        </svg>
      ),
    },
  ];
  return (
    <div className="inline-flex rounded-md border border-black/10 bg-white p-0.5">
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            title={o.label}
            aria-label={`${o.label} view`}
            aria-pressed={active}
            className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
              active
                ? 'bg-foreground text-white'
                : 'text-foreground/55 hover:text-foreground hover:bg-warm-bg/60'
            }`}
          >
            <span className="w-3.5 h-3.5">{o.icon}</span>
          </button>
        );
      })}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-foreground text-white border-foreground'
          : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/40'
      }`}
    >
      {label}
      <span className={`ml-1 ${active ? 'text-white/70' : 'text-foreground/40'}`}>· {count}</span>
    </button>
  );
}

/**
 * Inline-editable action title. Shows as plain text by default; click
 * (when canEdit) flips it into a textarea that auto-grows with the
 * content. Commits on blur or Cmd/Ctrl+Enter; Escape cancels and
 * reverts. Non-owners (canEdit=false) see read-only text.
 */
function EditableTitle({
  value,
  canEdit,
  onCommit,
}: {
  value: string;
  canEdit: boolean;
  onCommit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Re-sync when the parent re-renders the row with a new server copy.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Auto-size the textarea to fit its content while editing.
  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.style.height = 'auto';
    ref.current.style.height = `${ref.current.scrollHeight}px`;
    ref.current.focus();
    ref.current.select();
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next) {
      setDraft(value);
      return;
    }
    if (next === value) return;
    onCommit(next);
  }

  if (!canEdit || !editing) {
    return (
      <p
        className={`font-medium text-foreground line-clamp-3 max-w-[520px] text-[14px] leading-relaxed whitespace-pre-wrap ${
          canEdit ? 'cursor-text hover:bg-white/60 rounded px-1 -mx-1' : ''
        }`}
        title={canEdit ? 'Click to edit' : value}
        onClick={canEdit ? () => setEditing(true) : undefined}
      >
        {value}
      </p>
    );
  }

  return (
    <textarea
      ref={ref}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(value);
          setEditing(false);
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit();
        }
      }}
      rows={1}
      className="block w-full max-w-[520px] resize-none rounded border border-orange-300/60 bg-white px-2 py-1 text-[14px] leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-orange-300/50"
    />
  );
}

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c1.5 3 5 4.5 5 8.5 0 1.6-.7 3-1.7 4 .5-2.3-1.5-3.5-2.3-5C12 12 10.5 14 12 17c-2.5-.5-4-2.7-4-5.5 0-3.5 4-4.5 4-9.5z" />
      <path d="M7 14.5c0 4 3 7 5 7 2.5 0 5-2.5 5-5.5 0-1.5-.7-2.7-1.7-3.5.6 2-.9 4-3.3 4-2 0-3.5-1.5-3.5-3 0-.7.2-1.3.5-2-1.3.7-2 2-2 3z" />
    </svg>
  );
}

// Inject the @keyframes once on mount. The SeoSubNav fire-glow tab
// references these animations by name, but they only need to be
// registered when an SEO sub-page mounts.
/**
 * Circular avatar with an initial-letter fallback. Uses the snapshot
 * URL captured on submit so deleting the underlying user later still
 * shows the right face. The snapshot can be a Google profile photo
 * (=s96-c suffix) so we upgrade to s256 for crisper render at the
 * 40px tile size.
 */
function Avatar({
  name,
  src,
  tooltip,
}: {
  name: string | null;
  src: string | null;
  tooltip?: string;
}) {
  const initial = (name || '?').charAt(0).toUpperCase();
  const upgraded =
    src && /googleusercontent\.com/i.test(src)
      ? /=s\d+(-c)?$/i.test(src)
        ? src.replace(/=s\d+(-c)?$/i, '=s256-c')
        : `${src}=s256-c`
      : src;
  return (
    <div
      className="shrink-0 relative w-10 h-10 rounded-full overflow-hidden bg-warm-bg/70 border border-black/5 flex items-center justify-center text-foreground/55 text-sm font-bold"
      title={tooltip}
    >
      {upgraded ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={upgraded}
          alt={name ?? ''}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        initial
      )}
    </div>
  );
}

function FireGlowKeyframes() {
  return (
    <style jsx global>{`
      @keyframes seo-fire-glow {
        0%, 100% {
          box-shadow:
            0 0 6px rgba(255, 120, 40, 0.55),
            0 0 14px rgba(255, 70, 20, 0.35);
        }
        50% {
          box-shadow:
            0 0 12px rgba(255, 160, 70, 0.85),
            0 0 28px rgba(255, 90, 30, 0.55);
        }
      }
      @keyframes seo-fire-shift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
      @keyframes seo-done-glow {
        0%, 100% {
          box-shadow:
            0 0 6px rgba(16, 185, 129, 0.55),
            0 0 14px rgba(16, 185, 129, 0.35);
        }
        50% {
          box-shadow:
            0 0 10px rgba(16, 185, 129, 0.85),
            0 0 24px rgba(16, 185, 129, 0.55);
        }
      }
    `}</style>
  );
}
