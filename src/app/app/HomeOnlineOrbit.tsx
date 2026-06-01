'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
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
  // Today's activity-log count + recent rows, joined in by
  // HomeContent. > 10 actions flips the avatar into "on fire" mode:
  // a flame badge in the corner + a warm halo glow. The hover
  // tooltip surfaces the count and the most recent actions so the
  // viewer can see *why* a teammate is highlighted.
  actions_today?: number;
  recent_actions?: Array<{
    type: string;
    target_label: string | null;
    created_at: string;
  }>;
  // Phone-coverage shifts assigned to this user *today only*. Each
  // entry is one calendar_events row with category='phones' and
  // event_date = today (Phoenix time). Drives the phone badge in the
  // bottom-left of the avatar + the "On phones today" section in the
  // hover tooltip.
  phones_today?: Array<{
    title: string;
    start_time: string | null;
    end_time: string | null;
  }>;
  // Coarse sobriety milestone ("2 years sober"), attached by the
  // alumni home for alumni who turned on time-sober tracking AND
  // opted to share it. Shown as a line in the hover tooltip. The
  // staff dashboard never sets this.
  sobriety_label?: string | null;
}

const ON_FIRE_THRESHOLD = 10;

// Activity-log type strings are dot.snake_case (e.g.
// "seo.directory_status_changed"). For the on-fire tooltip we want
// short, human-readable labels — strip the namespace, replace
// underscores with spaces, sentence-case the result. Keeps the
// component decoupled from any per-type label registry: a new
// activity type added anywhere in the app shows up here without an
// edit.
function humanizeActivityType(type: string): string {
  const tail = type.includes('.') ? type.slice(type.lastIndexOf('.') + 1) : type;
  const spaced = tail.replace(/_/g, ' ').trim();
  if (!spaced) return type;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Inner ring shows the horse roster, orbiting opposite-direction so
// the two rings read as two distinct motions instead of one big drift.
interface OrbitHorse {
  id: string;
  name: string;
  image_url: string | null;
  age?: number | null;
  weight?: number | null;
  works_in?: string | null;
  rideable?: string | null;
  // Latest weight + feed log per horse, denormalised by HomeContent
  // so the tooltip can render rich info without each tooltip having
  // to query its own logs on hover.
  last_weight_lbs?: number | null;
  last_weighed_at?: string | null;
  last_feed_amount?: number | null;
  last_feed_unit?: string | null;
  last_feed_type?: string | null;
  last_fed_at?: string | null;
}

interface Props {
  users: OrbitUser[];
  /** Alumni online today — render as the OUTERMOST ring around
   *  the staff (middle) + horse (inner) rings. Falls back to []
   *  when no alumni were online so the older two-ring layout
   *  still works for staff-only deployments. */
  alumni?: OrbitUser[];
  horses?: OrbitHorse[];
  pathLabelFor: (path: string | null) => string | null;
  /** When set, the matching avatar gets a copper pulse ring —
   *  used by the home "Your move" Connect-4 nudge to draw the
   *  user's eye toward their opponent. */
  highlightUserId?: string | null;
}

function isOnlineNow(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 6 * 60 * 1000;
}

// Format a database time-of-day ('HH:MM:SS' or 'HH:MM') as a friendly
// 12-hour label — "9 AM", "5:30 PM". '00:00:00' on the end_time is
// treated as midnight (24:00) so the Evening shift's 17:00 → 00:00
// reads as "5 PM – 12 AM" instead of "5 PM – 12 AM" looking like a
// typo.
function fmtPhoneTime(s: string | null, isEnd = false): string {
  if (!s) return '—';
  const [hStr, mStr] = s.split(':');
  let h = Number(hStr);
  const m = Number(mStr ?? 0);
  if (!Number.isFinite(h)) return '—';
  if (isEnd && h === 0 && m === 0) return '12 AM';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
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

// Compact relative-time helper for the horse tooltip (matches the
// previous HomeHorsesRow strip's formatting). Beyond two weeks we
// fall back to a "Apr 30" calendar label so old logs read naturally.
function fmtRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const hr = ms / 3600000;
  if (hr < 1) return `${Math.max(1, Math.round(ms / 60000))}m ago`;
  if (hr < 24) return `${Math.round(hr)}h ago`;
  const d = hr / 24;
  if (d < 14) return `${Math.round(d)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type HoverState =
  | { kind: 'user'; user: OrbitUser; viewing: string | null; navTarget: string | null; online: boolean }
  | { kind: 'horse'; horse: OrbitHorse };

interface TooltipPos {
  // Fixed-positioning anchor. The tooltip is portaled to <body> so it
  // escapes every parent's overflow-hidden — only the viewport itself
  // can clip it, and the auto-flip + edge-clamp below handle that.
  left: number;
  // top edge (when placement === 'bottom') or bottom edge (when
  // placement === 'top') of the trigger, in viewport coords.
  anchorY: number;
  placement: 'top' | 'bottom';
}

function OrbitTooltip({
  hovered,
  pos,
  tooltipRef,
}: {
  hovered: HoverState;
  pos: TooltipPos;
  tooltipRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const gap = 12;
  const style: CSSProperties = {
    position: 'fixed',
    left: pos.left,
    top: pos.placement === 'bottom' ? pos.anchorY + gap : undefined,
    bottom: pos.placement === 'top' ? Math.max(0, window.innerHeight - pos.anchorY) + gap : undefined,
    transform: 'translateX(-50%)',
    zIndex: 9999,
    pointerEvents: 'none',
  };
  return (
    <div ref={tooltipRef} style={style} className="orbit-tooltip">
      {hovered.kind === 'user' ? (
        (() => {
          const actions = hovered.user.actions_today ?? 0;
          const onFire = actions > ON_FIRE_THRESHOLD;
          const recent = hovered.user.recent_actions ?? [];
          return (
            <div className="w-max max-w-[min(20rem,82vw)] px-3 py-2 bg-foreground text-white text-xs rounded-lg shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] break-words text-center">
              <p className="font-semibold leading-tight">{hovered.user.full_name || 'User'}</p>
              {hovered.user.job_title && (
                <p className="text-white/85 leading-tight mt-0.5">{hovered.user.job_title}</p>
              )}
              <p className="text-white/75 leading-tight mt-0.5">
                {hovered.online ? 'Online now' : `Last active ${timeAgo(hovered.user.last_sign_in)}`}
              </p>
              {hovered.user.sobriety_label && (
                <p className="text-emerald-300 font-semibold leading-tight mt-1">
                  🌱 {hovered.user.sobriety_label}
                </p>
              )}
              {hovered.viewing && (
                <p className="text-emerald-300 leading-tight mt-0.5">
                  Viewing {hovered.viewing}
                  {hovered.navTarget ? ' — click to jump' : ''}
                </p>
              )}
              {/* Phones-coverage block — only renders when the
                  teammate has at least one calendar_events row with
                  category='phones' for today (Phoenix time). Each
                  shift line reads "Day · 8 AM – 5 PM"; multiple
                  shifts stack so a person covering both Day + Evening
                  shows up as two rows. */}
              {(hovered.user.phones_today?.length ?? 0) > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-white/15 text-left">
                  <p className="text-sky-300 font-semibold leading-tight inline-flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    On phones today
                  </p>
                  <ul className="mt-1 space-y-0.5 text-white/85 leading-snug">
                    {hovered.user.phones_today!.map((p, i) => (
                      <li key={`${p.title}-${i}`} className="truncate">
                        <span className="text-white">{p.title || 'Phones'}</span>
                        <span className="text-white/55">
                          {' · '}
                          {fmtPhoneTime(p.start_time)}
                          {' – '}
                          {fmtPhoneTime(p.end_time, true)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {onFire && (
                <div className="mt-1.5 pt-1.5 border-t border-white/15 text-left">
                  <p className="text-orange-300 font-semibold leading-tight">
                    <span aria-hidden="true">🔥</span> On a streak — {actions} actions today
                  </p>
                  {recent.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-white/80 leading-snug">
                      {recent.slice(0, 4).map((a, idx) => (
                        <li key={`${a.created_at}-${idx}`} className="truncate">
                          <span className="text-white/55">{timeAgo(a.created_at)} · </span>
                          {humanizeActivityType(a.type)}
                          {a.target_label ? `: ${a.target_label}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })()
      ) : (
        <div className="w-max max-w-[min(18rem,80vw)] bg-white rounded-xl border border-gray-100 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{hovered.horse.name}</p>
          <p className="text-[11px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            {hovered.horse.age != null ? `${hovered.horse.age} years` : 'Age unknown'}
            {hovered.horse.works_in ? ` · ${hovered.horse.works_in}` : ''}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="text-foreground/40">Weight</span>
            <span className="text-foreground/80 text-right">
              {hovered.horse.last_weight_lbs ? `${hovered.horse.last_weight_lbs} lbs` : hovered.horse.weight ? `${hovered.horse.weight} lbs` : '—'}
            </span>
            <span className="text-foreground/40">Last fed</span>
            <span className="text-foreground/80 text-right">
              {hovered.horse.last_fed_at
                ? `${hovered.horse.last_feed_amount ?? ''}${hovered.horse.last_feed_unit ? ' ' + hovered.horse.last_feed_unit : ''} ${hovered.horse.last_feed_type ?? ''} · ${fmtRelative(hovered.horse.last_fed_at)}`.trim()
                : '—'}
            </span>
            {hovered.horse.last_weighed_at && (
              <>
                <span className="text-foreground/40">Weighed</span>
                <span className="text-foreground/80 text-right">{fmtRelative(hovered.horse.last_weighed_at)}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomeOnlineOrbit({ users, alumni = [], horses = [], pathLabelFor, highlightUserId = null }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Tooltips were previously pinned under the 7A medallion to dodge
  // overflow clipping. We now portal them to <body> with computed
  // fixed positioning, so they can attach directly to the hovered
  // avatar without ever being clipped. The ring also pauses on hover
  // so the avatar — and therefore the tooltip — stays put while you
  // read it.
  const [hovered, setHovered] = useState<HoverState | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Re-measure the tooltip after it renders so we can clamp its
  // horizontal position inside the viewport (a wide tooltip near the
  // ring's left/right edge would otherwise spill off-screen). Runs
  // only when hover state or anchor changes — not on every frame.
  useLayoutEffect(() => {
    if (!hovered || !tooltipPos || !tooltipRef.current) return;
    const tipRect = tooltipRef.current.getBoundingClientRect();
    const margin = 12;
    let { left } = tooltipPos;
    const halfWidth = tipRect.width / 2;
    if (left - halfWidth < margin) left = margin + halfWidth;
    if (left + halfWidth > window.innerWidth - margin) left = window.innerWidth - margin - halfWidth;
    if (left !== tooltipPos.left) {
      setTooltipPos((prev) => (prev ? { ...prev, left } : prev));
    }
  }, [hovered, tooltipPos]);

  // Place the tooltip relative to the trigger's screen rect. Choose
  // the side that points back toward the orbit centre (top half of
  // ring → tooltip below; bottom half → tooltip above) so the
  // tooltip naturally falls inside the orbit instead of off-screen.
  function positionTooltipFor(el: HTMLElement) {
    const rect = el.getBoundingClientRect();
    const centerY = window.innerHeight / 2;
    const triggerCenterY = rect.top + rect.height / 2;
    const placement: 'top' | 'bottom' = triggerCenterY < centerY ? 'bottom' : 'top';
    setTooltipPos({
      left: rect.left + rect.width / 2,
      anchorY: placement === 'bottom' ? rect.bottom : rect.top,
      placement,
    });
  }

  function clearHover(predicate: (h: HoverState) => boolean) {
    setHovered((prev) => {
      if (!prev) return prev;
      if (!predicate(prev)) return prev;
      setTooltipPos(null);
      return null;
    });
  }

  if (users.length === 0) return null;

  const onlineCount = users.filter((u) => isOnlineNow(u.last_seen_at)).length;

  // Auto-size the orbit so neither ring ever feels cramped. We solve
  // for the diameter that gives each avatar ~64px of arc length on
  // the outer ring (roughly 1.4× the 48px lg avatar diameter — wide
  // enough that faces breathe without the ring becoming sparse).
  // The inner ring sits at inset-[20%], i.e. 60% of the outer
  // diameter, so we back-solve a horse-comfort minimum from there
  // too — a horse-heavy day shouldn't crush the inner ring just
  // because the team count is light. Clamped between 240px (a tidy
  // ring for sparse teams) and 500px (so the orbit + tagline fit on
  // one viewport without scrolling on a typical laptop screen).
  // Outer alumni ring overhangs the staff ring by ~18% (the
  // staff ring sits at inset-[7%]; alumni live at inset-[-11%]
  // visually, but we paint them on the SAME aspect-square box
  // with a slightly larger orbit-slot radius via negative inset
  // below). The radius in arc-length terms is ~1.18× the staff
  // radius, so we back-solve a comfort minimum from there too.
  // Back-solve uses the SMALLER avatar dimensions now (40px staff,
  // 28px horse + alumni) so the orbit packs tighter on first paint
  // and doesn't bloat past the 460px max.
  const usersNeeded = (users.length * 52) / Math.PI;
  const horsesNeeded = (horses.length * 32) / (0.6 * Math.PI);
  const alumniNeeded = (alumni.length * 44) / (1.6 * Math.PI);
  const idealDiameter = Math.max(
    240,
    Math.min(460, Math.round(Math.max(usersNeeded, horsesNeeded, alumniNeeded))),
  );

  return (
    <section
      className="relative z-40 flex flex-col items-center w-full"
      aria-label="Online today"
    >
      {/* Title sits as a NORMAL block at the top of the section
          instead of an absolutely-positioned overlay. The earlier
          absolute layout floated the title above the orbit by a
          fixed offset, which made the alumni outer ring (which
          extends ~22% past the orbit container) clip into the
          title text every time. Putting the title in flow + giving
          the orbit container generous top padding below
          guarantees no overlap regardless of how many alumni are
          orbiting today. */}
      <div className="hidden sm:block text-center pointer-events-none mb-2">
        <h2
          className="text-foreground font-bold tracking-tight"
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

      {/* Wrapper with `flex justify-center` is intentional belt-and-
          braces: w-full + mx-auto on the orbit alone was leaving the
          7A medallion ~13px left of the visual console center on
          some viewport widths. The flex parent guarantees horizontal
          centering of the inner aspect-square box regardless of any
          width-resolution quirks above. The orbit's max-width is
          computed from the team + horse counts (idealDiameter above)
          so a sparse roster draws a tight ~280px ring while a packed
          one fans out to 680px. `w-full` still clamps to the viewport
          on phones, so the px-4 padding keeps mobile avatars off the
          screen edges without needing a hard breakpoint cap. */}
      {/* Reserve vertical clearance above + below the orbit's
          aspect-square box so the outer alumni ring (now inset -15%
          → ~15% overhang ≈ 70px on a 460px ring) clears both the
          title block above and the daily-logs pill below. Earlier
          this was inset -30% / pt-12 — that combination poked the
          12-o'clock alumni avatar straight onto the "Seven Arrows"
          subtitle. Bringing the alumni ring closer (still clearly
          outside the staff ring, but no longer halfway to the
          viewport edge) plus matching pt/pb keeps every layer
          discrete and on its own track. */}
      <div className="w-full flex justify-center px-8 sm:px-12 pt-24 pb-24">
        <div
          className="relative w-full aspect-square"
          style={{ maxWidth: `${idealDiameter}px` }}
        >
        {/* Decorative concentric rings + centre medallion.
            Each ring border now lands EXACTLY at the radius of
            the corresponding avatar ring (inset-[7%] sm:inset-0
            for staff; inset-[20%] for horses) so the eye reads
            each ring of avatars as sitting on its own real track
            instead of floating between mismatched guide lines.
            pointer-events-none is critical — without it, these
            full-size invisible boxes capture hover/click events on
            the staff and horse pins underneath them, breaking the
            tooltip. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[7%] sm:inset-0 rounded-full border border-primary/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[20%] rounded-full border border-primary/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[36%] rounded-full bg-gradient-to-br from-primary/[0.07] via-accent/[0.05] to-transparent"
        />
        {/* Centre 7A — small glass pill, kept understated so the
            orbiting team avatars stay the focus. `backdrop-blur` is
            gated to `sm:` because on mobile the blur layer sits in
            front of the spinning ring and forces the browser to
            recompose the blurred region every frame the ring tics —
            a known iOS/Android compositor stall. Phones get a solid
            frosted fill instead. */}
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/85 sm:bg-white/70 sm:supports-[backdrop-filter]:bg-white/45 sm:backdrop-blur-md border border-white/80 shadow-[0_8px_28px_-12px_rgba(60,48,42,0.35)] flex items-center justify-center"
        >
          <span
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            7A
          </span>
        </div>

        {/* Inner ring — horse roster. Pinned to the inset-[20%]
            decorative ring so each horse avatar lands exactly on it.
            Spins the same direction as the outer ring but slower
            (180s vs 120s) so the two motions read as one composed
            shape with the horses gently trailing the team. */}
        {horses.length > 0 && (
          <div
            className={`orbit-ring absolute inset-[20%] motion-reduce:!animate-none ${mounted ? 'orbit-spin-slow' : ''} ${hovered ? 'orbit-paused' : ''}`}
          >
            {horses.map((h, i) => {
              const angle = (i / horses.length) * 360;
              const slotStyle: CSSProperties = {
                transform: `rotate(${angle}deg)`,
              };
              const pinStyle: CSSProperties = {
                ['--enter-delay' as string]: `${300 + i * 55}ms`,
              };
              return (
                <div key={h.id} className="orbit-slot" style={slotStyle}>
                  <button
                    type="button"
                    onClick={() => router.push(`/app/equine/${h.id}`)}
                    onMouseEnter={(e) => {
                      positionTooltipFor(e.currentTarget);
                      setHovered({ kind: 'horse', horse: h });
                    }}
                    onMouseLeave={() => clearHover((prev) => prev.kind === 'horse' && prev.horse.id === h.id)}
                    onFocus={(e) => {
                      positionTooltipFor(e.currentTarget);
                      setHovered({ kind: 'horse', horse: h });
                    }}
                    onBlur={() => clearHover((prev) => prev.kind === 'horse' && prev.horse.id === h.id)}
                    className={`orbit-pin group orbit-pin-horse ${mounted ? 'orbit-pin-in' : 'orbit-pin-pre'} cursor-pointer`}
                    style={pinStyle}
                    title={h.name}
                    aria-label={h.name}
                  >
                    {/* Counter-rotating wrapper for the slower inner ring
                        (orbit-spin-slow on the parent). Gated on
                        `mounted` so it starts in the same frame as
                        the parent's spin animation — otherwise a 60ms
                        head-start would leave each horse photo
                        permanently tilted by ~0.12deg. Inner span then
                        undoes the slot's static rotation so the horse
                        photo isn't tilted by where it sits on the rim. */}
                    {/* Counter-rotation: parent ring spins clockwise
                        on a 180s loop, this wrapper spins
                        anti-clockwise on the same period so the horse
                        photo reads upright. Both classes only attach
                        once `mounted` flips, so the parent spin and
                        the counter start in the same animation frame
                        and don't drift. The inner span then cancels
                        the slot's static rotation so the avatar isn't
                        tilted by where it sits on the rim. */}
                    <span className={`motion-reduce:!animate-none ${mounted ? 'orbit-counter-slow' : ''}`}>
                      <span
                        className="block"
                        style={{ transform: `rotate(${-angle}deg)` }}
                      >
                        <span className="relative block">
                          {h.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={h.image_url}
                              alt={h.name}
                              referrerPolicy="no-referrer"
                              width={36}
                              height={36}
                              decoding="async"
                              className="block w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border-2 border-white shadow-md transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <span className="flex w-6 h-6 sm:w-7 sm:h-7 rounded-full items-center justify-center text-xs font-semibold border-2 border-white bg-warm-bg text-foreground/55 shadow-md transition-transform duration-300 group-hover:scale-110">
                              {h.name.charAt(0)}
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Outer ring — teammates online today. Avatars pinned to the
            top of each slot; since slots fill the ring + are rotated
            to their angle, the avatars naturally sit on the outer edge.
            On mobile the ring is inset 7% so avatars (which extend half
            their height past the slot's top edge) sit fully inside the
            container — otherwise they get clipped by the page padding.
            Rings rotate slowly (120s clockwise) and each avatar counter-
            rotates at the same rate so faces stay upright through the
            orbit. */}
        <div
          className={`orbit-ring absolute inset-[7%] sm:inset-0 motion-reduce:!animate-none ${mounted ? 'orbit-spin' : ''} ${hovered ? 'orbit-paused' : ''}`}
        >
          {users.map((u, i) => {
            const angle = (i / users.length) * 360;
            const online = isOnlineNow(u.last_seen_at);
            const viewing = online ? pathLabelFor(u.last_path) : null;
            const navTarget = online && u.last_path && u.last_path.startsWith('/app') ? u.last_path : null;
            const onFire = (u.actions_today ?? 0) > ON_FIRE_THRESHOLD;
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
                  onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
                    positionTooltipFor(e.currentTarget);
                    setHovered({ kind: 'user', user: u, viewing, navTarget, online });
                  }}
                  onMouseLeave={() => clearHover((h) => h.kind === 'user' && h.user.id === u.id)}
                  onFocus={(e: React.FocusEvent<HTMLElement>) => {
                    positionTooltipFor(e.currentTarget);
                    setHovered({ kind: 'user', user: u, viewing, navTarget, online });
                  }}
                  onBlur={() => clearHover((h) => h.kind === 'user' && h.user.id === u.id)}
                  className={`orbit-pin group ${mounted ? 'orbit-pin-in' : 'orbit-pin-pre'} ${navTarget ? 'cursor-pointer' : ''} ${highlightUserId === u.id ? 'orbit-pin-your-move' : ''}`}
                  style={pinStyle}
                  title={navTarget ? `Go to ${viewing}` : undefined}
                  aria-label={u.full_name || 'Teammate'}
                >
                  {/* Counter-rotating wrapper keeps the face upright
                      while the parent ring spins. Gated on `mounted`
                      so it starts in the exact same frame as the
                      parent's `orbit-spin` — otherwise the counter
                      runs 60ms ahead and faces sit permanently
                      ~0.18deg off-axis. The inner span then cancels
                      the slot's static rotation so the face isn't
                      tilted by where it sits on the rim. */}
                  {/* Counter-rotation: parent ring spins clockwise
                      on a 120s loop, this wrapper spins
                      anti-clockwise on the same period so faces
                      stay upright. Both `orbit-spin` (on the parent)
                      and `orbit-counter` (here) only attach once
                      `mounted` flips, so they start in the same
                      animation frame and don't drift apart over
                      successive cycles. The inner span then cancels
                      the slot's static rotation so the avatar isn't
                      tilted by where it sits on the rim. */}
                  <span className={`motion-reduce:!animate-none ${mounted ? 'orbit-counter' : ''}`}>
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
                            width={48}
                            height={48}
                            decoding="async"
                            className={`block w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 transition-transform duration-300 group-hover:scale-110 ${
                              onFire
                                ? 'border-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.7)]'
                                : online
                                  ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)]'
                                  : 'border-white shadow-md'
                            }`}
                          />
                        ) : (
                          <span
                            className={`flex w-8 h-8 sm:w-10 sm:h-10 rounded-full items-center justify-center text-sm font-bold border-2 transition-transform duration-300 group-hover:scale-110 ${
                              onFire
                                ? 'border-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.7)] bg-primary text-white'
                                : online
                                  ? 'border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.55)] bg-primary text-white'
                                  : 'border-white bg-primary text-white shadow-md'
                            }`}
                          >
                            {(u.full_name || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        {onFire && (
                          <span
                            aria-label="On a streak"
                            className="orbit-fire absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 via-orange-500 to-rose-500 border-2 border-white shadow-md flex items-center justify-center text-[10px] leading-none"
                            role="img"
                          >
                            <span aria-hidden="true">🔥</span>
                          </span>
                        )}
                        {!onFire && online && (
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white"
                          />
                        )}
                        {/* Phones-coverage badge — pinned bottom-left so
                            it doesn't fight the online dot (bottom-right)
                            or the on-fire flame (top-right). Renders only
                            when the teammate has at least one phones
                            shift assigned for today. Hover-tooltip in
                            OrbitTooltip surfaces the shift + time range. */}
                        {(u.phones_today?.length ?? 0) > 0 && (
                          <span
                            aria-label="On phones today"
                            role="img"
                            className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 border-2 border-white shadow-md flex items-center justify-center"
                          >
                            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                          </span>
                        )}
                        {/* Per-avatar tooltips were clipped by the
                            home wrapper's overflow-hidden whenever
                            an edge avatar was hovered; the shared
                            tooltip below the 7A medallion replaces
                            them. */}
                      </span>
                    </span>
                  </span>
                </Wrapper>
              </div>
            );
          })}
        </div>

        {/* Decorative outermost ring border — sits exactly on the
            alumni radius so the eye reads the alumni avatars as
            following a real concentric track instead of floating
            in space outside the inner two rings. */}
        {alumni.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-[-15%] rounded-full border border-violet-400/25"
          />
        )}

        {/* Outermost ring — alumni online today. Pinned to a
            NEGATIVE inset (-15%) so alumni orbit clearly outside
            the staff ring while still leaving room for the title
            above and the daily-logs pill below (see pt-24/pb-24
            on the wrapper). Was -30% before — that put the top
            alumni avatar right on top of the "Seven Arrows"
            subtitle text. Counter-rotates so all three rings
            drift in different directions. */}
        {alumni.length > 0 && (
          <div
            className={`orbit-ring absolute inset-[-15%] motion-reduce:!animate-none ${mounted ? 'orbit-spin-rev' : ''} ${hovered ? 'orbit-paused' : ''}`}
          >
            {alumni.map((u, i) => {
              const angle = (i / alumni.length) * 360;
              const online = isOnlineNow(u.last_seen_at);
              const slotStyle: CSSProperties = { transform: `rotate(${angle}deg)` };
              const pinStyle: CSSProperties = {
                ['--angle' as string]: `${angle}deg`,
                ['--enter-delay' as string]: `${500 + i * 65}ms`,
              };
              return (
                <div key={`alum-${u.id}`} className="orbit-slot" style={slotStyle}>
                  <button
                    type="button"
                    onMouseEnter={(e) => {
                      positionTooltipFor(e.currentTarget);
                      setHovered({ kind: 'user', user: u, viewing: null, navTarget: null, online });
                    }}
                    onMouseLeave={() => clearHover((h) => h.kind === 'user' && h.user.id === u.id)}
                    onFocus={(e) => {
                      positionTooltipFor(e.currentTarget);
                      setHovered({ kind: 'user', user: u, viewing: null, navTarget: null, online });
                    }}
                    onBlur={() => clearHover((h) => h.kind === 'user' && h.user.id === u.id)}
                    className={`orbit-pin group ${mounted ? 'orbit-pin-in' : 'orbit-pin-pre'} cursor-pointer`}
                    style={pinStyle}
                    title={`${u.full_name || 'Alumni'} · alumni community`}
                    aria-label={`${u.full_name || 'Alumni'} (alumni)`}
                  >
                    <span className={`motion-reduce:!animate-none ${mounted ? 'orbit-counter-rev' : ''}`}>
                      <span className="block" style={{ transform: `rotate(${-angle}deg)` }}>
                        <span className="relative block">
                          {u.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={u.avatar_url}
                              alt={u.full_name || ''}
                              referrerPolicy="no-referrer"
                              width={40}
                              height={40}
                              decoding="async"
                              className={`block w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border-2 ${
                                online
                                  ? 'border-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.55)]'
                                  : 'border-violet-200/70 shadow-sm'
                              }`}
                            />
                          ) : (
                            <span
                              className={`flex w-6 h-6 sm:w-7 sm:h-7 rounded-full items-center justify-center text-xs font-bold border-2 bg-violet-500/85 text-white ${
                                online ? 'border-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.55)]' : 'border-violet-200/70'
                              }`}
                            >
                              {(u.full_name || '?').charAt(0).toUpperCase()}
                            </span>
                          )}
                          {online && (
                            <span aria-hidden="true" className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-violet-400 border-2 border-white" />
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        </div>
      </div>

      {/* Avatar-attached tooltip. Portaled to <body> (outside the
          `app-shell` zoom wrapper) with fixed positioning so no
          parent's overflow-hidden can clip it. The ring above pauses
          while `hovered` is set so the trigger — and therefore the
          tooltip's anchor — stays still while you read it. */}
      {portalReady && hovered && tooltipPos && createPortal(
        <OrbitTooltip
          hovered={hovered}
          pos={tooltipPos}
          tooltipRef={tooltipRef}
        />,
        document.body,
      )}

      <style jsx>{`
        /* Single source of truth for the rotation angle. Both the
           ring and each avatar's counter-rotation read the same
           registered custom property, so they can't drift out of
           phase the way two paired keyframe animations did before
           (which produced visible per-avatar rotation over time). */
        @property --orbit-angle      { syntax: '<angle>'; initial-value: 0deg; inherits: true; }
        @property --orbit-angle-slow { syntax: '<angle>'; initial-value: 0deg; inherits: true; }
        /* Counter-clockwise variable for the alumni ring. Same
           single-source-of-truth pattern as --orbit-angle so the
           per-avatar counter-rotation stays locked to the parent
           ring's spin. */
        @property --orbit-angle-rev  { syntax: '<angle>'; initial-value: 0deg; inherits: true; }

        @keyframes orbit-angle-tick      { to { --orbit-angle: 360deg; } }
        @keyframes orbit-angle-tick-slow { to { --orbit-angle-slow: 360deg; } }
        @keyframes orbit-angle-tick-rev  { to { --orbit-angle-rev:  -360deg; } }

        /* GPU layer promotion. Without these hints mobile (especially
           iOS Safari and older Android Chromium) re-rasterises the
           ring + every nested avatar on every frame the rotation
           ticks — that's the primary source of the sub-60fps drop
           we were seeing on phones. The will-change + trailing
           translateZ(0) hint forces each rotated wrapper onto its
           own composited layer, so the per-frame work collapses
           into a single GPU transform instead of a recursive paint
           of every child. The 'contain' rule then scopes layout/paint so a
           tooltip-triggered restyle inside one slot can't invalidate
           the rest of the orbit. */
        .orbit-ring {
          will-change: transform;
          transform: translateZ(0);
          backface-visibility: hidden;
          /* Empty space inside a ring must NOT capture events,
             otherwise the outer alumni ring (which extends past
             the container with negative inset) blocks hovers on
             the staff + horse pins beneath. Only .orbit-pin
             children get pointer-events:auto further down. */
          pointer-events: none;
          /* layout + style only, NOT paint — avatars sit on the rim
             of the ring and translate(-50%, -50%) leaves half of
             each avatar outside the ring's bounding box, so paint
             containment would clip the visible portion that hangs
             past the rim (the right- and bottom-edge avatars showed
             up cropped on mobile). */
          contain: layout style;
        }

        /* Outer ring (team) ticks clockwise on a 120s loop. Inner
           ring (horses) ticks on a slower 180s loop so the two read
           as one composed motion with the horses gently trailing
           the team. The ring rotation IS the variable — transform:
           rotate(var(...)) reads whatever the keyframes have set
           this paint frame. Trailing translateZ(0) keeps the ring
           pinned on its own compositor layer. */
        .orbit-spin {
          animation: orbit-angle-tick 120s linear infinite;
          transform: rotate(var(--orbit-angle)) translateZ(0);
        }
        .orbit-spin-slow {
          animation: orbit-angle-tick-slow 180s linear infinite;
          transform: rotate(var(--orbit-angle-slow)) translateZ(0);
        }
        /* Alumni outer ring · 150s counter-clockwise. The negative
           keyframe end value means rotate() ticks DOWN from 0 to
           -360°, giving the appearance of the alumni orbiting the
           opposite direction from the staff + horse rings. Reads
           as three distinct motions instead of one drift. */
        .orbit-spin-rev {
          animation: orbit-angle-tick-rev 150s linear infinite;
          transform: rotate(var(--orbit-angle-rev)) translateZ(0);
        }

        /* Each avatar's counter rotation reads the same variable the
           parent ring is animating and applies the negation. Because
           it's a CSS variable read inside the same subtree (the @
           property is inherits: true), the two transforms can't fall
           out of phase — they're computed from the exact same value
           every frame. The result: ring rotates around the centre,
           individual avatars never rotate, no drift. */
        .orbit-counter,
        .orbit-counter-slow,
        .orbit-counter-rev {
          display: inline-block;
          will-change: transform;
          backface-visibility: hidden;
        }
        .orbit-counter      { transform: rotate(calc(-1 * var(--orbit-angle)))      translateZ(0); }
        .orbit-counter-slow { transform: rotate(calc(-1 * var(--orbit-angle-slow))) translateZ(0); }
        .orbit-counter-rev  { transform: rotate(calc(-1 * var(--orbit-angle-rev)))  translateZ(0); }

        /* When any avatar is hovered we freeze the rings (and their
           paired counter-rotations) so the trigger stays pinned under
           the cursor and the portaled tooltip — anchored to that
           trigger's getBoundingClientRect — stays glued to the avatar
           instead of drifting off as the ring spins. Pausing all
           three directions simultaneously keeps faces upright while
           frozen. */
        .orbit-ring.orbit-paused,
        .orbit-ring.orbit-paused .orbit-counter,
        .orbit-ring.orbit-paused .orbit-counter-slow,
        .orbit-ring.orbit-paused .orbit-counter-rev {
          animation-play-state: paused;
        }

        /* Slots fill the ring's bounding box. Each is rotated to its
           angle inline; the pin pinned at the top centre of the slot
           lands the avatar exactly on the outer edge of the ring.
           container-type:size lets the mount keyframe below
           express its starting offset in cqh (50% of the slot's own
           height = the orbit radius) so the avatar shoots out from
           centre to rim with a transform-only animation — no top
           keyframe, no per-pin layout work during the 24-avatar
           stagger. contain keeps each slot's paint scoped to
           itself. */
        .orbit-slot {
          position: absolute;
          inset: 0;
          pointer-events: none;
          transform-origin: center;
          container-type: size;
          /* layout + style only — see .orbit-ring above. Avatars are
             pinned to the slot's top edge with translate(-50%, -50%),
             so the upper half of every avatar sits outside the slot's
             box. Paint containment would crop that half off, which
             read on mobile as half-circle avatars at the rim. */
          contain: layout style;
        }
        /* When any pin inside a slot is hovered/focused, lift the
           whole slot above its siblings so the tooltip + glow can
           render on top of every other avatar in the orbit. Each
           slot already creates its own stacking context (because of
           the rotate transform), so a plain z-index on the inner
           tooltip can't escape that context — only the slot itself
           can be promoted. */
        .orbit-slot:has(.orbit-pin:hover),
        .orbit-slot:has(.orbit-pin:focus-visible) {
          z-index: 50;
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
          contain: layout style;
        }
        .orbit-pin:focus-visible {
          outline: 2px solid var(--color-primary, #bc6b4a);
          outline-offset: 4px;
          border-radius: 9999px;
        }

        /* Mount animation — start at the centre of the ring at scale
           0.3, ease out to the slot. The radial offset is expressed
           in cqh (container-query height of the slot, set up via
           container-type: size above), so this is a pure-transform
           animation: no top keyframe, no layout invalidation, the
           entire 24-avatar stagger runs on the compositor. */
        @keyframes orbit-pin-enter {
          0% {
            opacity: 0;
            transform: translate(-50%, calc(-50% + 50cqh)) scale(0.3);
          }
          60% { opacity: 1; }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .orbit-pin-pre {
          opacity: 0;
          transform: translate(-50%, calc(-50% + 50cqh)) scale(0.3);
        }
        .orbit-pin-in {
          animation: orbit-pin-enter 1100ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
          animation-delay: var(--enter-delay);
        }

        /* Flame badge gently breathes so on-fire avatars draw the
           eye. We dropped the per-frame box-shadow keyframe — every
           step of that animation forced the badge + its glow to
           re-rasterise, which on mobile cascaded into the whole
           rotating ring being re-painted. The warm halo is now a
           pseudo-element sibling that animates only opacity (a
           compositor-only property), and the badge itself still
           pulses scale (also compositor-only). Identical look,
           dramatically cheaper. */
        @keyframes orbit-fire-scale {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.15); }
        }
        @keyframes orbit-fire-halo {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        .orbit-fire {
          position: relative;
          animation: orbit-fire-scale 1.6s ease-in-out infinite;
          will-change: transform;
        }
        .orbit-fire::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 9999px;
          background: radial-gradient(closest-side, rgba(251, 146, 60, 0.85), rgba(251, 146, 60, 0) 75%);
          animation: orbit-fire-halo 1.6s ease-in-out infinite;
          pointer-events: none;
          z-index: -1;
          will-change: opacity;
        }

        /* Touch / no-hover devices: kill every transition inside the
           ring. On phones the hover state never fires, but the
           transition-transform duration-300 declarations on every
           avatar still cost a style-recalc lookup per element each
           frame the ring tics. Stripping them on (hover: none) means
           the browser has no transition tables to consult when
           re-applying styles to the 40+ rotating children. */
        @media (hover: none) {
          .orbit-pin,
          .orbit-pin *,
          .orbit-pin img {
            transition: none !important;
          }
        }

        /* Mobile: extend the rotation period so each frame on a
           constrained GPU has less visible-degree-of-rotation to
           reconcile. The orbit still reads as a gentle drift; what
           the eye *can't* read is the per-frame paint cost, which
           we halve by halving the angular velocity. */
        @media (max-width: 639px) {
          .orbit-spin      { animation-duration: 180s; }
          .orbit-spin-slow { animation-duration: 260s; }
        }

        @media (prefers-reduced-motion: reduce) {
          .orbit-pin-in,
          .orbit-pin-pre,
          .orbit-spin,
          .orbit-spin-slow,
          .orbit-counter,
          .orbit-counter-slow {
            animation: none !important;
            opacity: 1 !important;
            top: 0 !important;
            transform: translate(-50%, -50%) !important;
          }
          /* Fire badge: keep its corner positioning, just kill the
             pulse. Skipping the shared override above because it
             would also force a centre-translate that fights with
             the badge's Tailwind -top-1 / -right-1 placement. */
          .orbit-fire {
            animation: none !important;
            transform: none !important;
          }
          .orbit-fire::before {
            animation: none !important;
            opacity: 0.8;
          }
        }
      `}</style>
    </section>
  );
}

export type { OrbitUser, OrbitHorse };
