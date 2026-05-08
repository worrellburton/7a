// Catalogue of cursor effects users can pick on /app/profile → Cursor.
// The id is what we store in public.users.cursor_effect (CHECK
// constrained to this exact set) and broadcast over the realtime
// presence channel; PresenceCursors keys its render branch off the id.
//
// Keep this list in sync with the CHECK constraint applied by
// supabase/migrations/20260508_users_cursor_effect.sql. Adding a new
// effect requires both a migration to widen the CHECK and an entry
// here + a render branch in PresenceCursors.

export type CursorEffectId =
  | 'classic'
  | 'flame'
  | 'comet'
  | 'sparkle'
  | 'bubbles'
  | 'glow'
  | 'rainbow'
  | 'lightning'
  | 'dots'
  | 'pulse';

export interface CursorEffect {
  id: CursorEffectId;
  /** Short human label for the picker swatch. */
  label: string;
  /** One-line description for the swatch tooltip + caption. */
  blurb: string;
  /**
   * Render hint — picker thumbnails use this to render an SVG/CSS
   * preview without booting the full PresenceCursors render path.
   * `mode` keys the thumbnail variant; `accent` lets a thumbnail
   * pick a complementary tone for effects that need one (rainbow
   * uses it as the band gradient; pulse uses it as the ring tint).
   */
  thumb: {
    mode:
      | 'classic'
      | 'flame'
      | 'comet'
      | 'sparkle'
      | 'bubbles'
      | 'glow'
      | 'rainbow'
      | 'lightning'
      | 'dots'
      | 'pulse';
    accent?: string;
  };
}

export const CURSOR_EFFECTS: CursorEffect[] = [
  {
    id: 'classic',
    label: 'Classic',
    blurb: 'A clean dot with your name — the default look.',
    thumb: { mode: 'classic' },
  },
  {
    id: 'flame',
    label: 'Flame',
    blurb: 'A flickering fire trail behind the cursor.',
    thumb: { mode: 'flame' },
  },
  {
    id: 'comet',
    label: 'Comet',
    blurb: 'A tapered tail that follows the cursor like a comet.',
    thumb: { mode: 'comet' },
  },
  {
    id: 'sparkle',
    label: 'Sparkle',
    blurb: 'Tiny stars sparkle around the cursor as it moves.',
    thumb: { mode: 'sparkle' },
  },
  {
    id: 'bubbles',
    label: 'Bubbles',
    blurb: 'Soft circles drift up from the cursor.',
    thumb: { mode: 'bubbles' },
  },
  {
    id: 'glow',
    label: 'Glow',
    blurb: 'A soft halo follows the cursor.',
    thumb: { mode: 'glow' },
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    blurb: 'Cursor cycles smoothly through every hue.',
    thumb: { mode: 'rainbow', accent: 'conic-gradient(from 0deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #6366f1, #ec4899, #ef4444)' },
  },
  {
    id: 'lightning',
    label: 'Lightning',
    blurb: 'A jagged zigzag tail snaps behind the cursor.',
    thumb: { mode: 'lightning' },
  },
  {
    id: 'dots',
    label: 'Dots',
    blurb: 'A trail of fading dots marks the cursor’s path.',
    thumb: { mode: 'dots' },
  },
  {
    id: 'pulse',
    label: 'Pulse',
    blurb: 'Concentric rings pulse outward from the cursor.',
    thumb: { mode: 'pulse' },
  },
];

export const DEFAULT_CURSOR_EFFECT: CursorEffectId = 'classic';

/**
 * Coerce an arbitrary string (e.g. a stale value from a remote
 * payload after we widen the catalogue) to a known effect id, falling
 * back to 'classic' so we never end up rendering an undefined branch.
 */
export function normaliseCursorEffect(value: unknown): CursorEffectId {
  if (typeof value !== 'string') return DEFAULT_CURSOR_EFFECT;
  if (CURSOR_EFFECTS.some((e) => e.id === value)) {
    return value as CursorEffectId;
  }
  return DEFAULT_CURSOR_EFFECT;
}
