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

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {horses.map((h) => (
          <button
            key={h.id}
            onClick={() => setSelected(h)}
            className="group text-left relative overflow-hidden rounded-2xl bg-warm-bg border border-black/5 shadow-sm hover:shadow-xl transition-all duration-300 aspect-[4/5] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label={`Meet ${h.name}`}
          >
            {h.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={h.image_url}
                alt={h.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <HorsePlaceholder name={h.name} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="text-white text-lg font-bold tracking-tight drop-shadow-sm">{h.name}</h3>
              {(h.age != null || h.works_in) && (
                <p className="text-white/80 text-xs font-medium mt-0.5">
                  {h.age != null ? `${h.age} years` : ''}
                  {h.age != null && h.works_in ? ' · ' : ''}
                  {h.works_in || ''}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`About ${selected.name}`}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_1.1fr]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square md:aspect-auto md:min-h-full bg-warm-bg">
              {selected.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={selected.image_url} alt={selected.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <HorsePlaceholder name={selected.name} />
              )}
            </div>
            <div className="p-6 md:p-8 overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-1">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{selected.name}</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-warm-bg transition-colors shrink-0"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {selected.age != null && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                    {selected.age} years
                  </span>
                )}
                {selected.works_in && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {selected.works_in}
                  </span>
                )}
                {rideableLabel(selected.rideable) && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                    {rideableLabel(selected.rideable)}
                  </span>
                )}
              </div>
              {selected.behavior && (
                <section className="mb-4">
                  <h3 className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.12em] mb-1.5">Personality</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>{selected.behavior}</p>
                </section>
              )}
              {selected.notes && (
                <section className="mb-4">
                  <h3 className="text-[10px] font-bold text-foreground/50 uppercase tracking-[0.12em] mb-1.5">About {selected.name}</h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>{selected.notes}</p>
                </section>
              )}
              {!selected.behavior && !selected.notes && (
                <p className="text-sm text-foreground/50 italic" style={{ fontFamily: 'var(--font-body)' }}>
                  One of the horses in our therapy program.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
