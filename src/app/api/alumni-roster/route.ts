import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase, getUserFromRequest } from '@/lib/supabase-server';

// GET /api/alumni-roster
//
// Roster of every user_kind='alumni' row with their alumni_profiles
// fields joined in. Powers /app/alumni-roster, which is a
// cross-portal page:
//
//   * Staff (super admin / admin / alumni admin) get every field
//     raw so they can spot incomplete profiles, stale sobriety
//     dates, missing opt-ins, etc.
//   * Alumni get a privacy-filtered view: per-row visibility flags
//     (phone_visible, email_visible, sobriety_public) are honored,
//     and admin-only fields (status, last_sign_in, last_seen_at)
//     are dropped entirely.
//
// Any user_kind other than alumni who isn't on one of those staff
// roles gets 403.
//
// One round-trip, no pagination — alumni count is small (tens, not
// thousands), so client-side sort + search is faster than refetching.

export const dynamic = 'force-dynamic';

interface RosterRow {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  createdAt: string;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  availableFor: string[];
  phone: string | null;
  emailForAlumni: string | null;
  sobrietyDate: string | null;
  sobrietyPublic: boolean;
  trackSobriety: boolean;
  onMap: boolean;
  onPhoneList: boolean;
  phoneVisible: boolean;
  emailVisible: boolean;
  textOk: boolean;
  checkInStreak: number;
  lastCheckInAt: string | null;
  profileUpdatedAt: string | null;
  // Admin-only fields — null in alumni mode so the client renders
  // empty cells / hides the corresponding columns.
  email: string | null;
  status: 'active' | 'on_hold' | 'denied' | null;
  lastSignIn: string | null;
  lastSeenAt: string | null;
}

export async function GET(req: NextRequest) {
  const caller = await getUserFromRequest(req);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdminSupabase();
  const { data: callerRow } = await admin
    .from('users')
    .select('is_admin, is_super_admin, is_alumni_admin, user_kind')
    .eq('id', caller.id)
    .maybeSingle();

  const isStaffAdmin =
    callerRow?.is_super_admin === true ||
    callerRow?.is_admin === true ||
    callerRow?.is_alumni_admin === true;
  const isAlumni = callerRow?.user_kind === 'alumni';
  if (!isStaffAdmin && !isAlumni) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Two parallel reads — users + alumni_profiles. A LEFT JOIN via
  // PostgREST nested select would work too, but two indexed point
  // queries are cheaper than the nested-select planner cost at this
  // table size, and the join logic is trivial.
  const [usersRes, profilesRes] = await Promise.all([
    admin
      .from('users')
      .select('id, full_name, email, avatar_url, job_title, status, created_at, last_sign_in, last_seen_at')
      .eq('user_kind', 'alumni')
      .order('created_at', { ascending: false }),
    admin
      .from('alumni_profiles')
      .select('user_id, city, state, bio, interests, available_for, phone, email_for_alumni, sobriety_date, sobriety_public, track_sobriety, on_map, on_phone_list, phone_visible, email_visible, text_ok, check_in_streak, last_check_in_at, updated_at'),
  ]);

  if (usersRes.error) {
    return NextResponse.json({ error: usersRes.error.message }, { status: 500 });
  }

  type ProfileRow = {
    user_id: string;
    city: string | null;
    state: string | null;
    bio: string | null;
    interests: string[] | null;
    available_for: string[] | null;
    phone: string | null;
    email_for_alumni: string | null;
    sobriety_date: string | null;
    sobriety_public: boolean | null;
    track_sobriety: boolean | null;
    on_map: boolean | null;
    on_phone_list: boolean | null;
    phone_visible: boolean | null;
    email_visible: boolean | null;
    text_ok: boolean | null;
    check_in_streak: number | null;
    last_check_in_at: string | null;
    updated_at: string | null;
  };

  const profileByUserId = new Map<string, ProfileRow>();
  for (const p of (profilesRes.data ?? []) as ProfileRow[]) {
    profileByUserId.set(p.user_id, p);
  }

  type UserRow = {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    job_title: string | null;
    status: 'active' | 'on_hold' | 'denied' | null;
    created_at: string;
    last_sign_in: string | null;
    last_seen_at: string | null;
  };

  const mode: 'admin' | 'alumni' = isStaffAdmin ? 'admin' : 'alumni';

  const rows: RosterRow[] = ((usersRes.data ?? []) as UserRow[]).map((u) => {
    const p = profileByUserId.get(u.id);
    // Apply per-row privacy opt-ins for an alumni viewer; admins
    // see everything raw. Sobriety, phone, email all gate on the
    // alum's own visibility flag.
    const showPhone = isStaffAdmin || p?.phone_visible === true;
    const showEmail = isStaffAdmin || p?.email_visible === true;
    const showSobriety = isStaffAdmin || p?.sobriety_public === true;
    return {
      id: u.id,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      jobTitle: u.job_title,
      createdAt: u.created_at,
      city: p?.city ?? null,
      state: p?.state ?? null,
      bio: p?.bio ?? null,
      interests: Array.isArray(p?.interests) ? (p!.interests as string[]) : [],
      availableFor: Array.isArray(p?.available_for) ? (p!.available_for as string[]) : [],
      phone: showPhone ? (p?.phone ?? null) : null,
      emailForAlumni: showEmail ? (p?.email_for_alumni ?? null) : null,
      sobrietyDate: showSobriety ? (p?.sobriety_date ?? null) : null,
      sobrietyPublic: p?.sobriety_public === true,
      trackSobriety: p?.track_sobriety === true,
      onMap: p?.on_map === true,
      onPhoneList: p?.on_phone_list === true,
      phoneVisible: p?.phone_visible === true,
      emailVisible: p?.email_visible === true,
      textOk: p?.text_ok === true,
      checkInStreak: typeof p?.check_in_streak === 'number' ? p!.check_in_streak : 0,
      lastCheckInAt: p?.last_check_in_at ?? null,
      profileUpdatedAt: p?.updated_at ?? null,
      // Admin-only fields — null in alumni mode.
      email: isStaffAdmin ? u.email : null,
      status: isStaffAdmin ? u.status : null,
      lastSignIn: isStaffAdmin ? u.last_sign_in : null,
      lastSeenAt: isStaffAdmin ? u.last_seen_at : null,
    };
  });

  return NextResponse.json({ mode, rows });
}
