'use client';

import { useEffect, useRef, useState } from 'react';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';

// Site-wide WebGL background. Fixed full-viewport canvas anchored
// behind every section (z-index -10), so it reads as ambient atmosphere
// only where page sections leave transparent gaps. Subtle on purpose —
// it should never compete with content.
//
// Most page sections paint their own opaque background (warm-bg or
// white) and fully cover the canvas. The atmosphere is intended to
// peek through where the design opens up: route transitions, scroll
// overscroll on iOS, the body's edges before/after content has
// loaded, and any future section that opts into a transparent or
// semi-transparent background.
//
// Architecture summary across the 10 build phases:
//   1. Scaffold canvas + lifecycle hooks.
//   2. WebGL2 fullscreen quad + brand radial gradient base.
//   3-5. Brand mark layers — medallion ring, cross, dangling beads.
//   6.  Time-driven sway on the bead chain.
//   7.  3-octave FBM warm-haze layer for atmospheric texture.
//   8.  Pointer + scroll parallax with critically-damped smoothing.
//   9.  Mobile / low-power profile: DPR cap 1.0 and 30fps frame cap
//       on coarse-pointer / low-memory / narrow-viewport devices.
//   10. Final opacity tuning so the brand mark reads with presence
//       when the atmosphere does become visible.

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('[SiteBackground] shader compile failed:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[SiteBackground] program link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  // Shaders are linked in; we can drop our handles to them.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

export default function SiteBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Honor OS reduced-motion preference. When set, we render a single
  // static frame and skip the animation loop entirely.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  // Pause when the tab is hidden so we're not burning GPU off-screen.
  useEffect(() => {
    const onVis = () => setActive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Main WebGL lifecycle: build context + program + buffers, then
  // tick a rAF loop until cleanup. Re-runs on `reduced` flip so we
  // can switch to a one-frame mode without re-creating context.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Premultiplied alpha + no depth/stencil buffer — we only ever
    // draw a single full-screen quad and never z-test anything.
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: true,
      powerPreference: 'low-power',
    });
    if (!gl) {
      // Browser without WebGL2 — leave the empty canvas in place;
      // nothing visually breaks (just no background).
      return;
    }

    const program = buildProgram(gl);
    if (!program) return;

    // Fullscreen triangle-strip quad in clip space.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );

    gl.useProgram(program);
    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, 'u_time');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uScroll = gl.getUniformLocation(program, 'u_scroll');

    // Smoothed pointer + scroll state. Raw input is captured in the
    // listeners; the rAF loop eases the rendered values toward target
    // so parallax doesn't strobe with mouse jitter or wheel scroll.
    const target = { mx: 0, my: 0, scroll: 0 };
    const smooth = { mx: 0, my: 0, scroll: 0 };

    const onPointer = (e: PointerEvent) => {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      target.mx = (e.clientX / w) * 2 - 1; // [-1, 1]
      target.my = (e.clientY / h) * 2 - 1;
    };
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      target.scroll = Math.min(1, Math.max(0, window.scrollY / max));
    };
    onScroll();
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Power profile — coarse pointer (touch) or low memory (≤4GB) or
    // narrow viewport (<640px) all signal "phone or tablet". On these
    // we cap DPR harder (1.0) and clamp the rAF loop to 30fps to halve
    // the GPU bill. Desktop keeps the smoother 1.5 DPR / 60fps path.
    const isLowPower =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches ||
        // navigator.deviceMemory is not in lib.dom; tolerate undefined.
        ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 ||
        window.innerWidth < 640);
    const dprCap = isLowPower ? 1.0 : 1.5;
    const targetFps = isLowPower ? 30 : 60;
    const minFrameMs = 1000 / targetFps;

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(uResolution, w, h);
    }
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let cancelled = false;
    const start = performance.now();
    const renderOnce = () => {
      if (!gl) return;
      resize();
      const tSec = (performance.now() - start) / 1000;
      // Critically-damped-ish lerp toward target — k tuned so a full
      // 60 fps frame moves about 8% of the gap, giving us perceptually
      // smooth tracking without a feel of input lag.
      const k = 0.08;
      smooth.mx += (target.mx - smooth.mx) * k;
      smooth.my += (target.my - smooth.my) * k;
      smooth.scroll += (target.scroll - smooth.scroll) * k;
      gl.uniform1f(uTime, tSec);
      gl.uniform2f(uMouse, smooth.mx, smooth.my);
      gl.uniform1f(uScroll, smooth.scroll);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (reduced) {
      // Static single-frame render path. Skip parallax inputs so the
      // page is visually identical for users who opted out of motion.
      gl.uniform2f(uMouse, 0, 0);
      gl.uniform1f(uScroll, 0);
      gl.uniform1f(uTime, 0);
      renderOnce();
    } else {
      // Frame-cap loop — only render when at least minFrameMs has
      // elapsed since the last paint. Saves ~50% of fragment work on
      // mobile without affecting visual quality (the animations are
      // all sub-1Hz and don't need 60fps to look smooth).
      let lastPaint = 0;
      const loop = (now: number) => {
        if (cancelled) return;
        if (active && now - lastPaint >= minFrameMs) {
          lastPaint = now;
          renderOnce();
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
    };
  }, [active, reduced]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      // `contain: strict` keeps paint scoped to this element so the
      // browser can short-circuit hit-testing / layout against the
      // body content above us.
      style={{ contain: 'strict' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
