'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight animated backdrop. Vanilla WebGL2 fragment shader that
 * renders slow-moving warm aurora bands using layered value noise.
 * No external dependencies. If WebGL isn't available (older browser,
 * headless crawler, reduced-motion) the canvas silently does nothing
 * and the <section> behind it reads as a normal gradient backdrop.
 */
export default function WebGLAurora({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect OS-level reduced-motion — don't burn battery on someone
    // who has explicitly asked motion to calm down.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    const vertSrc = `#version 300 es
      in vec2 a_pos;
      void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    // Aurora shader — two layers of hash-based value noise scrolling at
    // different rates, modulated by a vertical ramp, blended into the
    // warm palette used across the site (terracotta → shadow plum).
    const fragSrc = `#version 300 es
      precision highp float;
      out vec4 outColor;
      uniform vec2  u_res;
      uniform float u_time;
      uniform float u_intensity;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.02;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_res.xy;
        vec2 p  = uv * vec2(2.6, 1.6);
        float t = u_time * 0.055;

        float n1 = fbm(p + vec2(t, -t * 0.5));
        float n2 = fbm(p * 1.7 + vec2(-t * 0.8, t * 0.6) + n1);

        // Warm palette aligned with the site tokens.
        vec3 shadow    = vec3(0.16, 0.06, 0.04);  // --color-dark-section-ish
        vec3 terracotta= vec3(0.74, 0.42, 0.29);  // --color-primary
        vec3 accent    = vec3(0.85, 0.54, 0.40);  // --color-accent
        vec3 plum      = vec3(0.09, 0.04, 0.03);

        // Vertical falloff — brighter near the top quarter, deep at the
        // bottom so the legibility scrim over the hero has something
        // warm to anchor to.
        float ramp = smoothstep(1.0, 0.1, uv.y);

        vec3 col = mix(plum, shadow, n1);
        col = mix(col, terracotta, n2 * 0.55 * ramp);
        col = mix(col, accent, pow(n2, 3.0) * 0.7 * ramp);

        // Subtle film grain so the shader reads as ambient rather than
        // screen-doored digital noise.
        float grain = (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.035;
        col += grain;

        outColor = vec4(col * u_intensity, 1.0);
      }
    `;

    function compile(type: number, src: string) {
      const sh = gl!.createShader(type)!;
      gl!.shaderSource(sh, src);
      gl!.compileShader(sh);
      if (!gl!.getShaderParameter(sh, gl!.COMPILE_STATUS)) {
        // eslint-disable-next-line no-console
        console.error('Aurora shader compile:', gl!.getShaderInfoLog(sh));
        gl!.deleteShader(sh);
        return null;
      }
      return sh;
    }

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uInt = gl.getUniformLocation(prog, 'u_intensity');

    let raf = 0;
    let start = performance.now();
    let running = true;

    function resize() {
      if (!gl || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth * dpr;
      const h = canvas.clientHeight * dpr;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Pause the loop when the tab is hidden — no point burning cycles on
    // a backgrounded aurora.
    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) {
        start = performance.now() - lastT * 1000;
        loop();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    let lastT = 0;
    function loop() {
      if (!running) return;
      resize();
      lastT = (performance.now() - start) / 1000;
      gl!.uniform2f(uRes, canvas!.width, canvas!.height);
      gl!.uniform1f(uTime, lastT);
      gl!.uniform1f(uInt, intensity);
      gl!.drawArrays(gl!.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(loop);
    }

    resize();
    loop();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, [intensity]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
}
