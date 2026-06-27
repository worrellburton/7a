'use client';

import { useEffect, useRef } from 'react';

// Animated starfield for the Landing → Code tab — a deliberately
// different backdrop from the rest of Feather. Drifting + twinkling
// stars, two soft nebula glows, and the occasional shooting star, all
// on a single <canvas>. Sizes to its positioned parent, scales for
// devicePixelRatio, and falls back to a single static frame when the
// user prefers reduced motion.
export default function SpaceBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    interface Star { x: number; y: number; z: number; r: number; tw: number; ts: number }
    interface Shoot { x: number; y: number; vx: number; vy: number; life: number; max: number }
    let stars: Star[] = [];
    let shoots: Shoot[] = [];

    function resize() {
      const parent = canvas!.parentElement;
      w = parent?.clientWidth ?? window.innerWidth;
      h = parent?.clientHeight ?? window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(240, Math.max(60, Math.floor((w * h) / 6500)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random(),
        r: Math.random() * 1.4 + 0.3,
        tw: Math.random() * Math.PI * 2,
        ts: Math.random() * 0.04 + 0.005,
      }));
    }

    function paintBackdrop() {
      ctx!.clearRect(0, 0, w, h);
      const g = ctx!.createRadialGradient(w * 0.72, h * 0.22, 0, w * 0.72, h * 0.22, Math.max(w, h) * 0.65);
      g.addColorStop(0, 'rgba(124,58,237,0.20)');
      g.addColorStop(0.5, 'rgba(37,99,235,0.08)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);
      const g2 = ctx!.createRadialGradient(w * 0.18, h * 0.82, 0, w * 0.18, h * 0.82, Math.max(w, h) * 0.55);
      g2.addColorStop(0, 'rgba(236,72,153,0.14)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = g2;
      ctx!.fillRect(0, 0, w, h);
    }

    function paintStars(animate: boolean) {
      for (const s of stars) {
        if (animate) {
          s.tw += s.ts;
          s.y += 0.05 + s.z * 0.18;
          if (s.y > h + 2) { s.y = -2; s.x = Math.random() * w; }
        }
        const a = animate ? 0.5 + Math.sin(s.tw) * 0.5 : 0.8;
        ctx!.globalAlpha = 0.25 + a * 0.75;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r * (0.6 + s.z * 0.8), 0, Math.PI * 2);
        ctx!.fillStyle = s.z > 0.85 ? '#bfdbfe' : '#ffffff';
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    resize();
    const ro = new ResizeObserver(() => resize());
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    if (reduce) {
      paintBackdrop();
      paintStars(false);
      return () => ro.disconnect();
    }

    let raf = 0;
    function draw() {
      paintBackdrop();
      paintStars(true);
      if (Math.random() < 0.008 && shoots.length < 2) {
        shoots.push({ x: Math.random() * w * 0.6, y: Math.random() * h * 0.4, vx: 6 + Math.random() * 4, vy: 2 + Math.random() * 2, life: 0, max: 40 + Math.random() * 20 });
      }
      shoots = shoots.filter((sh) => sh.life < sh.max);
      for (const sh of shoots) {
        sh.life++; sh.x += sh.vx; sh.y += sh.vy;
        const t = sh.life / sh.max;
        const grad = ctx!.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * 6, sh.y - sh.vy * 6);
        grad.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - t)})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.moveTo(sh.x, sh.y);
        ctx!.lineTo(sh.x - sh.vx * 6, sh.y - sh.vy * 6);
        ctx!.stroke();
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
