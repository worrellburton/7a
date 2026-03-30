import { Link } from '@remix-run/react';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ── Cloudflare Stream Config ────────────────────────────────────── */

const CLOUDFLARE_CUSTOMER = 'customer-1sijhr9xl3yqixxu';

/**
 * Add more Cloudflare Stream video IDs here to expand the carousel.
 * Each slide can be a video (with a Cloudflare video ID) or a static image.
 */
const heroSlides: {
  type: 'video' | 'image';
  src: string; // video ID for Cloudflare Stream, or image path
  label: string;
}[] = [
  {
    type: 'video',
    src: '23efc2d576759452ccdf1a2b1813580a',
    label: 'Our Facility',
  },
  {
    type: 'image',
    src: '/images/equine-therapy-portrait.jpg',
    label: 'Equine Therapy',
  },
  {
    type: 'image',
    src: '/images/group-sunset-desert.jpg',
    label: 'Community',
  },
  {
    type: 'image',
    src: '/images/covered-porch-desert-view.jpg',
    label: 'Desert Views',
  },
];

/* ── Desert Gradient WebGL Background ─────────────────────────────── */

function DesertGradientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    // Full-screen quad vertex shader
    const vsSource = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    // Fragment shader: layered radial gradients that drift and pulse
    // Desert palette: warm sand, terracotta, sage, dusty rose, canyon shadow
    const fsSource = `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uResolution;

      // Smooth noise for organic movement
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / uResolution.y;
        vec2 p = vec2(uv.x * aspect, uv.y);
        float t = uTime * 0.08;

        // Flowing noise field
        float n1 = fbm(p * 1.5 + vec2(t * 0.3, t * 0.2));
        float n2 = fbm(p * 2.0 + vec2(-t * 0.2, t * 0.4) + 5.0);
        float n3 = fbm(p * 1.0 + vec2(t * 0.15, -t * 0.1) + 10.0);

        // Desert palette colors (RGB)
        // Warm sand base
        vec3 sand      = vec3(0.957, 0.941, 0.922);  // #f4f0eb - warm bg
        // Terracotta / canyon
        vec3 terra     = vec3(0.627, 0.322, 0.176);  // #a0522d - primary
        // Dusty rose / sunset
        vec3 rose      = vec3(0.776, 0.478, 0.290);  // #c67a4a - accent
        // Sage green / desert plant
        vec3 sage      = vec3(0.588, 0.627, 0.518);  // #96a084
        // Canyon shadow / deep earth
        vec3 shadow    = vec3(0.239, 0.059, 0.039);  // #3d0f0a

        // Drifting radial gradient centers
        vec2 c1 = vec2(
          0.2 + sin(t * 0.5) * 0.15,
          0.3 + cos(t * 0.4) * 0.2
        );
        vec2 c2 = vec2(
          0.8 + cos(t * 0.3) * 0.12,
          0.7 + sin(t * 0.6) * 0.15
        );
        vec2 c3 = vec2(
          0.5 + sin(t * 0.7 + 2.0) * 0.2,
          0.2 + cos(t * 0.35 + 1.0) * 0.15
        );
        vec2 c4 = vec2(
          0.15 + cos(t * 0.45 + 3.0) * 0.1,
          0.85 + sin(t * 0.55) * 0.1
        );

        // Radial falloffs
        float r1 = smoothstep(0.6, 0.0, length(uv - c1));
        float r2 = smoothstep(0.5, 0.0, length(uv - c2));
        float r3 = smoothstep(0.55, 0.0, length(uv - c3));
        float r4 = smoothstep(0.4, 0.0, length(uv - c4));

        // Compose: start from sand, layer color blobs
        vec3 col = sand;
        col = mix(col, rose,   r1 * 0.12 * (0.8 + n1 * 0.4));
        col = mix(col, terra,  r2 * 0.08 * (0.7 + n2 * 0.6));
        col = mix(col, sage,   r3 * 0.10 * (0.6 + n3 * 0.5));
        col = mix(col, shadow, r4 * 0.04 * (0.5 + n1 * 0.3));

        // Subtle mountain horizon line shimmer
        float horizon = smoothstep(0.02, 0.0, abs(uv.y - 0.65 - fbm(vec2(uv.x * 3.0 + t * 0.2, 0.0)) * 0.08));
        col = mix(col, terra, horizon * 0.06);

        // Very subtle grain for texture
        float grain = (hash(uv * uResolution + fract(uTime)) - 0.5) * 0.012;
        col += grain;

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uResolution = gl.getUniformLocation(prog, 'uResolution');

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    let raf: number;
    const start = performance.now();
    const draw = () => {
      const elapsed = (performance.now() - start) / 1000;
      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  );
}

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
              to={item.href}
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

/* ── Video Slide ──────────────────────────────────────────────────── */

function VideoSlide({ videoId, active }: { videoId: string; active: boolean }) {
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
      // hls.js not yet loaded — try loading script
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

  // Play/pause based on active state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [active, loaded]);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${loaded ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}

/* ── Bullet Points ────────────────────────────────────────────────── */

const highlights = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    text: '24/7 admissions — begin treatment within 48 hours',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    text: '6:1 client-to-staff ratio for personalized care',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    text: 'Most major insurance plans accepted',
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    text: 'TraumAddiction\u2122 specialty approach to healing',
  },
];

/* ── Hero Component ────────────────────────────────────────────────── */

export default function Hero() {
  const [visible, setVisible] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance every 8 seconds
  const startAutoPlay = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 8000);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoPlay]);

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    startAutoPlay(); // Reset timer on manual navigation
  };

  const goNext = () => goToSlide((activeSlide + 1) % heroSlides.length);
  const goPrev = () => goToSlide((activeSlide - 1 + heroSlides.length) % heroSlides.length);

  return (
    <section
      className="relative flex flex-col overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Main hero area — light background, split layout */}
      <div className="relative bg-warm-bg overflow-hidden">
        <DesertGradientCanvas />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center min-h-[520px] lg:min-h-[calc(100vh-68px-40px-44px)]">

            {/* Left: Text Content */}
            <div className="py-16 lg:py-24">
              <h1
                id="hero-heading"
                className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] mb-8 text-foreground"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(30px)',
                  transition: 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
                }}
              >
                A place to heal,{' '}
                <br className="hidden sm:block" />
                a plan made for you
              </h1>

              <ul className="space-y-4 mb-10">
                {highlights.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3"
                    style={{
                      opacity: visible ? 1 : 0,
                      transform: visible ? 'translateY(0)' : 'translateY(20px)',
                      transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 0.1}s`,
                    }}
                  >
                    <span className="text-primary mt-0.5 shrink-0">{item.icon}</span>
                    <span className="text-foreground/70 text-[15px] leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className="flex flex-col sm:flex-row gap-4"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.9s',
                }}
              >
                <Link to="/admissions" className="btn-dark text-sm">
                  Get Started
                </Link>
                <a href="tel:+18669964308" className="btn-outline text-sm">
                  Call (866) 996-4308
                </a>
              </div>

              <p
                className="mt-8 text-foreground/40 text-xs leading-relaxed max-w-sm"
                style={{
                  fontFamily: 'var(--font-body)',
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.8s ease 1.2s',
                }}
              >
                JCAHO Accredited &bull; LegitScript Certified &bull; HIPAA Compliant
              </p>
            </div>

            {/* Right: Video/Image Carousel */}
            <div
              className="relative hidden lg:block"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.98)',
                transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s',
              }}
            >
              <div className="relative rounded-3xl overflow-hidden aspect-[4/5] shadow-2xl bg-warm-card">
                {/* Slides */}
                {heroSlides.map((slide, i) => (
                  <div
                    key={i}
                    className={`absolute inset-0 transition-opacity duration-700 ${i === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  >
                    {slide.type === 'video' ? (
                      <>
                        {/* Poster behind video */}
                        <img
                          src="/images/facility-exterior-mountains.jpg"
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <VideoSlide videoId={slide.src} active={i === activeSlide} />
                      </>
                    ) : (
                      <img
                        src={slide.src}
                        alt={slide.label}
                        className="w-full h-full object-cover"
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                    )}
                  </div>
                ))}

                {/* Navigation arrows */}
                <button
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  aria-label="Previous slide"
                >
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  aria-label="Next slide"
                >
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>

                {/* Slide label + dots */}
                <div className="absolute bottom-4 left-0 right-0 z-20 flex flex-col items-center gap-2">
                  <span className="text-white text-xs font-semibold tracking-wider uppercase drop-shadow-lg" style={{ fontFamily: 'var(--font-body)' }}>
                    {heroSlides[activeSlide].label}
                  </span>
                  <div className="flex gap-2">
                    {heroSlides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => goToSlide(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === activeSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/70'
                        }`}
                        aria-label={`Go to slide ${i + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating stat card */}
              <div
                className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-5 shadow-xl border border-gray-100 z-30"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(20px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.1s',
                }}
              >
                <p className="text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1">Google Rating</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">4.9</span>
                  <span className="text-foreground/40 text-sm">/5</span>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
              </div>

              {/* Floating badge top-right */}
              <div
                className="absolute -top-4 -right-4 bg-white rounded-xl px-4 py-3 shadow-lg border border-gray-100 z-30"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? 'translateY(0)' : 'translateY(-10px)',
                  transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 1.3s',
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">6:1 Ratio</p>
                    <p className="text-[10px] text-foreground/50">Client to Staff</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Horizontal scrolling ticker */}
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
