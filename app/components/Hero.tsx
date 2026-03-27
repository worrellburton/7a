import { Link } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';

const CLOUDFLARE_CUSTOMER = 'customer-1sijhr9xl3yqixxu';
const CLOUDFLARE_VIDEO_ID = '23efc2d576759452ccdf1a2b1813580a';
const VIDEO_HLS = `https://${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${CLOUDFLARE_VIDEO_ID}/manifest/video.m3u8?clientBandwidthHint=10`;
const VIDEO_MP4 = `https://${CLOUDFLARE_CUSTOMER}.cloudflarestream.com/${CLOUDFLARE_VIDEO_ID}/downloads/default.mp4`;

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

/* ── Hero Background Video ─────────────────────────────────────── */

function HeroBackgroundVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => setLoaded(true);

    // Safari supports HLS natively
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = VIDEO_HLS;
      video.addEventListener('loadeddata', onLoaded, { once: true });
      video.play().catch(() => {});
      return;
    }

    // For other browsers, load hls.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';
    script.onload = () => {
      const Hls = (window as any).Hls;
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: false,
          capLevelToPlayerSize: false,
          startLevel: -1,
          autoStartLoad: true,
          maxBufferLength: 30,
          abrBandWidthUpFactor: 2.0,
        });
        hls.loadSource(VIDEO_HLS);
        hls.attachMedia(video);
        // Once manifest is parsed, force the highest quality level
        hls.on(Hls.Events.MANIFEST_PARSED, (_: unknown, data: { levels: unknown[] }) => {
          hls.currentLevel = data.levels.length - 1;
          video.play().catch(() => {});
          onLoaded();
        });
      } else {
        // No HLS support at all — fall back to MP4 download
        video.src = VIDEO_MP4;
        video.addEventListener('loadeddata', onLoaded, { once: true });
        video.play().catch(() => {});
      }
    };
    script.onerror = () => {
      // hls.js failed to load — fall back to MP4
      video.src = VIDEO_MP4;
      video.addEventListener('loadeddata', onLoaded, { once: true });
      video.play().catch(() => {});
    };
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <>
      {/* Poster image — always present as base layer */}
      <img
        src="/7a/images/facility-exterior-mountains.jpg"
        alt="Seven Arrows Recovery facility with Swisshelm Mountains"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Video fades in over poster once loaded */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster="/7a/images/facility-exterior-mountains.jpg"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </>
  );
}

/* ── Hero Component ────────────────────────────────────────────────── */

export default function Hero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Main hero area */}
      <div className="relative min-h-[520px] lg:min-h-[calc(100vh-68px-40px)] flex items-center">
        {/* Background video with dark overlay */}
        <div className="absolute inset-0 z-0">
          <HeroBackgroundVideo />
          {/* Darkened overlay for text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#2a0f0a]/80 via-[#2a0f0a]/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#2a0f0a]/70 via-transparent to-[#2a0f0a]/20" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="max-w-2xl">
            {/* Label */}
            <div
              className="mb-6"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
              }}
            >
              <p className="section-label text-[10px]" style={{ color: 'var(--color-accent)' }}>Drug Rehab in Arizona</p>
            </div>

            {/* Heading */}
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.08] mb-6 text-white"
            >
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.4s',
                }}
              >
                A Place
              </span>{' '}
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.55s',
                }}
              >
                to
              </span>{' '}
              <span
                className="inline-block"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(40px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.7s',
                  color: 'var(--color-accent)',
                }}
              >
                Heal.
              </span>
            </h1>

            {/* Description */}
            <p
              className="text-base lg:text-lg leading-relaxed mb-8 max-w-lg"
              style={{
                fontFamily: 'var(--font-body)',
                color: 'rgba(255, 255, 255, 0.75)',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.9s',
              }}
            >
              Find out why Seven Arrows Recovery is considered one of the best drug
              rehabs in Arizona. We provide clinical and residential treatment to ensure
              lasting recovery in a small group setting, nestled at the base of the tranquil
              Swisshelm mountains.
            </p>

            {/* CTAs */}
            <div
              className="flex flex-col sm:flex-row gap-4"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(30px)',
                transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 1.1s',
              }}
            >
              <Link to="/admissions" className="btn-primary text-sm">
                Get Started
              </Link>
              <a href="tel:+18669964308" className="btn-outline border-white/40 text-white hover:bg-white hover:text-foreground text-sm">
                Call (866) 996-4308
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal scrolling ticker — pinned at bottom of hero */}
      <div
        className="relative z-20 bg-dark-section overflow-hidden"
        style={{
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 1.4s',
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
