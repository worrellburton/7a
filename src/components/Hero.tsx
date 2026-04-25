'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Payer trust strip ─────────────────────────────────────────────── */

const BRANDFETCH_CLIENT_ID = '1id3n10pdBTarCHI0db';

const heroPayers = [
  { name: 'Aetna', domain: 'aetna.com' },
  { name: 'Blue Cross Blue Shield', domain: 'bcbs.com' },
  { name: 'Cigna', domain: 'cigna.com' },
  { name: 'UnitedHealthcare', domain: 'uhc.com' },
  { name: 'Humana', domain: 'humana.com' },
  { name: 'TRICARE', domain: 'tricare.mil' },
];

function HeroPayerLogo({ name, domain }: { name: string; domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="text-white/70 text-[13px] font-semibold tracking-wide whitespace-nowrap"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {name}
      </span>
    );
  }
  return (
    <img
      src={`https://cdn.brandfetch.io/${domain}/fallback/404/theme/dark/h/80/w/200/logo?c=${BRANDFETCH_CLIENT_ID}`}
      alt={name}
      className="h-6 lg:h-7 w-auto max-w-[120px] object-contain opacity-90"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}

/* ── Media Sources ───────────────────────────────────────────────── */

const CLOUDFLARE_CUSTOMER = 'customer-1sijhr9xl3yqixxu';

export type HeroSource =
  | { kind: 'cloudflare'; id: string; label: string }
  | { kind: 'mp4'; url: string; label: string };

// Backdrop rotation — every source fills the viewport and loops muted.
// Cloudflare Stream sources use HLS; plain mp4s play directly. This
// is the *fallback* set used when no landing_heros row is marked
// live or the live row has no playable clips. The live timeline
// edited at /app/landing wins when present (passed in via props).
const fallbackHeroSources: HeroSource[] = [
  { kind: 'cloudflare', id: '23efc2d576759452ccdf1a2b1813580a', label: 'Our Facility' },
  {
    kind: 'mp4',
    url: 'https://xbirikzsrwmgqxlazglm.supabase.co/storage/v1/object/public/public-images/site-videos/9c83abff-3c23-47a6-a407-467dd6d4dec4.mp4',
    label: 'Swisshelm Mountains',
  },
];

/* ── Ticker Items ──────────────────────────────────────────────────── */

const tickerItems = [
  { type: 'stat', text: '★ 4.9/5 Google Rating' },
  { type: 'divider' },
  { type: 'stat', text: '1:1 Primary Clinician' },
  { type: 'divider' },
  { type: 'link', text: 'Read: When Drinking Stops Working →', href: '/who-we-are/blog/when-drinking-stops-working' },
  { type: 'divider' },
  { type: 'stat', text: '90+ Day Programs' },
  { type: 'divider' },
  { type: 'review', text: '"We finally have our son back." — Sarah K.' },
  { type: 'divider' },
  { type: 'stat', text: '24/7 Admissions' },
  { type: 'divider' },
  { type: 'review', text: '"This place is different." — James R.' },
  { type: 'divider' },
  { type: 'stat', text: 'JCAHO Accredited • LegitScript Certified' },
  { type: 'divider' },
];

function TickerContent() {
  return (
    <>
      {tickerItems.map((item, i) => {
        if (item.type === 'divider') {
          return <span key={i} className="text-white/20 mx-4">|</span>;
        }
        if (item.type === 'stat') {
          return (
            <span key={i} className="whitespace-nowrap text-white/90 text-[11px] font-semibold tracking-wider uppercase" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          );
        }
        if (item.type === 'review') {
          return (
            <span key={i} className="whitespace-nowrap text-white/60 text-[11px] italic" style={{ fontFamily: 'var(--font-body)' }}>
              {item.text}
            </span>
          );
        }
        if (item.type === 'link' && item.href) {
          return (
            <Link
              key={i}
              href={item.href}
              className="whitespace-nowrap text-accent text-[11px] font-semibold hover:text-white transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.text}
            </Link>
          );
        }
        return null;
      })}
    </>
  );
}

/* ── Cloudflare HLS slide ──────────────────────────────────────────── */

function CloudflareSlide({
  videoId,
  active,
  isOnly,
  onEnded,
}: {
  videoId: string;
  active: boolean;
  isOnly: boolean;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const hlsUrl = `https://${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${videoId}/manifest/video.m3u8?clientBandwidthHint=10`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => setLoaded(true);

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadeddata', onLoaded, { once: true });
    } else if (typeof (window as any).Hls !== 'undefined') {
      const Hls = (window as any).Hls;
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: false, capLevelToPlayerSize: false });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (_: unknown, data: { levels: unknown[] }) => {
          hls.currentLevel = data.levels.length - 1;
          onLoaded();
        });
        hlsRef.current = hls;
      }
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
      script.onload = () => {
        const Hls = (window as any).Hls;
        if (Hls && Hls.isSupported()) {
          const hls = new Hls({ enableWorker: false, capLevelToPlayerSize: false });
          hls.loadSource(hlsUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, (_: unknown, data: { levels: unknown[] }) => {
            hls.currentLevel = data.levels.length - 1;
            onLoaded();
          });
          hlsRef.current = hls;
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hlsUrl]);

  // When this slide becomes active, rewind + play. When it goes
  // inactive, pause. The `ended` listener is what drives the
  // carousel forward — onEnded() bumps activeSlide on the parent.
  // `loop` only stays on for single-source rotations (otherwise
  // ended would never fire).
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      try { video.currentTime = 0; } catch { /* not seekable yet */ }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, loaded]);

  return (
    <video
      ref={videoRef}
      muted
      loop={isOnly}
      playsInline
      onEnded={() => { if (!isOnly) onEnded(); }}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

/* ── Plain mp4 slide ───────────────────────────────────────────────── */

function Mp4Slide({
  url,
  active,
  isOnly,
  onEnded,
}: {
  url: string;
  active: boolean;
  isOnly: boolean;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      // Rewind every time a slide becomes active so the second
      // pass through the carousel doesn't open mid-clip.
      try { video.currentTime = 0; } catch { /* not seekable yet */ }
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, loaded]);

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      loop={isOnly}
      playsInline
      // preload="auto" so the next slide is buffered before its
      // turn — the rotation between clips would otherwise show a
      // poster-less black frame for a beat.
      preload="auto"
      onLoadedData={() => setLoaded(true)}
      onEnded={() => { if (!isOnly) onEnded(); }}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

/* ── Hero Component ────────────────────────────────────────────────── */

interface HeroProps {
  /** Override the fallback hero rotation. Wired by /(site)/page.tsx
   *  from the live landing_heros row so admins can curate the home
   *  page from /app/landing. Empty/undefined falls back to the
   *  hardcoded set above. */
  sources?: HeroSource[];
}

export default function Hero({ sources: sourcesProp }: HeroProps = {}) {
  const sources = sourcesProp && sourcesProp.length > 0 ? sourcesProp : fallbackHeroSources;
  const isOnly = sources.length <= 1;
  const [visible, setVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Each slide drives the carousel forward via its `ended` event —
  // that way every clip plays start-to-finish exactly once before
  // the next one takes over, and after the last slide we wrap to
  // the first. No more wall-clock setInterval, so short clips
  // don't get cut off and long ones don't get held back.
  const advance = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % sources.length);
  }, [sources.length]);

  // Reset to the first slide whenever the source list itself
  // changes (e.g. live hero swap on ISR refresh).
  useEffect(() => {
    setActiveSlide(0);
  }, [sources.length]);

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      aria-labelledby="hero-heading"
      // Pull the hero up by the sticky header's height so the video
      // extends behind the transparent nav — without this the region
      // between the orange TopBar and the hero renders white.
      style={{ marginTop: 'calc(var(--site-header-height, 68px) * -1)' }}
    >
      {/* Full-viewport video backdrop with text overlay. On mobile we use
          svh (small viewport height) so mobile browser chrome collapsing
          doesn't leave a white gap under the hero. */}
      <div className="relative w-full min-h-[calc(100svh-40px-44px)] lg:min-h-[calc(100vh-40px-44px)] overflow-hidden bg-dark-section">
        {/* Rotating video stack */}
        {sources.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === activeSlide ? 'opacity-100 z-0' : 'opacity-0 z-0'}`}
            aria-hidden={i !== activeSlide}
          >
            {src.kind === 'cloudflare' ? (
              <CloudflareSlide
                videoId={src.id}
                active={i === activeSlide}
                isOnly={isOnly}
                onEnded={advance}
              />
            ) : (
              <Mp4Slide
                url={src.url}
                active={i === activeSlide}
                isOnly={isOnly}
                onEnded={advance}
              />
            )}
          </div>
        ))}

        {/* Uniform color wash — recovery.com uses a deep navy tint
            across the whole image so the hero reads as a single mood
            rather than a photo + text panel. We use a warm terracotta-
            shadow mix so it stays on-brand while achieving the same
            effect. Slight vertical fade keeps the bottom deeper for
            the video label + dots. */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(180deg, rgba(36,16,10,0.55) 0%, rgba(36,16,10,0.45) 55%, rgba(36,16,10,0.7) 100%)',
          }}
        />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full">
          <div className="min-h-[calc(100svh-40px-44px)] lg:min-h-[calc(100vh-40px-44px)] flex items-center justify-center">
            {/* Pad down by the header so the headline clears the nav
                even though the hero now extends up behind it. */}
            <div
              className="max-w-3xl w-full text-center text-white py-16 lg:py-20"
              style={{ paddingTop: 'calc(var(--site-header-height, 68px) + 2rem)' }}
            >
              <h1
                id="hero-heading"
                className="font-bold leading-[1.02] tracking-tight mb-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                }}
              >
                A place to <em className="not-italic font-bold" style={{ color: 'var(--color-accent)' }}>land</em>.
              </h1>

              <p
                className="mx-auto max-w-xl text-white/85 leading-relaxed mb-8 text-base sm:text-lg"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.35s',
                }}
              >
                Seven Arrows Recovery is a residential addiction treatment
                ranch at the base of the Swisshelm Mountains in Arizona.
              </p>

              {/* Primary CTA — replacing the directory-style search input
                  from Recovery.com with an honest, single-purpose button.
                  A facility website only has one job here: move the visitor
                  into insurance verification / admissions. */}
              <div
                className="mx-auto w-full max-w-xl flex flex-col sm:flex-row items-center justify-center gap-3"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s',
                }}
              >
                <Link
                  href="/admissions#verify"
                  className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white rounded-full px-8 py-4 text-base font-semibold shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] transition-all"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  Verify My Insurance
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </Link>
              </div>

              {/* Payer trust strip — shows the visitor at a glance that we
                  accept their plan, which is exactly the reassurance the
                  removed search field was gesturing at. Hidden on mobile
                  so the hero stays focused on headline + primary CTA. */}
              <div
                className="mt-8 mx-auto max-w-3xl hidden lg:block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.55s',
                }}
              >
                <p
                  className="text-white/55 text-[11px] tracking-[0.22em] uppercase mb-4"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  In-Network &amp; Out-of-Network
                </p>
                <div className="flex flex-wrap justify-center items-center gap-x-6 sm:gap-x-8 lg:gap-x-10 gap-y-4">
                  {heroPayers.map((p) => (
                    <HeroPayerLogo key={p.name} name={p.name} domain={p.domain} />
                  ))}
                </div>
              </div>

              <div
                className="mt-7 hidden lg:flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-sm text-white/85"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s',
                }}
              >
                <Link
                  href="/admissions"
                  className="hover:text-white font-semibold transition-colors"
                >
                  Start Admissions →
                </Link>
                <span className="hidden sm:inline text-white/30">·</span>
                <a
                  href="tel:+18669964308"
                  className="hover:text-white font-semibold transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  Call (866) 996-4308
                </a>
              </div>

              <p
                className="mt-10 text-white/55 text-[11px] tracking-[0.22em] uppercase hidden lg:block"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.8s ease 0.9s',
                }}
              >
                JCAHO Accredited &bull; LegitScript Certified &bull; HIPAA Compliant
              </p>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        {sources.length > 1 && (
          <div className="absolute bottom-6 right-6 z-30 flex gap-2">
            {sources.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveSlide(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Horizontal scrolling ticker */}
      <div
        className="relative z-20 bg-dark-section overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 1.2s',
        }}
      >
        <div className="py-3 flex items-center">
          <div className="flex animate-ticker">
            <div className="flex items-center shrink-0">
              <TickerContent />
            </div>
            <div className="flex items-center shrink-0">
              <TickerContent />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
