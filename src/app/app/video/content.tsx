'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
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

    setUploading(true);
    try {
      // 1. Mint a signed upload URL on the server. The bytes never
      //    pass through Vercel (4.5 MB body cap) — they go straight
      //    from the browser to Supabase Storage.
      const signRes = await fetch('/api/fal/video/sign-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ filename: file.name }),
      });
      const signed = await signRes.json().catch(() => ({}));
      if (!signRes.ok) {
        showToast(signed?.error || `Upload failed (${signRes.status})`);
        return;
      }
      const { videoId, path, token } = signed as { videoId: string; path: string; token: string };

      // 2. Upload directly to storage. The browser supabase client
      //    talks straight to /storage/v1 — Vercel is out of the picture.
      const { error: upErr } = await supabase.storage
        .from('public-images')
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type || 'video/mp4',
          upsert: true,
        });
      if (upErr) {
        showToast(`Upload failed: ${upErr.message}`);
        return;
      }

      // 3. Tell the server the bytes landed; it stamps public_url
      //    + status='completed' and returns the row.
      const finRes = await fetch('/api/fal/video/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ videoId, path }),
      });
      const finJson = await finRes.json().catch(() => ({}));
      if (!finRes.ok) {
        showToast(finJson?.error || `Finalize failed (${finRes.status})`);
        return;
      }
      const video = finJson.video as SiteVideo | undefined;
      if (video) {
        setVideos((prev) => [video, ...prev]);
        showToast('Video uploaded');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }

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
        <div>
          <input
            ref={uploadInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadVideoFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-foreground border border-gray-200 hover:border-primary/40 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" />
                  <path d="m7 8 5-5 5 5" />
                  <rect x="3" y="15" width="18" height="6" rx="2" />
                </svg>
                Upload video
              </>
            )}
          </button>
        </div>
      </div>

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
                  <p className="text-xs font-medium text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }} title={v.prompt || ''}>
                    {v.prompt || <span className="italic text-foreground/40">No prompt</span>}
                  </p>
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
