'use client';

import { useEffect, useRef, useState } from 'react';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shader';

// Site-wide WebGL background. Fixed full-viewport canvas anchored
// behind every section (z-index -10), so it reads as ambient atmosphere
// only where page sections leave transparent gaps. Subtle on purpose —
// it should never compete with content.
//
// Phase 2: WebGL2 context + fullscreen quad + the brand-color radial
// gradient shader. Animation loop ticks `u_time` once per rAF when the
// component is `active` (tab visible). Reduced-motion users get a
// single static frame and no loop.

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

    // Cap DPR at 1.5 — the background is so subtle that a 1:1 pixel
    // grid is plenty, and capping saves a lot of fragment work on
    // 3x retina phones.
    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
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
      gl.uniform1f(uTime, tSec);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    if (reduced) {
      // Static single-frame render path.
      renderOnce();
    } else {
      const loop = () => {
        if (cancelled) return;
        if (active) renderOnce();
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
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
