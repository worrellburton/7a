'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';

// Centered, slowly-rotating ring of avatars representing every
// teammate seen in the last 24 hours.
//
// Layout pattern: each "slot" fills the ring's bounding box and is
// rotated to its angle. The avatar lives at the top centre of the
// slot, so once the slot is rotated the avatar sits exactly on the
// outer edge of the ring — radius = (ring height / 2 - avatar / 2)
// without having to compute a JS pixel value.
//
// Animation:
//   - The whole ring spins clockwise on a 60s loop.
//   - The avatar inner element counter-rotates at the same speed so
//     faces stay upright through the orbit.
//   - On mount, each avatar animates from the centre to its slot
//     position with a 65ms-per-index stagger.

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

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (users.length === 0) return null;

  const onlineCount = users.filter((u) => isOnlineNow(u.last_seen_at)).length;

  return (
    <section
      className="relative z-40 flex flex-col items-center justify-center w-full"
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
        className="relative w-full"
        style={{ maxWidth: 460, aspectRatio: '1 / 1' }}
      >
        {/* Decorative concentric rings + centre medallion. The
            outermost border is exactly where the avatars will land,
            so the eye reads the orbit as one composed shape. */}
        <div
          aria-hidden="true"
          className="absolute inset-[6%] rounded-full border border-primary/15"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[20%] rounded-full border border-primary/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-[36%] rounded-full bg-gradient-to-br from-primary/[0.07] via-accent/[0.05] to-transparent"
        />
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

        {/* Rotating ring. Avatars are pinned to the top of each slot;
            since slots fill the ring + are rotated to their angle,
            the avatars naturally sit on the outer edge. */}
        <div
          className={`orbit-ring absolute inset-0 motion-reduce:!animate-none ${mounted ? 'orbit-spin' : ''}`}
        >
          {users.map((u, i) => {
            const angle = (i / users.length) * 360;
            const online = isOnlineNow(u.last_seen_at);
            const viewing = online ? pathLabelFor(u.last_path) : null;
            const navTarget = online && u.last_path && u.last_path.startsWith('/app') ? u.last_path : null;
            const Wrapper: 'button' | 'div' = navTarget ? 'button' : 'div';
            const slotStyle: CSSProperties = {
              transform: `rotate(${angle}deg)`,
            };
            const pinStyle: CSSProperties = {
              ['--angle' as string]: `${angle}deg`,
              ['--enter-delay' as string]: `${i * 65}ms`,
            };
            return (
              <div key={u.id} className="orbit-slot" style={slotStyle}>
                <Wrapper
                  type={navTarget ? 'button' : undefined}
                  onClick={navTarget ? () => router.push(navTarget) : undefined}
                  className={`orbit-pin group ${mounted ? 'orbit-pin-in' : 'orbit-pin-pre'} ${navTarget ? 'cursor-pointer' : ''}`}
                  style={pinStyle}
                  title={navTarget ? `Go to ${viewing}` : undefined}
                  aria-label={u.full_name || 'Teammate'}
                >
                  {/* Counter-rotating wrapper keeps the face upright
                      while the parent ring spins. */}
                  <span className="orbit-counter motion-reduce:!animate-none">
                    {/* Slot-rotation undo so the avatar isn't tilted
                        by the slot's static rotation. */}
                    <span
                      className="block"
                      style={{ transform: `rotate(${-angle}deg)` }}
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
                        {/* Tooltip — same counter-rotating layer so
                            it reads upright regardless of which side
                            of the orbit the avatar currently sits on. */}
                        <span className="orbit-tooltip pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-[60] text-left shadow-lg">
                          <span className="block font-semibold text-white">
                            {u.full_name || 'User'}
                          </span>
                          {u.job_title && (
                            <span className="block text-white/85">{u.job_title}</span>
                          )}
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
                      </span>
                    </span>
                  </span>
                </Wrapper>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        /* Outer rotation — the ring container spins. */
        @keyframes orbit-spin-rot {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .orbit-spin { animation: orbit-spin-rot 60s linear infinite; }

        /* Counter-rotation so faces stay upright as the ring turns. */
        @keyframes orbit-counter-rot {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        .orbit-counter {
          display: inline-block;
          animation: orbit-counter-rot 60s linear infinite;
        }

        /* Slots fill the ring's bounding box. Each is rotated to its
           angle inline; the pin pinned at the top centre of the slot
           lands the avatar exactly on the outer edge of the ring. */
        .orbit-slot {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transform-origin: center;
        }
        .orbit-pin {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translate(-50%, -50%);
          pointer-events: auto;
          background: transparent;
          border: 0;
          padding: 0;
          line-height: 0;
        }
        .orbit-pin:focus-visible {
          outline: 2px solid var(--color-primary, #bc6b4a);
          outline-offset: 4px;
          border-radius: 9999px;
        }

        /* Mount animation — start at the centre of the ring at scale
           0.3, ease out to the slot. We achieve "centre" by pinning
           the avatar's translate to (-50%, -50%) of (50%, 50%) of the
           slot, which puts it at slot centre — i.e. ring centre after
           the slot's static rotation is applied. */
        @keyframes orbit-pin-enter {
          0% {
            opacity: 0;
            top: 50%;
            transform: translate(-50%, -50%) scale(0.3);
          }
          60% { opacity: 1; }
          100% {
            opacity: 1;
            top: 0;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .orbit-pin-pre {
          opacity: 0;
          top: 50%;
          transform: translate(-50%, -50%) scale(0.3);
        }
        .orbit-pin-in {
          animation: orbit-pin-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
          animation-delay: var(--enter-delay);
        }

        @media (prefers-reduced-motion: reduce) {
          .orbit-pin-in,
          .orbit-pin-pre,
          .orbit-spin,
          .orbit-counter {
            animation: none !important;
            opacity: 1 !important;
            top: 0 !important;
            transform: translate(-50%, -50%) !important;
          }
        }
      `}</style>
    </section>
  );
}

export type { OrbitUser };
