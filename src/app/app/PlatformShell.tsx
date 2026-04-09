'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions } from '@/lib/PagePermissions';
import PageGuard from '@/lib/PageGuard';

/* ── Login WebGL Background ─────────────────────────────────────── */

function LoginBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { alpha: false, antialias: true });
    if (!gl) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);

    const vs = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main() {
        vUv = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec2 uRes;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float asp = uRes.x / uRes.y;
        float t = uTime * 0.04;

        // Warm tan base
        vec3 bg = vec3(0.96, 0.94, 0.92);

        // Warm palette for waves
        vec3 sand  = vec3(0.92, 0.88, 0.82);
        vec3 terra = vec3(0.78, 0.58, 0.42);
        vec3 rose  = vec3(0.82, 0.65, 0.55);

        float n1 = fbm(uv * 2.0 + t * 0.3);
        float n2 = fbm(uv * 2.5 + t * 0.2 + 5.0);

        // Subtle flowing wave bands
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float freq = 1.5 + fi * 0.6;
          float speed = 0.3 + fi * 0.08;
          float yOff = 0.3 + fi * 0.12;
          float n = fbm(vec2(uv.x * asp * 1.2 + fi * 2.5, t * 0.15 + fi));
          float wave = sin(uv.x * asp * freq + t * speed + n * 2.5) * (0.06 + fi * 0.01);
          float line = smoothstep(0.004, 0.0, abs(uv.y - yOff + wave));
          float glow = smoothstep(0.08, 0.0, abs(uv.y - yOff + wave));
          vec3 lineCol = mix(terra, rose, fi / 3.0);
          col = bg;
          col = bg + lineCol * line * 0.12 + lineCol * glow * 0.03;
        }

        // Very subtle drifting warmth
        col = bg;
        for (int i = 0; i < 4; i++) {
          float fi = float(i);
          float freq = 1.5 + fi * 0.6;
          float speed = 0.3 + fi * 0.08;
          float yOff = 0.3 + fi * 0.12;
          float n = fbm(vec2(uv.x * asp * 1.2 + fi * 2.5, t * 0.15 + fi));
          float wave = sin(uv.x * asp * freq + t * speed + n * 2.5) * (0.06 + fi * 0.01);
          float line = smoothstep(0.003, 0.0, abs(uv.y - yOff + wave));
          float glow = smoothstep(0.06, 0.0, abs(uv.y - yOff + wave));
          vec3 lineCol = mix(terra, rose, fi / 3.0);
          col += lineCol * line * 0.08 + lineCol * glow * 0.015;
        }

        // Barely-there noise texture
        col += (sand - bg) * n1 * 0.03;

        // Film grain
        col += (hash(uv * uRes + fract(uTime * 0.5)) - 0.5) * 0.006;

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
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const aPos = gl.getAttribLocation(prog, 'aPos');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uRes = gl.getUniformLocation(prog, 'uRes');

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    let raf: number;
    const t0 = performance.now();
    const draw = () => {
      gl.uniform1f(uTime, (performance.now() - t0) / 1000);
      gl.uniform2f(uRes, canvas.width, canvas.height);
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
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  );
}

/* ── Theme Toggle ──────────────────────────────────────────────── */

function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className="fixed bottom-5 right-5 z-50 w-10 h-10 rounded-full bg-white dark:bg-[#2a2118] border border-gray-200 dark:border-white/10 shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      aria-label="Toggle theme"
    >
      {dark ? (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-foreground/50" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="transparent" stroke="currentColor" />
        </svg>
      )}
    </button>
  );
}

/* ── Nav Items ──────────────────────────────────────────────────── */

/* ── Icon Map ─────────────────────────────────────────────────── */

const pageIcons: Record<string, React.ReactNode> = {
  '/app': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  ),
  '/app/improvements': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
    </svg>
  ),
  '/app/compliance': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  '/app/groups': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  '/app/equine': (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2c-1 0-2.5.8-3 2l-1 3-4 1-3 4h3l-1 3 2.5 1L13 21M17 21v-5c0-1 .5-2 1.5-3L21 10l-1-3c-.5-1.5-1-3-2-5" />
      <path d="M20.5 3.5c.5 0 1 .5 1 1" />
    </svg>
  ),
  '/app/billing': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  '/app/calls': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  ),
  '/app/frameworks': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" />
    </svg>
  ),
  '/app/users': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  '/app/pages': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
};

function getPageIcon(path: string, size: 'sm' | 'md' = 'md') {
  const icon = pageIcons[path];
  if (!icon) return null;
  if (size === 'sm') {
    // Clone with smaller class - icons already use w-5 h-5 but popup uses w-4 h-4
    return <span className="[&>svg]:w-4 [&>svg]:h-4">{icon}</span>;
  }
  return icon;
}

export { pageIcons };

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, signInWithGoogle, signOut } = useAuth();
  const { isPageAdminOnly, navPages, popupPages } = usePagePermissions();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Restore theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not signed in — show login with WebGL background
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <LoginBackground />
        <div className="relative z-10 max-w-sm w-full mx-4 text-center">
          <img
            src="/images/logo.png"
            alt="Seven Arrows Recovery"
            className="h-20 w-auto mx-auto mb-6"
          />
          <div className="mb-10" />
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-foreground hover:bg-foreground/90 text-white rounded-full py-3.5 px-6 text-sm font-semibold transition-all shadow-sm hover:shadow-lg"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  // Signed in — platform with sidebar
  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 hidden lg:flex">
        {/* Logo / Brand */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/app" className="flex items-center gap-2.5">
            <span className="text-2xl font-black text-primary tracking-tighter">7A</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {navPages.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/60 hover:bg-warm-bg hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className={isActive ? 'text-primary' : 'text-foreground/40'}>{getPageIcon(item.path)}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User settings — bottom left */}
        <div className="relative p-3 border-t border-gray-100">
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
              <Link
                href="/app/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground/70 hover:bg-warm-bg transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                My Profile
              </Link>
              {popupPages.filter((item) => !item.adminOnly || isAdmin).map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground/70 hover:bg-warm-bg transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {getPageIcon(item.path, 'sm')}
                  {item.label}
                </Link>
              ))}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 text-sm text-foreground/70 hover:bg-warm-bg transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H18m0 0v4.5m0-4.5L10.5 13.5" />
                </svg>
                In Progress
              </a>
              <button
                onClick={() => { signOut(); setUserMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-warm-bg transition-colors text-left"
          >
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {(user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.user_metadata?.full_name || 'User'}
              </p>
              <p className="text-xs text-foreground/40 truncate">{user.email}</p>
            </div>
            <svg className="w-4 h-4 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 bg-warm-bg overflow-auto relative">
        {/* Mobile nav bar */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                {(user.user_metadata?.full_name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-foreground">
              {user.user_metadata?.full_name?.split(' ')[0] || 'Portal'}
            </span>
          </div>
          <div className="flex gap-2">
            {navPages.filter((item) => !item.adminOnly || isAdmin).map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`p-2 rounded-lg ${pathname === item.path ? 'bg-primary/10 text-primary' : 'text-foreground/40'}`}
              >
                {getPageIcon(item.path)}
              </Link>
            ))}
          </div>
        </div>

        <PageGuard>{children}</PageGuard>

        {/* Theme toggle — fixed bottom right */}
        <ThemeToggle />
      </div>
    </div>
  );
}
