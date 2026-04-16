'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthProvider';
import { usePagePermissions, type PageConfig } from '@/lib/PagePermissions';
import { db } from '@/lib/db';
import PageGuard from '@/lib/PageGuard';
import PageViewers from './PageViewers';
import { PresenceCursors } from '@/components/PresenceCursors';

interface NavDepartment {
  id: string;
  name: string;
  color: string | null;
}

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
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-warm-bg/40 dark:hover:bg-white/5 transition-colors"
      style={{ fontFamily: 'var(--font-body)' }}
      aria-label="Toggle theme"
    >
      {dark ? (
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-foreground/50" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="transparent" stroke="currentColor" />
        </svg>
      )}
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}

/* ── Nav Items ──────────────────────────────────────────────────── */

/* ── Icon Map ─────────────────────────────────────────────────── */

// Lucide-derived icon set. Stroke 1.75 at 24-viewBox reads well at w-5 h-5.
// Meaning-first: Facilities=building (not wrench), Equine=horseshoe,
// Billing=receipt, Calendar=dated grid.
const pageIcons: Record<string, React.ReactNode> = {
  '/app': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  '/app/facilities': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </svg>
  ),
  '/app/departments': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="7" height="13" rx="1" />
      <rect x="14" y="4" width="7" height="16" rx="1" />
      <path d="M6 11h1M6 14h1M6 17h1M17 8h1M17 11h1M17 14h1M17 17h1" />
    </svg>
  ),
  '/app/finance': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 4 4 5-6" />
      <path d="M15 9h5v5" />
    </svg>
  ),
  '/app/reports': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h2v5H8zM12 10h2v8h-2zM16 15h2v3h-2z" />
    </svg>
  ),
  '/app/job-descriptions': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M2 13h20" />
      <path d="M10 13v2h4v-2" />
    </svg>
  ),
  '/app/org-chart': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v3M6 16v-2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  '/app/compliance': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  '/app/groups': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  '/app/calendar': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  '/app/equine': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 21V10a7 7 0 0 1 14 0v11" />
      <circle cx="5" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="21" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  '/app/billing': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  ),
  '/app/fleet': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="11" width="16" height="7" rx="2" />
      <path d="M17 11V7a2 2 0 0 1 2-2h1l3 5v7a1 1 0 0 1-1 1h-1" />
      <circle cx="6" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <path d="M17 18h-3M9 18H1" />
    </svg>
  ),
  '/app/calls': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  '/app/team': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <circle cx="18" cy="11" r="3" />
      <path d="m22 15-1.5-1.5M22 7l-1.5 1.5" />
    </svg>
  ),
  '/app/pages': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 9H8M16 13H8M16 17H8" />
    </svg>
  ),
  '/app/apis': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="8" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
  '/app/super-admin': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" />
      <path d="m9.5 12 2 2 3.5-4" />
    </svg>
  ),
  '/app/activity': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9-6-18-3 9H2" />
    </svg>
  ),
  '/app/tours': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13 6-3m-6 3V7m6 10 5.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-1.447-.894L15 4m0 13V4m-6 3 6-3" />
    </svg>
  ),
  '/app/notes': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4a2 2 0 0 1 2-2h10l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path d="M16 2v4h4" />
      <path d="M8 11h8M8 15h8M8 19h5" />
    </svg>
  ),
  '/app/policies': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h6l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M14 4v4h4" />
      <path d="m9 14 2 2 4-4" />
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
  const { user, loading, isAdmin, departmentId, signInWithGoogle, signOut, session } = useAuth();
  const { navPages, popupPages, isPageAllowedForDepartment } = usePagePermissions();
  const pathname = usePathname();
  const router = useRouter();
  const [navDepartments, setNavDepartments] = useState<NavDepartment[]>([]);

  // Sidebar/popup links are gated on both admin-only flag and the
  // per-page department allow-list. Admins bypass the department check.
  const canSeePage = (item: { path: string; adminOnly: boolean }) => {
    if (item.adminOnly && !isAdmin) return false;
    if (isAdmin) return true;
    return isPageAllowedForDepartment(item.path, departmentId);
  };
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navMounted, setNavMounted] = useState(false);
  const [latestSignedJd, setLatestSignedJd] = useState<{ id: string; title: string } | null>(null);

  // Load departments for sidebar grouping
  useEffect(() => {
    if (!session?.access_token) return;
    async function loadDepts() {
      try {
        const data = await db({ action: 'select', table: 'departments', select: 'id, name, color', order: { column: 'name', ascending: true } });
        if (Array.isArray(data)) setNavDepartments(data as NavDepartment[]);
      } catch { /* ignore */ }
    }
    loadDepts();
  }, [session]);

  // Latest signed JD — shown under user name in sidebar chip
  useEffect(() => {
    if (!session?.access_token || !user?.id) return;
    let cancelled = false;
    async function loadLatestSigned() {
      try {
        const sigs = await db({
          action: 'select',
          table: 'jd_signatures',
          match: { signer_user_id: user!.id },
          select: 'id, job_description_id, signed_at',
          order: { column: 'signed_at', ascending: false },
        });
        if (cancelled || !Array.isArray(sigs)) return;
        const signed = (sigs as Array<{ job_description_id: string; signed_at: string | null }>).find((s) => !!s.signed_at);
        if (!signed) {
          setLatestSignedJd(null);
          return;
        }
        const jd = await db({
          action: 'select',
          table: 'job_descriptions',
          match: { id: signed.job_description_id },
          select: 'id, title',
        });
        if (cancelled) return;
        if (Array.isArray(jd) && jd.length > 0) {
          const row = jd[0] as { id: string; title: string };
          setLatestSignedJd({ id: row.id, title: row.title });
        }
      } catch { /* ignore */ }
    }
    loadLatestSigned();
    return () => { cancelled = true; };
  }, [session, user?.id]);

  // Group visible nav pages: ungrouped first, then by department
  const visibleNavPages = navPages.filter(canSeePage);
  const ungroupedPages = visibleNavPages.filter(p => !p.departmentId);
  const deptGroups: { dept: NavDepartment; pages: PageConfig[] }[] = [];
  for (const dept of navDepartments) {
    const deptPages = visibleNavPages.filter(p => p.departmentId === dept.id);
    if (deptPages.length > 0) {
      deptGroups.push({ dept, pages: deptPages });
    }
  }

  // Restore theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.classList.add('dark');
    }
    // Trigger nav entrance animation after first paint
    requestAnimationFrame(() => setNavMounted(true));
  }, []);

  // Preload the Finance page so it renders instantly when the user
  // opens it. Two layers of warming:
  //   1. `router.prefetch` asks Next to fetch the Finance route bundle
  //      and its RSC payload in the background.
  //   2. We fire a no-await GET for the QuickBooks company list so
  //      the HTTP response is already sitting in the browser cache
  //      (credentials + same URL) by the time FinanceContent mounts
  //      and asks for it. The Finance sub-panels fetch their own
  //      reports lazily per tab; this covers the initial company
  //      picker + Overview handshake that used to show a spinner.
  // Skipped when the user is already on /app/finance (pointless) or
  // when there is no session yet (the API will 401).
  useEffect(() => {
    if (!session?.access_token) return;
    if (pathname?.startsWith('/app/finance')) return;
    try { router.prefetch('/app/finance'); } catch { /* noop */ }
    const controller = new AbortController();
    const warm = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          fetch('/api/quickbooks/data?report=list', {
            credentials: 'include',
            signal: controller.signal,
          }).catch(() => { /* ignore — this is opportunistic */ });
        })
      : window.setTimeout(() => {
          fetch('/api/quickbooks/data?report=list', {
            credentials: 'include',
            signal: controller.signal,
          }).catch(() => { /* ignore */ });
        }, 400);
    return () => {
      controller.abort();
      if (typeof warm === 'number') window.clearTimeout(warm);
      else if (window.cancelIdleCallback) window.cancelIdleCallback(warm);
    };
  }, [session?.access_token, pathname, router]);

  // Close drawer on Escape + lock body scroll while open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Auto-close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <div className="flex min-h-screen app-shell">
      <PresenceCursors />
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 hidden lg:flex">
        {/* Logo / Brand */}
        <div className="p-5 border-b border-gray-100">
          <Link href="/app" className={`flex items-center gap-2.5 transition-all duration-500 ease-out ${navMounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <span className="text-2xl font-black text-primary tracking-tighter">7A</span>
          </Link>
        </div>

        {/* Nav links — grouped by department */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {(() => {
            let animIdx = 0;
            const renderLink = (item: PageConfig) => {
              const idx = animIdx++;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-500 ease-out ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/60 hover:bg-warm-bg hover:text-foreground'
                  } ${navMounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}
                  style={{ fontFamily: 'var(--font-body)', transitionDelay: `${idx * 50}ms` }}
                >
                  <span className={isActive ? 'text-primary' : 'text-foreground/40'}>{getPageIcon(item.path)}</span>
                  {item.label}
                </Link>
              );
            };
            return (
              <>
                {ungroupedPages.map(renderLink)}
                {deptGroups.map(({ dept, pages }) => {
                  const hdrIdx = animIdx++;
                  return (
                    <div key={dept.id}>
                      <p
                        className={`px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/35 transition-all duration-500 ease-out ${navMounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}
                        style={{ fontFamily: 'var(--font-body)', transitionDelay: `${hdrIdx * 50}ms` }}
                      >
                        {dept.name}
                      </p>
                      {pages.map(renderLink)}
                    </div>
                  );
                })}
              </>
            );
          })()}
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
              {popupPages.filter(canSeePage).map((item) => (
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
              {latestSignedJd ? (
                <p className="text-xs text-foreground/50 truncate" title={`Signed: ${latestSignedJd.title}`}>
                  {latestSignedJd.title}
                </p>
              ) : (
                <p className="text-xs text-foreground/40 truncate">{user.email}</p>
              )}
            </div>
            <svg className="w-4 h-4 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 bg-warm-bg overflow-auto relative">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-white/90 dark:bg-[#1a1410]/90 backdrop-blur border-b border-gray-100 dark:border-white/5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-lg text-foreground/70 hover:bg-warm-bg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/app" className="text-xl font-black text-primary tracking-tighter">
            7A
          </Link>
          <div className="w-10" aria-hidden="true" />
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-drawer-fade"
              aria-hidden="true"
            />
            {/* Panel */}
            <aside className="absolute inset-y-0 left-0 w-[82%] max-w-[320px] bg-white dark:bg-[#1a1410] border-r border-gray-100 dark:border-white/5 shadow-2xl flex flex-col animate-drawer-slide">
              {/* Header: brand + close */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-white/5">
                <Link href="/app" className="flex items-center gap-2.5">
                  <span className="text-2xl font-black text-primary tracking-tighter">7A</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 -mr-2 rounded-lg text-foreground/60 hover:bg-warm-bg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Nav links — grouped by department */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {ungroupedPages.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                      }`}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      <span className={isActive ? 'text-primary' : 'text-foreground/40'}>
                        {getPageIcon(item.path)}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
                {deptGroups.map(({ dept, pages }) => (
                  <div key={dept.id}>
                    <p
                      className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground/35"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {dept.name}
                    </p>
                    {pages.map((item) => {
                      const isActive = pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                          }`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <span className={isActive ? 'text-primary' : 'text-foreground/40'}>
                            {getPageIcon(item.path)}
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                ))}

                {popupPages.filter(canSeePage).length > 0 && (
                  <>
                    <div className="h-px my-3 bg-gray-100 dark:bg-white/5" />
                    {popupPages.filter(canSeePage).map((item) => {
                      const isActive = pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          href={item.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                          }`}
                          style={{ fontFamily: 'var(--font-body)' }}
                        >
                          <span className={isActive ? 'text-primary' : 'text-foreground/40'}>
                            {getPageIcon(item.path)}
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </>
                )}

                <Link
                  href="/app/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    pathname === '/app/profile'
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground/70 hover:bg-warm-bg hover:text-foreground'
                  }`}
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <span className={pathname === '/app/profile' ? 'text-primary' : 'text-foreground/40'}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </span>
                  My Profile
                </Link>
              </nav>

              {/* User card + sign out */}
              <div className="p-3 border-t border-gray-100 dark:border-white/5 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="" className="w-9 h-9 rounded-full" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                      {(user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    {latestSignedJd ? (
                      <p className="text-xs text-foreground/50 truncate" title={`Signed: ${latestSignedJd.title}`}>
                        {latestSignedJd.title}
                      </p>
                    ) : (
                      <p className="text-xs text-foreground/40 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <ThemeToggle />
                <button
                  onClick={() => { setMobileMenuOpen(false); signOut(); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </aside>
          </div>
        )}

        <PageGuard>{children}</PageGuard>

        {/* Same-page viewers — shown on every /app/* page */}
        <PageViewers />

      </div>
    </div>
  );
}
