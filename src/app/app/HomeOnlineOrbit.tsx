'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

// Centered, slowly-rotating ring of avatars representing every
// teammate seen in the last 24 hours. Replaces the old horizontal
// "Online today" strip that lived inside the home hero band.
//
// Anatomy:
//   - Outer wrapper rotates clockwise on a long loop (60s) so the
//     "team is in motion" feel is gentle, not disorienting.
//   - Each avatar is positioned along the ring with a per-user
//     CSS variable `--angle`. Their inner element counter-rotates
//     at the same speed so faces stay upright as the orbit turns.
//   - On mount the avatars animate from the center outward to
//     their slot, staggered by index. Reduced-motion users see
//     them appear in place with no spin.
//
// The orbit shows everyone whose last_seen_at landed in the last
// 24 hours; online-now users get a soft halo ring + green dot.

interface OrbitUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
  last_seen_at: string | null;
  last_path: string | null;
  job_title: string | null;
}

interface Props {
  users: OrbitUser[];
  pathLabelFor: (path: string | null) => string | null;
}

function isOnlineNow(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 6 * 60 * 1000;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HomeOnlineOrbit({ users, pathLabelFor }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tiny delay so the entry animation is reliably perceived even
    // when the parent renders synchronously above the fold.
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (users.length === 0) return null;

  const onlineCount = users.filter((u) => isOnlineNow(u.last_seen_at)).length;

  // Avatar size + ring radius scale with the viewport. The component
  // sets its own height so the surrounding flow reserves the right
  // amount of vertical space — no cumulative-layout-shift when the
  // orbit mounts.
  const SIZE = 460; // canvas square in CSS px (max width for desktop)

  return (
    <section
      className="relative flex flex-col items-center justify-center w-full"
      aria-label="Online today"
    >
      <div className="text-center mb-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.28em] text-foreground/45"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          The team
        </p>
        <h2
          className="mt-1 text-foreground font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 2.6vw, 1.85rem)' }}
        >
          Online <em className="not-italic text-primary">today</em>
        </h2>
        <p
          className="mt-1 text-[12px] text-foreground/55"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {onlineCount > 0
            ? `${onlineCount} ${onlineCount === 1 ? 'person' : 'people'} on Seven Arrows right now`
            : `${users.length} ${users.length === 1 ? 'teammate' : 'teammates'} active in the last 24 hours`}
        </p>
      </div>

      <div
        className="relative"
        style={{
          width: '100%',
          maxWidth: SIZE,
          aspectRatio: '1 / 1',
        }}
      >
        {/* Decorative concentric rings — give the orbit a real centre
            point so the avatars don't read as floating blobs. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-primary/15"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[12%] rounded-full border border-primary/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[28%] rounded-full bg-gradient-to-br from-primary/[0.07] via-accent/[0.05] to-transparent"
        />
        {/* Center medallion */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/70 supports-[backdrop-filter]:bg-white/45 backdrop-blur-md border border-white/80 shadow-[0_8px_28px_-12px_rgba(60,48,42,0.35)] flex items-center justify-center"
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            7A
          </span>
        </div>

        {/* The rotating ring. Position frame for the avatars; rotates
            clockwise. Avatars counter-rotate to stay upright. */}
        <div
          ref={ringRef}
          className={`absolute inset-0 motion-reduce:!animate-none ${mounted ? 'orbit-spin' : ''}`}
          style={{ animationDuration: '60s' }}
        >
          {users.map((u, i) => {
            const angle = (i / users.length) * 360;
            const online = isOnlineNow(u.last_seen_at);
            const viewing = online ? pathLabelFor(u.last_path) : null;
            const navTarget = online && u.last_path && u.last_path.startsWith('/app') ? u.last_path : null;
            const Wrapper: 'button' | 'div' = navTarget ? 'button' : 'div';
            const slotStyle: CSSProperties = {
              ['--angle' as string]: `${angle}deg`,
              ['--enter-delay' as string]: `${i * 65}ms`,
            };
            return (
              <Wrapper
                key={u.id}
                onClick={navTarget ? () => router.push(navTarget) : undefined}
                className={`orbit-slot group ${mounted ? 'orbit-slot-in' : 'orbit-slot-pre'} ${navTarget ? 'cursor-pointer' : ''}`}
                style={slotStyle}
                title={navTarget ? `Go to ${viewing}` : undefined}
                aria-label={u.full_name || 'Teammate'}
              >
                <span
                  className="orbit-avatar motion-reduce:!animate-none"
                  style={{ animationDuration: '60s' }}
                >
                  <span className="relative block">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatar_url}
                        alt={u.full_name || ''}
                        referrerPolicy="no-referrer"
                        className={`block w-12 h-12 rounded-full object-cover border-2 transition-transform duration-300 group-hover:scale-110 ${
                          online
                            ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]'
                            : 'border-white shadow-md'
                        }`}
                      />
                    ) : (
                      <span
                        className={`flex w-12 h-12 rounded-full items-center justify-center text-sm font-bold border-2 transition-transform duration-300 group-hover:scale-110 ${
                          online
                            ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)] bg-primary text-white'
                            : 'border-white bg-primary text-white shadow-md'
                        }`}
                      >
                        {(u.full_name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    {online && (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"
                      />
                    )}
                  </span>
                </span>
                {/* Tooltip — anchors to the avatar, not the slot, so
                    it never appears flipped when the orbit puts the
                    slot in the bottom half of the ring. The tooltip
                    inner is also counter-rotated. */}
                <span
                  className="orbit-tooltip motion-reduce:!animate-none pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-30 text-left shadow-lg"
                  style={{ animationDuration: '60s' }}
                >
                  <span className="block font-semibold text-white">{u.full_name || 'User'}</span>
                  {u.job_title && <span className="block text-white/85">{u.job_title}</span>}
                  <span className="block text-white/75">
                    {online ? 'Online now' : `Last active ${timeAgo(u.last_sign_in)}`}
                  </span>
                  {viewing && (
                    <span className="block text-emerald-300">
                      Viewing {viewing}
                      {navTarget ? ' — click to jump' : ''}
                    </span>
                  )}
                </span>
              </Wrapper>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        /* Outer rotation. */
        @keyframes orbit-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .orbit-spin { animation: orbit-spin 60s linear infinite; }

        /* Counter-rotation for the avatar so faces stay upright. */
        @keyframes orbit-counter {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        .orbit-avatar {
          display: inline-block;
          animation: orbit-counter 60s linear infinite;
        }
        .orbit-tooltip {
          animation: orbit-counter 60s linear infinite;
          transform-origin: center;
        }

        /* Slot positioning — places each avatar at its angle along
           the ring radius. We use percentage-based positions so the
           ring scales cleanly with the surrounding container. */
        .orbit-slot {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 3rem;
          height: 3rem;
          margin: -1.5rem 0 0 -1.5rem;
          /* Combined transform: rotate to angle → translate radially
             → counter-rotate so the avatar inner doesn't double up
             with the parent's spin. The avatar element itself runs
             its own counter-rotation animation; this counter-rotate
             keeps the slot's local axes aligned to screen at angle 0. */
          transform: rotate(var(--angle)) translateY(-44%) rotate(calc(-1 * var(--angle)));
          transform-origin: center;
        }

        /* Mount animation — start at the centre with zero radius +
           reduced scale, then ease out to the slot. Stagger the
           per-avatar delay so the team appears wave-by-wave rather
           than all at once. */
        @keyframes orbit-slot-enter {
          0% {
            opacity: 0;
            transform: rotate(var(--angle)) translateY(0) rotate(calc(-1 * var(--angle))) scale(0.3);
          }
          60% { opacity: 1; }
          100% {
            opacity: 1;
            transform: rotate(var(--angle)) translateY(-44%) rotate(calc(-1 * var(--angle))) scale(1);
          }
        }
        .orbit-slot-pre {
          opacity: 0;
        }
        .orbit-slot-in {
          animation: orbit-slot-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
          animation-delay: var(--enter-delay);
        }

        @media (prefers-reduced-motion: reduce) {
          .orbit-slot-in,
          .orbit-slot-pre,
          .orbit-spin,
          .orbit-avatar,
          .orbit-tooltip {
            animation: none !important;
            opacity: 1 !important;
          }
        }
      `}</style>
    </section>
  );
}

export type { OrbitUser };
