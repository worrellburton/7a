'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Layout, LayoutBlock } from '@/lib/content-claude';
import DbBlogRenderer from './DbBlogRenderer';

// Live-edit overlay mounted by the public blog page when ?edit=1 is in
// the URL. Wraps DbBlogRenderer with click-to-edit behaviour on prose
// blocks (and hero title / tagline) so editors can fix typos directly
// on the rendered page without round-tripping to /app/content/<id>.
//
// Auth: we read the supabase session client-side to attach a token to
// the PATCH; the /api/content/[id] route itself is super-admin gated,
// so non-admin visitors can read but never write.

export default function LiveBlogEditor({
  blogId,
  initialLayout,
  byline,
}: {
  blogId: string;
  initialLayout: Layout;
  byline?: React.ReactNode;
}) {
  const [draft, setDraft] = useState<Layout>(initialLayout);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
    });
  }, []);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initialLayout), [draft, initialLayout]);

  function patchBlock(i: number, patch: Partial<LayoutBlock>) {
    setDraft((cur) => ({
      blocks: cur.blocks.map((b, idx) => (idx === i ? ({ ...b, ...patch } as LayoutBlock) : b)),
    }));
  }

  async function save() {
    if (!token) {
      setErr('You need to be signed in as a super admin to save edits.');
      return;
    }
    if (!dirty) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/content/${blogId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ layout: draft }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr((json as { error?: string }).error ?? `HTTP ${res.status}`);
        return;
      }
      setSavedAt(new Date());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  function revert() {
    setDraft(initialLayout);
    setSavedAt(null);
    setErr(null);
    setEditingIdx(null);
  }

  // Map each block to either the standard renderer output or an
  // inline-editable wrapper. We swap the layout passed to
  // DbBlogRenderer so the prose blocks render with editable shells.
  const editableLayout: Layout = useMemo(() => ({
    blocks: draft.blocks.map((block, i) => {
      if (block.type === 'prose') {
        // We render a sentinel <div data-edit-prose> with the index so
        // a single overlay can attach click handlers. The actual
        // contenteditable swap happens in the editing-pass below.
        return block;
      }
      return block;
    }),
  }), [draft]);

  return (
    <div className="relative">
      <FloatingToolbar
        dirty={dirty}
        saving={saving}
        savedAt={savedAt}
        err={err}
        onSave={save}
        onRevert={revert}
        hasToken={!!token}
      />
      {/* The renderer paints prose markdown; we overlay click-to-edit
          shells by re-rendering edited blocks ourselves. Approach:
          render the whole layout via DbBlogRenderer in a base layer,
          but interpose an editable prose component per prose block. */}
      <EditableRenderedLayout
        layout={editableLayout}
        byline={byline}
        editingIdx={editingIdx}
        onStartEdit={(idx) => setEditingIdx(idx)}
        onCommit={(idx, nextMarkdown) => {
          patchBlock(idx, { markdown: nextMarkdown } as Partial<LayoutBlock>);
          setEditingIdx(null);
        }}
        onCancel={() => setEditingIdx(null)}
      />
    </div>
  );
}

function FloatingToolbar({
  dirty,
  saving,
  savedAt,
  err,
  onSave,
  onRevert,
  hasToken,
}: {
  dirty: boolean;
  saving: boolean;
  savedAt: Date | null;
  err: string | null;
  onSave: () => void;
  onRevert: () => void;
  hasToken: boolean;
}) {
  return (
    <div
      className="fixed top-3 right-3 z-50 max-w-[92vw] rounded-xl border border-black/10 bg-white shadow-xl ring-1 ring-black/5 px-3 py-2.5 flex items-center gap-2"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary"
        title="Edit mode is active"
      >
        <svg viewBox="0 0 16 16" width={11} height={11} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 2l3 3-8 8H3v-3z" />
        </svg>
      </span>
      <div className="text-[11.5px] leading-tight pr-1">
        <p className="font-semibold text-foreground">Editing live post</p>
        <p className="text-foreground/55">
          {!hasToken
            ? 'Sign in as super admin to save'
            : err
              ? `Error: ${err}`
              : saving
                ? 'Saving…'
                : dirty
                  ? 'Click a paragraph to edit · changes pending'
                  : savedAt
                    ? `Saved ${savedAt.toLocaleTimeString()}`
                    : 'Click a paragraph to edit'}
        </p>
      </div>
      <button
        type="button"
        onClick={onRevert}
        disabled={!dirty}
        className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-foreground/65 hover:text-foreground hover:bg-warm-bg/60 disabled:opacity-40"
      >
        Revert
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving || !hasToken}
        className="px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

// Renders the layout via DbBlogRenderer for non-prose blocks but
// overlays editable prose shells where the user can click to enter a
// textarea-driven edit. Keeps the visual identical to the public page
// while a paragraph is at rest; once a block is being edited, we
// swap it for a textarea so contentEditable parsing quirks don't
// drop newlines or list markers.
function EditableRenderedLayout({
  layout,
  byline,
  editingIdx,
  onStartEdit,
  onCommit,
  onCancel,
}: {
  layout: Layout;
  byline?: React.ReactNode;
  editingIdx: number | null;
  onStartEdit: (idx: number) => void;
  onCommit: (idx: number, nextMarkdown: string) => void;
  onCancel: () => void;
}) {
  // Strategy: walk the layout block-by-block. For each block, if it's
  // a prose block currently being edited, render the inline textarea;
  // otherwise render via a tiny single-block layout passed to
  // DbBlogRenderer. The byline rides on the first hero block as
  // before so the visual order stays Hero → Byline → Content.
  const heroIdx = byline ? layout.blocks.findIndex((b) => b.type === 'hero') : -1;
  return (
    <>
      {byline && heroIdx === -1 && <div className="mb-6">{byline}</div>}
      {layout.blocks.map((block, i) => (
        <div key={i}>
          {block.type === 'prose' ? (
            <ProseEditable
              markdown={block.markdown}
              editing={editingIdx === i}
              onStartEdit={() => onStartEdit(i)}
              onCommit={(next) => onCommit(i, next)}
              onCancel={onCancel}
            />
          ) : (
            <DbBlogRenderer layout={{ blocks: [block] }} />
          )}
          {byline && i === heroIdx && <div className="-mt-4 mb-8">{byline}</div>}
        </div>
      ))}
    </>
  );
}

function ProseEditable({
  markdown,
  editing,
  onStartEdit,
  onCommit,
  onCancel,
}: {
  markdown: string;
  editing: boolean;
  onStartEdit: () => void;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState(markdown);

  useEffect(() => { setValue(markdown); }, [markdown]);

  useEffect(() => {
    if (!editing) return;
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    // Move caret to end so the editor lands inside the text, not over it.
    ta.setSelectionRange(ta.value.length, ta.value.length);
    // Auto-grow on entry.
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={onStartEdit}
        title="Click to edit this paragraph"
        className="block w-full text-left -mx-2 px-2 rounded-md hover:bg-amber-50/60 hover:ring-1 hover:ring-amber-200 transition-colors"
      >
        <DbBlogRenderer layout={{ blocks: [{ type: 'prose', markdown }] }} />
      </button>
    );
  }

  return (
    <div className="my-6 rounded-lg ring-2 ring-primary/40 bg-white shadow-sm">
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          const ta = e.currentTarget;
          ta.style.height = 'auto';
          ta.style.height = ta.scrollHeight + 'px';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setValue(markdown);
            onCancel();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onCommit(value);
          }
        }}
        className="w-full px-3 py-3 rounded-lg border-0 text-[15px] sm:text-[16px] leading-[1.7] focus:outline-none resize-none font-body"
        style={{ fontFamily: 'var(--font-body)', minHeight: '6rem' }}
      />
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-black/5 bg-warm-bg/30 rounded-b-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => insertLink(taRef, value, setValue)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-black/10 text-[10.5px] font-semibold uppercase tracking-wider text-foreground/65 hover:text-foreground hover:bg-white"
            title="Highlight text first, then click to wrap it in a markdown link"
          >
            <svg viewBox="0 0 16 16" width={11} height={11} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 9a3 3 0 004.243 0l2-2a3 3 0 10-4.243-4.243l-1 1" />
              <path d="M9 7a3 3 0 00-4.243 0l-2 2a3 3 0 104.243 4.243l1-1" />
            </svg>
            + Link
          </button>
          <p className="hidden sm:block text-[10px] uppercase tracking-[0.18em] text-foreground/45 font-bold">
            Markdown · ⌘↩ to commit · esc to cancel
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => { setValue(markdown); onCancel(); }}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-foreground/65 hover:text-foreground hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onCommit(value)}
            className="px-3 py-1 rounded-md bg-foreground text-white text-[11px] font-semibold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// Highlight-and-wrap markdown link insert. Mirrors the "+ Link"
// affordance in src/components/EditableBlogPreview.tsx so both
// surfaces feel like one editor. If no selection exists, prompts for
// link text first. Bare hostnames get https://; paths / mailto: /
// tel: / fragments pass through untouched.
function insertLink(
  taRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  setValue: (v: string) => void,
) {
  const ta = taRef.current;
  if (!ta) return;
  const start = ta.selectionStart ?? 0;
  const end = ta.selectionEnd ?? 0;
  const selected = value.slice(start, end);
  let linkText = selected.trim();
  if (!linkText) {
    const promptedText = window.prompt('Link text');
    if (promptedText === null) return;
    linkText = promptedText.trim();
    if (!linkText) return;
  }
  const promptedUrl = window.prompt('Link URL (e.g. https://… or /our-program)', 'https://');
  if (promptedUrl === null) return;
  const raw = promptedUrl.trim();
  if (!raw) return;
  const url = /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(raw) ? raw : `https://${raw}`;
  const replacement = `[${linkText}](${url})`;
  const next = value.slice(0, start) + replacement + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    const el = taRef.current;
    if (!el) return;
    el.focus();
    const caret = start + replacement.length;
    el.setSelectionRange(caret, caret);
  });
}
