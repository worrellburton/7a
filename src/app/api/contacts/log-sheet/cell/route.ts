import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET /api/contacts/log-sheet/cell?method=<method>&monthIdx=<0-11>
//
// Hydrated touchpoint detail for a SINGLE cell of the log-sheet grid
// (one method in one Phoenix month of the current year), fetched
// lazily when the rep opens that cell. Keeps the grid's initial load
// tiny — the counts come from /api/contacts/log-sheet, the rows only
// arrive for the cell you actually click into.

export const dynamic = 'force-dynamic';

interface LogRow {
  id: string;
  contact_id: string;
  contacted_by: string | null;
  contacted_at: string;
  duration_seconds: number | null;
  method: string | null;
}
interface UserLite {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}
interface ContactLite {
  id: string;
  name: string | null;
  company: string | null;
}

function phoenixDateKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
}
// Arizona has no DST, so the fixed -07:00 offset is valid year-round.
function phoenixMidnight(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00-07:00`);
}

export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;
  const { admin } = gate;

  const method = req.nextUrl.searchParams.get('method');
  const monthIdx = Number(req.nextUrl.searchParams.get('monthIdx'));
  if (!method) return NextResponse.json({ error: 'method is required' }, { status: 400 });
  if (!Number.isInteger(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return NextResponse.json({ error: 'monthIdx must be 0–11' }, { status: 400 });
  }

  const year = Number(phoenixDateKey(new Date().toISOString()).slice(0, 4));
  const mm = String(monthIdx + 1).padStart(2, '0');
  const monthStartIso = phoenixMidnight(`${year}-${mm}-01`).toISOString();
  const nextY = monthIdx === 11 ? year + 1 : year;
  const nextMm = String(monthIdx === 11 ? 1 : monthIdx + 2).padStart(2, '0');
  const monthEndIso = phoenixMidnight(`${nextY}-${nextMm}-01`).toISOString();

  const { data, error } = await admin
    .from('contact_logs')
    .select('id, contact_id, contacted_by, contacted_at, duration_seconds, method')
    .eq('method', method)
    .gte('contacted_at', monthStartIso)
    .lt('contacted_at', monthEndIso)
    .order('contacted_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const logRows = (data ?? []) as LogRow[];

  // Hydrate the referenced users + contacts in two batched lookups,
  // matching the shape /feather/logs already renders.
  const userIds = Array.from(new Set(logRows.map((l) => l.contacted_by).filter((v): v is string => !!v)));
  const contactIds = Array.from(new Set(logRows.map((l) => l.contact_id).filter((v): v is string => !!v)));
  const [usersRes, contactsRes] = await Promise.all([
    userIds.length > 0
      ? admin.from('users').select('id, full_name, email, avatar_url').in('id', userIds)
      : Promise.resolve({ data: [] as UserLite[] }),
    contactIds.length > 0
      ? admin.from('contacts').select('id, name, company').in('id', contactIds)
      : Promise.resolve({ data: [] as ContactLite[] }),
  ]);
  const usersById = new Map<string, UserLite>(((usersRes.data ?? []) as UserLite[]).map((u) => [u.id, u]));
  const contactsById = new Map<string, ContactLite>(((contactsRes.data ?? []) as ContactLite[]).map((c) => [c.id, c]));

  const logs = logRows.map((l) => {
    const u = l.contacted_by ? usersById.get(l.contacted_by) : null;
    const c = contactsById.get(l.contact_id);
    return {
      id: l.id,
      contactedAt: l.contacted_at,
      method: l.method,
      durationSeconds: l.duration_seconds,
      userId: l.contacted_by,
      userName: u?.full_name?.trim() || u?.email || 'Unknown',
      userAvatarUrl: u?.avatar_url ?? null,
      contactId: l.contact_id,
      contactName: c?.name?.trim() || 'Unknown contact',
      contactCompany: c?.company?.trim() || null,
    };
  });

  return NextResponse.json({ logs });
}
