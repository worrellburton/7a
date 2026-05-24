'use client';

import { useEffect, useRef } from 'react';

// Subtle WebGL backdrop for the insurance-verification section.
// Renders three slowly-drifting blobs of warm color in a fragment
// shader — visually closer to a Rothko gradient than a particle
// field. No external library; vanilla WebGL2 + a tiny fragment
// shader, ~3KB gzipped.
//
// Tradeoffs called out explicitly:
//   - prefers-reduced-motion: bails to a static gradient, no GL
//     context created at all (battery + GPU on mobile).
//   - device pixel ratio is capped at 1.5 so HiDPI displays don't
//     burn cycles on pixels that don't help the visual.
//   - intersectionobserver pauses the rAF when the section is
//     off-screen so scrolling through the page doesn't keep the
//     GPU busy.

const VERT = `#version 300 es
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// Three blobs drift along Lissajous-like paths. Color stops bias
// toward the brand copper + warm dark brown so the field reads as
// an extension of the footer below.
const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
out vec4 outColor;

float blob(vec2 uv, vec2 c, float r) {
  float d = distance(uv, c);
  return smoothstep(r, r * 0.2, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  uv.x *= u_res.x / u_res.y;

  float t = u_time * 0.06;
  vec2 c1 = vec2(0.30 + 0.10 * sin(t * 0.7), 0.40 + 0.07 * cos(t * 0.9));
  vec2 c2 = vec2(0.65 + 0.12 * cos(t * 0.5), 0.55 + 0.08 * sin(t * 1.1));
  vec2 c3 = vec2(0.50 + 0.18 * sin(t * 0.3), 0.20 + 0.10 * cos(t * 0.6));

  float b1 = blob(uv, c1, 0.55);
  float b2 = blob(uv, c2, 0.50);
  float b3 = blob(uv, c3, 0.45);

  vec3 base = vec3(0.078, 0.044, 0.034);             // #14090a footer dark
  vec3 copper = vec3(0.737, 0.420, 0.290);           // #bc6b4a brand copper
  vec3 plum = vec3(0.165, 0.078, 0.062);             // mid-tone seam

  vec3 col = base;
  col = mix(col, copper * 0.55, b1 * 0.35);
  col = mix(col, plum, b2 * 0.55);
  col = mix(col, copper * 0.40, b3 * 0.25);

  // film grain — tiny, deterministic from fragcoord, takes the
  // hard edge off the gradient bands without animating.
  float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (noise - 0.5) * 0.012;

  outColor = vec4(col, 1.0);
}`;

export default function DarkFormBackdrop({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect prefers-reduced-motion. Static fallback is the CSS
    // gradient on the parent <section>, so we just don't initialise
    // the GL context at all here.
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false });
    if (!gl) return;

    // Compile shaders. Failures are silent — the static gradient
    // bg on the parent stays visible, so a missing animation is a
    // graceful degradation, not a broken layout.
    function compile(type: number, source: string): WebGLShader | null {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, source);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    }
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    const resLoc = gl.getUniformLocation(prog, 'u_res');
    const timeLoc = gl.getUniformLocation(prog, 'u_time');

    // Full-viewport triangle pair — cheaper than a quad with index
    // buffer for a one-off backdrop.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    let rafId = 0;
    let running = true;

    function resize() {
      if (!canvas || !gl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener('resize', resize);

    const start = performance.now();
    function frame() {
      if (!running || !gl) return;
      resize();
      gl.uniform2f(resLoc, canvas!.width, canvas!.height);
      gl.uniform1f(timeLoc, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      rafId = requestAnimationFrame(frame);
    }

    // Pause the rAF when the section scrolls off-screen so the GPU
    // isn't busy painting pixels nobody can see.
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        if (visible && !running) {
          running = true;
          frame();
        } else if (!visible && running) {
          running = false;
          cancelAnimationFrame(rafId);
        }
      },
      { rootMargin: '100px' },
    );
    io.observe(canvas);

    frame();

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      io.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
    />
  );
}
