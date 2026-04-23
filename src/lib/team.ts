import { getPublicSupabase } from '@/lib/supabase-server';

/** Interesting-fact prompt + member-authored answer. Mirrors the
 *  `interesting_facts` JSONB column written by the /app/profile
 *  editor. Answers can be empty strings on entries the editor
 *  added but hasn't filled out; the public page filters those. */
export interface PublicTeamFact {
  prompt: string;
  answer: string;
}

export interface PublicTeamMember {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_quote: string | null;
  favorite_seven_arrows: string | null;
  hometown: string | null;
  interesting_facts: PublicTeamFact[];
  slug: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Google stores OAuth profile photos at `=s96-c` by default (96px), which
// looks blurry once we render them at card size. The same URL serves any
// size when we swap that suffix — bump it so the team grid + detail hero
// have something crisp to show.
//   .../a/ABC=s96-c   -> .../a/ABC=s512-c
//   .../a/ABC         -> .../a/ABC=s512-c
function upgradeAvatarUrl(url: string | null, size = 512): string | null {
  if (!url) return url;
  if (!/googleusercontent\.com/i.test(url)) return url;
  if (/=s\d+(-c)?$/i.test(url)) {
    return url.replace(/=s\d+(-c)?$/i, `=s${size}-c`);
  }
  return `${url}=s${size}-c`;
}

// Build a stable slug for a team member, preferring an explicit override on
// the row. When two members would collide on the auto-derived slug we append
// a numeric suffix in row order so URLs stay deterministic across loads.
export function withSlugs<T extends { id: string; full_name: string | null; public_slug: string | null }>(
  rows: T[],
): Array<T & { slug: string }> {
  const seen = new Map<string, number>();
  return rows.map((row) => {
    const explicit = row.public_slug?.trim();
    let slug = explicit || slugify(row.full_name || row.id);
    if (!explicit) {
      const count = seen.get(slug) || 0;
      if (count > 0) slug = `${slug}-${count + 1}`;
      seen.set(slug, count + 1);
    }
    return { ...row, slug };
  });
}

// Lower number = higher up the page. Untitled rows sink to the bottom so
// the team grid leads with leadership instead of alphabetical chance.
function jobRank(jobTitle: string | null): number {
  if (!jobTitle) return 99;
  const t = jobTitle.toLowerCase();
  // C-suite / owners
  if (/\b(ceo|coo|cfo|cmo|cto|cco|cio|chief|owner|founder|president)\b/.test(t)) return 0;
  // Vice Presidents
  if (/\b(vice president|vp)\b/.test(t)) return 1;
  // Directors
  if (/\bdirector\b/.test(t)) return 2;
  // Managers
  if (/\bmanager\b/.test(t)) return 3;
  // Leads
  if (/\blead\b/.test(t)) return 4;
  // Coordinators / Supervisors / Specialists
  if (/\b(coordinator|supervisor|specialist)\b/.test(t)) return 5;
  // Counselors / Therapists / Clinicians / Physicians
  if (/\b(counselor|therapist|clinician|physician|nurse|md|lcsw|lpc|lmft|lisac)\b/.test(t)) return 6;
  // Technicians / Assistants / everyone else with a title
  return 7;
}

// Three-tier select so degraded Supabase schemas still render. The
// extended select includes `hometown` + `interesting_facts` (latest
// profile fields). If the migration hasn't been applied we fall
// back to the previous FULL_SELECT, and if *that* fails we fall
// back further to the minimal columns.
const EXTENDED_SELECT =
  'id, full_name, job_title, avatar_url, bio, favorite_quote, favorite_seven_arrows, hometown, interesting_facts, public_slug, status, public_team, team_page_order';
const FULL_SELECT =
  'id, full_name, job_title, avatar_url, bio, favorite_quote, favorite_seven_arrows, public_slug, status, public_team, team_page_order';
const MINIMAL_SELECT = 'id, full_name, job_title, avatar_url, bio, public_slug, status, public_team';

type TeamRow = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_quote?: string | null;
  favorite_seven_arrows?: string | null;
  hometown?: string | null;
  interesting_facts?: unknown;
  public_slug: string | null;
  status?: string | null;
  public_team?: boolean | null;
  team_page_order?: number | null;
};

// Coerce the `interesting_facts` JSONB column into a well-typed
// array. Accepts JSON strings, plain arrays, or garbage — returns
// an empty array when anything looks off so one malformed row can't
// crash the page.
function coerceFacts(raw: unknown): PublicTeamFact[] {
  if (!raw) return [];
  let arr: unknown = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .map((f) => {
      if (!f || typeof f !== 'object') return null;
      const entry = f as { prompt?: unknown; answer?: unknown };
      const prompt = typeof entry.prompt === 'string' ? entry.prompt.trim() : '';
      const answer = typeof entry.answer === 'string' ? entry.answer.trim() : '';
      if (!prompt || !answer) return null;
      return { prompt, answer } satisfies PublicTeamFact;
    })
    .filter((f): f is PublicTeamFact => !!f);
}

export async function fetchPublicTeam(): Promise<PublicTeamMember[]> {  try {
    const supabase = getPublicSupabase();

    // Try the extended select first (profile fields incl. hometown
    // + interesting_facts). If it errors, fall back to the previous
    // full select, then finally to the minimal one. The page should
    // render whatever columns the deployed schema actually has.
    let data: TeamRow[] | null = null;
    {
      const q = await supabase
        .from('users')
        .select(EXTENDED_SELECT)
        .eq('status', 'active')
        .eq('public_team', true)
        .order('full_name', { ascending: true });
      if (!q.error) {
        data = (q.data || []) as unknown as TeamRow[];
      } else {
        console.warn('[team] extended select failed, retrying full:', q.error.message);
      }
    }
    if (!data) {
      const q = await supabase
        .from('users')
        .select(FULL_SELECT)
        .eq('status', 'active')
        .eq('public_team', true)
        .order('full_name', { ascending: true });
      if (!q.error) {
        data = (q.data || []) as unknown as TeamRow[];
      } else {
        console.warn('[team] full select failed, retrying minimal:', q.error.message);
      }
    }
    if (!data) {
      const q = await supabase
        .from('users')
        .select(MINIMAL_SELECT)
        .eq('status', 'active')
        .eq('public_team', true)
        .order('full_name', { ascending: true });
      if (q.error) {
        console.error('[team] minimal select also failed', q.error);
        return [];
      }
      data = (q.data || []) as unknown as TeamRow[];
    }

    const rows = (data || [])
      .filter((row) => (row.full_name || '').trim().length > 0)
      .sort((a, b) => {
        // Manual override from /app/team "Team Page Order" wins when
        // present. Nulls sink to the bottom so pinning the first few
        // people doesn't rearrange the long tail of unordered rows.
        const oa = a.team_page_order;
        const ob = b.team_page_order;
        const hasA = typeof oa === 'number';
        const hasB = typeof ob === 'number';
        if (hasA && hasB && oa !== ob) return (oa as number) - (ob as number);
        if (hasA !== hasB) return hasA ? -1 : 1;
        // Fallback: jobRank, then alphabetical.
        const ra = jobRank(a.job_title);
        const rb = jobRank(b.job_title);
        if (ra !== rb) return ra - rb;
        return (a.full_name || '').localeCompare(b.full_name || '');
      });

    return withSlugs(rows).map((row) => ({
      id: row.id,
      full_name: row.full_name as string,
      job_title: row.job_title,
      avatar_url: upgradeAvatarUrl(row.avatar_url),
      bio: row.bio,
      favorite_quote: row.favorite_quote ?? null,
      favorite_seven_arrows: row.favorite_seven_arrows ?? null,
      hometown: row.hometown ?? null,
      interesting_facts: coerceFacts(row.interesting_facts),
      slug: row.slug,
    }));
  } catch (err) {
    // Don't take the team page down if Supabase env is missing at build
    // time or the request fails — degrade to an empty grid so the rest
    // of the page (hero, intro, CTA) still renders.
    console.error('[team] fetchPublicTeam threw', err);
    return [];
  }
}

/**
 * Look up a single public team member by their stable URL slug.
 * Returns null if the member does not exist or is not publicly listed
 * (status !== 'active' or public_team !== true). Relies on
 * fetchPublicTeam so the slug resolution logic matches the grid.
 */
export async function fetchPublicTeamMemberBySlug(
  slug: string,
): Promise<PublicTeamMember | null> {
  if (!slug) return null;
  const team = await fetchPublicTeam();
  return team.find((m) => m.slug === slug) ?? null;
}

