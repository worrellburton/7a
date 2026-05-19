// Shared SavedDraft store. The Compose flow + the Drafts list +
// the Ready-to-go list + the per-draft detail page all read /
// write through this module so they stay in sync via the same
// localStorage key and custom event bus.

export interface SavedDraft {
  id: string;
  createdAt: string;
  caption: string;
  mediaUrls: string[];
  ready?: boolean;
  platforms?: string[];
  /**
   * Optional per-deliverable media assignment, populated from the
   * Create page's upload slots. Keys are stable strings of the form
   * `${platformId}|${label}` (e.g. "facebook|Feed (1:1)") so the
   * per-post page can reconcile the slot back to its spec.
   */
  mediaByDeliverable?: { key: string; url: string }[];
  /**
   * Claude-generated 3-6 word headline for the Ready to Go card.
   * Populated at save time when ready=true; older drafts without it
   * fall back to a caption snippet in the UI.
   */
  title?: string;
  /**
   * Subset of mediaByDeliverable keys whose slot was filled, as a flat
   * string array. Surfaced on the Ready to Go card so the editor can
   * see exactly which platform crops the post will fire to before
   * scheduling. Same key shape: `${platformId}|${label}`.
   */
  deliverables?: string[];
  /**
   * Authoring credit captured at save time. Shown as a "Created by
   * <Name>" line + avatar on the Ready to Go card.
   */
  createdBy?: { id: string; name: string | null; avatarUrl: string | null };
}

export const DRAFTS_KEY = 'social_media_saved_drafts_v1';

export function readSavedDrafts(): SavedDraft[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedDraft[]) : [];
  } catch { return []; }
}

export function writeSavedDrafts(drafts: SavedDraft[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
    window.dispatchEvent(new Event('social-media-drafts-changed'));
  } catch { /* localStorage disabled */ }
}

export function findSavedDraft(id: string): SavedDraft | null {
  return readSavedDrafts().find((d) => d.id === id) ?? null;
}
