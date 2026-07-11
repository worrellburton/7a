import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET /api/contacts/quick-log-context
//
// Slim payload backing the shared Quick Log sheet (src/app/feather/
// QuickLog.tsx) on surfaces that don't already hold the contacts
// roster in memory (home Create menu, /feather/logs header):
//
//   roster  — every contact's id / name / company / last-touch pair,
//             for the combobox suggestions + match line. Deliberately
//             excludes phone / email / notes: the sheet only needs
//             enough to disambiguate two people with the same name.
//   recents — the signed-in rep's 5 most recently logged DISTINCT
//             contacts, for the zero-typing "Recent" chip row.
//
// Staff-gated: the roster is admissions PII-adjacent (who we talk
// to), so guest / alumni accounts don't get to enumerate it.

export const dynamic = 'force-dynamic';

interface RosterRow {
  id: string;
  name: string | null;
  company: string | null;
  last_contact_at: string | null;
  last_contact_method: string | null;
}

export async function GET(req: NextRequest) {
  const gate = await requireStaff(req);
  if (gate instanceof NextResponse) return gate;
  const { admin, userId } = gate;

  // Full roster, paginated past PostgREST's 1000-row default cap.
  const PAGE = 1000;
  const rosterRows: RosterRow[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('contacts')
      .select('id, name, company, last_contact_at, last_contact_method')
      .order('name', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const chunk = (data ?? []) as RosterRow[];
    rosterRows.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  const byId = new Map(rosterRows.map((r) => [r.id, r]));

  // My most recent distinct contacts — pull a generous window of my
  // latest logs and dedupe down to 5 people.
  const { data: recentLogs, error: recentErr } = await admin
    .from('contact_logs')
    .select('contact_id, contacted_at, method')
    .eq('contacted_by', userId)
    .order('contacted_at', { ascending: false })
    .limit(60);
  if (recentErr) return NextResponse.json({ error: recentErr.message }, { status: 500 });

  const seen = new Set<string>();
  const recents: Array<{ id: string; name: string; company: string | null; lastAt: string; lastMethod: string | null }> = [];
  for (const l of recentLogs ?? []) {
    if (!l.contact_id || seen.has(l.contact_id)) continue;
    seen.add(l.contact_id);
    const c = byId.get(l.contact_id);
    if (!c?.name) continue;
    recents.push({
      id: c.id,
      name: c.name,
      company: c.company,
      lastAt: l.contacted_at,
      lastMethod: l.method,
    });
    if (recents.length >= 5) break;
  }

  return NextResponse.json({
    roster: rosterRows
      .filter((r): r is RosterRow & { name: string } => !!r.name)
      .map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company,
        lastAt: r.last_contact_at,
        lastMethod: r.last_contact_method,
      })),
    recents,
  });
}
