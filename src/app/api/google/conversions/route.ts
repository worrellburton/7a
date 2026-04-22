import { NextResponse } from 'next/server';
import { getServerSupabase, getAdminSupabase } from '@/lib/supabase-server';
import { ga4Run, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/conversions?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Joins GA4 engagement + key events with CTM calls + Supabase
// admissions to produce the conversions dashboard:
//   - funnel:         sessions → engaged → key events → calls → admissions
//   - events:         key-event breakdown by event name
//   - byChannel:      conv rate + key events per channel
//   - byLandingPage:  conv rate + key events per landing page (top 15)
//   - callTrends:     inbound call volume from the calls table

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: row } = await supabase.from('users').select('is_admin').eq('id', user.id).maybeSingle();
  if (!row?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (!hasGoogleOAuth() || !process.env.GA4_PROPERTY_ID) {
    return NextResponse.json({ error: 'GA4 not configured' }, { status: 412 });
  }

  const url = new URL(req.url);
  const startDate = url.searchParams.get('startDate') || '30daysAgo';
  const endDate = url.searchParams.get('endDate') || 'today';

  try {
    // Top-line engagement + key event totals
    const totalsReq = ga4Run({
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'keyEvents' },
        { name: 'activeUsers' },
      ],
    });

    const eventsReq = ga4Run({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'eventCountPerUser' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 40,
    });

    const byChannelReq = ga4Run({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'keyEvents' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [{ metric: { metricName: 'keyEvents' }, desc: true }],
      limit: 10,
    });

    const byLandingReq = ga4Run({
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'keyEvents' },
        { name: 'sessionKeyEventRate' },
      ],
      orderBys: [{ metric: { metricName: 'keyEvents' }, desc: true }],
      limit: 20,
    });

    // Supabase query: inbound calls in the date range, daily + total.
    // We use the admin client to bypass RLS — the route already gates on is_admin above.
    const admin = getAdminSupabase();
    const callsPromise = (async () => {
      // Phoenix offset: 07:00 UTC = 00:00 Phoenix
      const startIso = `${startDate}T07:00:00.000Z`;
      const endIso = `${addDaysIso(endDate, 1)}T06:59:59.999Z`;

      const { data: calls, error } = await admin
        .from('calls')
        .select('called_at, direction, duration, source')
        .gte('called_at', startIso)
        .lte('called_at', endIso)
        .limit(5000);
      if (error) throw new Error(`calls: ${error.message}`);
      return calls ?? [];
    })();

    const [totalsRes, eventsRes, byChannelRes, byLandingRes, callsRaw] = await Promise.all([
      totalsReq,
      eventsReq,
      byChannelReq,
      byLandingReq,
      callsPromise.catch(() => [] as Array<{ called_at: string; direction: string | null; duration: number | null; source: string | null }>),
    ]);

    const t = totalsRes.rows?.[0]?.metricValues ?? [];
    const summary = {
      sessions: Number(t[0]?.value ?? 0),
      engagedSessions: Number(t[1]?.value ?? 0),
      keyEvents: Number(t[2]?.value ?? 0),
      activeUsers: Number(t[3]?.value ?? 0),
    };

    // Calls: inbound only, count + unique callers (by normalized source)
    const inboundCalls = (callsRaw as { called_at: string; direction: string | null; duration: number | null; source: string | null }[])
      .filter((c) => (c.direction || '').toLowerCase() === 'inbound');
    const totalInbound = inboundCalls.length;
    const answeredInbound = inboundCalls.filter((c) => (c.duration ?? 0) > 0).length;

    const events = (eventsRes.rows ?? []).map((r) => ({
      name: r.dimensionValues?.[0]?.value ?? 'unknown',
      count: Number(r.metricValues?.[0]?.value ?? 0),
      perUser: Number(r.metricValues?.[1]?.value ?? 0),
      activeUsers: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    // Interesting events: tap-to-call, form submit, scroll, file download, etc.
    const KEY_EVENT_PATTERNS = [
      /^click$/i,
      /^generate_lead$/i,
      /^form_/i,
      /^submit/i,
      /^click_phone/i,
      /^tel_/i,
      /^phone/i,
      /^cta/i,
      /_click$/i,
      /_submit$/i,
      /^purchase$/i,
      /^sign_up$/i,
      /^download/i,
    ];
    const keyEventCandidates = events.filter((e) =>
      KEY_EVENT_PATTERNS.some((rx) => rx.test(e.name))
    );

    const byChannel = (byChannelRes.rows ?? []).map((r) => ({
      channel: r.dimensionValues?.[0]?.value ?? 'unknown',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      keyEvents: Number(r.metricValues?.[1]?.value ?? 0),
      conversionRate: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    const byLanding = (byLandingRes.rows ?? []).map((r) => ({
      path: r.dimensionValues?.[0]?.value ?? '',
      sessions: Number(r.metricValues?.[0]?.value ?? 0),
      keyEvents: Number(r.metricValues?.[1]?.value ?? 0),
      conversionRate: Number(r.metricValues?.[2]?.value ?? 0),
    }));

    // Daily calls trend (for chart). Bucket by Phoenix date.
    const callsDaily = new Map<string, number>();
    for (const c of inboundCalls) {
      const d = new Date(c.called_at);
      const localDate = d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
      callsDaily.set(localDate, (callsDaily.get(localDate) ?? 0) + 1);
    }
    const callTrend = Array.from(callsDaily.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Funnel
    const funnel = [
      { stage: 'Sessions', value: summary.sessions },
      { stage: 'Engaged sessions', value: summary.engagedSessions },
      { stage: 'Key events', value: summary.keyEvents },
      { stage: 'Inbound calls', value: totalInbound },
      { stage: 'Answered calls', value: answeredInbound },
    ];

    return NextResponse.json({
      range: { startDate, endDate },
      summary: {
        ...summary,
        inboundCalls: totalInbound,
        answeredCalls: answeredInbound,
        answerRate: totalInbound ? answeredInbound / totalInbound : 0,
        convRate: summary.sessions ? summary.keyEvents / summary.sessions : 0,
      },
      funnel,
      events,
      keyEventCandidates,
      byChannel,
      byLanding,
      callTrend,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function addDaysIso(dateStr: string, delta: number): string {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(yy, mo - 1, dd));
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
