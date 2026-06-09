'use client';

// Trail Ride · canvas-based side-scroller, flat-2D style.
//
//   - Player picks a horse from the actual Seven Arrows herd
//     before each run. The horse's photo is loaded and painted
//     as the running silhouette's head in-game.
//   - Press Space / Up / W / tap to jump. Double-jump unlocks
//     at 200m so the early game is forgiving.
//   - Procedural obstacles: fences (jump), dry creeks (long
//     jump), and tumbleweeds (low jump). Hay bales above the
//     ground = +50 score pickups.
//   - Difficulty ramps aggressively — speed climbs fast, spawn
//     cadence tightens, longer creeks appear sooner.
//   - Canvas fills the browser viewport (~95vw × ~72vh) so the
//     game reads as "full screen" within the platform shell.
//   - Score = distance + hay × 50. Score + horse_name + horse_id
//     submit on game-over.

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

// World units — fixed virtual size; canvas scales DPR + container.
const WORLD = { w: 1600, h: 700 } as const;
const GROUND_Y = 540;
const HORSE = { x: 220, w: 96, h: 80 } as const;
const GRAVITY = 2400;
const JUMP_V = 920;

type ObstacleKind = 'fence' | 'creek' | 'tumble' | 'cactus';
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
  const [horses, setHorses] = useState<Horse[]>([]);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  // Off-screen <img> for the picked horse — paint its head onto
  // the canvas every frame instead of the painted oval.
  const horseImgRef = useRef<HTMLImageElement | null>(null);

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

  // Preload the picked horse's image so the canvas can paint it
  // immediately on first frame instead of flashing a blank head.
  useEffect(() => {
    if (!selectedHorse?.image_url) { horseImgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = selectedHorse.image_url;
    img.onload = () => { horseImgRef.current = img; };
    img.onerror = () => { horseImgRef.current = null; };
  }, [selectedHorse?.image_url]);

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
    cameraX: 0, horseY: GROUND_Y - HORSE.h, horseVy: 0, onGround: true,
    jumpsLeft: 1, speed: 360, elapsed: 0, distance: 0, hay: 0,
    obstacles: [], pickups: [], nextId: 1, spawnX: WORLD.w,
    last: 0, running: false,
  });

  const start = useCallback(() => {
    if (!selectedHorse) return;
    stateRef.current = {
      cameraX: 0, horseY: GROUND_Y - HORSE.h, horseVy: 0, onGround: true,
      jumpsLeft: 1, speed: 360, elapsed: 0, distance: 0, hay: 0,
      obstacles: [], pickups: [], nextId: 1, spawnX: WORLD.w,
      last: performance.now(), running: true,
    };
    setHudDist(0); setHudHay(0);
    setRunning(true); setGameOver(false); setSubmitted(false);
  }, [selectedHorse]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) { start(); return; }
    if (s.jumpsLeft <= 0) return;
    s.horseVy = -JUMP_V;
    s.onGround = false;
    s.jumpsLeft -= 1;
  }, [start]);

  function spawnPattern(s: typeof stateRef.current) {
    const t = s.elapsed;
    const r = Math.random();
    const baseX = s.spawnX;
    // Difficulty curve · denser packing + harder pattern mix as
    // elapsed grows. Gap shrinks from ~360 → ~180 by 90s.
    const gap = Math.max(180, 360 - t * 2);
    if (r < 0.28) {
      s.obstacles.push({ id: s.nextId++, kind: 'fence', x: baseX, w: 50, h: 110 });
    } else if (r < 0.5) {
      s.obstacles.push({ id: s.nextId++, kind: 'tumble', x: baseX, w: 76, h: 70 });
    } else if (r < 0.72) {
      // Creek width climbs steeply with elapsed time.
      const w = Math.min(220, 90 + t * 0.9);
      s.obstacles.push({ id: s.nextId++, kind: 'creek', x: baseX, w, h: 18 });
    } else if (r < 0.86) {
      // Tall cactus — late-game.
      const h = Math.min(160, 80 + t * 0.5);
      s.obstacles.push({ id: s.nextId++, kind: 'cactus', x: baseX, w: 56, h });
    } else {
      const y = GROUND_Y - 150 - Math.random() * 110;
      s.pickups.push({ id: s.nextId++, x: baseX, y, taken: false });
    }
    s.spawnX += gap + Math.random() * 120;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const el = containerRef.current;
      if (!el) return;
      const targetW = el.clientWidth;
      const aspect = WORLD.h / WORLD.w;
      const targetH = Math.max(420, Math.min(window.innerHeight * 0.72, targetW * aspect));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.style.width = `${targetW}px`;
      canvas.style.height = `${targetH}px`;
      canvas.width = Math.round(targetW * dpr);
      canvas.height = Math.round(targetH * dpr);
      // Scale world coords to fit container.
      const sx = (targetW * dpr) / WORLD.w;
      const sy = (targetH * dpr) / WORLD.h;
      ctx.setTransform(sx, 0, 0, sy, 0, 0);
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
        // Speed ramps fast — 360 → 900 px/s by 90s elapsed.
        s.speed = 360 + Math.min(540, s.elapsed * 6);
        s.distance += (s.speed / 30) * dt;
        s.cameraX += s.speed * dt;
        // Unlock double jump at 200m.
        const maxJumps = s.distance >= 200 ? 2 : 1;
        if (s.onGround) s.jumpsLeft = maxJumps;
        setHudDist(Math.floor(s.distance));

        while (s.spawnX < s.cameraX + WORLD.w + 200) {
          spawnPattern(s);
        }
        s.obstacles = s.obstacles.filter((o) => o.x + o.w > s.cameraX - 100);
        s.pickups = s.pickups.filter((p) => p.x > s.cameraX - 100 && !p.taken);

        s.horseVy += GRAVITY * dt;
        s.horseY += s.horseVy * dt;
        if (s.horseY >= GROUND_Y - HORSE.h) {
          s.horseY = GROUND_Y - HORSE.h;
          s.horseVy = 0;
          s.onGround = true;
        } else {
          s.onGround = false;
        }

        const horseRect = {
          x0: s.cameraX + HORSE.x + 10,
          x1: s.cameraX + HORSE.x + HORSE.w - 10,
          y0: s.horseY + 8,
          y1: s.horseY + HORSE.h - 6,
        };
        let hit = false;
        for (const o of s.obstacles) {
          if (o.kind === 'creek') {
            if (s.onGround && horseRect.x1 > o.x + 6 && horseRect.x0 < o.x + o.w - 6) {
              hit = true; break;
            }
          } else {
            const oY0 = GROUND_Y - o.h;
            const oY1 = GROUND_Y;
            if (horseRect.x1 > o.x + 6 && horseRect.x0 < o.x + o.w - 6
                && horseRect.y1 > oY0 + 4 && horseRect.y0 < oY1) {
              hit = true; break;
            }
          }
        }
        if (hit) {
          s.running = false;
          setRunning(false);
          setGameOver(true);
        }

        let collected = 0;
        for (const p of s.pickups) {
          if (p.taken) continue;
          if (
            p.x > horseRect.x0 - 24 && p.x < horseRect.x1 + 24
            && p.y > horseRect.y0 - 24 && p.y < horseRect.y1 + 24
          ) {
            p.taken = true; collected += 1;
          }
        }
        if (collected > 0) { s.hay += collected; setHudHay(s.hay); }
      }

      drawScene(ctx, stateRef.current, horseImgRef.current);
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
    <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-[1600px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <Link href="/app/arcade" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Arcade</Link>
          <h1 className="mt-1 text-xl sm:text-2xl font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Trail Ride
            {selectedHorse && <span className="ml-2 text-[12.5px] text-foreground/55 font-normal">· riding {selectedHorse.name}</span>}
          </h1>
        </div>
        <p className="text-[11.5px] text-foreground/55 max-w-md text-right">
          Space / tap to jump. Double-jump unlocks at 200m. Gets harder the further you go.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-4 items-start">
        <div ref={containerRef} className="relative w-full">
          <canvas
            ref={canvasRef}
            className="block w-full rounded-2xl border border-black/10 shadow-lg bg-[#fbe9d2] touch-none select-none"
          />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="px-3 py-1.5 rounded-md bg-foreground/85 text-white text-[13px] font-bold tabular-nums tracking-wider">
              {hudDist}m
            </span>
            <span className="px-3 py-1.5 rounded-md bg-foreground/85 text-white text-[13px] font-bold tabular-nums tracking-wider">
              🌾 {hudHay}
            </span>
          </div>

          {!running && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <div className="bg-white rounded-2xl px-6 py-5 text-center max-w-md w-[88%] shadow-xl">
                {gameOver ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Trail ended</p>
                    <p className="mt-1 text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{finalScore.toLocaleString()}</p>
                    <p className="text-[11.5px] text-foreground/55 mt-1">{hudDist}m · {hudHay} hay × 50 · {selectedHorse?.name}</p>
                    {submitted && finalScore > 0 && (
                      <p className="mt-2 text-[10.5px] text-emerald-700 font-semibold uppercase tracking-wider">✓ Score saved</p>
                    )}
                    <div className="mt-4 flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={start}
                        className="px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
                      >
                        Ride again
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSelectedHorse(null); setGameOver(false); }}
                        className="px-3 py-2 rounded-md border border-black/10 text-foreground/65 text-[12px] font-semibold hover:bg-warm-bg/60"
                      >
                        Switch horse
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Mount up</p>
                    <h2 className="mt-1 text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Pick your horse</h2>
                    <p className="mt-1 text-[11.5px] text-foreground/55">{horses.length === 0 ? 'Loading the herd…' : 'The horse you choose rides with you on the leaderboard.'}</p>
                    <div className="mt-3 max-h-56 overflow-y-auto pr-1">
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {horses.map((h) => {
                          const isPicked = selectedHorse?.id === h.id;
                          return (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => setSelectedHorse(h)}
                              className={`flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-colors ${
                                isPicked ? 'bg-primary/15 border-primary' : 'border-black/10 hover:bg-warm-bg/60'
                              }`}
                              title={h.name}
                            >
                              {h.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={h.image_url} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover border border-black/10" />
                              ) : (
                                <span className="w-12 h-12 rounded-full bg-warm-bg/80 text-foreground/45 flex items-center justify-center text-sm font-bold">{h.name.charAt(0)}</span>
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
                      className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-40"
                    >
                      {selectedHorse ? `Ride with ${selectedHorse.name}` : 'Pick a horse first'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <Leaderboard
          game="trail_ride"
          scoreLabel="Best run (distance + hay × 50)"
          refreshKey={refreshKey}
          metaRenderer={(meta) => {
            const horse = (meta?.horse_name as string | undefined);
            return horse ? <span>on {horse}</span> : null;
          }}
        />
      </div>
    </div>
  );
}

// ── Drawing helpers — flat-2D style. No gradients on entities,
// only on the sky. Solid-color polygons + circles read as a
// graphic poster aesthetic.

function drawScene(
  ctx: CanvasRenderingContext2D,
  s: {
    cameraX: number;
    horseY: number;
    obstacles: Obstacle[];
    pickups: Pickup[];
    onGround: boolean;
  },
  horseImg: HTMLImageElement | null,
) {
  // Sky — single gradient, the only one in the scene.
  const grd = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  grd.addColorStop(0, '#fde2c4');
  grd.addColorStop(0.55, '#f6c08f');
  grd.addColorStop(1, '#e88f5d');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // Far ridges · flat silhouettes.
  drawRidges(ctx, s.cameraX, 0.18, '#b97044', WORLD.h * 0.42, 90);
  drawRidges(ctx, s.cameraX, 0.36, '#8a4f30', WORLD.h * 0.6, 70);

  // Ground band — single flat color.
  ctx.fillStyle = '#d59a6d';
  ctx.fillRect(0, GROUND_Y, WORLD.w, WORLD.h - GROUND_Y);
  // Darker base lip.
  ctx.fillStyle = '#a86a3f';
  ctx.fillRect(0, GROUND_Y, WORLD.w, 6);

  // Obstacles
  for (const o of s.obstacles) {
    const x = o.x - s.cameraX;
    if (x < -120 || x > WORLD.w + 120) continue;
    if (o.kind === 'fence') drawFence(ctx, x, GROUND_Y - o.h, o.w, o.h);
    else if (o.kind === 'tumble') drawTumble(ctx, x, GROUND_Y - o.h, o.w, o.h);
    else if (o.kind === 'creek') drawCreek(ctx, x, o.w);
    else if (o.kind === 'cactus') drawCactus(ctx, x, GROUND_Y - o.h, o.w, o.h);
  }
  for (const p of s.pickups) {
    if (p.taken) continue;
    const x = p.x - s.cameraX;
    if (x < -60 || x > WORLD.w + 60) continue;
    drawHay(ctx, x, p.y);
  }

  drawHorse(ctx, HORSE.x, s.horseY, s.onGround, horseImg);
}

function drawRidges(ctx: CanvasRenderingContext2D, cameraX: number, parallax: number, color: string, baseY: number, peak: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.h);
  const step = 140;
  for (let x = 0; x <= WORLD.w + step; x += step) {
    const seed = Math.floor((x + cameraX * parallax) / step);
    const y = baseY - Math.abs(Math.sin(seed * 1.7) + Math.cos(seed * 0.9)) * (peak / 2);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD.w, WORLD.h);
  ctx.closePath();
  ctx.fill();
}

function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Two solid posts + two cross rails. No outlines.
  ctx.fillStyle = '#5b3318';
  ctx.fillRect(x + 8, y, 8, h);
  ctx.fillRect(x + w - 16, y, 8, h);
  ctx.fillStyle = '#7a4424';
  ctx.fillRect(x, y + 16, w, 8);
  ctx.fillRect(x, y + h - 32, w, 8);
}

function drawTumble(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Solid brown circle with a slightly darker inner notch — flat 2D.
  const cx = x + w / 2, cy = y + h / 2, r = h / 2;
  ctx.fillStyle = '#7a4d22';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9a6533';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
}

function drawCreek(ctx: CanvasRenderingContext2D, x: number, w: number) {
  ctx.fillStyle = '#a26339';
  ctx.fillRect(x, GROUND_Y, w, 8);
  ctx.fillStyle = '#3d6e94';
  ctx.fillRect(x, GROUND_Y + 8, w, 26);
}

function drawCactus(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const trunkW = w * 0.34;
  ctx.fillStyle = '#3f7d4e';
  // Trunk
  roundedRect(ctx, x + w / 2 - trunkW / 2, y, trunkW, h, trunkW / 2);
  ctx.fill();
  // Left arm
  roundedRect(ctx, x + 4, y + h * 0.32, w * 0.32, trunkW * 0.7, trunkW / 2.5);
  ctx.fill();
  roundedRect(ctx, x + 4, y + h * 0.05, trunkW * 0.7, h * 0.35, trunkW / 2.5);
  ctx.fill();
  // Right arm
  roundedRect(ctx, x + w - 4 - w * 0.32, y + h * 0.45, w * 0.32, trunkW * 0.7, trunkW / 2.5);
  ctx.fill();
  roundedRect(ctx, x + w - 4 - trunkW * 0.7, y + h * 0.18, trunkW * 0.7, h * 0.32, trunkW / 2.5);
  ctx.fill();
}

function drawHay(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = '#dba93f';
  ctx.fillRect(x - 22, y - 16, 44, 32);
  ctx.fillStyle = '#a87826';
  ctx.fillRect(x - 22, y - 4, 44, 4);
  ctx.fillRect(x - 4, y - 16, 4, 32);
}

function drawHorse(ctx: CanvasRenderingContext2D, x: number, y: number, onGround: boolean, headImg: HTMLImageElement | null) {
  // Flat-2D horse · body is a single chocolate-brown silhouette
  // built from a few overlapping shapes. The head is the selected
  // horse's photo, drawn into a circular clip so it reads as
  // 'that horse, running across the desert'.
  ctx.fillStyle = '#3e2716';
  // Torso
  ctx.beginPath();
  ctx.ellipse(x + 48, y + 42, 44, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Neck
  ctx.beginPath();
  ctx.moveTo(x + 76, y + 36);
  ctx.lineTo(x + 90, y + 6);
  ctx.lineTo(x + 102, y + 6);
  ctx.lineTo(x + 100, y + 38);
  ctx.closePath();
  ctx.fill();
  // Tail · a swept-back triangle.
  ctx.beginPath();
  ctx.moveTo(x + 4, y + 30);
  ctx.lineTo(x - 12, y + 24);
  ctx.lineTo(x - 6, y + 50);
  ctx.closePath();
  ctx.fill();
  // Legs — alternate position when running on ground.
  const wave = onGround ? Math.sin(performance.now() / 70) * 14 : 0;
  ctx.fillStyle = '#3e2716';
  ctx.fillRect(x + 16, y + 58, 8, 22 + (onGround ? wave : -4));
  ctx.fillRect(x + 30, y + 58, 8, 22 + (onGround ? -wave : -4));
  ctx.fillRect(x + 58, y + 58, 8, 22 + (onGround ? -wave : -4));
  ctx.fillRect(x + 72, y + 58, 8, 22 + (onGround ? wave : -4));
  // Head — circular crop of horse photo if loaded; otherwise
  // a brown polygon head with a small eye + ear.
  const headCx = x + 105, headCy = y + 18, headR = 22;
  if (headImg) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    // Cover-fit the image into the circle.
    const iw = headImg.naturalWidth || headImg.width;
    const ih = headImg.naturalHeight || headImg.height;
    const target = headR * 2;
    const scale = Math.max(target / iw, target / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(headImg, headCx - dw / 2, headCy - dh / 2, dw, dh);
    ctx.restore();
    // Copper ring outline.
    ctx.strokeStyle = '#bc6b4a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    // Painted fallback head.
    ctx.fillStyle = '#3e2716';
    ctx.beginPath();
    ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1f1208';
    // Ear
    ctx.beginPath();
    ctx.moveTo(headCx - 14, headCy - 14);
    ctx.lineTo(headCx - 6, headCy - 24);
    ctx.lineTo(headCx - 2, headCy - 12);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(headCx + 6, headCy - 2, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
