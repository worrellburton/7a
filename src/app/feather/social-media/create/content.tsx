'use client';

// Create Post page — landing point for the Build → Continue
// hand-off. Hydrates from the same sessionStorage staging key that
// the old Library → AI path used, then asks the marketer to:
//
//   1. Confirm / edit the caption.
//   2. Pick which networks the post is going to.
//   3. Fill an upload slot for every deliverable that those
//      networks need (one per spec / aspect ratio). Hovering a
//      slot reveals a "Pick from library" overlay; the
//      first staged media URL is also one click away via
//      "Use staged media." A media-URL textbox is the final
//      fallback for assets that live outside the library.
//   4. Hit "Save and ready to go" — that commits a SavedDraft
//      with ready: true + the captured per-deliverable URLs and
//      routes back to Creative > Ready to go.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { uploadFile } from '@/lib/upload';
import { useAuth } from '@/lib/AuthProvider';
import { PlatformIcon, type PlatformId } from '../PlatformIcon';
import { saveDraft, updateDraft, useSavedDrafts } from '../saved-drafts';
import { PostingPausedBanner } from '../PostingStatus';
import { PostPreview } from '../PostPreview';
import { PLATFORM_SPECS } from '../platform-specs';
import {
  PLATFORM_LABELS,
  ALL_PLATFORM_IDS,
  SURFACE_LABEL,
  buildDeliverableRows,
  aspectStyle,
  inferSurface,
  type DeliverableSurface,
} from '../deliverables';

// Mirrors the staging contract pushed by CreativeLibraryPanel.continueToAi.
const STAGING_KEY = 'social_media_creative_staging_v1';

function readStagedMedia(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STAGING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { mediaUrls?: unknown };
    return Array.isArray(parsed.mediaUrls)
      ? (parsed.mediaUrls as unknown[]).filter((u): u is string => typeof u === 'string')
      : [];
  } catch { return []; }
}

function clearStagedMedia() {
  if (typeof window === 'undefined') return;
  try { window.sessionStorage.removeItem(STAGING_KEY); } catch { /* ignore */ }
}

interface LibraryAsset {
  id: string;
  url: string;
  thumbUrl: string;
  kind: 'image' | 'video';
  filename: string | null;
}

export default function CreatePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // When ?edit=<draftId> is present we reopen an existing draft: hydrate the
  // composer from it and update it in place on save (instead of creating new).
  const editId = searchParams.get('edit');
  // Where to send the user on Cancel / after save. When they came from the
  // Post tab (Edit on a Ready row), return there instead of the Compose
  // drafts list so "back" lands on the page they left.
  const fromParam = searchParams.get('from');
  const returnHref = fromParam === 'post'
    ? '/feather/social-media?tab=post'
    : null;
  const { drafts: allDrafts } = useSavedDrafts();
  const hydratedRef = useRef(false);
  const { session, user } = useAuth();
  const [stagedMedia, setStagedMedia] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [generatingCaption, setGeneratingCaption] = useState(false);
  // AI variants — three caption options + hashtag suggestions the user can
  // drop in.
  const [variants, setVariants] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  // The Variants / Improve-with-Claude actions only appear once there's
  // caption text, sliding up from the bottom (Transitions.dev stagger).
  // Mount while text exists; keep mounted briefly on clear so the exit fade
  // can play before unmount.
  const captionHasText = caption.trim().length > 0;
  const [captionActionsMounted, setCaptionActionsMounted] = useState(false);
  const [captionActionsShown, setCaptionActionsShown] = useState(false);
  useEffect(() => {
    if (captionHasText) {
      setCaptionActionsMounted(true);
      const id = window.setTimeout(() => setCaptionActionsShown(true), 10);
      return () => window.clearTimeout(id);
    }
    setCaptionActionsShown(false);
    const t = window.setTimeout(() => setCaptionActionsMounted(false), 240);
    return () => window.clearTimeout(t);
  }, [captionHasText]);
  const [platforms, setPlatforms] = useState<Set<PlatformId>>(() => new Set(['facebook', 'instagram', 'linkedin']));
  // Per-deliverable media URL. Keyed by "${platform}|${label}".
  const [urlByKey, setUrlByKey] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Build library — fetched once on mount; surfaced via a
  // hover-overlay "Pick from library" button on each deliverable
  // slot. The library is the same site_images / site_videos pool
  // the Build (Library) tab renders.
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [pickerForKey, setPickerForKey] = useState<string | null>(null);
  // Library picker opened from the Media card (multi-select add to the
  // post's media set) rather than to fill one slot.
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickSelection, setMediaPickSelection] = useState<Set<string>>(new Set());
  // The slot currently under a media drag (for the drop-target ring).
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  // Crop editor — set to the slot being cropped (with its target ratio).
  const [cropForKey, setCropForKey] = useState<{ key: string; url: string; ratio: string } | null>(null);
  // Gallery — extra images attached to a deliverable beyond its primary,
  // so an image slot can carry a carousel. Keyed by deliverable key.
  const [galleryByKey, setGalleryByKey] = useState<Record<string, string[]>>({});
  // The slot whose gallery is being added to (opens the media picker in
  // append mode — stays open so several can be added in a row).
  const [galleryForKey, setGalleryForKey] = useState<string | null>(null);
  // Active platform tab in the Deliverable Slots section.
  const [activeTab, setActiveTab] = useState<PlatformId | null>(null);

  useEffect(() => {
    // Editing → media comes from the draft (hydrated below), not the
    // Creative-staging handoff, so don't clobber it with stale staging.
    if (editId) return;
    const m = readStagedMedia();
    setStagedMedia(m);
  }, [editId]);

  // Edit mode: hydrate the composer from the saved draft, once, when it
  // resolves from the store. Reconstructs the per-deliverable media (primary
  // + gallery) and the enabled-combo selection from the saved keys, so the
  // checkboxes and slots come back exactly as they were.
  useEffect(() => {
    if (!editId || hydratedRef.current) return;
    const d = allDrafts.find((x) => x.id === editId);
    if (!d) return;
    hydratedRef.current = true;

    setCaption(d.caption ?? '');
    setPlatforms(new Set((d.platforms ?? []) as PlatformId[]));
    setStagedMedia(d.mediaUrls ?? []);

    const byKey: Record<string, string[]> = {};
    for (const { key, url } of d.mediaByDeliverable ?? []) {
      if (!url) continue;
      (byKey[key] ??= []).push(url);
    }
    const primary: Record<string, string> = {};
    const gallery: Record<string, string[]> = {};
    const combos: Record<string, string[]> = {};
    for (const [key, urls] of Object.entries(byKey)) {
      primary[key] = urls[0];
      if (urls.length > 1) gallery[key] = urls.slice(1);
      // key = `${pid}|${kind}|${index}|${label}` → infer the (surface|kind)
      // combo so the deliverable checkbox comes back checked.
      const [pid, kind, , ...labelParts] = key.split('|');
      const label = labelParts.join('|');
      const comboKey = `${inferSurface(label)}|${kind}`;
      (combos[pid] ??= []);
      if (!combos[pid].includes(comboKey)) combos[pid].push(comboKey);
    }
    setUrlByKey(primary);
    setGalleryByKey(gallery);
    // Set enabledCombos before the default-enable effect runs for the new
    // platform set: because it preserves any platform already present in
    // state, our reconstructed selection survives instead of resetting to all.
    if (Object.keys(combos).length > 0) setEnabledCombos(combos);
  }, [editId, allDrafts]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [imagesRes, videosRes] = await Promise.all([
        supabase.from('site_images')
          .select('id, public_url, filename')
          // Recently-used assets bubble to the top across every
          // surface that picks media.
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('site_videos')
          .select('id, video_url, thumbnail_url, filename')
          .order('last_used_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(80),
      ]);
      if (cancelled) return;
      const imageRows = (imagesRes.data ?? []) as Array<{ id: string; public_url: string; filename: string | null }>;
      const videoRows = (videosRes.data ?? []) as Array<{ id: string; video_url: string | null; thumbnail_url: string | null; filename: string | null }>;
      const merged: LibraryAsset[] = [
        ...imageRows.map<LibraryAsset>((r) => ({ id: `img:${r.id}`, url: r.public_url, thumbUrl: r.public_url, kind: 'image', filename: r.filename })),
        ...videoRows
          .filter((r) => Boolean(r.video_url))
          .map<LibraryAsset>((r) => ({ id: `vid:${r.id}`, url: r.video_url as string, thumbUrl: r.thumbnail_url || (r.video_url as string), kind: 'video', filename: r.filename })),
      ];
      setLibraryAssets(merged);
    })();
    return () => { cancelled = true; };
  }, []);

  // All raw rows for the picked platforms, then filtered by the
  // per-platform surface picks from the Deliverables card below.
  const allRows = useMemo(
    () => buildDeliverableRows(Array.from(platforms).sort()),
    [platforms],
  );

  // Per-platform set of (surface, kind) deliverable combos the user wants
  // to produce — images and videos are tracked separately so videos are
  // independently selectable. Value: string[] of `${surface}|${kind}`.
  const [enabledCombos, setEnabledCombos] = useState<Record<string, string[]>>({});

  // Available (surface, kind) combos per selected platform, derived from
  // the raw row set (images first, then videos, per buildDeliverableRows).
  const combosByPlatform = useMemo(() => {
    const out = new Map<PlatformId, { surface: DeliverableSurface; kind: 'image' | 'video' }[]>();
    for (const row of allRows) {
      const list = out.get(row.platform) ?? [];
      const key = `${row.surface}|${row.kind}`;
      if (!list.some((c) => `${c.surface}|${c.kind}` === key)) list.push({ surface: row.surface, kind: row.kind });
      out.set(row.platform, list);
    }
    return out;
  }, [allRows]);

  // Default: when a platform is freshly added, enable every combo it
  // offers (images and videos). The user can then uncheck what they don't want.
  useEffect(() => {
    setEnabledCombos((prev) => {
      const next: Record<string, string[]> = {};
      for (const [pid, combos] of combosByPlatform.entries()) {
        const keys = combos.map((c) => `${c.surface}|${c.kind}`);
        next[pid] = prev[pid]
          // Drop any combos no longer offered (defensive).
          ? prev[pid].filter((k) => keys.includes(k))
          : keys.slice();
      }
      return next;
    });
  }, [combosByPlatform]);

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      const enabled = enabledCombos[r.platform];
      // Until the combo state has caught up with a freshly-added platform,
      // treat everything as enabled so the slots grid isn't briefly empty.
      if (!enabled) return true;
      return enabled.includes(`${r.surface}|${r.kind}`);
    });
  }, [allRows, enabledCombos]);

  // Platform tabs for the slots grid — one per selected platform that
  // actually has enabled deliverables. An unselected platform (or one
  // whose surfaces are all unchecked) gets no tab.
  const tabPlatforms = useMemo(() => {
    const seen: PlatformId[] = [];
    for (const r of rows) if (!seen.includes(r.platform)) seen.push(r.platform);
    return seen;
  }, [rows]);

  useEffect(() => {
    if (tabPlatforms.length === 0) { setActiveTab(null); return; }
    setActiveTab((cur) => (cur && tabPlatforms.includes(cur) ? cur : tabPlatforms[0]));
  }, [tabPlatforms]);

  const visibleRows = useMemo(
    () => (activeTab ? rows.filter((r) => r.platform === activeTab) : rows),
    [rows, activeTab],
  );

  // "Ready" gate: every deliverable slot must carry media. A draft can
  // always be saved; "Save as ready" stays disabled until this is true.
  const allSlotsFilled = useMemo(
    () => rows.length > 0 && rows.every((r) => (urlByKey[r.key] ?? '').trim().length > 0),
    [rows, urlByKey],
  );

  // Per-network caption character budget — platforms hard-reject past the
  // cap (X at 280 is the easy one to blow), so flag any selected network
  // whose limit the caption exceeds.
  const overLimitPlatforms = useMemo(
    () => Array.from(platforms).filter((pid) => {
      const max = PLATFORM_SPECS[pid]?.textMax;
      return typeof max === 'number' && caption.length > max;
    }),
    [platforms, caption],
  );

  // Specific, human reasons "Save as ready" is blocked — surfaced under the
  // save bar so the disabled button is never a mystery.
  const readyBlockers = useMemo(() => {
    const out: string[] = [];
    if (!caption.trim()) out.push('add a caption');
    if (platforms.size === 0) out.push('pick a network');
    if (rows.length > 0) {
      const unfilled = rows.filter((r) => !(urlByKey[r.key] ?? '').trim()).length;
      if (unfilled > 0) out.push(`fill ${unfilled} deliverable slot${unfilled === 1 ? '' : 's'}`);
    }
    if (overLimitPlatforms.length > 0) {
      out.push(`shorten the caption for ${overLimitPlatforms.map((p) => PLATFORM_LABELS[p] ?? p).join(', ')}`);
    }
    return out;
  }, [caption, platforms, rows, urlByKey, overLimitPlatforms]);
  const canSaveReady = allSlotsFilled && readyBlockers.length === 0;

  // Fill just the active platform's slots from staged media (kind-matched).
  const usePrimaryForActivePlatform = () => {
    if (!activeTab) return;
    setUrlByKey((prev) => {
      const next = { ...prev };
      for (const r of rows.filter((row) => row.platform === activeTab)) {
        const match = stagedMedia.find((u) => isVideoUrl(u) === (r.kind === 'video'));
        if (match) next[r.key] = match;
      }
      return next;
    });
  };

  const togglePlatform = (pid: PlatformId) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid); else next.add(pid);
      return next;
    });
  };

  const toggleCombo = (pid: PlatformId, surface: DeliverableSurface, kind: 'image' | 'video') => {
    const key = `${surface}|${kind}`;
    setEnabledCombos((prev) => {
      const list = prev[pid] ?? [];
      const has = list.includes(key);
      const nextList = has ? list.filter((k) => k !== key) : [...list, key];
      return { ...prev, [pid]: nextList };
    });
  };

  // Bulk check / uncheck every deliverable across all selected networks.
  const setAllCombos = (on: boolean) => {
    setEnabledCombos(() => {
      const next: Record<string, string[]> = {};
      for (const [pid, combos] of combosByPlatform.entries()) {
        next[pid] = on ? combos.map((c) => `${c.surface}|${c.kind}`) : [];
      }
      return next;
    });
  };
  // True when every offered combo is currently enabled → the bulk button
  // flips to "Uncheck all".
  const allCombosOn = useMemo(() => {
    let total = 0, onCount = 0;
    for (const [pid, combos] of combosByPlatform.entries()) {
      const enabled = enabledCombos[pid] ?? combos.map((c) => `${c.surface}|${c.kind}`);
      total += combos.length;
      onCount += enabled.filter((k) => combos.some((c) => `${c.surface}|${c.kind}` === k)).length;
    }
    return total > 0 && onCount >= total;
  }, [combosByPlatform, enabledCombos]);

  const usePrimaryForKey = (key: string) => {
    const row = rows.find((r) => r.key === key);
    const want = row?.kind === 'video';
    const match = stagedMedia.find((u) => isVideoUrl(u) === want);
    if (!match) return;
    setUrlByKey((prev) => ({ ...prev, [key]: match }));
  };

  const usePrimaryForAll = () => {
    // Fill each slot with the first staged item of its own kind so a
    // video slot never gets an image (and vice versa).
    setUrlByKey((prev) => {
      const next = { ...prev };
      for (const r of rows) {
        const match = stagedMedia.find((u) => isVideoUrl(u) === (r.kind === 'video'));
        if (match) next[r.key] = match;
      }
      return next;
    });
  };

  // ── Media set (the post's photos/videos) ──────────────────────────
  const isVideoUrl = (u: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);
  const addMediaUrls = (urls: string[]) => {
    setStagedMedia((prev) => {
      const next = [...prev];
      for (const u of urls) if (u && !next.includes(u)) next.push(u);
      return next;
    });
  };
  const removeMedia = (url: string) => {
    setStagedMedia((prev) => prev.filter((u) => u !== url));
  };
  // Fill a single slot (drag-drop / picker target).
  const applyToSlot = (key: string, url: string) => {
    setUrlByKey((prev) => ({ ...prev, [key]: url }));
  };
  // Gallery — append/remove extra images on a deliverable. The primary
  // (urlByKey) is never duplicated into the gallery.
  const addGalleryImage = (key: string, url: string) => {
    setGalleryByKey((prev) => {
      const cur = prev[key] ?? [];
      if (!url || url === (urlByKey[key] ?? '') || cur.includes(url)) return prev;
      return { ...prev, [key]: [...cur, url] };
    });
  };
  const removeGalleryImage = (key: string, url: string) => {
    setGalleryByKey((prev) => ({ ...prev, [key]: (prev[key] ?? []).filter((u) => u !== url) }));
  };
  // Apply one media item to every slot of the SAME kind (image vs video).
  const applyToAll = (url: string) => {
    const vid = isVideoUrl(url);
    setUrlByKey((prev) => {
      const next = { ...prev };
      for (const r of rows) if ((r.kind === 'video') === vid) next[r.key] = url;
      return next;
    });
  };

  const generateCaption = async () => {
    if (!session?.access_token || generatingCaption) return;
    setGeneratingCaption(true);
    setError(null);
    try {
      const r = await fetch('/api/claude/social-caption/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          platforms: Array.from(platforms),
          mediaUrls: stagedMedia,
          // Reuse whatever's in the textbox as a hint — lets the
          // user iterate on a generated caption by tweaking the
          // hint and clicking again.
          hint: caption.trim(),
        }),
      });
      const json = (await r.json().catch(() => ({}))) as { caption?: string; error?: string };
      if (!r.ok || !json.caption) {
        setError(json.error ?? `HTTP ${r.status}`);
        return;
      }
      setCaption(json.caption);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGeneratingCaption(false);
    }
  };

  const generateVariants = async () => {
    if (!session?.access_token || loadingVariants) return;
    setLoadingVariants(true);
    setError(null);
    try {
      const r = await fetch('/api/claude/social-caption/variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ platforms: Array.from(platforms), mediaUrls: stagedMedia, hint: caption.trim() }),
      });
      const json = (await r.json().catch(() => ({}))) as { variants?: string[]; hashtags?: string[]; error?: string };
      if (!r.ok || !json.variants?.length) {
        setError(json.error ?? `HTTP ${r.status}`);
        return;
      }
      setVariants(json.variants);
      setHashtags(json.hashtags ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingVariants(false);
    }
  };

  // Append a hashtag to the caption (idempotent — won't double-add).
  const addHashtag = (tag: string) => {
    const token = `#${tag}`;
    if (new RegExp(`(^|\\s)${token}(\\s|$)`, 'i').test(caption)) return;
    setCaption((prev) => (prev.trimEnd() + (prev.trim() ? ' ' : '') + token));
  };

  const onSave = async (ready: boolean) => {
    if (caption.trim().length === 0) {
      setError('Add a caption before saving.');
      return;
    }
    if (platforms.size === 0) {
      setError('Pick at least one network.');
      return;
    }
    if (ready && !canSaveReady) {
      setError(`Before saving as ready: ${readyBlockers.join('; ')}.`);
      return;
    }

    // Make the Deliverables panel authoritative for what gets saved:
    //  - Only persist media for slots that are actually ENABLED (selected
    //    platform + checked combo). Media dragged onto a slot for a network
    //    or deliverable the user later unchecked stays in urlByKey/galleryByKey
    //    and would otherwise be saved — that's how a Facebook-only post ended
    //    up carrying Instagram + LinkedIn deliverables.
    //  - Drop any selected network whose deliverables are ALL unchecked.
    //    Networks that offer no deliverable specs at all are kept (they post
    //    with the shared media).
    const enabledKeys = new Set(rows.map((r) => r.key));
    const effectivePlatforms = Array.from(platforms).filter((pid) => {
      const offered = combosByPlatform.get(pid)?.length ?? 0;
      if (offered === 0) return true; // posts with the shared media
      // Stay consistent with what's actually rendered/fillable (`rows`):
      // keep the network if any of its deliverable slots are enabled. Using
      // enabledKeys (not enabledCombos[pid] > 0) avoids dropping a network
      // whose combo state is still the transient "all enabled" (undefined),
      // which the slots grid treats as on — the mismatch that let a filled
      // network get silently dropped on save.
      for (const key of enabledKeys) if (key.startsWith(`${pid}|`)) return true;
      return false;
    });
    if (effectivePlatforms.length === 0) {
      setError('Every deliverable is unchecked — pick at least one to post.');
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const mediaByDeliverable = [
        ...Object.entries(urlByKey)
          .filter(([key, url]) => enabledKeys.has(key) && url && url.trim().length > 0)
          .map(([key, url]) => ({ key, url })),
        // Gallery extras ride along as additional rows under the same key.
        ...Object.entries(galleryByKey).flatMap(([key, urls]) =>
          enabledKeys.has(key) ? urls.filter((u) => u && u.trim().length > 0).map((url) => ({ key, url })) : []),
      ];

      // Persist the exact set of checked deliverables so the draft-detail
      // page agrees with the composer about what's "selected" (empty there
      // means "all checked", which previously made a ready post reopen as
      // "not ready"). Same key scheme on both sides (deliverableKey).
      const selectedDeliverables = Array.from(enabledKeys);

      if (editId) {
        // Editing an existing draft → update it in place.
        const ok = await updateDraft(editId, {
          caption: caption.trim(),
          mediaUrls: stagedMedia,
          platforms: effectivePlatforms,
          ready,
          mediaByDeliverable,
          selectedDeliverables,
        });
        if (!ok) {
          setError('Could not save your changes. Try again.');
          return;
        }
      } else {
        const saved = await saveDraft({
          caption: caption.trim(),
          mediaUrls: stagedMedia,
          platforms: effectivePlatforms,
          ready,
          mediaByDeliverable,
          selectedDeliverables,
          createdBy: user?.id ?? null,
          createdByName: ((user?.user_metadata?.full_name as string | undefined) || user?.email) ?? null,
        });
        if (!saved) {
          setError('Could not save the draft. Try again.');
          return;
        }
      }
      clearStagedMedia();
      router.push(returnHref ?? `/feather/social-media?tab=creative&sub=${ready ? 'ai' : 'drafts'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Social Media · {editId ? 'Edit post' : 'Create post'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Build the post · {stagedMedia.length} {stagedMedia.length === 1 ? 'asset' : 'assets'} staged
          </h1>
          <p className="mt-1 text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            Fill the deliverable slots for every network you&apos;re posting to, then save it ready-to-go.
          </p>
        </div>
        <Link
          href={returnHref ?? '/feather/social-media?tab=creative'}
          className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          ← Cancel
        </Link>
      </header>

      <PostingPausedBanner className="mb-4" />

      {/* Platform picker */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
          Networks · {platforms.size}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PLATFORM_IDS.map((pid) => {
            const on = platforms.has(pid);
            return (
              <button
                key={pid}
                type="button"
                onClick={() => togglePlatform(pid)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-semibold transition-colors ${on ? 'bg-primary text-white border-primary' : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'}`}
              >
                <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${on ? 'text-white' : 'text-foreground/55'}`}>
                  <PlatformIcon platform={pid} size={12} />
                </span>
                {PLATFORM_LABELS[pid] ?? pid}
              </button>
            );
          })}
        </div>
      </section>

      {/* Deliverables · per-platform checklist of surfaces
          (Post / Story / Reel / etc). Each selected platform gets
          a row; the surfaces it offers come from the inferred
          DeliverableSurface attached to each row in
          platform-specs.ts. Toggling a surface off filters its
          slots out of the Deliverable Slots grid below. Defaults:
          every surface enabled the moment a platform is picked. */}
      {platforms.size > 0 && combosByPlatform.size > 0 && (
        <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
              Deliverables
            </p>
            <button
              type="button"
              onClick={() => setAllCombos(!allCombosOn)}
              className="text-[10.5px] font-semibold text-primary hover:underline"
            >
              {allCombosOn ? 'Uncheck all' : 'Check all'}
            </button>
          </div>
          <p className="text-[11.5px] text-foreground/50 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
            Pick which surfaces each network gets — photos <span className="inline-flex items-center"><PhotoIcon /></span> and videos <span className="inline-flex items-center"><VideoIcon /></span> are selectable separately. Uncheck the ones you don&rsquo;t want to produce a crop for.
          </p>
          <ul className="divide-y divide-black/5">
            {ALL_PLATFORM_IDS.filter((pid) => platforms.has(pid)).map((pid) => {
              const combos = combosByPlatform.get(pid) ?? [];
              if (combos.length === 0) return null;
              const enabled = enabledCombos[pid] ?? combos.map((c) => `${c.surface}|${c.kind}`);
              return (
                <li key={pid} className="py-2 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 min-w-[6.5rem]">
                    <span className="inline-flex items-center justify-center w-4 h-4 text-foreground/70">
                      <PlatformIcon platform={pid} size={14} />
                    </span>
                    <span className="text-[12.5px] font-semibold text-foreground/85">
                      {PLATFORM_LABELS[pid] ?? pid}
                    </span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {combos.map(({ surface, kind }) => {
                      const key = `${surface}|${kind}`;
                      const on = enabled.includes(key);
                      const isVid = kind === 'video';
                      return (
                        <label
                          key={key}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11.5px] font-semibold cursor-pointer transition-colors ${
                            on
                              ? isVid ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-primary/10 text-primary border-primary/40'
                              : 'bg-white text-foreground/55 border-black/10 hover:bg-warm-bg/60'
                          }`}
                          title={`${SURFACE_LABEL[surface]} ${isVid ? 'video' : 'photo'} for ${PLATFORM_LABELS[pid] ?? pid}`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleCombo(pid, surface, kind)}
                            className={`w-3 h-3 ${isVid ? 'accent-rose-600' : 'accent-primary'}`}
                            aria-label={`${SURFACE_LABEL[surface]} ${isVid ? 'video' : 'photo'} for ${PLATFORM_LABELS[pid] ?? pid}`}
                          />
                          <span className="inline-flex items-center justify-center opacity-70">{isVid ? <VideoIcon /> : <PhotoIcon />}</span>
                          {SURFACE_LABEL[surface]}
                          {isVid && <span className="text-[9px] uppercase tracking-wide opacity-70">video</span>}
                        </label>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── Content page break ── */}
      <div className="flex items-center gap-3 mt-8 mb-4">
        <span className="text-[11px] font-bold tracking-[0.28em] uppercase text-foreground/45">Content</span>
        <span className="flex-1 h-px bg-black/10" />
      </div>

      {/* Caption */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Caption</span>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={5}
          placeholder="Write the post copy…"
          className="w-full px-3 py-2 rounded-md border border-black/10 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ fontFamily: 'var(--font-body)' }}
        />

        {/* Claude actions — only once there's caption text, sliding up from
            the bottom with a staggered reveal (Transitions.dev). */}
        {captionActionsMounted && (
          <div className={`t-stagger flex items-center justify-end gap-1.5 mt-2 ${captionActionsShown ? 'is-shown' : 'is-hiding'}`}>
            <button
              type="button"
              onClick={generateVariants}
              disabled={loadingVariants || !session?.access_token}
              title="Get three caption options + hashtag ideas"
              className="t-stagger-line t-stagger-line--1 inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/30 bg-white text-primary text-[11px] font-semibold hover:bg-primary/5 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <ClaudeMark className="w-3.5 h-3.5" />
              {loadingVariants ? 'Thinking…' : 'Variants'}
            </button>
            <button
              type="button"
              onClick={generateCaption}
              disabled={generatingCaption || !session?.access_token}
              title="Improve this caption with Claude"
              aria-label="Improve caption with Claude"
              className="t-stagger-line t-stagger-line--2 inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary text-[11px] font-semibold hover:bg-primary/10 disabled:opacity-50"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <ClaudeMark className="w-3.5 h-3.5" />
              {generatingCaption ? 'Improving…' : 'Improve with Claude'}
            </button>
            <style jsx>{`
              .t-stagger {
                --stagger-dur: 500ms;
                --stagger-distance: 12px;
                --stagger-stagger: 40ms;
                --stagger-blur: 3px;
                --stagger-ease: cubic-bezier(0.22, 1, 0.36, 1);
              }
              .t-stagger-line {
                opacity: 0;
                transform: translateY(var(--stagger-distance));
                filter: blur(var(--stagger-blur));
                transition:
                  opacity var(--stagger-dur) var(--stagger-ease),
                  transform var(--stagger-dur) var(--stagger-ease),
                  filter var(--stagger-dur) var(--stagger-ease);
                will-change: transform, opacity, filter;
              }
              .t-stagger-line--2 { transition-delay: var(--stagger-stagger); }
              .t-stagger.is-shown .t-stagger-line {
                opacity: 1;
                transform: translateY(0);
                filter: blur(0);
              }
              .t-stagger.is-hiding .t-stagger-line {
                opacity: 0;
                transform: translateY(0);
                filter: blur(0);
                transition:
                  opacity 200ms ease,
                  transform 0s linear,
                  filter 0s linear;
                transition-delay: 0s;
              }
              @media (prefers-reduced-motion: reduce) {
                .t-stagger-line { transition: none !important; }
              }
            `}</style>
          </div>
        )}

        {/* AI variants + hashtag suggestions. */}
        {(variants.length > 0 || hashtags.length > 0) && (
          <div className="mt-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/80">Claude suggestions</span>
              <button type="button" onClick={() => { setVariants([]); setHashtags([]); }} className="text-[10px] text-foreground/45 hover:text-foreground">Dismiss</button>
            </div>
            {variants.length > 0 && (
              <ul className="space-y-1.5 mb-2">
                {variants.map((v, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setCaption(v)}
                      className="w-full text-left rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[12px] text-foreground/85 leading-snug hover:border-primary hover:bg-primary/[0.03] transition-colors"
                      style={{ fontFamily: 'var(--font-body)' }}
                      title="Use this caption"
                    >
                      <span className="line-clamp-3 whitespace-pre-line">{v}</span>
                      <span className="mt-1 inline-block text-[9.5px] font-semibold uppercase tracking-wider text-primary/70">Use this →</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addHashtag(tag)}
                    className="px-2 py-0.5 rounded-full border border-primary/25 bg-white text-[11px] font-semibold text-primary hover:bg-primary/10"
                    title="Add to caption"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Per-network character budget — a network goes red once the
            caption passes its hard cap (e.g. X at 280). */}
        {platforms.size > 0 && caption.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ALL_PLATFORM_IDS.filter((pid) => platforms.has(pid)).map((pid) => {
              const max = PLATFORM_SPECS[pid]?.textMax;
              if (typeof max !== 'number') return null;
              const over = caption.length > max;
              const near = !over && caption.length > max * 0.9;
              return (
                <span
                  key={pid}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-semibold tabular-nums ${
                    over ? 'border-red-300 bg-red-50 text-red-700'
                      : near ? 'border-amber-300 bg-amber-50 text-amber-700'
                      : 'border-black/10 bg-white text-foreground/55'
                  }`}
                  title={`${PLATFORM_LABELS[pid] ?? pid} caption limit ${max.toLocaleString()}`}
                >
                  <span className="inline-flex items-center justify-center w-3 h-3"><PlatformIcon platform={pid} size={11} /></span>
                  {caption.length.toLocaleString()}/{max.toLocaleString()}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Media — the post's photos/videos. Drag a thumbnail onto a
          deliverable slot below, or click "Apply to all". */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">Media · {stagedMedia.length}</span>
          <button
            type="button"
            onClick={() => { setMediaPickSelection(new Set()); setMediaPickerOpen(true); }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            + Add from library
          </button>
        </div>
        <p className="text-[11.5px] text-foreground/50 mb-2.5" style={{ fontFamily: 'var(--font-body)' }}>
          Add the photos and videos for this post, then drag one onto a deliverable slot below — or apply it to every slot.
        </p>
        {stagedMedia.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-warm-bg/30 px-5 py-7 text-center">
            <p className="text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
              No media yet. Click <strong>Add from library</strong>.
            </p>
          </div>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {stagedMedia.map((url) => (
              <li
                key={url}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData('application/x-media-url', url); e.dataTransfer.setData('text/plain', url); e.dataTransfer.effectAllowed = 'copy'; }}
                className="group relative w-24 h-24 rounded-lg overflow-hidden border border-black/10 cursor-grab active:cursor-grabbing"
                title="Drag onto a slot below"
              >
                {isVideoUrl(url) ? (
                  <video src={url} muted playsInline draggable={false} className="w-full h-full object-cover bg-black pointer-events-none" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(url)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/55 text-white text-[12px] leading-none flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  aria-label="Remove"
                >
                  ✕
                </button>
                <button
                  type="button"
                  onClick={() => applyToAll(url)}
                  className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-semibold py-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                  title="Fill every matching slot with this"
                >
                  Apply to all
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Deliverable upload slots */}
      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-5">
        <header className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
              Deliverable slots · {rows.length}
            </p>
            <p className="text-[11.5px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
              One slot per crop the targeted networks need. Drag media from the card above onto a slot, then hover a filled slot to <em>Crop</em> it to that exact ratio.
            </p>
          </div>
          {stagedMedia.length > 0 && rows.length > 0 && (
            <button
              type="button"
              onClick={usePrimaryForAll}
              className="px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
            >
              Use staged media for every slot
            </button>
          )}
        </header>

        {/* Per-platform tabs — only platforms with at least one enabled
            deliverable get a tab. */}
        {rows.length > 0 && tabPlatforms.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {tabPlatforms.map((pid) => {
              const count = rows.filter((r) => r.platform === pid).length;
              const filled = rows.filter((r) => r.platform === pid && (urlByKey[r.key] ?? '').trim()).length;
              const complete = filled === count && count > 0;
              const on = activeTab === pid;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setActiveTab(pid)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11.5px] font-semibold transition-colors ${on ? 'bg-foreground text-white border-foreground' : 'bg-white text-foreground/60 border-black/10 hover:bg-warm-bg/60'}`}
                >
                  <span className="inline-flex items-center justify-center w-3.5 h-3.5">
                    <PlatformIcon platform={pid} size={12} />
                  </span>
                  {PLATFORM_LABELS[pid] ?? pid}
                  <span className={`text-[10px] ${complete ? (on ? 'text-emerald-200' : 'text-emerald-600') : on ? 'text-white/70' : 'text-foreground/40'}`}>
                    {complete ? '✓' : `${filled}/${count}`}
                  </span>
                </button>
              );
            })}
            {activeTab && stagedMedia.length > 0 && (
              <button
                type="button"
                onClick={usePrimaryForActivePlatform}
                className="ml-auto px-2.5 py-1 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
                title={`Fill every ${PLATFORM_LABELS[activeTab] ?? activeTab} slot from your media`}
              >
                Fill {PLATFORM_LABELS[activeTab] ?? activeTab} slots
              </button>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-[12.5px] text-foreground/55 italic" style={{ fontFamily: 'var(--font-body)' }}>
            Pick at least one network above to load its deliverable slots.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleRows.map((row) => {
              const url = urlByKey[row.key] ?? '';
              return (
                <li key={row.key} className="rounded-xl border border-black/10 bg-warm-bg/30 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="inline-flex items-center justify-center w-4 h-4 text-foreground/65">
                      <PlatformIcon platform={row.platform} size={13} />
                    </span>
                    <span className="text-[12px] font-semibold text-foreground">{PLATFORM_LABELS[row.platform] ?? row.platform}</span>
                    <span className="text-foreground/35 text-[10px]">·</span>
                    <span className="text-[11.5px] text-foreground/65 truncate">{row.label}</span>
                    <span className={`ml-auto text-[8.5px] font-semibold uppercase tracking-wider ${row.kind === 'video' ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {row.kind}
                    </span>
                  </div>

                  {/* Preview at the actual aspect ratio so the marketer
                      eyeballs the crop they're filling. Hover reveals
                      a "Pick from library" overlay so the picker can
                      be reached without leaving the row. */}
                  <div
                    onDragOver={(e) => { if (e.dataTransfer.types.includes('application/x-media-url')) { e.preventDefault(); setDragOverKey(row.key); } }}
                    onDragLeave={() => setDragOverKey((k) => (k === row.key ? null : k))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const u = e.dataTransfer.getData('application/x-media-url') || e.dataTransfer.getData('text/plain');
                      if (u) applyToSlot(row.key, u);
                      setDragOverKey(null);
                    }}
                    className={`group relative w-full rounded-md overflow-hidden mb-2 transition-shadow ${url ? '' : 'border-2 border-dashed border-black/15 bg-white'} ${dragOverKey === row.key ? 'ring-2 ring-primary' : ''}`}
                    style={aspectStyle(row.ratio)}
                  >
                    {url ? (
                      isVideoUrl(url) ? (
                        <video src={url} muted playsInline className="w-full h-full object-cover bg-black" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-foreground/35 text-center px-1">
                        {dragOverKey === row.key ? 'Drop to fill' : (<>{row.ratio === 'free' ? 'Any ratio' : row.ratio}{row.size && <span className="ml-1 text-foreground/30">· {row.size}</span>}</>)}
                      </div>
                    )}
                    {/* Action bar — bottom strip so it never hides the
                        image. Always visible on touch (no hover); fade-in
                        on hover for desktop. */}
                    <div className="absolute inset-x-0 bottom-0 flex divide-x divide-white/20 bg-black/55 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setPickerForKey(row.key)}
                        className="flex-1 py-1.5 text-white text-[10.5px] font-semibold uppercase tracking-wider hover:bg-white/10"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        Pick media
                      </button>
                      {url && !isVideoUrl(url) && (
                        <button
                          type="button"
                          onClick={() => setCropForKey({ key: row.key, url, ratio: row.ratio })}
                          className="flex-1 py-1.5 text-white text-[10.5px] font-bold uppercase tracking-wider hover:bg-white/10"
                        >
                          Crop
                        </button>
                      )}
                    </div>
                  </div>

                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrlByKey((prev) => ({ ...prev, [row.key]: e.target.value }))}
                    placeholder="Paste a media URL"
                    className="w-full px-2 py-1.5 rounded-md border border-black/10 text-[11.5px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  {stagedMedia.length > 0 && (
                    <button
                      type="button"
                      onClick={() => usePrimaryForKey(row.key)}
                      className="mt-1.5 w-full px-2 py-1 rounded-md bg-foreground text-white text-[10px] font-semibold uppercase tracking-wider hover:bg-foreground/85"
                    >
                      Use staged media
                    </button>
                  )}

                  {/* Gallery — extra images for a carousel-style deliverable.
                      Only images carousel, so videos don't get the affordance. */}
                  {row.kind === 'image' && (
                    <div className="mt-2">
                      {(galleryByKey[row.key]?.length ?? 0) > 0 && (
                        <ul className="flex flex-wrap gap-1.5 mb-1.5">
                          {(galleryByKey[row.key] ?? []).map((g) => (
                            <li key={g} className="group/g relative w-10 h-10 rounded overflow-hidden border border-black/10">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={g} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(row.key, g)}
                                className="absolute top-0 right-0 w-5 h-5 bg-black/60 text-white text-[10px] leading-none flex items-center justify-center opacity-100 md:opacity-0 md:group-hover/g:opacity-100 transition-opacity"
                                aria-label="Remove gallery image"
                              >
                                ✕
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        onClick={() => setGalleryForKey(row.key)}
                        className="w-full px-2 py-1 rounded-md border border-dashed border-black/20 text-[10px] font-semibold uppercase tracking-wider text-foreground/55 hover:bg-warm-bg/60"
                      >
                        + Add gallery image{(galleryByKey[row.key]?.length ?? 0) > 0 ? ` · ${galleryByKey[row.key]!.length}` : ''}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PostPreview
        caption={caption}
        // Only the ENABLED deliverables (rows) feed the preview, so unchecked
        // surfaces/networks don't show, and each previews at its own ratio.
        deliverables={rows.map((r) => ({ key: r.key, platform: r.platform, surface: r.surface, kind: r.kind, ratio: r.ratio }))}
        mediaFor={(key) => {
          // Only show media that's actually been placed in this deliverable
          // slot — no staged-media fallback — so the preview reflects the
          // real slot state instead of a stand-in image.
          const filled = (urlByKey[key] ?? '').trim();
          return filled ? { url: filled, isVideo: isVideoUrl(filled) } : undefined;
        }}
      />

      {error && <p className="mb-3 text-[12px] text-red-700" role="alert">{error}</p>}

      <div className="flex items-center justify-end gap-2 flex-wrap">
        {!canSaveReady && readyBlockers.length > 0 && (
          <span className="mr-auto text-[11.5px] text-foreground/45" style={{ fontFamily: 'var(--font-body)' }}>
            To <strong className="text-foreground/60">Save as ready</strong>: {readyBlockers.join(' · ')}.
          </span>
        )}
        <Link
          href={returnHref ?? '/feather/social-media?tab=creative'}
          className="px-4 py-2 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
        >
          Cancel
        </Link>
        <button
          type="button"
          onClick={() => onSave(false)}
          disabled={saving}
          className="px-4 py-2 rounded-md border border-black/15 bg-white text-[12px] font-semibold text-foreground/80 hover:bg-warm-bg/60 disabled:opacity-50"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {saving ? 'Saving…' : 'Save as draft'}
        </button>
        <button
          type="button"
          onClick={() => onSave(true)}
          disabled={saving || !canSaveReady}
          title={canSaveReady ? undefined : `To save as ready: ${readyBlockers.join('; ')}`}
          className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {saving ? 'Saving…' : 'Save as ready'}
        </button>
      </div>

      {/* Library picker — two modes. Slot mode (pickerForKey) assigns one
          asset to one slot. Media mode (mediaPickerOpen) multi-selects to
          add to the post's media set. */}
      {(pickerForKey !== null || galleryForKey !== null || mediaPickerOpen) && (() => {
        const closeModal = () => { setPickerForKey(null); setGalleryForKey(null); setMediaPickerOpen(false); setMediaPickSelection(new Set()); };
        const mediaMode = mediaPickerOpen;
        const galleryMode = galleryForKey !== null;
        const openMediaPicker = () => { setPickerForKey(null); setGalleryForKey(null); setMediaPickSelection(new Set()); setMediaPickerOpen(true); };
        // Slot / gallery mode pull ONLY from media already added to the
        // post — and only the kind (image vs video) the slot expects.
        // Galleries are images only.
        const activeKey = pickerForKey ?? galleryForKey;
        const slotRow = activeKey ? rows.find((r) => r.key === activeKey) ?? null : null;
        const slotKind = galleryMode ? 'image' : (slotRow?.kind ?? null);
        const slotMedia = activeKey
          ? stagedMedia.filter((u) => (slotKind === 'video' ? isVideoUrl(u) : !isVideoUrl(u)))
          : [];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            onClick={closeModal}
          >
            <div
              className="w-full max-w-3xl max-h-[80vh] rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="px-5 py-3 border-b border-black/5 flex items-baseline justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{mediaMode ? 'Add media to this post' : galleryMode ? 'Add gallery images' : `Pick a ${slotKind ?? 'media'} for this slot`}</h3>
                  <p className="text-[11.5px] text-foreground/55 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {mediaMode
                      ? `Tap to select, then Add. ${libraryAssets.length} asset${libraryAssets.length === 1 ? '' : 's'} from Build.`
                      : galleryMode
                        ? 'Tap images to add them to this deliverable’s gallery. Only media added to this post shows here.'
                        : 'Only media added to this post shows here.'}
                  </p>
                </div>
                <button type="button" onClick={closeModal} className="text-[11px] text-foreground/55 hover:text-foreground">✕</button>
              </header>
              <div className="flex-1 overflow-y-auto p-4">
                {mediaMode ? (
                  libraryAssets.length === 0 ? (
                    <p className="text-[12.5px] text-foreground/55 italic text-center py-12" style={{ fontFamily: 'var(--font-body)' }}>
                      Library is empty. Upload media via Build first.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                      {libraryAssets.map((a) => {
                        const picked = mediaPickSelection.has(a.url);
                        return (
                          <li key={a.id}>
                            <button
                              type="button"
                              onClick={() => setMediaPickSelection((prev) => { const n = new Set(prev); if (n.has(a.url)) n.delete(a.url); else n.add(a.url); return n; })}
                              className={`relative w-full aspect-square rounded-md overflow-hidden border transition-all ${picked ? 'border-primary ring-2 ring-primary' : 'border-black/10 hover:border-primary hover:ring-2 hover:ring-primary/30'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={a.thumbUrl} alt={a.filename ?? ''} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                              {a.kind === 'video' && (
                                <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-500 text-white">VID</span>
                              )}
                              {picked && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">✓</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )
                ) : slotMedia.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-[13px] font-semibold text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
                      {stagedMedia.length === 0
                        ? 'Please add media to the post to start.'
                        : `No ${slotKind === 'video' ? 'videos' : 'images'} on this post yet.`}
                    </p>
                    <button
                      type="button"
                      onClick={openMediaPicker}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold hover:bg-primary/90"
                    >
                      + Add media to post
                    </button>
                  </div>
                ) : (
                  <ul className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                    {slotMedia.map((u) => {
                      const inGallery = galleryMode && activeKey ? (galleryByKey[activeKey] ?? []).includes(u) : false;
                      return (
                        <li key={u}>
                          <button
                            type="button"
                            onClick={() => {
                              if (galleryMode && activeKey) { addGalleryImage(activeKey, u); /* stay open for more */ }
                              else if (pickerForKey) { applyToSlot(pickerForKey, u); setPickerForKey(null); }
                            }}
                            className={`relative w-full aspect-square rounded-md overflow-hidden border transition-all ${inGallery ? 'border-primary ring-2 ring-primary' : 'border-black/10 hover:border-primary hover:ring-2 hover:ring-primary/30'}`}
                          >
                            {isVideoUrl(u) ? (
                              <video src={u} muted playsInline className="w-full h-full object-cover bg-black" />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u} alt="" className="w-full h-full object-cover" />
                            )}
                            {isVideoUrl(u) && (
                              <span className="absolute top-1 left-1 px-1 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider bg-rose-500 text-white">VID</span>
                            )}
                            {inGallery && <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center">✓</span>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {mediaMode && (
                <div className="px-5 py-3 border-t border-black/5 flex items-center justify-end gap-2">
                  <button type="button" onClick={closeModal} className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60">Cancel</button>
                  <button
                    type="button"
                    disabled={mediaPickSelection.size === 0}
                    onClick={() => { addMediaUrls([...mediaPickSelection]); closeModal(); }}
                    className="px-4 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 disabled:opacity-40"
                  >
                    Add {mediaPickSelection.size || ''}
                  </button>
                </div>
              )}
              {galleryMode && (
                <div className="px-5 py-3 border-t border-black/5 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
                    {activeKey ? (galleryByKey[activeKey]?.length ?? 0) : 0} in this gallery
                  </span>
                  <button type="button" onClick={closeModal} className="px-4 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold hover:bg-primary/90">Done</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {cropForKey && (
        <CropModal
          url={cropForKey.url}
          ratio={cropForKey.ratio}
          onCancel={() => setCropForKey(null)}
          onCropped={(newUrl) => { applyToSlot(cropForKey.key, newUrl); setCropForKey(null); }}
        />
      )}
    </div>
  );
}

// Crop editor — a ratio-locked crop box you drag over the image (with a
// zoom slider). On apply it draws the cropped region to a canvas at full
// resolution, uploads the result to the public-images bucket, and hands
// the new URL back so the deliverable slot points at the cropped asset.
function CropModal({ url, ratio, onCancel, onCropped }: {
  url: string;
  ratio: string;
  onCancel: () => void;
  onCropped: (url: string) => void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dragRef = useRef<{ sx: number; sy: number; bx: number; by: number; bw: number; bh: number } | null>(null);

  const ratioVal = (() => {
    const m = ratio.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    return m ? Number(m[1]) / Number(m[2]) : null;
  })();

  // Display budget is clamped to the viewport so the editor fits on a
  // phone (and re-flows on rotate) instead of overflowing off-screen.
  const [maxW, setMaxW] = useState(520);
  const [maxH, setMaxH] = useState(440);
  useEffect(() => {
    const calc = () => {
      setMaxW(Math.min(520, window.innerWidth - 48));
      setMaxH(Math.min(440, window.innerHeight - 248));
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    if (!im.naturalWidth || !im.naturalHeight) return;
    setNatural({ w: im.naturalWidth, h: im.naturalHeight });
  };

  // (Re)compute the display size + reset the crop box whenever the image
  // or the viewport budget changes (covers small screens + rotation).
  useEffect(() => {
    if (!natural) return;
    const scale = Math.min(maxW / natural.w, maxH / natural.h, 1);
    const dw = natural.w * scale, dh = natural.h * scale;
    setDisplay({ w: dw, h: dh });
    const r = ratioVal ?? (dw / dh);
    let bw = dw, bh = bw / r;
    if (bh > dh) { bh = dh; bw = bh * r; }
    setBox({ x: (dw - bw) / 2, y: (dh - bh) / 2, w: bw, h: bh });
    setZoom(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, maxW, maxH]);

  const applyZoom = (z: number) => {
    if (!box) return;
    const r = ratioVal ?? (display.w / display.h);
    let maxBw = display.w, maxBh = maxBw / r;
    if (maxBh > display.h) { maxBh = display.h; maxBw = maxBh * r; }
    const bw = maxBw * z, bh = maxBh * z;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const nx = Math.max(0, Math.min(display.w - bw, cx - bw / 2));
    const ny = Math.max(0, Math.min(display.h - bh, cy - bh / 2));
    setBox({ x: nx, y: ny, w: bw, h: bh });
    setZoom(z);
  };

  // Pointer events cover mouse, touch, and pen with one path — the old
  // mouse-only handler meant the crop box couldn't be moved on a phone.
  const onBoxPointerDown = (e: React.PointerEvent) => {
    if (!box) return;
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, bx: box.x, by: box.y, bw: box.w, bh: box.h };
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nx = Math.max(0, Math.min(display.w - d.bw, d.bx + (ev.clientX - d.sx)));
      const ny = Math.max(0, Math.min(display.h - d.bh, d.by + (ev.clientY - d.sy)));
      setBox({ x: nx, y: ny, w: d.bw, h: d.bh });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const apply = async () => {
    if (!natural || !box || !imgRef.current) return;
    setBusy(true); setErr(null);
    try {
      const scale = natural.w / display.w;
      const sw = Math.max(1, Math.round(box.w * scale));
      const sh = Math.max(1, Math.round(box.h * scale));
      const canvas = document.createElement('canvas');
      canvas.width = sw; canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not available');
      ctx.drawImage(imgRef.current, Math.round(box.x * scale), Math.round(box.y * scale), sw, sh, 0, 0, sw, sh);
      const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not render the crop'))), 'image/jpeg', 0.92));
      const file = new File([blob], `crop-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { url: newUrl, error } = await uploadFile(file, 'public-images');
      if (error || !newUrl) throw new Error(error || 'Upload failed');
      onCropped(newUrl);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-[600px]" onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-black/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Crop to {ratioVal ? ratio : 'fit'}</h3>
          <button type="button" onClick={onCancel} className="text-[11px] text-foreground/55 hover:text-foreground">✕</button>
        </header>
        <div className="p-4 flex flex-col items-center gap-3">
          <div className="relative select-none leading-none" style={{ width: display.w || undefined, height: display.h || undefined }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={url}
              crossOrigin="anonymous"
              onLoad={onImgLoad}
              alt=""
              draggable={false}
              className="block max-w-none"
              style={{ width: display.w || 'auto', height: display.h || 'auto' }}
            />
            {box && (
              <div
                onPointerDown={onBoxPointerDown}
                className="absolute border-2 border-white cursor-move"
                style={{ left: box.x, top: box.y, width: box.w, height: box.h, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', touchAction: 'none' }}
              />
            )}
          </div>
          <div className="w-full flex items-center gap-2">
            <span className="text-[11px] text-foreground/55">Zoom</span>
            <input type="range" min={0.2} max={1} step={0.01} value={zoom} onChange={(e) => applyZoom(Number(e.target.value))} className="flex-1 accent-primary" />
          </div>
          {err && <p className="text-[12px] text-red-700" role="alert">{err}</p>}
        </div>
        <footer className="px-5 py-3 border-t border-black/5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60">Cancel</button>
          <button type="button" onClick={() => void apply()} disabled={busy || !box} className="px-4 py-1.5 rounded-md bg-primary text-white text-[12px] font-semibold hover:bg-primary/90 disabled:opacity-40">
            {busy ? 'Saving…' : 'Apply crop'}
          </button>
        </footer>
      </div>
    </div>
  );
}

// Tiny photo / video glyphs used on the Deliverable combo chips so it's
// obvious which selections are images vs videos.
function PhotoIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-5-5L5 19" />
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6" width="13" height="12" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 10l5-3v10l-5-3" />
    </svg>
  );
}

// Stylised Anthropic / Claude mark — eight rays radiating from a
// center dot. Used on the "Write with Claude" button so the
// affordance reads as "AI assist" without needing the wordmark.
function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
