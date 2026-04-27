'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import { uploadActionScreenshot } from '@/lib/seo/actionScreenshots';

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

const CATEGORY_SUGGESTIONS = [
  'on-page',
  'off-page',
  'technical',
  'content',
  'local',
  'analytics',
  'other',
];

export default function ActionsContent() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Filter + search
  const [filter, setFilter] = useState<'active' | 'all' | Status>('active');
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
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/seo/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: message.trim(),
          category: category.trim() || null,
          priority,
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

        {/* Screenshot strip — thumbs of already-uploaded files plus
            a visible "attach" button. Drag-and-drop + paste handlers
            land in the next phase; this is the click-to-pick path. */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
          <label
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-dashed border-orange-300 text-[11px] font-semibold transition-colors cursor-pointer ${
              uploadingShot
                ? 'text-orange-400 cursor-wait'
                : 'text-orange-700 hover:bg-orange-50'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {uploadingShot ? 'Uploading…' : 'Attach screenshot'}
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
          {pendingShots.length > 0 && (
            <span className="text-[10px] text-foreground/45">
              {pendingShots.length} attached · max 12
            </span>
          )}
        </div>
        {shotError ? (
          <p className="text-[11px] text-rose-700 mt-1">{shotError}</p>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mt-3">
          <input
            list="seo-action-categories"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
          />
          <datalist id="seo-action-categories">
            {CATEGORY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
            aria-label="Priority"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
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

      {/* Filter + search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterChip active={filter === 'active'} onClick={() => setFilter('active')} label="Active" count={counts.active} />
        <FilterChip active={filter === 'open'} onClick={() => setFilter('open')} label="Open" count={counts.open} />
        <FilterChip active={filter === 'in_progress'} onClick={() => setFilter('in_progress')} label="In progress" count={counts.in_progress} />
        <FilterChip active={filter === 'done'} onClick={() => setFilter('done')} label="Done" count={counts.done} />
        <FilterChip active={filter === 'wontfix'} onClick={() => setFilter('wontfix')} label="Won't fix" count={counts.wontfix} />
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={counts.all} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions…"
          className="ml-auto text-sm rounded-md border border-black/10 bg-white px-3 py-1.5 w-64 max-w-full"
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
      ) : (
        <ul className="space-y-2">
          {visible.map((a) => (
            <ActionCard
              key={a.id}
              a={a}
              onCycle={() => patchAction(a.id, { status: STATUS_CYCLE[a.status] })}
              onPriority={(p) => patchAction(a.id, { priority: p })}
              onDelete={() => deleteAction(a.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionCard({
  a,
  onCycle,
  onPriority,
  onDelete,
}: {
  a: Action;
  onCycle: () => void;
  onPriority: (p: Priority) => void;
  onDelete: () => void;
}) {
  const completed = a.status === 'done' || a.status === 'wontfix';
  return (
    <li
      className={`rounded-2xl border bg-white p-4 ${
        completed ? 'border-black/5 opacity-75' : 'border-black/10'
      }`}
    >
      <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
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
        </div>
      </div>
    </li>
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
    `}</style>
  );
}
