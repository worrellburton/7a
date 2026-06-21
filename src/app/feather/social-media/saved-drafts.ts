'use client';

// Shared SavedDraft store — now DATABASE-backed (public.social_media_drafts)
// instead of per-browser localStorage, so drafts sync across devices +
// teammates and carry a "created by" attribution. The Compose flow, the
// Drafts list, the Ready-to-go list, and the per-draft detail page all read
// through the same in-memory cache + `social-media-drafts-changed` event,
// and write through the async mutators below (which keep the cache and
// Supabase Realtime in lockstep).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface SavedDraft {
  id: string;
  createdAt: string;
  caption: string;
  mediaUrls: string[];
  ready?: boolean;
  platforms?: string[];
  /** auth.uid() of the creator + a denormalised display name. */
  createdBy?: string | null;
  createdByName?: string | null;
  /**
   * Optional per-deliverable media assignment, populated from the Create
   * page's upload slots. Keys are stable strings of the form
   * `${platformId}|${label}` (e.g. "facebook|Feed (1:1)").
   */
  mediaByDeliverable?: { key: string; url: string }[];
  /**
   * Which per-platform deliverables the operator checked for this draft
   * (same `${platformId}|${label}` keys). Empty = "not customised", which
   * the UI treats as "every deliverable selected".
   */
  selectedDeliverables?: string[];
  /**
   * Approval workflow state. `approved` always lines up with `ready: true`
   * (approved posts are the publishable bucket); `in_review` is a draft
   * submitted and awaiting a super-admin's sign-off.
   */
  reviewStatus?: 'draft' | 'in_review' | 'approved';
}

const TABLE = 'social_media_drafts';
const EVENT = 'social-media-drafts-changed';
const LEGACY_KEY = 'social_media_saved_drafts_v1';

// Module-level cache so the existing synchronous readers keep working.
let cache: SavedDraft[] = [];
let loadedOnce = false;
let inflight: Promise<void> | null = null;

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

function rowToDraft(r: Record<string, unknown>): SavedDraft {
  return {
    id: String(r.id),
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
    caption: (r.caption as string) ?? '',
    mediaUrls: Array.isArray(r.media_urls) ? (r.media_urls as string[]) : [],
    platforms: Array.isArray(r.platforms) ? (r.platforms as string[]) : [],
    ready: Boolean(r.ready),
    createdBy: (r.created_by as string | null) ?? null,
    createdByName: (r.created_by_name as string | null) ?? null,
    mediaByDeliverable: Array.isArray(r.media_by_deliverable)
      ? (r.media_by_deliverable as { key: string; url: string }[])
      : [],
    selectedDeliverables: Array.isArray(r.selected_deliverables)
      ? (r.selected_deliverables as string[])
      : [],
    reviewStatus: (r.review_status === 'in_review' || r.review_status === 'approved')
      ? r.review_status
      : 'draft',
  };
}

export async function loadSavedDrafts(): Promise<SavedDraft[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (!error && Array.isArray(data)) {
    cache = data.map((r) => rowToDraft(r as Record<string, unknown>));
    loadedOnce = true;
    notify();
  }
  return cache;
}

// One-time lift of any legacy per-browser drafts into the shared table,
// then clear the localStorage key so it never double-imports.
async function importLegacyDrafts(): Promise<void> {
  if (typeof window === 'undefined') return;
  let legacy: SavedDraft[] = [];
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) legacy = parsed as SavedDraft[];
    }
  } catch { return; }
  if (legacy.length === 0) return;
  const rows = legacy.map((d) => ({
    caption: d.caption ?? '',
    media_urls: d.mediaUrls ?? [],
    platforms: d.platforms ?? [],
    ready: d.ready ?? false,
    media_by_deliverable: d.mediaByDeliverable ?? [],
    created_at: d.createdAt ?? new Date().toISOString(),
  }));
  const { error } = await supabase.from(TABLE).insert(rows);
  if (!error) {
    try { window.localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
  }
}

/** Synchronous read of the current cache (populated by useSavedDrafts/load). */
export function readSavedDrafts(): SavedDraft[] {
  return cache;
}

export function findSavedDraft(id: string): SavedDraft | null {
  return cache.find((d) => d.id === id) ?? null;
}

export interface NewDraftInput {
  caption: string;
  mediaUrls: string[];
  platforms?: string[];
  ready?: boolean;
  mediaByDeliverable?: { key: string; url: string }[];
  createdBy?: string | null;
  createdByName?: string | null;
}

export async function saveDraft(input: NewDraftInput): Promise<SavedDraft | null> {
  // Always stamp the author. Callers may pass createdBy/createdByName
  // explicitly, but if they don't we fall back to the signed-in user so
  // EVERY save path (create flow, templates, AI) records who made the
  // post — that's what drives the "Created by" column.
  let createdBy = input.createdBy ?? null;
  let createdByName = input.createdByName ?? null;
  if (!createdBy || !createdByName) {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const u = auth.user;
      if (u) {
        createdBy = createdBy ?? u.id;
        createdByName = createdByName
          ?? ((u.user_metadata?.full_name as string | undefined) || u.email) ?? null;
      }
    } catch { /* best-effort — leave null */ }
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      caption: input.caption,
      media_urls: input.mediaUrls,
      platforms: input.platforms ?? [],
      ready: input.ready ?? false,
      media_by_deliverable: input.mediaByDeliverable ?? [],
      created_by: createdBy,
      created_by_name: createdByName,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  const draft = rowToDraft(data as Record<string, unknown>);
  cache = [draft, ...cache.filter((d) => d.id !== draft.id)];
  notify();
  return draft;
}

export type DraftPatch = Partial<Pick<SavedDraft, 'caption' | 'mediaUrls' | 'platforms' | 'ready' | 'mediaByDeliverable' | 'selectedDeliverables' | 'reviewStatus'>>;

export async function updateDraft(id: string, patch: DraftPatch): Promise<void> {
  const dbPatch: Record<string, unknown> = {};
  if (patch.caption !== undefined) dbPatch.caption = patch.caption;
  if (patch.mediaUrls !== undefined) dbPatch.media_urls = patch.mediaUrls;
  if (patch.platforms !== undefined) dbPatch.platforms = patch.platforms;
  if (patch.ready !== undefined) dbPatch.ready = patch.ready;
  if (patch.mediaByDeliverable !== undefined) dbPatch.media_by_deliverable = patch.mediaByDeliverable;
  if (patch.selectedDeliverables !== undefined) dbPatch.selected_deliverables = patch.selectedDeliverables;
  if (patch.reviewStatus !== undefined) dbPatch.review_status = patch.reviewStatus;
  if (Object.keys(dbPatch).length === 0) return;
  const { error } = await supabase.from(TABLE).update(dbPatch).eq('id', id);
  if (error) return;
  cache = cache.map((d) => (d.id === id ? { ...d, ...patch } : d));
  notify();
}

export async function setDraftReady(id: string, ready: boolean): Promise<void> {
  // Keep the review state in lockstep with ready everywhere ready is
  // toggled (drag moves, bulk unmark, the Mark-ready button): ready ⇒
  // approved, not-ready ⇒ back to draft.
  return updateDraft(id, { ready, reviewStatus: ready ? 'approved' : 'draft' });
}

/** Submit a not-ready draft for a super-admin's review. */
export async function submitForReview(id: string): Promise<void> {
  return updateDraft(id, { reviewStatus: 'in_review' });
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return;
  cache = cache.filter((d) => d.id !== id);
  notify();
}

/**
 * React hook — the canonical way components consume drafts. Ensures the
 * DB load (and the one-time localStorage import) has run, subscribes to
 * Realtime + the local change event, and returns the live list.
 */
export function useSavedDrafts(): { drafts: SavedDraft[]; loading: boolean } {
  const [drafts, setDrafts] = useState<SavedDraft[]>(cache);
  const [loading, setLoading] = useState(!loadedOnce);

  useEffect(() => {
    let cancelled = false;
    const sync = () => { if (!cancelled) setDrafts([...cache]); };

    if (!loadedOnce && !inflight) {
      inflight = (async () => {
        await importLegacyDrafts();
        await loadSavedDrafts();
      })().finally(() => { inflight = null; });
    }
    (inflight ?? Promise.resolve()).then(() => {
      if (cancelled) return;
      setLoading(false);
      sync();
    });

    window.addEventListener(EVENT, sync);
    const channel = supabase
      .channel(`social_media_drafts_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, () => { void loadSavedDrafts(); })
      .subscribe();

    return () => {
      cancelled = true;
      window.removeEventListener(EVENT, sync);
      supabase.removeChannel(channel);
    };
  }, []);

  return { drafts, loading };
}
