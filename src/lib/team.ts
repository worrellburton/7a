import { getServerSupabase } from '@/lib/supabase-server';

export interface PublicTeamMember {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_url: string | null;
  bio: string | null;
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

export async function fetchPublicTeam(): Promise<PublicTeamMember[]> {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, job_title, avatar_url, bio, public_slug, status, public_team')
      .eq('status', 'active')
      .eq('public_team', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.error('[team] failed to load public team', error);
      return [];
    }

    const rows = (data || []).filter((row) => (row.full_name || '').trim().length > 0);
    return withSlugs(rows).map((row) => ({
      id: row.id,
      full_name: row.full_name as string,
      job_title: row.job_title,
      avatar_url: row.avatar_url,
      bio: row.bio,
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

export async function fetchTeamMemberBySlug(slug: string): Promise<PublicTeamMember | null> {
  const all = await fetchPublicTeam();
  return all.find((m) => m.slug === slug) || null;
}
