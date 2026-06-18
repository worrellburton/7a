import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-gates';
import { aircallFetch, aircallConfigured, type AircallUser } from '@/lib/aircall';

// GET /api/aircall/availability — current Aircall users + their live
// availability_status (available / busy / offline / …). The operator
// schedule header uses this to badge whoever is rostered on phones with
// their real-time phone status. Matched to feather users by email.

interface AircallUsersResponse {
  meta?: { next_page_link?: string | null };
  users?: AircallUser[];
}

export async function GET(req: NextRequest) {
  const gate = await requireUser(req);
  if (gate instanceof NextResponse) return gate;

  if (!aircallConfigured()) {
    // Degrade gracefully — the schedule still renders from the calendar,
    // just without live phone-status badges.
    return NextResponse.json({ users: [], configured: false });
  }

  try {
    const out: { id?: number; name?: string; email?: string; availability_status?: string }[] = [];
    let page = 1;
    while (page <= 10) {
      const resp = await aircallFetch<AircallUsersResponse>('/users', {
        params: { page, per_page: 50 },
      });
      for (const u of resp.users ?? []) {
        out.push({ id: u.id, name: u.name, email: u.email, availability_status: u.availability_status });
      }
      if (!resp.meta?.next_page_link) break;
      page++;
    }
    return NextResponse.json({ users: out, configured: true });
  } catch (err) {
    return NextResponse.json(
      { users: [], configured: true, error: err instanceof Error ? err.message : String(err) },
      { status: 200 },
    );
  }
}
