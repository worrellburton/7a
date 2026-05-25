'use client';

// Trail Ride · canvas-based side-scroller.
//   - Horse runs left-to-right at a constant world speed; the
//     camera scrolls so the horse stays anchored ~1/3 in.
//   - Press Space / Up / W / tap to jump. Double-jump unlocks
//     after 200m so the early game is slow and the late game
//     stays survivable.
//   - Procedural obstacles: fences (jump), dry creeks (long
//     jump), and tumbleweeds (low jump). Hay bales above the
//     ground = +5 score pickups.
//   - Distance ticks at 8 m/s + ramps with elapsed time. Score
//     = distance + hay * 50. Game over on obstacle collision.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Leaderboard from '../_components/Leaderboard';
import { useArcadeScore } from '../_lib/useArcadeScore';

interface Horse {
  id: string;
  name: string;
  image_url: string | null;
}

const WORLD = { w: 880, h: 360 } as const;
const GROUND_Y = 280;
const HORSE = { x: 140, w: 60, h: 50 } as const;
const GRAVITY = 1900;
const JUMP_V = 720;

type ObstacleKind = 'fence' | 'creek' | 'tumble';
interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  w: number;
  h: number;
}
interface Pickup {
  id: number;
  x: number;
  y: number;
  taken: boolean;
}

export default function TrailRideContent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submitScore = useArcadeScore('trail_ride');

  const [hudDist, setHudDist] = useState(0);
  const [hudHay, setHudHay] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // Horse roster — fetched once on mount; the player picks one
  // before they ride. The choice is stored on the score row's
  // meta so the leaderboard can attribute the run to a horse.
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from('horses')
      .select('id, name, image_url')
      .order('name', { ascending: true })
      .then((r) => {
        if (cancelled) return;
        setHorses(((r.data ?? []) as Horse[]).filter((h) => h.name));
      });
    return () => { cancelled = true; };
  }, []);

  const stateRef = useRef<{
    cameraX: number;
    horseY: number;
    horseVy: number;
    onGround: boolean;
    jumpsLeft: number;
    speed: number;
    elapsed: number;
    distance: number;
    hay: number;
    obstacles: Obstacle[];
    pickups: Pickup[];
    nextId: number;
    spawnX: number;
    last: number;
    running: boolean;
  }>({
    cameraX: 0,
    horseY: GROUND_Y - HORSE.h,
    horseVy: 0,
    onGround: true,
    jumpsLeft: 1,
    speed: 280,
    elapsed: 0,
    distance: 0,
    hay: 0,
    obstacles: [],
    pickups: [],
    nextId: 1,
    spawnX: WORLD.w,
    last: 0,
    running: false,
  });

  const start = useCallback(() => {
    if (!selectedHorse) return; // can't ride without picking one
    stateRef.current = {
      cameraX: 0,
      horseY: GROUND_Y - HORSE.h,
      horseVy: 0,
      onGround: true,
      jumpsLeft: 1,
      speed: 280,
      elapsed: 0,
      distance: 0,
      hay: 0,
      obstacles: [],
      pickups: [],
      nextId: 1,
      spawnX: WORLD.w,
      last: performance.now(),
      running: true,
    };
    setHudDist(0);
    setHudHay(0);
    setRunning(true);
    setGameOver(false);
    setSubmitted(false);
  }, [selectedHorse]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) { start(); return; }
    // Single jump on the ground, double jump unlocks at 200m.
    const maxJumps = s.distance >= 200 ? 2 : 1;
    if (s.jumpsLeft <= 0) return;
    s.horseVy = -JUMP_V;
    s.onGround = false;
    s.jumpsLeft -= 1;
    if (s.jumpsLeft < maxJumps - 1) s.jumpsLeft = Math.max(0, s.jumpsLeft);
  }, [start]);

  function spawnPattern(s: typeof stateRef.current) {
    // Pick a pattern that fits the current difficulty.
    const t = s.elapsed;
    const r = Math.random();
    const baseX = s.spawnX;
    if (r < 0.32) {
      // Fence (short obstacle, easy jump).
      s.obstacles.push({ id: s.nextId++, kind: 'fence', x: baseX, w: 36, h: 60 });
      s.spawnX += 240 + Math.random() * 180;
    } else if (r < 0.55) {
      // Tumbleweed (low + wide; jump or take damage).
      s.obstacles.push({ id: s.nextId++, kind: 'tumble', x: baseX, w: 56, h: 40 });
      s.spawnX += 220 + Math.random() * 160;
    } else if (r < 0.78) {
      // Creek (wide gap, requires a higher / longer jump).
      const w = Math.min(110, 60 + t * 0.4);
      s.obstacles.push({ id: s.nextId++, kind: 'creek', x: baseX, w, h: 14 });
      s.spawnX += 280 + Math.random() * 200;
    } else {
      // Hay pickup floating above the ground.
      const y = GROUND_Y - 110 - Math.random() * 70;
      s.pickups.push({ id: s.nextId++, x: baseX, y, taken: false });
      s.spawnX += 200 + Math.random() * 160;
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const targetW = Math.min(WORLD.w, el.clientWidth);
      const aspect = WORLD.h / WORLD.w;
      const targetH = targetW * aspect;
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = `${targetW}px`;
      canvas.style.height = `${targetH}px`;
      canvas.width = Math.round(targetW * dpr);
      canvas.height = Math.round(targetH * dpr);
      ctx.setTransform(dpr * (targetW / WORLD.w), 0, 0, dpr * (targetH / WORLD.h), 0, 0);
    };
    resize();
    const onWin = () => resize();
    window.addEventListener('resize', onWin);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', onKey);
    const onClick = () => jump();
    canvas.addEventListener('mousedown', onClick);
    const onTouch = (e: TouchEvent) => { e.preventDefault(); jump(); };
    canvas.addEventListener('touchstart', onTouch, { passive: false });

    let raf = 0;
    const loop = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (s.running) {
        s.elapsed += dt;
        s.speed = 280 + Math.min(220, s.elapsed * 4); // px/s
        // Distance in metres ≈ speed/30.
        s.distance += (s.speed / 30) * dt;
        s.cameraX += s.speed * dt;
        setHudDist(Math.floor(s.distance));

        // Spawn obstacles ahead of the camera.
        while (s.spawnX < s.cameraX + WORLD.w + 200) {
          spawnPattern(s);
        }
        // Drop obstacles/pickups left behind.
        s.obstacles = s.obstacles.filter((o) => o.x + o.w > s.cameraX - 60);
        s.pickups = s.pickups.filter((p) => p.x > s.cameraX - 60 && !p.taken);

        // Horse physics.
        s.horseVy += GRAVITY * dt;
        s.horseY += s.horseVy * dt;
        if (s.horseY >= GROUND_Y - HORSE.h) {
          s.horseY = GROUND_Y - HORSE.h;
          s.horseVy = 0;
          if (!s.onGround) {
            s.onGround = true;
            s.jumpsLeft = s.distance >= 200 ? 2 : 1;
          }
        }

        // Collision check.
        const horseRect = {
          x0: s.cameraX + HORSE.x + 6,
          x1: s.cameraX + HORSE.x + HORSE.w - 6,
          y0: s.horseY + 4,
          y1: s.horseY + HORSE.h - 4,
        };
        let hit = false;
        for (const o of s.obstacles) {
          if (o.kind === 'creek') {
            // Creek is a ground gap — collide if horse on ground
            // AND x overlaps the gap.
            if (s.onGround && horseRect.x1 > o.x + 4 && horseRect.x0 < o.x + o.w - 4) {
              hit = true;
              break;
            }
          } else {
            const oY0 = GROUND_Y - o.h;
            const oY1 = GROUND_Y;
            if (
              horseRect.x1 > o.x + 4
              && horseRect.x0 < o.x + o.w - 4
              && horseRect.y1 > oY0 + 4
              && horseRect.y0 < oY1
            ) {
              hit = true;
              break;
            }
          }
        }
        if (hit) {
          s.running = false;
          setRunning(false);
          setGameOver(true);
        }

        // Pickup collection (axis-aligned circle approx).
        let collected = 0;
        for (const p of s.pickups) {
          if (p.taken) continue;
          if (
            p.x > horseRect.x0 - 18
            && p.x < horseRect.x1 + 18
            && p.y > horseRect.y0 - 18
            && p.y < horseRect.y1 + 18
          ) {
            p.taken = true;
            collected += 1;
          }
        }
        if (collected > 0) {
          s.hay += collected;
          setHudHay(s.hay);
        }
      }

      // Render
      drawScene(ctx, stateRef.current);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onWin);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('mousedown', onClick);
      canvas.removeEventListener('touchstart', onTouch);
    };
  }, [jump]);

  // Submit score once when game ends.
  useEffect(() => {
    if (!gameOver || submitted) return;
    const score = hudDist + hudHay * 50;
    if (score <= 0) { setSubmitted(true); return; }
    void submitScore(score, {
      distance: hudDist,
      hay: hudHay,
      horse_id: selectedHorse?.id ?? null,
      horse_name: selectedHorse?.name ?? null,
    }).then((ok) => {
      setSubmitted(true);
      if (ok) setRefreshKey((k) => k + 1);
    });
  }, [gameOver, submitted, hudDist, hudHay, submitScore, selectedHorse]);

  const finalScore = hudDist + hudHay * 50;

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/arcade" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Arcade</Link>
      <header className="mt-3 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Game · Trail Ride</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Gallop east through Pearce.
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground/65 max-w-xl">
          Space / tap to jump. Double-jump unlocks at 200m. Hay bales add 50 to score; one collision ends the ride.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <div ref={containerRef} className="relative">
          <canvas ref={canvasRef} className="block w-full rounded-2xl border border-black/10 shadow-lg bg-amber-50 touch-none select-none" />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-foreground/85 text-white text-[12px] font-bold tabular-nums tracking-wider">
              {hudDist}m
            </span>
            <span className="px-2.5 py-1 rounded-md bg-foreground/85 text-white text-[12px] font-bold tabular-nums tracking-wider">
              🌾 {hudHay}
            </span>
          </div>

          {!running && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <div className="bg-white rounded-2xl px-6 py-5 text-center max-w-xs shadow-xl">
                {gameOver ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Trail ended</p>
                    <p className="mt-1 text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{finalScore.toLocaleString()}</p>
                    <p className="text-[11.5px] text-foreground/55 mt-1">{hudDist}m · {hudHay} hay × 50</p>
                    {submitted && finalScore > 0 && (
                      <p className="mt-2 text-[10.5px] text-emerald-700 font-semibold uppercase tracking-wider">✓ Score saved</p>
                    )}
                    <button
                      type="button"
                      onClick={start}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
                    >
                      Ride again
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Mount up</p>
                    <h2 className="mt-1 text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Pick your horse</h2>
                    <p className="mt-1 text-[11.5px] text-foreground/55">{horses.length === 0 ? 'Loading the herd…' : 'The horse you choose rides with you on the leaderboard.'}</p>
                    <div className="mt-3 max-h-44 overflow-y-auto pr-1">
                      <div className="grid grid-cols-3 gap-2">
                        {horses.map((h) => {
                          const isPicked = selectedHorse?.id === h.id;
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setSelectedHorse(h)}
                              className={`group/h flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                                isPicked ? 'bg-primary/15 border-primary' : 'border-black/10 hover:bg-warm-bg/60'
                              }`}
                              title={h.name}
                            >
                              {h.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={h.image_url} alt="" referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-black/10" />
                              ) : (
                                <span className="w-10 h-10 rounded-full bg-warm-bg/80 text-foreground/45 flex items-center justify-center text-xs font-bold">{h.name.charAt(0)}</span>
                              )}
                              <span className="text-[10px] font-semibold text-foreground/75 truncate w-full text-center">{h.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={start}
                      disabled={!selectedHorse}
                      className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40"
                    >
                      {selectedHorse ? `Ride with ${selectedHorse.name}` : 'Pick a horse first'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <Leaderboard game="trail_ride" scoreLabel="Best run (distance + hay × 50)" refreshKey={refreshKey} />
      </div>
    </div>
  );
}

function drawScene(ctx: CanvasRenderingContext2D, s: ReturnType<() => {
  cameraX: number;
  horseY: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  onGround: boolean;
}>) {
  // Sky gradient
  const grd = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  grd.addColorStop(0, '#fde8d2');
  grd.addColorStop(0.6, '#fcdab8');
  grd.addColorStop(1, '#f6b18b');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Parallax mountains
  drawMountains(ctx, s.cameraX, 0.25, '#a86a47', WORLD.h * 0.35, 110);
  drawMountains(ctx, s.cameraX, 0.45, '#7a4d35', WORLD.h * 0.52, 80);

  // Distant saguaro silhouettes
  drawSaguaros(ctx, s.cameraX, 0.65, 'rgba(73, 100, 71, 0.45)');

  // Ground band
  ctx.fillStyle = '#d4a173';
  ctx.fillRect(0, GROUND_Y, WORLD.w, WORLD.h - GROUND_Y);
  // Speckle
  ctx.fillStyle = 'rgba(120, 80, 50, 0.18)';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 47 - s.cameraX * 0.95) % WORLD.w + WORLD.w) % WORLD.w;
    const y = GROUND_Y + 10 + ((i * 13) % 50);
    ctx.fillRect(x, y, 3, 2);
  }

  // Obstacles
  for (const o of s.obstacles) {
    const x = o.x - s.cameraX;
    if (x < -80 || x > WORLD.w + 80) continue;
    if (o.kind === 'fence') drawFence(ctx, x, GROUND_Y - o.h, o.w, o.h);
    else if (o.kind === 'tumble') drawTumbleweed(ctx, x, GROUND_Y - o.h, o.w, o.h, s.cameraX);
    else if (o.kind === 'creek') drawCreek(ctx, x, o.w);
  }

  // Pickups
  for (const p of s.pickups) {
    if (p.taken) continue;
    const x = p.x - s.cameraX;
    if (x < -40 || x > WORLD.w + 40) continue;
    drawHay(ctx, x, p.y);
  }

  // Horse (anchored)
  drawHorse(ctx, HORSE.x, s.horseY, s.onGround);
}

function drawMountains(ctx: CanvasRenderingContext2D, cameraX: number, parallax: number, color: string, baseY: number, peak: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.h);
  const step = 90;
  for (let x = 0; x <= WORLD.w + step; x += step) {
    const seed = Math.floor((x + cameraX * parallax) / step);
    const y = baseY - Math.abs(Math.sin(seed * 1.7)) * peak;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD.w, WORLD.h);
  ctx.closePath();
  ctx.fill();
}

function drawSaguaros(ctx: CanvasRenderingContext2D, cameraX: number, parallax: number, color: string) {
  ctx.fillStyle = color;
  const step = 220;
  for (let i = -1; i < Math.ceil(WORLD.w / step) + 2; i++) {
    const wx = i * step - ((cameraX * parallax) % step);
    const x = Math.floor(wx);
    const seed = i + Math.floor(cameraX / 1000);
    const h = 50 + (Math.abs(Math.sin(seed * 3.1)) * 40);
    const base = GROUND_Y - 4;
    // Trunk
    ctx.fillRect(x, base - h, 8, h);
    // Arm
    ctx.fillRect(x - 10, base - h + 16, 10, 4);
    ctx.fillRect(x - 12, base - h + 16, 4, 20);
    ctx.fillRect(x + 8, base - h + 24, 10, 4);
    ctx.fillRect(x + 14, base - h + 4, 4, 24);
  }
}

function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = '#6b3d22';
  ctx.fillRect(x + 4, y, 6, h);
  ctx.fillRect(x + w - 10, y, 6, h);
  ctx.fillRect(x, y + 12, w, 5);
  ctx.fillRect(x, y + h - 22, w, 5);
}

function drawTumbleweed(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cameraX: number) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(cameraX * 0.04);
  ctx.strokeStyle = '#8a5a32';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, h / 2, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * (h / 2), Math.sin(a) * (h / 2));
    ctx.stroke();
  }
  ctx.restore();
}

function drawCreek(ctx: CanvasRenderingContext2D, x: number, w: number) {
  // Carve a darker band out of the ground.
  ctx.fillStyle = '#a76a3a';
  ctx.fillRect(x, GROUND_Y, w, 6);
  ctx.fillStyle = '#3a6c8b';
  ctx.fillRect(x, GROUND_Y + 6, w, 14);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 4, GROUND_Y + 10 + i * 3);
    ctx.lineTo(x + w - 4, GROUND_Y + 10 + i * 3);
    ctx.stroke();
  }
}

function drawHay(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#d9a44a';
  ctx.strokeStyle = '#8a5d22';
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - 14, y - 10, 28, 20);
  ctx.strokeRect(x - 14, y - 10, 28, 20);
  ctx.beginPath();
  ctx.moveTo(x - 14, y);
  ctx.lineTo(x + 14, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
}

function drawHorse(ctx: CanvasRenderingContext2D, x: number, y: number, onGround: boolean) {
  // Body
  ctx.fillStyle = '#4a2f1f';
  ctx.strokeStyle = '#2a180c';
  ctx.lineWidth = 1.5;
  // Torso
  ctx.beginPath();
  ctx.ellipse(x + 30, y + 24, 26, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Neck + head
  ctx.beginPath();
  ctx.moveTo(x + 48, y + 20);
  ctx.lineTo(x + 56, y + 6);
  ctx.lineTo(x + 64, y + 6);
  ctx.lineTo(x + 64, y + 18);
  ctx.lineTo(x + 56, y + 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Mane
  ctx.fillStyle = '#1a0d05';
  ctx.beginPath();
  ctx.moveTo(x + 50, y + 16);
  ctx.lineTo(x + 56, y + 4);
  ctx.lineTo(x + 60, y + 18);
  ctx.closePath();
  ctx.fill();
  // Legs (animate when running on ground)
  ctx.strokeStyle = '#2a180c';
  ctx.lineWidth = 3;
  const wave = onGround ? Math.sin(performance.now() / 80) * 6 : 0;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 36); ctx.lineTo(x + 12, y + 50 + (onGround ? wave : -4));
  ctx.moveTo(x + 22, y + 36); ctx.lineTo(x + 24, y + 50 + (onGround ? -wave : -4));
  ctx.moveTo(x + 40, y + 36); ctx.lineTo(x + 38, y + 50 + (onGround ? -wave : -4));
  ctx.moveTo(x + 48, y + 36); ctx.lineTo(x + 50, y + 50 + (onGround ? wave : -4));
  ctx.stroke();
  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 60, y + 12, 1.6, 0, Math.PI * 2);
  ctx.fill();
}
