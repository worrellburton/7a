'use client';

// Feather Catcher · canvas-based endless faller.
//   - Player paddle (a leather satchel) moves left/right with
//     arrows OR follows the mouse OR taps on touch.
//   - Feathers drop from random x positions; catching adds 1
//     to the score.
//   - Tumbleweeds and cacti drop too — collide with one and
//     you lose a life. Three lives total.
//   - Difficulty ramps with score: faster fall, more obstacles
//     per spawn, occasionally a "bonus feather" (gold) worth 5.
//
// All game state lives in refs so the requestAnimationFrame
// loop never re-renders React mid-tick. Only the visible HUD
// (score + lives + game-over panel) uses setState.

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Leaderboard from '../_components/Leaderboard';
import { useArcadeScore } from '../_lib/useArcadeScore';

type EntityKind = 'feather' | 'gold' | 'rock' | 'cactus';

interface Entity {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
}

const WORLD = { w: 720, h: 540 } as const;
const PADDLE = { w: 96, h: 18 } as const;

export default function FeatherCatcherContent() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const submitScore = useArcadeScore('feather_catcher');

  const [hudScore, setHudScore] = useState(0);
  const [hudLives, setHudLives] = useState(3);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Authoritative game state — never sync into React on tick.
  const stateRef = useRef<{
    paddleX: number;
    entities: Entity[];
    nextId: number;
    score: number;
    lives: number;
    spawnAccum: number;
    elapsed: number;
    last: number;
    keys: { left: boolean; right: boolean };
    mouseX: number | null;
    running: boolean;
  }>({
    paddleX: WORLD.w / 2 - PADDLE.w / 2,
    entities: [],
    nextId: 1,
    score: 0,
    lives: 3,
    spawnAccum: 0,
    elapsed: 0,
    last: 0,
    keys: { left: false, right: false },
    mouseX: null,
    running: false,
  });

  const start = useCallback(() => {
    stateRef.current = {
      paddleX: WORLD.w / 2 - PADDLE.w / 2,
      entities: [],
      nextId: 1,
      score: 0,
      lives: 3,
      spawnAccum: 0,
      elapsed: 0,
      last: performance.now(),
      keys: { left: false, right: false },
      mouseX: null,
      running: true,
    };
    setHudScore(0);
    setHudLives(3);
    setRunning(true);
    setGameOver(false);
    setSubmitted(false);
  }, []);

  // Spawn one entity at a random x with kind chosen by the
  // current difficulty curve. Obstacle ratio + speed scale up
  // as elapsed time grows.
  function spawnEntity(s: typeof stateRef.current) {
    const t = s.elapsed;
    // Speed climbs from 130 px/s at t=0 to ~340 px/s at 120s.
    const vyBase = 130 + Math.min(210, t * 1.75);
    const vyJitter = 70;
    const vy = vyBase + Math.random() * vyJitter;
    const obstacleChance = Math.min(0.42, 0.18 + t * 0.0025);
    const goldChance = 0.05;
    const r = Math.random();
    let kind: EntityKind;
    if (r < obstacleChance / 2) kind = 'rock';
    else if (r < obstacleChance) kind = 'cactus';
    else if (r < obstacleChance + goldChance) kind = 'gold';
    else kind = 'feather';
    const size = kind === 'cactus' ? 32 : kind === 'rock' ? 26 : 22;
    const x = 24 + Math.random() * (WORLD.w - 48);
    s.entities.push({
      id: s.nextId++,
      kind,
      x,
      y: -size,
      vy,
      size,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 1.6,
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fit canvas to its container with a fixed aspect ratio.
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

    // Input handlers.
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') stateRef.current.keys.left = down;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') stateRef.current.keys.right = down;
      if ((e.key === ' ' || e.key === 'Enter') && down && !stateRef.current.running && !running) start();
    };
    const kd = onKey(true), ku = onKey(false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const rectInWorld = (ev: { clientX: number }) => {
      const rect = canvas.getBoundingClientRect();
      const localX = ev.clientX - rect.left;
      return (localX / rect.width) * WORLD.w;
    };
    const onMove = (e: MouseEvent) => { stateRef.current.mouseX = rectInWorld(e); };
    const onLeave = () => { stateRef.current.mouseX = null; };
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      stateRef.current.mouseX = rectInWorld(e.touches[0]);
    };
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('touchmove', onTouch, { passive: true });
    canvas.addEventListener('touchstart', onTouch, { passive: true });

    let raf = 0;
    const loop = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      if (s.running) {
        s.elapsed += dt;
        // Paddle motion.
        if (s.mouseX != null) {
          // Smoothly chase the cursor target.
          const target = s.mouseX - PADDLE.w / 2;
          s.paddleX += (target - s.paddleX) * Math.min(1, dt * 14);
        } else {
          const dir = (s.keys.right ? 1 : 0) - (s.keys.left ? 1 : 0);
          s.paddleX += dir * 480 * dt;
        }
        s.paddleX = Math.max(0, Math.min(WORLD.w - PADDLE.w, s.paddleX));

        // Spawn cadence — 0.85s at start → 0.28s at 90s elapsed.
        const interval = Math.max(0.28, 0.85 - s.elapsed * 0.006);
        s.spawnAccum += dt;
        while (s.spawnAccum >= interval) {
          s.spawnAccum -= interval;
          spawnEntity(s);
        }

        // Update entities + collide with paddle / ground.
        const padY = WORLD.h - 60;
        const padBox = { x0: s.paddleX, x1: s.paddleX + PADDLE.w, y0: padY, y1: padY + PADDLE.h };
        const next: Entity[] = [];
        let scoreDelta = 0;
        let livesDelta = 0;
        for (const e of s.entities) {
          e.y += e.vy * dt;
          e.rot += e.vrot * dt;
          // Collide with paddle if the entity's centre is within
          // the paddle's box.
          if (e.y >= padBox.y0 && e.y <= padBox.y1 && e.x >= padBox.x0 - 6 && e.x <= padBox.x1 + 6) {
            if (e.kind === 'feather') scoreDelta += 1;
            else if (e.kind === 'gold') scoreDelta += 5;
            else livesDelta -= 1;
            continue; // consumed
          }
          // Off the bottom — feathers that fall through aren't
          // penalised, but rocks/cacti are: missing the dodge
          // means it landed on you. We treat them as "passed" —
          // no life loss — to keep the game forgiving. Lives
          // only drop on actual collisions above.
          if (e.y > WORLD.h + e.size) continue;
          next.push(e);
        }
        s.entities = next;
        if (scoreDelta !== 0) { s.score += scoreDelta; setHudScore(s.score); }
        if (livesDelta !== 0) {
          s.lives = Math.max(0, s.lives + livesDelta);
          setHudLives(s.lives);
          if (s.lives <= 0) {
            s.running = false;
            setRunning(false);
            setGameOver(true);
          }
        }
      }

      // Render
      // Background — warm cream → desert pink gradient.
      const grd = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      grd.addColorStop(0, '#fbecd9');
      grd.addColorStop(0.55, '#fcdac0');
      grd.addColorStop(1, '#f5b58e');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      // Distant mountains silhouette
      ctx.fillStyle = 'rgba(141, 96, 70, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, WORLD.h * 0.72);
      for (let i = 0; i <= 8; i++) {
        const x = (i / 8) * WORLD.w;
        const y = WORLD.h * (0.72 - Math.abs(Math.sin(i * 1.3)) * 0.12);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(WORLD.w, WORLD.h);
      ctx.lineTo(0, WORLD.h);
      ctx.closePath();
      ctx.fill();

      // Entities
      for (const e of stateRef.current.entities) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.rot);
        drawEntity(ctx, e);
        ctx.restore();
      }

      // Paddle (leather satchel)
      ctx.save();
      ctx.translate(stateRef.current.paddleX, WORLD.h - 60);
      ctx.fillStyle = '#9c5a35';
      roundedRect(ctx, 0, 0, PADDLE.w, PADDLE.h, 6);
      ctx.fill();
      ctx.fillStyle = '#bc6b4a';
      ctx.fillRect(6, 4, PADDLE.w - 12, 4);
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onWin);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('touchmove', onTouch);
      canvas.removeEventListener('touchstart', onTouch);
    };
  }, [running, start]);

  // Submit score once when game ends.
  useEffect(() => {
    if (!gameOver || submitted) return;
    if (hudScore <= 0) { setSubmitted(true); return; }
    void submitScore(hudScore).then((ok) => {
      setSubmitted(true);
      if (ok) setRefreshKey((k) => k + 1);
    });
  }, [gameOver, submitted, hudScore, submitScore]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-5xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/arcade" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Arcade</Link>
      <header className="mt-3 mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Game · Feather Catcher</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Catch the feathers, dodge the rocks.
        </h1>
        <p className="mt-1 text-[12.5px] text-foreground/65 max-w-xl">
          Arrow keys / A · D, or move your mouse. Gold feathers are worth 5. Three rocks (or cacti) and the run ends.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr_280px] gap-5">
        <div ref={containerRef} className="relative">
          <canvas
            ref={canvasRef}
            className="block w-full rounded-2xl border border-black/10 shadow-lg bg-amber-50"
          />
          {/* HUD overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-foreground/85 text-white text-[12px] font-bold tabular-nums tracking-wider">
              {hudScore}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-foreground/85 text-white text-[12px] font-bold tracking-wider">
              {'❤'.repeat(hudLives)}{'·'.repeat(Math.max(0, 3 - hudLives))}
            </span>
          </div>

          {/* Idle / game-over overlays */}
          {!running && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
              <div className="bg-white rounded-2xl px-6 py-5 text-center max-w-xs shadow-xl">
                {gameOver ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Round over</p>
                    <p className="mt-1 text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{hudScore}</p>
                    <p className="text-[11.5px] text-foreground/55 mt-1">feathers caught</p>
                    {submitted && hudScore > 0 && (
                      <p className="mt-2 text-[10.5px] text-emerald-700 font-semibold uppercase tracking-wider">✓ Score saved</p>
                    )}
                    <button
                      type="button"
                      onClick={start}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
                    >
                      Play again
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Ready</p>
                    <h2 className="mt-1 text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>Feather Catcher</h2>
                    <p className="mt-2 text-[12px] text-foreground/55">Catch feathers. Dodge rocks + cacti.</p>
                    <button
                      type="button"
                      onClick={start}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90"
                    >
                      Play · Space
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <Leaderboard game="feather_catcher" scoreLabel="Feathers caught (best run)" refreshKey={refreshKey} />
      </div>
    </div>
  );
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

function drawEntity(ctx: CanvasRenderingContext2D, e: Entity) {
  if (e.kind === 'feather' || e.kind === 'gold') {
    // Stylised feather.
    const isGold = e.kind === 'gold';
    ctx.strokeStyle = isGold ? '#d97706' : '#9c5a35';
    ctx.lineWidth = 2.2;
    ctx.fillStyle = isGold ? '#fde68a' : '#fff5e0';
    // Vane shape — teardrop.
    ctx.beginPath();
    ctx.moveTo(0, -e.size);
    ctx.bezierCurveTo(e.size * 0.7, -e.size * 0.6, e.size * 0.5, e.size * 0.4, 0, e.size * 0.7);
    ctx.bezierCurveTo(-e.size * 0.5, e.size * 0.4, -e.size * 0.7, -e.size * 0.6, 0, -e.size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Rachis line.
    ctx.beginPath();
    ctx.moveTo(0, -e.size);
    ctx.lineTo(0, e.size * 0.7);
    ctx.stroke();
  } else if (e.kind === 'rock') {
    ctx.fillStyle = '#6b6258';
    ctx.strokeStyle = '#3f3a32';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    const sides = 7;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const r = e.size * (0.78 + ((i % 2) ? 0.18 : -0.05));
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (e.kind === 'cactus') {
    ctx.fillStyle = '#3f7d4e';
    ctx.strokeStyle = '#264a30';
    ctx.lineWidth = 1.4;
    // Trunk
    roundedRect(ctx, -e.size * 0.18, -e.size, e.size * 0.36, e.size * 2, e.size * 0.18);
    ctx.fill();
    ctx.stroke();
    // Arm
    roundedRect(ctx, e.size * 0.16, -e.size * 0.55, e.size * 0.5, e.size * 0.22, e.size * 0.12);
    ctx.fill();
    ctx.stroke();
    roundedRect(ctx, e.size * 0.5, -e.size * 0.8, e.size * 0.22, e.size * 0.45, e.size * 0.12);
    ctx.fill();
    ctx.stroke();
  }
}
