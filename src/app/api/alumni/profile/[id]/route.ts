import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, getAdminSupabase } from '@/lib/supabase-server';

// GET /api/alumni/profile/[id]  →  one alumnus's profile data for the
// per-alumnus profile page (/feather/alumni/u/[id]).
//
// Reads through the service-role client so the join to public.users
// for full_name + avatar_url works regardless of users-table RLS, and
// strips out fields that the alumnus has opted not to share publicly
// (phone / email behind phone_visible / email_visible). Sobriety date
// is only included when sobriety_public is true.
//
// Auth: any signed-in user can call this. The /feather/alumni/u/[id]
// route itself is gated to alumni + staff via PagePermissions, so the
// API just needs to ensure the caller is logged in.

export const dynamic = 'force-dynamic';

interface AlumniProfilePayload {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  availableFor: string[];
  // Honored visibility — null when the alum has opted out.
  phone: string | null;
  email: string | null;
  sobrietyDate: string | null;
  sobrietyLabel: string | null;
  onMap: boolean;
  onPhoneList: boolean;
  lastSeenAt: string | null;
  lastSignIn: string | null;
}

function soberMilestoneLabel(iso: string | null): string | null {
  if (!iso) return null;
  const start = Date.parse(`${iso}T00:00:00-07:00`);
  if (!Number.isFinite(start)) return null;
  const days = Math.floor((Date.now() - start) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return 'Day 1 sober';
  if (days < 30) return `${days} days sober`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'} sober`;
  }
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} sober`;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getUserFromRequest(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;
  if (!id || !/^[0-9a-fA-F-]{32,40}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const admin = getAdminSupabase();

  // Pull the user row first (full_name, avatar, job_title, last_seen)
  // — works for any user, alumni or not. The alumni_profiles row is
  // optional; not every alumnus has filled their profile in yet.
  const { data: user, error: userErr } = await admin
    .from('users')
    .select('id, full_name, avatar_url, job_title, last_seen_at, last_sign_in, user_kind')
    .eq('id', id)
    .maybeSingle();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // alumni_profiles is keyed on user_id. A missing row just means the
  // alumnus hasn't customized anything beyond their core user fields
  // — render the page with whatever we have.
  const { data: profile } = await admin
    .from('alumni_profiles')
    .select('city, state, bio, interests, available_for, phone, email_for_alumni, phone_visible, email_visible, on_map, on_phone_list, sobriety_date, sobriety_public')
    .eq('user_id', id)
    .maybeSingle();

  const payload: AlumniProfilePayload = {
    userId: user.id as string,
    fullName: (user.full_name as string | null) ?? null,
    avatarUrl: (user.avatar_url as string | null) ?? null,
    jobTitle: (user.job_title as string | null) ?? null,
    city: profile?.city ?? null,
    state: profile?.state ?? null,
    bio: profile?.bio ?? null,
    interests: Array.isArray(profile?.interests) ? (profile!.interests as string[]) : [],
    availableFor: Array.isArray(profile?.available_for) ? (profile!.available_for as string[]) : [],
    phone: profile?.phone_visible ? (profile?.phone ?? null) : null,
    email: profile?.email_visible ? (profile?.email_for_alumni ?? null) : null,
    sobrietyDate: profile?.sobriety_public ? (profile?.sobriety_date ?? null) : null,
    sobrietyLabel: profile?.sobriety_public ? soberMilestoneLabel(profile?.sobriety_date ?? null) : null,
    onMap: profile?.on_map === true,
    onPhoneList: profile?.on_phone_list === true,
    lastSeenAt: (user.last_seen_at as string | null) ?? null,
    lastSignIn: (user.last_sign_in as string | null) ?? null,
  };

  return NextResponse.json(payload);
}
