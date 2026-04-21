'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Media Sources ───────────────────────────────────────────────── */

const CLOUDFLARE_CUSTOMER = 'customer-1sijhr9xl3yqixxu';

type HeroSource =
  | { kind: 'cloudflare'; id: string; label: string }
  | { kind: 'mp4'; url: string; label: string };

// Backdrop rotation — every source fills the viewport and loops muted.
// Cloudflare Stream sources use HLS; plain mp4s play directly.
const heroSources: HeroSource[] = [
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
  { type: 'review', text: '"Seven Arrows saved my life." — Michael T.' },
  { type: 'divider' },
  { type: 'stat', text: '6:1 Client to Staff Ratio' },
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

function CloudflareSlide({ videoId, active }: { videoId: string; active: boolean }) {
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => {});
    else video.pause();
  }, [active, loaded]);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

/* ── Plain mp4 slide ───────────────────────────────────────────────── */

function Mp4Slide({ url, active }: { url: string; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) video.play().catch(() => {});
    else video.pause();
  }, [active, loaded]);

  return (
    <video
      ref={videoRef}
      src={url}
      muted
      loop
      playsInline
      preload="metadata"
      onLoadedData={() => setLoaded(true)}
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

/* ── Hero Component ────────────────────────────────────────────────── */

export default function Hero() {
  const [visible, setVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSources.length);
    }, 10000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoPlay]);

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
        {heroSources.map((src, i) => (
          <div
            key={i}
            className={`absolute inset-0 transition-opacity duration-1000 ${i === activeSlide ? 'opacity-100 z-0' : 'opacity-0 z-0'}`}
            aria-hidden={i !== activeSlide}
          >
            {src.kind === 'cloudflare' ? (
              <CloudflareSlide videoId={src.id} active={i === activeSlide} />
            ) : (
              <Mp4Slide url={src.url} active={i === activeSlide} />
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
                className="font-bold leading-[1.02] tracking-tight mb-8"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                }}
              >
                Recovery starts here.
                <br />
                Find <em className="not-italic font-bold" style={{ color: 'var(--color-accent)' }}>a plan made for you</em>.
              </h1>

              {/* Prominent action pill — the Recovery.com reference uses a
                  search input as the primary CTA. For a single facility we
                  route the equivalent attention into insurance verification,
                  which is the most common first step for new admissions. */}
              <form
                action="/insurance"
                method="get"
                className="mx-auto w-full max-w-2xl"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.45s',
                }}
              >
                <div className="flex items-center gap-2 bg-white rounded-full shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] p-1.5 pl-5 text-foreground">
                  <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  <input
                    name="provider"
                    type="text"
                    aria-label="Your insurance provider"
                    placeholder="Check your insurance — Aetna, BCBS, Cigna…"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm sm:text-base placeholder:text-foreground/45 py-2"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  <button
                    type="submit"
                    className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-dark text-white rounded-full px-5 sm:px-6 py-3 text-sm font-semibold transition-colors"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Verify
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </div>
              </form>

              <div
                className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-sm text-white/85"
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
                className="mt-10 text-white/55 text-[11px] tracking-[0.22em] uppercase"
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
        {heroSources.length > 1 && (
          <div className="absolute bottom-6 right-6 z-30 flex gap-2">
            {heroSources.map((_, i) => (
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
