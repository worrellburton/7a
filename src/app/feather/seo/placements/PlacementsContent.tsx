'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SeoSubNav from '../SeoSubNav';
import LinksSubNav from '../LinksSubNav';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/AuthProvider';
import { logActivity } from '@/lib/activity';

// Shared placement-log tracker for off-site backlinks. Renders the
// same Add-row form + sortable table across all four "Backlinks"
// sub-pages (Forum, PDF, Web 2.0, Social Bookmarks). Each page
// imports this with its own `channel` so rows stay scoped and the
// header reflects the channel's wording.
//
// Columns: Website (where the link lives) · Target URL (which page
// of ours it points to) · Anchor text · Live link (the actual URL
// the team can click to verify the placement is live).

export type BacklinkChannel = 'forum' | 'pdf' | 'web2_0' | 'social_bookmark';

export interface BacklinkPlacement {
  id: string;
  channel: BacklinkChannel;
  website: string | null;
  target_url: string | null;
  anchor_text: string | null;
  live_link: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ChannelCopy {
  slug: string;
  title: string;
  blurb: string;
  websitePlaceholder: string;
  addLabel: string;
}

const COPY: Record<BacklinkChannel, ChannelCopy> = {
  forum: {
    slug: 'forums',
    title: 'Forum placements',
    blurb: 'Backlinks placed on forum threads — log each live link with the page it lives on and the page of ours it points to.',
    websitePlaceholder: 'e.g. reddit.com/r/recovery',
    addLabel: 'Add forum placement',
  },
  pdf: {
    slug: 'pdf',
    title: 'PDF placements',
    blurb: 'Backlinks placed inside PDF documents hosted on third-party platforms (whitepapers, slide decks, training material).',
    websitePlaceholder: 'e.g. scribd.com/document/…',
    addLabel: 'Add PDF placement',
  },
  web2_0: {
    slug: 'web2',
    title: 'Web 2.0 placements',
    blurb: 'Backlinks placed on Web 2.0 properties — Medium, Tumblr, WordPress.com, Blogger, etc.',
    websitePlaceholder: 'e.g. medium.com/@sevenarrows/…',
    addLabel: 'Add Web 2.0 placement',
  },
  social_bookmark: {
    slug: 'social-bookmarks',
    title: 'Social bookmark placements',
    blurb: 'Backlinks placed on social-bookmarking sites — Reddit submissions, Mix, Pocket public lists, etc.',
    websitePlaceholder: 'e.g. mix.com/sevenarrows/…',
    addLabel: 'Add social-bookmark placement',
  },
};

interface Props {
  channel: BacklinkChannel;
}

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function domainOf(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function PlacementsContent({ channel }: Props) {
  const { user, session } = useAuth();
  const copy = COPY[channel];

  const [rows, setRows] = useState<BacklinkPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add-row draft state.
  const [draftWebsite, setDraftWebsite] = useState('');
  const [draftTargetUrl, setDraftTargetUrl] = useState('');
  const [draftAnchor, setDraftAnchor] = useState('');
  const [draftLiveLink, setDraftLiveLink] = useState('');
  const [adding, setAdding] = useState(false);

  // Editable cell state: tracks the row currently in edit mode + the
  // working draft. One row at a time keeps the UX predictable; an
  // accidental click on another row commits the in-flight change.
  const [editing, setEditing] = useState<{ id: string; field: keyof BacklinkPlacement } | null>(null);
  const [editingDraft, setEditingDraft] = useState('');

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await db({
        action: 'select',
        table: 'seo_backlink_placements',
        match: { channel },
        order: { column: 'created_at', ascending: false },
      });
      if (Array.isArray(data)) {
        setRows(data as BacklinkPlacement[]);
      } else {
        // db() returns { error } when the select fails — surface it
        // instead of leaving the table blank.
        const message =
          data && typeof data === 'object' && 'error' in data
            ? String((data as { error: unknown }).error)
            : null;
        if (message) setError(message);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [channel, session?.access_token]);

  useEffect(() => {
    void load();
  }, [load]);

  const addRow = async () => {
    if (!user?.id || adding) return;
    const website = draftWebsite.trim();
    const targetUrl = draftTargetUrl.trim();
    const anchor = draftAnchor.trim();
    const liveLink = draftLiveLink.trim();
    if (!website && !liveLink) {
      setError('Add at least the live link or the website.');
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const payload = {
        channel,
        website: website ? normalizeUrl(website) : null,
        target_url: targetUrl ? normalizeUrl(targetUrl) : null,
        anchor_text: anchor || null,
        live_link: liveLink ? normalizeUrl(liveLink) : null,
        added_by: user.id,
      };
      const inserted = await db({
        action: 'insert',
        table: 'seo_backlink_placements',
        data: payload,
      });
      if (inserted && typeof inserted === 'object' && 'id' in inserted) {
        const real = inserted as BacklinkPlacement;
        setRows((prev) => [real, ...prev.filter((r) => r.id !== real.id)]);
        setDraftWebsite('');
        setDraftTargetUrl('');
        setDraftAnchor('');
        setDraftLiveLink('');
        logActivity({
          userId: user.id,
          type: `seo.${channel}_placement_added`,
          targetKind: 'seo_backlink_placement',
          targetId: real.id,
          targetLabel: real.live_link || real.website || copy.title,
          targetPath: `/feather/seo/${copy.slug}`,
          metadata: { website: real.website ?? undefined, live_link: real.live_link ?? undefined },
        });
      } else {
        // No row returned but no exception either — almost always a
        // silent RLS / policy block. Surface it so it isn't invisible.
        setError("Couldn't save — your account may not have permission to add placements here. Ask an admin to widen access.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (id: string, field: keyof BacklinkPlacement, current: string | null) => {
    setEditing({ id, field });
    setEditingDraft(current ?? '');
  };

  const commitEdit = async () => {
    if (!editing) return;
    const { id, field } = editing;
    const trimmed = editingDraft.trim();
    const value =
      field === 'website' || field === 'target_url' || field === 'live_link'
        ? trimmed
          ? normalizeUrl(trimmed)
          : null
        : trimmed || null;
    setEditing(null);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    await db({
      action: 'update',
      table: 'seo_backlink_placements',
      match: { id },
      data: { [field]: value, updated_at: new Date().toISOString() },
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditingDraft('');
  };

  const deleteRow = async (id: string) => {
    if (!window.confirm('Delete this placement? This cannot be undone.')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
    await db({ action: 'delete', table: 'seo_backlink_placements', match: { id } });
  };

  const summary = useMemo(() => {
    const total = rows.length;
    const live = rows.filter((r) => r.live_link).length;
    return { total, live };
  }, [rows]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-6xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <SeoSubNav />
      <LinksSubNav />

      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.22em] text-foreground/45 font-semibold">
          Backlinks
        </p>
        <h1
          className="text-2xl lg:text-3xl font-bold text-foreground leading-tight"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-foreground/60 max-w-3xl">
          {copy.blurb}
        </p>
        <p className="mt-2 text-xs text-foreground/55 tabular-nums">
          {summary.total} placement{summary.total === 1 ? '' : 's'}
          {summary.total > 0 && (
            <>
              {' · '}
              {summary.live} with a live link
            </>
          )}
        </p>
      </header>

      {/* Add row form. Borrows the inline-strip pattern used by
          OutreachContent so the page feels consistent across the
          Backlinks sub-nav. */}
      <div className="mb-5 p-4 rounded-xl bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80">
        <p className="text-[10px] uppercase tracking-[0.18em] text-foreground/55 font-semibold mb-2">
          New placement
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            type="text"
            value={draftWebsite}
            onChange={(e) => setDraftWebsite(e.target.value)}
            placeholder={`Website · ${copy.websitePlaceholder}`}
            className="h-9 px-3 rounded-md bg-white border border-foreground/15 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <input
            type="text"
            value={draftTargetUrl}
            onChange={(e) => setDraftTargetUrl(e.target.value)}
            placeholder="Target URL · sevenarrowsrecoveryarizona.com/…"
            className="h-9 px-3 rounded-md bg-white border border-foreground/15 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <input
            type="text"
            value={draftAnchor}
            onChange={(e) => setDraftAnchor(e.target.value)}
            placeholder="Anchor text"
            className="h-9 px-3 rounded-md bg-white border border-foreground/15 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <input
            type="text"
            value={draftLiveLink}
            onChange={(e) => setDraftLiveLink(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addRow();
            }}
            placeholder="Live link to verify"
            className="h-9 px-3 rounded-md bg-white border border-foreground/15 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          {error && (
            <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-3 py-1.5 mr-auto">
              {error}
            </span>
          )}
          <button
            type="button"
            onClick={() => void addRow()}
            disabled={adding || (!draftWebsite.trim() && !draftLiveLink.trim())}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground text-white text-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-foreground/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            {adding ? 'Adding…' : copy.addLabel}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white/70 supports-[backdrop-filter]:bg-white/55 backdrop-blur-md border border-white/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-foreground/55 text-[11px] uppercase tracking-[0.14em]">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Website</th>
                <th className="text-left font-semibold px-4 py-3">Target URL</th>
                <th className="text-left font-semibold px-4 py-3">Anchor text</th>
                <th className="text-left font-semibold px-4 py-3">Live link</th>
                <th className="text-right font-semibold px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-foreground/45">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-foreground/45">
                    No placements logged yet. Add your first one above.
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <PlacementRow
                  key={row.id}
                  row={row}
                  editing={editing}
                  editingDraft={editingDraft}
                  setEditingDraft={setEditingDraft}
                  onStartEdit={startEdit}
                  onCommitEdit={commitEdit}
                  onCancelEdit={cancelEdit}
                  onDelete={deleteRow}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  row: BacklinkPlacement;
  editing: { id: string; field: keyof BacklinkPlacement } | null;
  editingDraft: string;
  setEditingDraft: (value: string) => void;
  onStartEdit: (id: string, field: keyof BacklinkPlacement, current: string | null) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
}

function PlacementRow({
  row,
  editing,
  editingDraft,
  setEditingDraft,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDelete,
}: RowProps) {
  const isEditing = (field: keyof BacklinkPlacement) => editing?.id === row.id && editing.field === field;

  const renderCell = (field: keyof BacklinkPlacement, value: string | null, displayMode: 'link' | 'text') => {
    if (isEditing(field)) {
      return (
        <input
          autoFocus
          type="text"
          value={editingDraft}
          onChange={(e) => setEditingDraft(e.target.value)}
          onBlur={onCommitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          className="w-full h-7 px-2 rounded bg-white border border-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    }
    if (!value) {
      return (
        <button
          type="button"
          onClick={() => onStartEdit(row.id, field, value)}
          className="text-xs text-foreground/35 hover:text-foreground/60"
        >
          + add
        </button>
      );
    }
    if (displayMode === 'link') {
      return (
        <div className="flex items-center gap-2 min-w-0">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary hover:underline truncate"
            title={value}
          >
            {field === 'live_link' ? value : domainOf(value)}
          </a>
          <button
            type="button"
            onClick={() => onStartEdit(row.id, field, value)}
            title="Edit"
            className="text-foreground/30 hover:text-foreground/70 text-xs"
          >
            ✎
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onStartEdit(row.id, field, value)}
        title="Edit"
        className="text-left text-foreground hover:text-primary"
      >
        {value}
      </button>
    );
  };

  return (
    <tr className="border-t border-foreground/5 hover:bg-foreground/[0.02] align-top">
      <td className="px-4 py-3 max-w-[220px]">
        {renderCell('website', row.website, 'link')}
      </td>
      <td className="px-4 py-3 max-w-[220px]">
        {renderCell('target_url', row.target_url, 'link')}
      </td>
      <td className="px-4 py-3 max-w-[200px]">
        {renderCell('anchor_text', row.anchor_text, 'text')}
      </td>
      <td className="px-4 py-3 max-w-[260px]">
        {renderCell('live_link', row.live_link, 'link')}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={() => onDelete(row.id)}
          title="Delete"
          className="text-foreground/30 hover:text-rose-600 text-xs"
        >
          ✕
        </button>
      </td>
    </tr>
  );
}
