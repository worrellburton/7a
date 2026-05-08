'use client';

import { useEffect, useState } from 'react';

interface PublicHorse {
  id: string;
  name: string;
  age: number | null;
  works_in: string | null;
  rideable: string | null;
  behavior: string | null;
  notes: string | null;
  image_url: string | null;
  // Phase 6 — wider PublicHorse shape from the upgraded
  // /api/public/horses. Both default to safe empty values when the
  // API hasn't shipped the migration yet.
  gallery_urls?: string[];
  video_url?: string | null;
}

function rideableLabel(r: string | null): string | null {
  if (!r) return null;
  const s = r.toLowerCase();
  if (s === 'yes' || s === 'true') return 'Available to ride';
  if (s === 'for staff') return 'Staff only';
  if (s === 'maybe') return 'Sometimes';
  if (s === 'no' || s === 'false') return 'Groundwork only';
  return r;
}

/**
 * Branded SVG placeholder for horses whose portrait photo hasn't been
 * uploaded yet. Shown in both the grid tile and the detail modal so
 * the roster never has empty or flat-color slots. The silhouette is a
 * single-stroke illustration on a warm gradient that sits in the same
 * visual family as the rest of the ranch chrome.
 */
function HorsePlaceholder({ name }: { name: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
      style={{
        background:
          'linear-gradient(135deg, rgba(216,137,102,0.35) 0%, rgba(107,42,20,0.55) 55%, rgba(42,15,10,0.85) 100%)',
      }}
    >
      {/* Soft radial highlight behind the silhouette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,237,220,0.25) 0%, rgba(255,237,220,0) 70%)',
        }}
      />
      <svg
        viewBox="0 0 160 160"
        className="relative w-3/5 h-3/5 text-white/80"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Horse head & neck silhouette — based on a classic right-
            facing profile used in western ranch branding. */}
        <path
          d="M44 126 L44 96 C44 78 52 64 66 56 L72 46 C74 42 78 38 84 36 L92 34 C96 30 102 28 108 30 C114 32 118 36 120 42 L122 50 L128 54 L124 62 L120 60 L118 68 L112 74 L108 82 L108 96 L112 108 L108 120 L100 124 L92 122 L86 116 L82 112 L76 114 L72 122 L66 126 Z"
          fill="rgba(255,255,255,0.18)"
        />
        {/* Eye */}
        <circle cx="108" cy="54" r="1.4" fill="currentColor" stroke="none" />
        {/* Mane suggestion */}
        <path d="M70 58 L62 54 M68 64 L58 62 M68 72 L58 74" strokeOpacity="0.7" />
      </svg>
      {/* Just the horse's name — no "coming soon" copy; the silhouette
          reads as a stylized placeholder rather than a broken state. */}
      <span
        className="absolute bottom-[28%] text-[9px] tracking-[0.28em] uppercase font-bold text-white/70 px-2 py-0.5 rounded-full"
        style={{
          fontFamily: 'var(--font-body)',
          background: 'rgba(0,0,0,0.22)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {name}
      </span>
    </div>
  );
}

export default function HorseGallery() {
  const [horses, setHorses] = useState<PublicHorse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicHorse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/horses');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || `Error ${res.status}`);
        } else {
          setHorses((data?.horses as PublicHorse[]) || []);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || horses.length === 0) {
    return null; // silently hide on the marketing page if nothing to show
  }

  return (
    <>
      {/* Phase 6 — bigger, more editorial gallery tiles. Three-up on
          desktop instead of four so each horse has real photographic
          presence; aspect-[3/4] for that tall portrait feel. Each
          tile also surfaces small "+N photos" / "video" badges
          when the horse has extra media so visitors know there's
          more behind the click. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
        {horses.map((h) => {
          const galleryCount = (h.gallery_urls?.length || 0);
          return (
            <button
              key={h.id}
              onClick={() => setSelected(h)}
              className="group text-left relative overflow-hidden rounded-3xl bg-warm-bg border border-black/5 shadow-sm hover:shadow-2xl transition-all duration-500 aspect-[3/4] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label={`Meet ${h.name}`}
            >
              {h.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={h.image_url}
                  alt={`Portrait of ${h.name}, one of the therapy horses at Seven Arrows Recovery`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.07]"
                  loading="lazy"
                />
              ) : (
                <HorsePlaceholder name={h.name} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

              {/* Media-presence badges, top-right. Only render when
                  there's something extra behind the tile. */}
              {(h.video_url || galleryCount > 0) && (
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {h.video_url && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-white text-[9.5px] font-semibold tracking-wider uppercase"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5z" /></svg>
                      Video
                    </span>
                  )}
                  {galleryCount > 0 && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/55 backdrop-blur text-white text-[9.5px] font-semibold tracking-wider uppercase"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      +{galleryCount}
                    </span>
                  )}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
                <h3
                  className="text-white font-bold tracking-tight drop-shadow-sm mb-1"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.4rem, 2.4vw, 1.85rem)',
                    lineHeight: 1.05,
                  }}
                >
                  {h.name}
                </h3>
                {(h.age != null || h.works_in) && (
                  <p
                    className="text-white/85 text-[12.5px] font-medium"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {h.age != null ? `${h.age} years` : ''}
                    {h.age != null && h.works_in ? ' · ' : ''}
                    {h.works_in || ''}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <HorseDetailModal horse={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

/**
 * Phase 7 — full-bleed detail modal with a photo carousel + an
 * inline video tab when the horse has one.
 *
 * Left column is a media stage: cycles through [image_url, ...gallery_urls]
 * when the user is on the Photos tab, plays the clip when on Video.
 * Tabs only render when there's content for both — a horse with no
 * video shows a clean photo carousel with no tab strip.
 *
 * Carousel controls: prev / next chevrons + a row of pill dots. Photos
 * also cycle automatically every 4.5s (paused on hover) so the modal
 * shows life immediately even if the visitor never clicks anything.
 */
function HorseDetailModal({ horse, onClose }: { horse: PublicHorse; onClose: () => void }) {
  const photos = [horse.image_url, ...(horse.gallery_urls || [])].filter(
    (u): u is string => typeof u === 'string' && u.trim() !== '',
  );
  const hasVideo = !!horse.video_url;
  const [tab, setTab] = useState<'photos' | 'video'>('photos');
  const [photoIdx, setPhotoIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance the carousel every 4.5s. Pauses while the user is
  // hovering the media area so they have time to look at a shot
  // they're interested in.
  useEffect(() => {
    if (tab !== 'photos' || photos.length < 2 || paused) return;
    const id = window.setInterval(() => {
      setPhotoIdx((i) => (i + 1) % photos.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [tab, photos.length, paused]);

  // Esc closes; arrow keys move the carousel. Scoped to the modal so
  // we don't fight other listeners on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (tab !== 'photos' || photos.length < 2) return;
      if (e.key === 'ArrowRight') setPhotoIdx((i) => (i + 1) % photos.length);
      if (e.key === 'ArrowLeft') setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tab, photos.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`About ${horse.name}`}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden grid grid-cols-1 md:grid-cols-[1.1fr_1fr]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media stage */}
        <div
          className="relative aspect-square md:aspect-auto md:min-h-full bg-black"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {tab === 'photos' && photos.length > 0 && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={photos[photoIdx]}
              src={photos[photoIdx]}
              alt={`Portrait of ${horse.name}, photo ${photoIdx + 1} of ${photos.length}`}
              className="absolute inset-0 w-full h-full object-cover animate-in fade-in duration-500"
            />
          )}
          {tab === 'photos' && photos.length === 0 && (
            <HorsePlaceholder name={horse.name} />
          )}
          {tab === 'video' && hasVideo && (
            /* eslint-disable-next-line jsx-a11y/media-has-caption */
            <video
              src={horse.video_url || undefined}
              poster={horse.image_url || undefined}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              controls
              autoPlay
              playsInline
            />
          )}

          {/* Carousel chevrons — only on the photos tab with >1 shot */}
          {tab === 'photos' && photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur text-white flex items-center justify-center transition-colors"
                aria-label="Previous photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur text-white flex items-center justify-center transition-colors"
                aria-label="Next photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>

              {/* Dot indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all ${i === photoIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/45 hover:bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Photo / Video tab strip — only renders when both kinds
              of media exist on this horse. */}
          {hasVideo && photos.length > 0 && (
            <div className="absolute top-3 left-3 inline-flex p-1 rounded-full bg-black/55 backdrop-blur" role="tablist">
              <button
                role="tab"
                aria-selected={tab === 'photos'}
                onClick={() => setTab('photos')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-colors ${tab === 'photos' ? 'bg-white text-foreground' : 'text-white/85 hover:text-white'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Photos
                <span className="ml-1 opacity-60">({photos.length})</span>
              </button>
              <button
                role="tab"
                aria-selected={tab === 'video'}
                onClick={() => setTab('video')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-colors ${tab === 'video' ? 'bg-white text-foreground' : 'text-white/85 hover:text-white'}`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Video
              </button>
            </div>
          )}
        </div>

        {/* Text column */}
        <div className="p-6 md:p-8 overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>{horse.name}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-warm-bg transition-colors shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {horse.age != null && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                {horse.age} years
              </span>
            )}
            {horse.works_in && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                {horse.works_in}
              </span>
            )}
            {rideableLabel(horse.rideable) && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                {rideableLabel(horse.rideable)}
              </span>
            )}
          </div>
          {horse.behavior && (
            <section className="mb-4">
              <h3 className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.12em] mb-1.5">Personality</h3>
              <p className="text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{horse.behavior}</p>
            </section>
          )}
          {horse.notes && (
            <section className="mb-4">
              <h3 className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.12em] mb-1.5">About {horse.name}</h3>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>{horse.notes}</p>
            </section>
          )}
          {!horse.behavior && !horse.notes && (
            <p className="text-sm text-foreground/50 italic" style={{ fontFamily: 'var(--font-body)' }}>
              One of the horses in our therapy program.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
