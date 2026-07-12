import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/api-gates';

// GET /api/contacts/log-sheet
//
// Compact count matrix for the /feather/logs/sheet grid: log method
// × Phoenix calendar month for the current year. Replaces the old
// approach of pulling every hydrated log of the year to the client
// just to count them — this reads only (method, contacted_at),
// buckets server-side, and returns ~a dozen rows of small integers.
// The per-cell touchpoint detail is fetched lazily from the sibling
// /api/contacts/log-sheet/cell route when a cell is opened.
//
// Windowed to [Phoenix Jan 1 00:00, now()]: the upper bound at now()
// means future-dated rows (data-entry typos, scheduled touches) are
// excluded and months after the current one are genuinely empty, so
// the grid's "future = blank" styling is always truthful.

export const dynamic = 'force-dynamic';

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

  const nowIso = new Date().toISOString();
  const todayKey = phoenixDateKey(nowIso);
  const year = todayKey.slice(0, 4);
  const currentMonthIdx = Number(todayKey.slice(5, 7)) - 1;
  const yearStartIso = phoenixMidnight(`${year}-01-01`).toISOString();

  // Narrow paginated read. Order by (contacted_at, id): bulk email
  // campaigns stamp thousands of rows at the identical instant, so
  // `contacted_at` alone is riddled with ties exactly where the page
  // boundary can fall — the unique `id` tiebreaker keeps offset
  // paging from duplicating or dropping rows.
  const PAGE = 1000;
  const rows: Array<{ method: string | null; contacted_at: string }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await admin
      .from('contact_logs')
      .select('method, contacted_at')
      .gte('contacted_at', yearStartIso)
      .lte('contacted_at', nowIso)
      .order('contacted_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const chunk = (data ?? []) as Array<{ method: string | null; contacted_at: string }>;
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
  }

  const byMethod = new Map<string, number[]>();
  for (const r of rows) {
    const key = phoenixDateKey(r.contacted_at);
    if (key.slice(0, 4) !== year) continue;
    const m = Number(key.slice(5, 7)) - 1;
    if (m < 0 || m > 11 || m > currentMonthIdx) continue;
    const method = (r.method || 'Other').trim() || 'Other';
    let counts = byMethod.get(method);
    if (!counts) {
      counts = new Array(12).fill(0);
      byMethod.set(method, counts);
    }
    counts[m] += 1;
  }

  const matrix = Array.from(byMethod.entries())
    .map(([method, counts]) => ({ method, counts, total: counts.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => (a.total !== b.total ? b.total - a.total : a.method.localeCompare(b.method)));

  return NextResponse.json({ today: todayKey, year, currentMonthIdx, rows: matrix });
}
