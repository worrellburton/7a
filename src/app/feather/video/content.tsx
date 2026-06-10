'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as tus from 'tus-js-client';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';

// Extract a thumbnail JPEG from a video file in the browser. Loads the
// file as an object URL into an off-DOM <video>, seeks to ~1s (or 10%
// in for very short clips), draws the frame onto a canvas, exports a
// JPEG blob. Returns null if the browser can't decode the format —
// caller falls back to "no thumbnail" rather than failing the upload.
async function extractVideoThumbnail(
  file: File,
  maxEdge = 720,
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
      };
      video.onloadedmetadata = () => { cleanup(); resolve(); };
      video.onerror = () => { cleanup(); reject(new Error('video metadata load failed')); };
    });

    const target = Math.min(1, Math.max(0.1, (video.duration || 1) * 0.1));
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.onseeked = null;
        video.onerror = null;
      };
      video.onseeked = () => { cleanup(); resolve(); };
      video.onerror = () => { cleanup(); reject(new Error('video seek failed')); };
      video.currentTime = target;
    });

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_VIDEO_MODEL_ID,
  VIDEO_MODELS,
  estimateVideoCostUSD,
  findVideoModel,
  findVideoModelByEndpoint,
  videoModelFamilies,
} from '@/lib/videoModels';

interface SiteImage {
  id: string;
  public_url: string;
  filename: string;
  alt: string | null;
}

interface SiteVideo {
  id: string;
  source_image_id: string | null;
  request_id: string | null;
  model_endpoint: string;
  prompt: string | null;
  duration_seconds: number | null;
  resolution: string | null;
  aspect_ratio: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  error: string | null;
  seed: number | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_processed_at: string | null;
  filename: string | null;
  debug_info: {
    last_polled_at?: string;
    queued_for_seconds?: number;
    app_id?: string;
    request_id?: string;
    status_url?: string;
    fal_status_http?: number;
    fal_status?: string;
    fal_logs?: string[];
    fal_error_body?: string;
    audio_status?: string;
  } | null;
}

export default function VideoContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();
  const [images, setImages] = useState<SiteImage[]>([]);
  const [videos, setVideos] = useState<SiteVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SiteImage | null>(null);
  const [prompt, setPrompt] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [modelId, setModelId] = useState<string>(DEFAULT_VIDEO_MODEL_ID);
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('720p');
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<SiteVideo | null>(null);
  // Persistent, copyable upload error. Toasts disappear before users
  // can read them, which made debugging "this didn't work" painful.
  // Anything thrown by the sign / upload / finalize flow is captured
  // here as a multi-line block the user can paste back to support.
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Real-time upload progress so 100+ MB videos don't look frozen.
  // Driven by XMLHttpRequest's upload.onprogress (fetch can't observe
  // bytes-sent), then rendered as an inline progress bar with a size
  // readout next to the upload zone.
  const [uploadProgress, setUploadProgress] = useState<{
    fileName: string;
    loaded: number;
    total: number;
  } | null>(null);
  // Multi-file batch state. uploadVideoFiles fans out to repeated
  // single-file uploads sequentially; this lets the UI render
  // "Uploading 2 of 5" above the per-file bytes bar so the user
  // can tell the queue isn't stuck.
  const [uploadQueue, setUploadQueue] = useState<{ total: number; doneCount: number } | null>(null);
  // SEO batch runner — mirrors the SEO Images flow on /app/images.
  // Walks every completed video that hasn't been SEO-processed yet,
  // calls Claude to generate alt + title + description from the
  // prompt + thumbnail, persists, and updates the row in place.
  const [seoRunning, setSeoRunning] = useState(false);
  const [seoProgress, setSeoProgress] = useState<{ done: number; total: number; videoId?: string }>({ done: 0, total: 0 });
  const seoAbortRef = useRef(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  // Re-render every second while any tile is pending so the time-based
  // progress bar animates smoothly between the 5s status polls.
  const [, setProgressTick] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const selectedModel = useMemo(
    () => findVideoModel(modelId) || VIDEO_MODELS[0],
    [modelId],
  );

  // If the current duration/resolution/aspect aren't supported by the
  // newly-selected model, clamp to the model's first supported value.
  useEffect(() => {
    if (!selectedModel.durations.includes(duration)) {
      setDuration(selectedModel.durations[0]);
    }
    if (selectedModel.resolutions.length && !selectedModel.resolutions.includes(resolution)) {
      setResolution(selectedModel.resolutions[0]);
    }
    if (selectedModel.aspects.length && !selectedModel.aspects.includes(aspectRatio)) {
      setAspectRatio(selectedModel.aspects[0]);
    }
  }, [selectedModel, duration, resolution, aspectRatio]);

  const estimatedCost = estimateVideoCostUSD(selectedModel, duration, resolution);

  const loadImages = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_images')
      .select('id, public_url, filename, alt')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[video] images load failed', error);
      return;
    }
    setImages((data || []) as SiteImage[]);
  }, []);

  const loadVideos = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_videos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      // Migration likely hasn't been applied yet; degrade to empty list
      // so the rest of the page still renders.
      console.error('[video] videos load failed', error);
      setVideos([]);
      setLoading(false);
      return;
    }
    setVideos((data || []) as SiteVideo[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!session?.access_token) return;
    loadImages();
    loadVideos();
  }, [session, loadImages, loadVideos]);

  // Advance the progress bar smoothly between status polls.
  useEffect(() => {
    const anyPending = videos.some((v) => v.status === 'queued' || v.status === 'in_progress');
    if (!anyPending) return;
    const id = setInterval(() => setProgressTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [videos]);

  // Poll in-flight videos every 5s until they resolve. One interval
  // runs the batch to keep network usage predictable.
  useEffect(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    const pending = videos.filter((v) => v.status === 'queued' || v.status === 'in_progress');
    if (pending.length === 0 || !session?.access_token) return;

    pollTimer.current = setInterval(async () => {
      for (const v of pending) {
        try {
          const res = await fetch(`/api/fal/video/status?id=${v.id}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (!res.ok) continue;
          const json = (await res.json()) as { video?: SiteVideo };
          if (json.video) {
            setVideos((prev) => prev.map((x) => (x.id === json.video!.id ? json.video! : x)));
          }
        } catch {
          // Ignore transient errors — next tick will retry.
        }
      }
    }, 5000);

    return () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [videos, session?.access_token]);

  // Esc closes lightbox / picker.
  useEffect(() => {
    if (!lightbox && !pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightbox) setLightbox(null);
      else if (pickerOpen) setPickerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, pickerOpen]);

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Could not copy — select the URL manually');
    }
  }

  async function submitJob() {
    if (!selectedImage) {
      showToast('Pick a source image first');
      return;
    }
    if (!session?.access_token) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/fal/video/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          imageId: selectedImage.id,
          imageUrl: selectedImage.public_url,
          prompt: [stylePrompt.trim(), prompt.trim()].filter(Boolean).join(' '),
          duration,
          resolution,
          aspectRatio,
          model: selectedModel.id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(json?.error || `Request failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      const video = json.video as SiteVideo | undefined;
      if (video) {
        setVideos((prev) => [video, ...prev]);
        setPrompt('');
        showToast('Video queued — will update when ready');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Batch entry point. Filters out non-video / oversize files, then
  // walks the remainder sequentially calling uploadVideoFile. Setting
  // uploadQueue lets the UI render "Uploading 2 of 5" above the
  // per-file progress bar.
  async function uploadVideoFiles(files: File[]) {
    if (!session?.access_token) return;
    const videos: File[] = [];
    const skipped: string[] = [];
    const oversize: string[] = [];
    const MAX_BYTES = 300 * 1024 * 1024;
    for (const f of files) {
      if (!f.type.startsWith('video/')) skipped.push(f.name);
      else if (f.size > MAX_BYTES) oversize.push(f.name);
      else videos.push(f);
    }
    if (skipped.length) showToast(`Skipped ${skipped.length} non-video file${skipped.length === 1 ? '' : 's'}`);
    if (oversize.length) showToast(`Skipped ${oversize.length} file${oversize.length === 1 ? '' : 's'} over 300 MB`);
    if (videos.length === 0) return;

    setUploadQueue({ total: videos.length, doneCount: 0 });
    for (let i = 0; i < videos.length; i++) {
      setUploadQueue({ total: videos.length, doneCount: i });
      await uploadVideoFile(videos[i]);
    }
    setUploadQueue(null);
    if (videos.length > 1) showToast(`Uploaded ${videos.length} videos`);
  }

  async function uploadVideoFile(file: File) {
    if (!session?.access_token) return;
    if (!file.type.startsWith('video/')) {
      showToast(`Expected a video file, got ${file.type || 'unknown type'}`);
      return;
    }
    // Bucket file_size_limit on Supabase is also 300 MB; checking
    // client-side gives a friendly toast instead of a 413 from
    // storage halfway through the upload.
    const MAX_BYTES = 300 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      showToast(`Video is ${(file.size / 1024 / 1024).toFixed(0)} MB — limit is 300 MB. Compress with HandBrake or upload to YouTube and embed the URL.`);
      return;
    }

    // Build a rich error report when any stage fails so the user
    // can paste the full context back to engineering.
    const reportError = (stage: string, detail: string, extra?: Record<string, unknown>) => {
      const lines = [
        `Stage: ${stage}`,
        `Detail: ${detail}`,
        `File: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB, ${file.type || 'unknown type'})`,
        `User: ${user?.email ?? user?.id ?? 'unknown'}`,
        `When: ${new Date().toISOString()}`,
        `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
      ];
      if (extra) {
        for (const [k, v] of Object.entries(extra)) {
          lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
        }
      }
      const block = lines.join('\n');
      // eslint-disable-next-line no-console
      console.error('[video upload] failed', block);
      setUploadError(block);
      showToast(`Upload failed at ${stage} — see banner above for details`);
    };

    setUploading(true);
    setUploadError(null);
    try {
      // 1. Mint a signed upload URL on the server. The bytes never
      //    pass through Vercel (4.5 MB body cap) — they go straight
      //    from the browser to Supabase Storage.
      let signRes: Response;
      try {
        signRes = await fetch('/api/fal/video/sign-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ filename: file.name }),
        });
      } catch (netErr) {
        reportError('sign-upload (network)', netErr instanceof Error ? netErr.message : String(netErr));
        return;
      }
      let signed: { videoId?: string; path?: string; token?: string; error?: string };
      try {
        signed = await signRes.json();
      } catch (parseErr) {
        reportError('sign-upload (parse)', `HTTP ${signRes.status} returned non-JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`, { status: signRes.status });
        return;
      }
      if (!signRes.ok) {
        reportError('sign-upload', signed?.error || `HTTP ${signRes.status}`, { status: signRes.status, body: signed });
        return;
      }
      const { videoId, path } = signed as { videoId: string; path: string };
      if (!videoId || !path) {
        reportError('sign-upload (shape)', 'sign-upload response missing videoId/path', { body: signed });
        return;
      }
      const thumbInfo = (signed as { thumb?: { path: string; token: string; signedUrl: string } | null }).thumb ?? null;

      // 2. Upload directly to storage via TUS resumable. The standard
      //    PUT path 413's anywhere over ~50–100 MB regardless of the
      //    bucket's file_size_limit (Supabase has a separate body cap
      //    on standard uploads). TUS chunks the file at 6 MB and has
      //    built-in progress events.
      //
      //    Auth: we use the user's session JWT directly (Supabase
      //    docs' canonical pattern) instead of the
      //    createSignedUploadUrl token in x-signature. The signed-
      //    URL approach 403'd with "Invalid Compact JWS" — the
      //    resumable endpoint expects a real Supabase JWT, not the
      //    signed-upload token shape. The "public-images write" RLS
      //    policy already allows any authenticated user to INSERT,
      //    so this works without new policies.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        reportError('upload-to-storage (config)', 'NEXT_PUBLIC_SUPABASE_URL is not set in the browser env');
        return;
      }
      // Direct storage subdomain is the recommended host for big
      // resumable uploads — it bypasses the API gateway and is
      // documented as more performant. Falls back to the default URL
      // host on self-hosted setups where the storage subdomain
      // doesn't exist.
      const tusEndpoint = (() => {
        try {
          const u = new URL(supabaseUrl);
          if (u.host.endsWith('.supabase.co')) {
            const projectId = u.host.split('.')[0];
            return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
          }
          return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`;
        } catch {
          return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`;
        }
      })();

      setUploadProgress({ fileName: file.name, loaded: 0, total: file.size });
      const tusErr = await new Promise<{ message: string; statusCode?: number } | null>((resolve) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'true',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          chunkSize: 6 * 1024 * 1024,
          metadata: {
            bucketName: 'public-images',
            objectName: path,
            contentType: file.type || 'video/mp4',
            cacheControl: '31536000',
          },
          onError: (err) => {
            const anyErr = err as Error & { originalResponse?: { getStatus: () => number; getBody: () => string } };
            const status = anyErr.originalResponse?.getStatus();
            const body = anyErr.originalResponse?.getBody?.();
            resolve({
              message: anyErr.message || String(err),
              statusCode: typeof status === 'number' ? status : undefined,
              ...(body ? { body: body.slice(0, 400) } : {}),
            } as { message: string; statusCode?: number });
          },
          onProgress: (loaded, total) => {
            setUploadProgress({ fileName: file.name, loaded, total });
          },
          onSuccess: () => {
            setUploadProgress({ fileName: file.name, loaded: file.size, total: file.size });
            resolve(null);
          },
        });
        upload.start();
      });
      if (tusErr) {
        reportError('upload-to-storage (tus)', tusErr.message, {
          path,
          statusCode: tusErr.statusCode,
        });
        return;
      }

      // 2b. Best-effort thumbnail extraction. If decoding fails or the
      //     mint route didn't hand back a thumb URL, we just upload the
      //     video without one — the gallery tile shows a placeholder
      //     instead of crashing the upload.
      let uploadedThumbPath: string | null = null;
      if (thumbInfo) {
        try {
          const thumb = await extractVideoThumbnail(file);
          if (thumb && thumb.size > 0) {
            const thumbPutUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/upload/sign/public-images/${thumbInfo.path
              .split('/')
              .map(encodeURIComponent)
              .join('/')}?token=${encodeURIComponent(thumbInfo.token)}`;
            const thumbRes = await fetch(thumbPutUrl, {
              method: 'PUT',
              headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
              body: thumb,
            });
            if (thumbRes.ok) {
              uploadedThumbPath = thumbInfo.path;
            } else {
              // eslint-disable-next-line no-console
              console.warn('[video upload] thumbnail PUT failed', thumbRes.status, await thumbRes.text().catch(() => ''));
            }
          }
        } catch (thumbErr) {
          // eslint-disable-next-line no-console
          console.warn('[video upload] thumbnail extraction skipped', thumbErr);
        }
      }

      // 3. Tell the server the bytes landed; it stamps public_url
      //    + status='completed' and returns the row.
      let finRes: Response;
      try {
        finRes = await fetch('/api/fal/video/finalize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ videoId, path, thumbPath: uploadedThumbPath }),
        });
      } catch (netErr) {
        reportError('finalize (network)', netErr instanceof Error ? netErr.message : String(netErr), { videoId, path });
        return;
      }
      let finJson: { video?: SiteVideo; error?: string };
      try {
        finJson = await finRes.json();
      } catch (parseErr) {
        reportError('finalize (parse)', `HTTP ${finRes.status} returned non-JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`, { status: finRes.status, videoId, path });
        return;
      }
      if (!finRes.ok) {
        reportError('finalize', finJson?.error || `HTTP ${finRes.status}`, { status: finRes.status, body: finJson, videoId, path });
        return;
      }
      const video = finJson.video;
      if (video) {
        setVideos((prev) => [video, ...prev]);
        setUploadError(null);
        showToast('Video uploaded');
      } else {
        reportError('finalize (shape)', 'finalize response missing `video`', { body: finJson });
      }
    } catch (err) {
      reportError('uncaught', err instanceof Error ? `${err.name}: ${err.message}` : String(err), {
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }

  const runSeoBatch = useCallback(
    async (onlyIds?: string[]) => {
      if (!session?.access_token) return;
      const token = session.access_token;

      // Pick targets: explicit ids if given, otherwise every completed
      // playable row that hasn't been SEO-processed yet. Failed and
      // queued rows are ignored — there's no thumbnail to read.
      const targets = (onlyIds
        ? videos.filter((v) => onlyIds.includes(v.id))
        : videos.filter(
            (v) => v.status === 'completed' && !!v.video_url && !v.seo_processed_at,
          )
      ).slice();

      if (targets.length === 0) {
        showToast('Nothing to do — every video already has SEO metadata.');
        return;
      }

      setSeoRunning(true);
      seoAbortRef.current = false;
      setSeoProgress({ done: 0, total: targets.length });

      let done = 0;
      for (const v of targets) {
        if (seoAbortRef.current) break;
        setSeoProgress({ done, total: targets.length, videoId: v.id });
        try {
          const res = await fetch('/api/claude/videos/seo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ videoId: v.id }),
          });
          const json = (await res.json().catch(() => ({}))) as { video?: SiteVideo; error?: string };
          if (res.ok && json.video) {
            const updated = json.video;
            setVideos((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
          } else {
            // eslint-disable-next-line no-console
            console.warn('[seo-video] failed', v.id, json.error || res.status);
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[seo-video] network error', v.id, err);
        }
        done += 1;
        setSeoProgress({ done, total: targets.length });
      }

      setSeoRunning(false);
      seoAbortRef.current = false;
      showToast(
        seoAbortRef.current
          ? `SEO pass canceled after ${done}/${targets.length}.`
          : `SEO pass done — ${done}/${targets.length} clips updated.`,
      );
    },
    [session, videos],
  );

  // ?autoRun=1 (e.g. the "SEO Video" button on /app/seo) kicks off a
  // gallery pass automatically once the videos list has loaded. Mirrors
  // the same pattern used on /app/images.
  const searchParams = useSearchParams();
  const autoRunRequested = searchParams?.get('autoRun') === '1';
  const autoRunFiredRef = useRef(false);
  useEffect(() => {
    if (!autoRunRequested || autoRunFiredRef.current) return;
    if (loading) return;
    if (!user || !session?.access_token) return;
    autoRunFiredRef.current = true;
    void runSeoBatch();
  }, [autoRunRequested, loading, user, session?.access_token, runSeoBatch]);

  async function deleteVideo(v: SiteVideo) {
    const ok = await confirm('Delete this video?', {
      message: 'The generated clip will be removed from the gallery. Anything linking to this URL will break.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    const { error } = await supabase.from('site_videos').delete().eq('id', v.id);
    if (error) {
      showToast(`Delete failed: ${error.message}`);
      return;
    }
    setVideos((prev) => prev.filter((x) => x.id !== v.id));
    showToast('Video removed');
  }

  const imagesById = new Map(images.map((i) => [i.id, i]));

  if (!user) return null;

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Video</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Animate any image from the Images gallery into a short clip with fal.ai video models, or upload an existing video. Click a generated or uploaded video to copy its URL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (seoRunning ? (seoAbortRef.current = true) : runSeoBatch())}
            disabled={false}
            title={
              seoRunning
                ? 'Cancel after the current clip finishes.'
                : 'Run an SEO pass on every completed clip that hasn\'t been optimized yet (alt + title + description from prompt + thumbnail).'
            }
            className="inline-flex items-center gap-1.5 rounded-xl bg-foreground text-white px-3 py-2.5 text-sm font-semibold hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M8 11h6M11 8v6" />
            </svg>
            {seoRunning
              ? `Cancel · ${seoProgress.done}/${seoProgress.total}`
              : 'SEO Video'}
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) void uploadVideoFiles(files);
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-disabled={uploading}
            aria-label="Upload video — click or drop a video file"
            onClick={() => { if (!uploading) uploadInputRef.current?.click(); }}
            onKeyDown={(e) => {
              if (uploading) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                uploadInputRef.current?.click();
              }
            }}
            onDragEnter={(e) => {
              if (uploading) return;
              if (Array.from(e.dataTransfer.types || []).includes('Files')) {
                e.preventDefault();
                setDragOver(true);
              }
            }}
            onDragOver={(e) => {
              if (uploading) return;
              if (Array.from(e.dataTransfer.types || []).includes('Files')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setDragOver(true);
              }
            }}
            onDragLeave={(e) => {
              // Don't flicker when moving across child elements.
              if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
              setDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (uploading) return;
              const files = Array.from(e.dataTransfer.files ?? []);
              if (files.length > 0) void uploadVideoFiles(files);
            }}
            className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer select-none border-2 border-dashed shadow-sm ${
              uploading
                ? 'bg-white text-foreground/50 border-gray-200 cursor-wait'
                : dragOver
                  ? 'bg-primary/5 text-primary border-primary'
                  : 'bg-white text-foreground border-gray-200 hover:border-primary/40 hover:text-primary'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Uploading…
              </>
            ) : dragOver ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="m7 8 5-5 5 5" />
                  <rect x="3" y="15" width="18" height="6" rx="2" />
                </svg>
                Drop video to upload
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="m7 8 5-5 5 5" />
                  <rect x="3" y="15" width="18" height="6" rx="2" />
                </svg>
                Drop video or click to upload
              </>
            )}
          </div>
        </div>
      </div>

      {uploadQueue && uploadQueue.total > 1 && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2 text-[12px] text-foreground/75 flex items-center gap-3" style={{ fontFamily: 'var(--font-body)' }}>
          <span className="font-mono tabular-nums text-primary font-semibold">
            {Math.min(uploadQueue.doneCount + 1, uploadQueue.total)} / {uploadQueue.total}
          </span>
          <span>
            Uploading {uploadQueue.total} videos in queue. The page can stay open in the background.
          </span>
        </div>
      )}

      {uploadProgress && (
        <div className="mb-6 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm" style={{ fontFamily: 'var(--font-body)' }}>
          {(() => {
            const { fileName, loaded, total } = uploadProgress;
            const pct = total > 0 ? Math.min(100, (loaded / total) * 100) : 0;
            const mb = (n: number) => (n / 1024 / 1024).toFixed(1);
            return (
              <>
                <div className="flex items-center justify-between text-[12px] text-foreground/70 mb-2">
                  <span className="truncate max-w-[60%]" title={fileName}>
                    {pct >= 100 ? 'Finalizing… ' : 'Uploading '}
                    <span className="text-foreground/50">{fileName}</span>
                  </span>
                  <span className="font-mono tabular-nums text-[11px]">
                    {mb(loaded)} / {mb(total)} MB · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-[width] duration-150 ease-linear"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </>
            );
          })()}
        </div>
      )}

      {uploadError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="font-semibold">Video upload failed.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (uploadError) {
                    navigator.clipboard?.writeText(uploadError).then(
                      () => showToast('Error details copied'),
                      () => showToast('Could not copy — select the text manually'),
                    );
                  }
                }}
                className="text-[11px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md bg-red-700 text-white hover:bg-red-800"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-[11px] font-semibold text-red-700/70 hover:text-red-900"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-[12px] leading-snug bg-white/60 border border-red-100 rounded-md p-2 max-h-64 overflow-auto select-text">
{uploadError}
          </pre>
          <p className="mt-2 text-[11px] text-red-700/75">
            Click <strong>Copy</strong> and paste this whole block into chat — that gives me everything I need to diagnose.
          </p>
        </div>
      )}

      {/* Create form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-8">
        <div className="grid md:grid-cols-[220px_1fr] gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative aspect-square rounded-xl overflow-hidden bg-warm-bg border-2 border-dashed border-gray-200 hover:border-primary/40 transition-colors flex items-center justify-center group"
          >
            {selectedImage ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage.public_url}
                  alt={selectedImage.alt || selectedImage.filename}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground/80" style={{ fontFamily: 'var(--font-body)' }}>
                    Change image
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center px-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                  Pick source image
                </p>
                <p className="text-[11px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Choose from your Images gallery
                </p>
              </div>
            )}
          </button>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                Style / Lead Prompt
              </label>
              <textarea
                value={stylePrompt}
                onChange={(e) => setStylePrompt(e.target.value)}
                rows={2}
                placeholder="Optional — high-level style directive prepended to every generation. E.g. 'warm golden-hour grade, documentary feel, 24fps film grain.'"
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-warm-bg/40 border border-gray-100 focus:bg-white focus:border-primary focus:outline-none resize-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <p className="mt-1 text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                Prepended before the cinematic directive so style/tone wins.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Optional — add motion or scene detail. E.g. 'camera slowly pans right as the horses graze, soft desert light, subtle dust kick-up.'"
                className="w-full text-sm px-3 py-2.5 rounded-lg bg-warm-bg/40 border border-gray-100 focus:bg-white focus:border-primary focus:outline-none resize-none"
                style={{ fontFamily: 'var(--font-body)' }}
              />
              <p className="mt-1 text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                “Turn into a cinematic video.” is always sent first; anything above is appended.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                Model
              </label>
              <select
                value={selectedModel.id}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full text-sm px-2 py-2 rounded-lg bg-white border border-gray-200 focus:border-primary focus:outline-none"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {videoModelFamilies().map(({ family, models }) => (
                  <optgroup key={family} label={family}>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                {selectedModel.description}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full text-sm px-2 py-2 rounded-lg bg-white border border-gray-200 focus:border-primary focus:outline-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {selectedModel.durations.map((d) => (
                    <option key={d} value={d}>
                      {d}s
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  disabled={selectedModel.resolutions.length === 0}
                  className="w-full text-sm px-2 py-2 rounded-lg bg-white border border-gray-200 focus:border-primary focus:outline-none disabled:bg-warm-bg/50 disabled:text-foreground/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {selectedModel.resolutions.length === 0 ? (
                    <option value="">n/a</option>
                  ) : (
                    selectedModel.resolutions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                  Aspect
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  disabled={selectedModel.aspects.length === 0}
                  className="w-full text-sm px-2 py-2 rounded-lg bg-white border border-gray-200 focus:border-primary focus:outline-none disabled:bg-warm-bg/50 disabled:text-foreground/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {selectedModel.aspects.length === 0 ? (
                    <option value="">n/a</option>
                  ) : (
                    selectedModel.aspects.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                {estimatedCost != null ? (
                  <>
                    <span className="font-semibold text-foreground/70">Est. ${estimatedCost.toFixed(2)}</span>
                    <span className="text-foreground/40"> per generation · billed by fal.ai</span>
                  </>
                ) : (
                  <span className="text-foreground/40">Cost varies — billed by fal.ai</span>
                )}
              </p>
              <button
                type="button"
                disabled={!selectedImage || submitting}
                onClick={submitJob}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Queuing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Generate video{estimatedCost != null ? ` · $${estimatedCost.toFixed(2)}` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video gallery */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            No videos yet. Pick a source image above and hit Generate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((v) => {
            const source = v.source_image_id ? imagesById.get(v.source_image_id) : null;
            const isPending = v.status === 'queued' || v.status === 'in_progress';
            const isFailed = v.status === 'failed';
            // Time-based progress estimate — fal.ai doesn't hand us a real
            // percentage, so we approximate from elapsed / typical.
            const pendingModel = isPending ? findVideoModelByEndpoint(v.model_endpoint) : null;
            const elapsedSec = isPending ? Math.max(0, (Date.now() - new Date(v.created_at).getTime()) / 1000) : 0;
            const typicalSec = pendingModel ? pendingModel.typicalSeconds(v.duration_seconds, v.resolution) : 60;
            const progressFraction = isPending ? Math.min(0.98, elapsedSec / Math.max(typicalSec, 1)) : 0;
            const etaSec = isPending ? Math.max(0, Math.round(typicalSec - elapsedSec)) : 0;
            return (
              <div key={v.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
                <button
                  type="button"
                  onClick={() => {
                    if (v.video_url) {
                      setLightbox(v);
                    } else if (v.status === 'failed') {
                      showToast(v.error || 'Generation failed');
                    }
                  }}
                  className="relative aspect-video w-full block bg-foreground/90 overflow-hidden"
                  title={v.video_url ? 'Play' : v.status}
                >
                  {v.thumbnail_url || source?.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={v.thumbnail_url || source?.public_url || ''}
                      alt={source?.filename || 'video thumbnail'}
                      className={`absolute inset-0 h-full w-full object-cover transition-all ${isPending ? 'opacity-40 blur-sm scale-105' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-warm-bg" />
                  )}
                  {isPending && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 text-foreground text-xs font-semibold shadow" style={{ fontFamily: 'var(--font-body)' }}>
                          <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          {v.status === 'queued'
                            ? 'In queue'
                            : `Generating… ${Math.round(progressFraction * 100)}%`}
                          {v.status === 'in_progress' && etaSec > 0 && (
                            <span className="text-foreground/50 font-normal"> · ~{etaSec}s</span>
                          )}
                        </div>
                      </div>
                      <div className="absolute left-0 right-0 bottom-0 h-1.5 bg-black/30">
                        <div
                          className="h-full bg-primary transition-[width] duration-1000 ease-linear"
                          style={{ width: `${Math.round(progressFraction * 100)}%` }}
                        />
                      </div>
                    </>
                  )}
                  {v.video_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition-colors">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity w-12 h-12 rounded-full bg-white/90 text-foreground flex items-center justify-center shadow">
                        <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </span>
                    </div>
                  )}
                  {isFailed && (
                    <div className="absolute inset-0 bg-red-950/60 flex items-center justify-center p-3 text-center">
                      <span className="text-white text-xs font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
                        Failed — click for details
                      </span>
                    </div>
                  )}
                </button>
                <div className="p-3">
                  {(() => {
                    // Title priority:
                    //   1. seo_title — written by the SEO Video pass; the
                    //      richest, most human-readable label we have.
                    //   2. prompt — the fal generation prompt; obviously
                    //      meaningful for fal-generated clips.
                    //   3. filename — original upload name (only present
                    //      on rows uploaded after the filename column was
                    //      added on 4/25).
                    //   4. "Uploaded video" — direct uploads that pre-date
                    //      the filename column, so we have nothing else.
                    //   5. "No prompt" — fal-generated rows missing a prompt.
                    const isUpload = v.model_endpoint === 'upload/direct';
                    const title =
                      v.seo_title ||
                      v.prompt ||
                      v.filename ||
                      (isUpload ? 'Uploaded video' : null);
                    const subtitle = v.seo_title
                      ? (v.prompt || v.filename || (isUpload ? 'Uploaded video' : null))
                      : v.prompt
                        ? v.filename
                        : null;
                    return (
                      <>
                        <p
                          className={`text-xs font-medium truncate ${title ? 'text-foreground' : 'italic text-foreground/40'}`}
                          style={{ fontFamily: 'var(--font-body)' }}
                          title={title || ''}
                        >
                          {title || 'No prompt'}
                        </p>
                        {subtitle ? (
                          <p
                            className="text-[10px] text-foreground/45 mt-0.5 truncate"
                            style={{ fontFamily: 'var(--font-body)' }}
                            title={subtitle}
                          >
                            {subtitle}
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                  {(() => {
                    const usedModel = findVideoModelByEndpoint(v.model_endpoint);
                    return (
                      <>
                        <p className="text-[10px] font-semibold text-primary/80 mt-1 truncate" style={{ fontFamily: 'var(--font-body)' }} title={v.model_endpoint}>
                          {usedModel?.label ?? v.model_endpoint}
                        </p>
                        <p className="text-[10px] text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                          {v.duration_seconds}s · {v.resolution} · {v.aspect_ratio} · {new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </>
                    );
                  })()}
                  {(isPending || isFailed) && (
                    <StuckDiagnostic v={v} />
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    {v.video_url && (
                      <button
                        onClick={() => copyUrl(v.video_url!)}
                        className="p-1.5 rounded-md text-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors"
                        title="Copy URL"
                        aria-label="Copy URL"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => deleteVideo(v)}
                      className="p-1.5 rounded-md text-foreground/40 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image picker modal */}
      {pickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            aria-label="Close"
            onClick={() => setPickerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-foreground">Pick a source image</h2>
              <button
                onClick={() => setPickerOpen(false)}
                className="p-2 rounded-lg text-foreground/40 hover:bg-warm-bg"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {images.length === 0 ? (
                <p className="text-center text-foreground/40 py-12 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                  No images in the gallery yet. Upload some under the Images page first.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        setSelectedImage(img);
                        setPickerOpen(false);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden group ring-2 transition-all ${
                        selectedImage?.id === img.id ? 'ring-primary' : 'ring-transparent hover:ring-primary/40'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.public_url}
                        alt={img.alt || img.filename}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
          <button
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-black">
              {lightbox.video_url && (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={lightbox.video_url}
                  controls
                  autoPlay
                  className="w-full max-h-[70vh] mx-auto block"
                />
              )}
            </div>
            <div className="p-4 flex items-center gap-3 border-t border-gray-100 flex-wrap">
              <input
                readOnly
                value={lightbox.video_url || ''}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-[200px] text-sm px-3 py-2 rounded-lg bg-warm-bg/50 border border-gray-100 font-mono text-foreground/70"
              />
              <button
                onClick={() => lightbox.video_url && copyUrl(lightbox.video_url)}
                className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Copy URL
              </button>
              <button
                onClick={() => setLightbox(null)}
                className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-foreground/60 text-sm font-semibold hover:bg-warm-bg transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

// Inline diagnostic block for queued / in_progress / failed cards.
// Reads the debug_info written by /api/fal/video/status on every
// poll and shows the user exactly what fal.ai is returning. The
// "Copy" button packages it as plain text so a stuck row can be
// pasted into chat for support.
function StuckDiagnostic({ v }: { v: SiteVideo }) {
  const [open, setOpen] = useState(false);
  const d = v.debug_info ?? null;
  const elapsedSec = Math.round((Date.now() - new Date(v.created_at).getTime()) / 1000);
  const elapsedLabel = elapsedSec < 60
    ? `${elapsedSec}s`
    : elapsedSec < 3600
      ? `${Math.round(elapsedSec / 60)}m`
      : `${Math.round(elapsedSec / 360) / 10}h`;

  function blockText(): string {
    const lines = [
      `Video ID: ${v.id}`,
      `Status: ${v.status} (${elapsedLabel} since created)`,
      `Model: ${v.model_endpoint}`,
      `Request ID: ${v.request_id ?? '(none)'}`,
      `Error: ${v.error ?? '(none)'}`,
      d ? '— Last poll —' : '— No poll diagnostic recorded yet —',
    ];
    if (d) {
      if (d.last_polled_at) lines.push(`Polled at: ${d.last_polled_at}`);
      if (typeof d.fal_status_http === 'number') lines.push(`HTTP: ${d.fal_status_http}`);
      if (d.fal_status) lines.push(`fal status: ${d.fal_status}`);
      if (d.app_id) lines.push(`App id: ${d.app_id}`);
      if (d.status_url) lines.push(`Status URL: ${d.status_url}`);
      if (d.fal_error_body) lines.push(`fal error body: ${d.fal_error_body}`);
      if (d.fal_logs && d.fal_logs.length) {
        lines.push('fal logs:');
        for (const m of d.fal_logs) lines.push(`  · ${m}`);
      }
    }
    return lines.join('\n');
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="text-[10px] font-semibold uppercase tracking-wider text-foreground/45 hover:text-foreground transition-colors"
        aria-expanded={open}
      >
        {open ? 'Hide details' : 'Details'}
      </button>
      {open && (
        <div className="mt-1.5 rounded-md border border-black/10 bg-warm-bg/40 px-2.5 py-2 text-[11px] leading-snug text-foreground/75 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono">{v.status} · {elapsedLabel}</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(blockText()).catch(() => {});
              }}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
              Copy
            </button>
          </div>
          <p className="font-mono text-foreground/55 break-all">
            id {v.id} · req {v.request_id ?? '—'}
          </p>
          {d ? (
            <>
              <p>
                Last polled{' '}
                <span className="font-mono">
                  {d.last_polled_at ? new Date(d.last_polled_at).toLocaleTimeString() : '—'}
                </span>
                {typeof d.fal_status_http === 'number' && (
                  <> · HTTP <span className="font-mono">{d.fal_status_http}</span></>
                )}
                {d.fal_status && <> · fal <span className="font-mono">{d.fal_status}</span></>}
              </p>
              {d.app_id && (
                <p className="font-mono text-foreground/55 break-all">
                  app {d.app_id}
                </p>
              )}
              {d.fal_error_body && (
                <pre className="whitespace-pre-wrap break-words font-mono text-[10px] bg-red-50 border border-red-100 text-red-900 rounded px-2 py-1">
{d.fal_error_body}
                </pre>
              )}
              {d.fal_logs && d.fal_logs.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-foreground/45 mt-1">fal logs</p>
                  <ul className="font-mono text-[10px] text-foreground/70 list-disc pl-4">
                    {d.fal_logs.map((m, i) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <p className="italic text-foreground/45">
              No poll diagnostic recorded yet — the next 5s poll will fill this in.
            </p>
          )}
          {v.error && (
            <p className="text-red-700">{v.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
