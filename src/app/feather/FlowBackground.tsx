'use client';

import { useEffect, useRef } from 'react';

// WebGL backdrop for the console. Two layered value-noise bands animate very
// slowly to evoke desert mountain ridgelines drifting under heat shimmer.
// Strictly uses the existing warm palette (no blues/greens/purples) and stays
// subtle enough to sit behind all dashboard content.
//
// Palette anchors:
//   deep   = #3d1a0e (primary-dark, distant mountains)
//   mid    = #a0522d (primary, near ridges)
//   warm   = #e8dccf (warm haze)
//   bg     = #f5f0eb (page base)

const VERT = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision mediump float;
  varying vec2 v_uv;
  uniform float u_time;
  uniform vec2 u_res;

  // 2D hash + value noise
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
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

  // Sample a ridge height at horizontal position x, drifting over time.
  float ridge(float x, float seed, float speed, float scale) {
    float n = fbm(vec2(x * scale + u_time * speed, seed));
    // Sharpen into ridge-like shape
    n = abs(n - 0.5) * 2.0;
    return 1.0 - n;
  }

  void main() {
    vec2 uv = v_uv;

    // Palette (warm earth tones only)
    vec3 bg   = vec3(0.961, 0.941, 0.922); // #f5f0eb
    vec3 warm = vec3(0.910, 0.863, 0.812); // #e8dccf
    vec3 mid  = vec3(0.627, 0.322, 0.176); // #a0522d
    vec3 deep = vec3(0.239, 0.102, 0.055); // #3d1a0e

    // Vertical gradient: warmer near the ground
    float sky = smoothstep(0.1, 1.0, uv.y);
    vec3 col = mix(warm, bg, sky);

    // Far ridge (dark, slow)
    float r1 = ridge(uv.x, 12.5, 0.010, 2.0) * 0.28 + 0.18;
    float mask1 = smoothstep(r1 + 0.01, r1, uv.y);
    col = mix(col, mix(col, deep, 0.35), mask1 * 0.65);

    // Middle ridge (warm brown)
    float r2 = ridge(uv.x, 4.7, 0.018, 2.8) * 0.22 + 0.12;
    float mask2 = smoothstep(r2 + 0.008, r2, uv.y);
    col = mix(col, mix(col, mid, 0.45), mask2 * 0.55);

    // Near desert layer — softer, more textured (dune strokes)
    float r3 = ridge(uv.x, 1.9, 0.028, 3.6) * 0.14 + 0.05;
    float dune = fbm(vec2(uv.x * 6.0 + u_time * 0.02, uv.y * 3.0));
    float mask3 = smoothstep(r3 + 0.006, r3, uv.y);
    col = mix(col, mix(col, warm * 0.85, 0.6), mask3 * (0.5 + dune * 0.4));

    // Heat shimmer sheen horizontally — very subtle
    float shimmer = sin((uv.y * 120.0) + u_time * 0.6 + uv.x * 2.0) * 0.004;
    col += shimmer;

    // Gentle vignette to keep focus on the center
    float vig = smoothstep(1.3, 0.3, distance(uv, vec2(0.5)));
    col = mix(col * 0.96, col, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

export default function FlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: true, alpha: true }) || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;

    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    // Fullscreen quad (two triangles)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1,  -1, 1,
      -1,  1,  1, -1,   1, 1,
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_res');

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(canvas.clientWidth * dpr);
      const h = Math.floor(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl!.viewport(0, 0, w, h);
      }
      gl!.uniform2f(uRes, w, h);
    }

    const start = performance.now();
    function frame(now: number) {
      resize();
      const t = (now - start) / 1000;
      gl!.uniform1f(uTime, t);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      if (!reduce) rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 -z-10 w-full h-full pointer-events-none"
      style={{ opacity: 0.55 }}
    />
  );
}
