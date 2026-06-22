// Shared deliverable logic for the Social composer.
//
// The Create page and the per-draft detail page both need to enumerate
// the crops/slots a set of platforms requires, and they MUST agree on the
// key format — a divergent `${pid}|${label}` key once collided (Facebook
// has a "Story (9:16)" in both images and videos) and broke React list
// reconciliation (phantom rows you couldn't uncheck). Centralising the key
// scheme + the platform label/order tables here means the two surfaces can
// never drift again.

import type { CSSProperties } from 'react';
import { PLATFORM_SPECS, type MediaSpec, type VideoSpec } from './platform-specs';
import type { PlatformId } from './PlatformIcon';

export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  gmb: 'Google Business',
  reddit: 'Reddit',
  threads: 'Threads',
  bluesky: 'Bluesky',
};

export const ALL_PLATFORM_IDS: PlatformId[] = [
  'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok',
  'youtube', 'pinterest', 'gmb', 'reddit', 'threads', 'bluesky',
];

// Surface = the social-network "place" a deliverable goes. Derived off
// the deliverable label because PLATFORM_SPECS doesn't carry it natively.
export type DeliverableSurface =
  | 'post'
  | 'story'
  | 'reel'
  | 'short'
  | 'long-form'
  | 'link'
  | 'pin'
  | 'thumbnail'
  | 'document';

export const SURFACE_LABEL: Record<DeliverableSurface, string> = {
  post: 'Post',
  story: 'Story',
  reel: 'Reel',
  short: 'Short',
  'long-form': 'Long-form',
  link: 'Link preview',
  pin: 'Pin',
  thumbnail: 'Thumbnail',
  document: 'Document',
};

export function inferSurface(label: string): DeliverableSurface {
  const l = label.toLowerCase();
  // Order matters — earlier matches win. 'Story / Reel' matches 'story'
  // first, the dominant Instagram use case for that combined 9:16 slot.
  if (l.includes('story')) return 'story';
  if (l.includes('reel')) return 'reel';
  if (l.includes('short')) return 'short';
  if (l.includes('long-form')) return 'long-form';
  if (l.includes('thumbnail')) return 'thumbnail';
  if (l.includes('link preview')) return 'link';
  if (l.includes('pin')) return 'pin';
  if (l.includes('document') || l.includes('pdf')) return 'document';
  return 'post';
}

// The canonical per-deliverable key. kind+index make it unique even when
// two specs share a label. Used by BOTH the Create slots and the draft
// detail spec lines so media assignments line up across the two surfaces.
export function deliverableKey(pid: PlatformId, kind: 'image' | 'video', index: number, label: string): string {
  return `${pid}|${kind}|${index}|${label}`;
}

export interface DeliverableRow {
  key: string;
  platform: PlatformId;
  label: string;          // "Feed (1:1)"
  ratio: string;          // "1:1"
  size: string | undefined;
  kind: 'image' | 'video';
  surface: DeliverableSurface;
}

export function buildDeliverableRows(platforms: PlatformId[]): DeliverableRow[] {
  const out: DeliverableRow[] = [];
  for (const pid of platforms) {
    const spec = PLATFORM_SPECS[pid];
    if (!spec) continue;
    spec.images.forEach((img, i) => {
      out.push({
        key: deliverableKey(pid, 'image', i, img.label),
        platform: pid,
        label: img.label,
        ratio: img.ratio,
        size: img.size,
        kind: 'image',
        surface: inferSurface(img.label),
      });
    });
    spec.videos.forEach((vid, i) => {
      out.push({
        key: deliverableKey(pid, 'video', i, vid.label),
        platform: pid,
        label: vid.label,
        ratio: vid.ratio,
        size: vid.size,
        kind: 'video',
        surface: inferSurface(vid.label),
      });
    });
  }
  return out;
}

export interface SpecLine {
  key: string;
  label: string;
  size: string | undefined;
  ratio: string;
  kind: 'image' | 'video';
}

// Flat list of ONE platform's deliverables, same key scheme as
// buildDeliverableRows so a media assignment keyed on the Create page
// resolves on the draft detail page.
export function specLinesFor(pid: PlatformId): SpecLine[] {
  const spec = PLATFORM_SPECS[pid];
  if (!spec) return [];
  const out: SpecLine[] = [];
  spec.images.forEach((img: MediaSpec, i) => out.push({ key: deliverableKey(pid, 'image', i, img.label), label: img.label, size: img.size, ratio: img.ratio, kind: 'image' }));
  spec.videos.forEach((vid: VideoSpec, i) => out.push({ key: deliverableKey(pid, 'video', i, vid.label), label: vid.label, size: vid.size, ratio: vid.ratio, kind: 'video' }));
  return out;
}

// Resolve the media each network should actually post, from a draft's
// per-deliverable crops. For each platform we take its feed/"post" image
// slot (primary + any gallery extras), so per-network posting sends the
// correctly-cropped asset for that network. Video-only networks fall back
// to their first video slot. Platforms with no crops are omitted, so the
// caller can fall back to the shared media for them.
export function mediaByPlatformFromDeliverables(
  mediaByDeliverable: { key: string; url: string }[],
  platforms: string[],
): Record<string, string[]> {
  const dedupe = (arr: string[]) => Array.from(new Set(arr.filter((u) => u && u.trim())));
  const labelOf = (key: string) => key.split('|').slice(3).join('|');
  const out: Record<string, string[]> = {};
  for (const pid of platforms) {
    const imgEntries = mediaByDeliverable.filter((m) => m.key.startsWith(`${pid}|image|`) && m.url.trim());
    if (imgEntries.length > 0) {
      // Prefer the feed/post image slot; otherwise the first image slot.
      const postKey = imgEntries.find((m) => inferSurface(labelOf(m.key)) === 'post')?.key ?? imgEntries[0].key;
      const urls = dedupe(imgEntries.filter((m) => m.key === postKey).map((m) => m.url));
      if (urls.length > 0) out[pid] = urls;
      continue;
    }
    const vidEntries = mediaByDeliverable.filter((m) => m.key.startsWith(`${pid}|video|`) && m.url.trim());
    if (vidEntries.length > 0) {
      const firstKey = vidEntries[0].key;
      const urls = dedupe(vidEntries.filter((m) => m.key === firstKey).map((m) => m.url));
      if (urls.length > 0) out[pid] = urls;
    }
  }
  return out;
}

// CSS aspect-ratio for a "w:h" string (falls back to square).
export function aspectStyle(ratio: string): CSSProperties {
  const m = ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (!m) return { aspectRatio: '1 / 1' };
  return { aspectRatio: `${m[1]} / ${m[2]}` };
}
