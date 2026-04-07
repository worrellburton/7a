'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';

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
        for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
        return v;
      }

      void main() {
        vec2 uv = vUv;
        float asp = uRes.x / uRes.y;
        float t = uTime * 0.05;

        float n1 = fbm(vec2(uv.x * asp * 1.2 + t * 0.3, uv.y * 1.2 + t * 0.2));
        float n2 = fbm(vec2(uv.x * asp * 1.8 - t * 0.2, uv.y * 1.8 + t * 0.35) + 5.0);
        float n3 = fbm(vec2(uv.x * asp * 0.8 + t * 0.15, uv.y * 0.8 - t * 0.1) + 10.0);

        // Warm desert palette
        vec3 sand  = vec3(0.965, 0.950, 0.930);
        vec3 terra = vec3(0.627, 0.322, 0.176);
        vec3 rose  = vec3(0.776, 0.478, 0.290);
        vec3 sage  = vec3(0.620, 0.660, 0.560);
        vec3 dusk  = vec3(0.400, 0.280, 0.350);

        // Drifting radial blobs
        vec2 c1 = vec2(0.3 + sin(t * 0.7) * 0.2, 0.3 + cos(t * 0.5) * 0.2);
        vec2 c2 = vec2(0.7 + cos(t * 0.4) * 0.15, 0.6 + sin(t * 0.8) * 0.15);
        vec2 c3 = vec2(0.5 + sin(t * 0.9 + 2.0) * 0.25, 0.8 + cos(t * 0.3) * 0.1);
        vec2 c4 = vec2(0.2 + cos(t * 0.6 + 1.0) * 0.1, 0.7 + sin(t * 0.7) * 0.15);

        float r1 = smoothstep(0.55, 0.0, length(uv - c1));
        float r2 = smoothstep(0.50, 0.0, length(uv - c2));
        float r3 = smoothstep(0.45, 0.0, length(uv - c3));
        float r4 = smoothstep(0.40, 0.0, length(uv - c4));

        vec3 col = sand;
        col = mix(col, rose,  r1 * 0.18 * (0.7 + n1 * 0.6));
        col = mix(col, terra, r2 * 0.12 * (0.6 + n2 * 0.8));
        col = mix(col, sage,  r3 * 0.14 * (0.5 + n3 * 0.6));
        col = mix(col, dusk,  r4 * 0.08 * (0.6 + n1 * 0.4));

        // Subtle flowing particles
        float p1 = smoothstep(0.48, 0.50, noise(uv * 30.0 + t * 2.0)) * 0.03;
        float p2 = smoothstep(0.49, 0.51, noise(uv * 25.0 - t * 1.5 + 3.0)) * 0.02;
        col += vec3(terra) * p1 + vec3(rose) * p2;

        // Film grain
        col += (hash(uv * uRes + fract(uTime * 0.5)) - 0.5) * 0.008;

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

/* ── Nav Items ──────────────────────────────────────────────────── */

const navItems = [
  {
    label: 'Home',
    href: '/app',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
      </svg>
    ),
  },
  {
    label: 'Improvements',
    href: '/app/improvements',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    label: 'Users',
    href: '/app/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

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
          <h1 className="text-3xl font-bold text-foreground mb-1 tracking-tight">
            Seven Arrows Recovery
          </h1>
          <p className="text-foreground/40 text-xs tracking-widest uppercase mb-10" style={{ fontFamily: 'var(--font-body)' }}>
            Patient Portal
          </p>
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
          <p className="mt-8 text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
            Secure &bull; HIPAA Compliant &bull; Confidential
          </p>
        </div>
      </div>
    );
  }

  // Signed in — platform with sidebar
  return (
    <div className="flex min-h-[calc(100vh-200px)]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 hidden lg:flex">
        {/* Logo / Brand */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/app" className="flex items-center gap-2.5">
            <img src="/images/logo.png" alt="Seven Arrows" className="h-8 w-auto" />
            <span className="text-sm font-bold text-foreground tracking-tight">Portal</span>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/60 hover:bg-warm-bg hover:text-foreground'
                }`}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className={isActive ? 'text-primary' : 'text-foreground/40'}>{item.icon}</span>
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
                href="/"
                className="block px-4 py-3 text-sm text-foreground/70 hover:bg-warm-bg transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Back to Website
              </Link>
              <button
                onClick={() => { signOut(); setUserMenuOpen(false); }}
                className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
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
      <div className="flex-1 bg-warm-bg overflow-auto">
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
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-lg ${pathname === item.href ? 'bg-primary/10 text-primary' : 'text-foreground/40'}`}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
