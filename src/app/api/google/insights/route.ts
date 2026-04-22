import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ga4Run, gscSearchAnalytics, hasGoogleOAuth } from '@/lib/google';

// GET /api/google/insights?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Admin-only. Compares current range to previous equal-length range across
// several dimensions and emits structured findings for the UI to render as
// "what's working" / "needs improvement".

export const dynamic = 'force-dynamic';

interface Finding {
  kind: 'working' | 'needs';
  category: 'traffic' | 'seo' | 'engagement' | 'conversion' | 'content';
  headline: string;
  detail: string;
  metric?: { label: string; value: string };
  delta?: number; // -1..+∞, as a ratio (not percentage points)
  action?: string; // suggested next step
}

function parseIsoUtc(dateStr: string): Date {
  const [yy, mo, dd] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(yy, mo - 1, dd));
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, delta: number): string {
  const d = parseIsoUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + delta);
  return iso(d);
}

function diffDays(startStr: string, endStr: string): number {
  return (
    Math.round(
      (parseIsoUtc(endStr).getTime() - parseIsoUtc(startStr).getTime()) / (24 * 60 * 60 * 1000)
    ) + 1
  );
}

function pct(curr: number, prev: number): number | null {
  if (!prev) return null;
  return (curr - prev) / prev;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtPctStr(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

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
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  }

  const len = diffDays(startDate, endDate);
  const prevEnd = addDays(startDate, -1);
  const prevStart = addDays(prevEnd, -(len - 1));

  const findings: Finding[] = [];

  try {
    // 1. Top-line GA4 compare (sessions, users, conv rate, bounce, engagement)
    const [curTop, prevTop, curChan, prevChan, curPages, prevPages] = await Promise.all([
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
          { name: 'keyEvents' },
          { name: 'averageSessionDuration' },
        ],
      }),
      ga4Run({
        dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
        metrics: [
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'engagementRate' },
          { name: 'bounceRate' },
          { name: 'keyEvents' },
          { name: 'averageSessionDuration' },
        ],
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10,
      }),
      ga4Run({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'bounceRate' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 30,
      }),
      ga4Run({
        dateRanges: [{ startDate: prevStart, endDate: prevEnd }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 50,
      }),
    ]);

    const c = curTop.rows?.[0]?.metricValues ?? [];
    const p = prevTop.rows?.[0]?.metricValues ?? [];
    const cur = {
      sessions: Number(c[0]?.value ?? 0),
      activeUsers: Number(c[1]?.value ?? 0),
      engagementRate: Number(c[2]?.value ?? 0),
      bounceRate: Number(c[3]?.value ?? 0),
      keyEvents: Number(c[4]?.value ?? 0),
      avgDuration: Number(c[5]?.value ?? 0),
    };
    const prv = {
      sessions: Number(p[0]?.value ?? 0),
      activeUsers: Number(p[1]?.value ?? 0),
      engagementRate: Number(p[2]?.value ?? 0),
      bounceRate: Number(p[3]?.value ?? 0),
      keyEvents: Number(p[4]?.value ?? 0),
      avgDuration: Number(p[5]?.value ?? 0),
    };

    // Sessions direction
    const sessDelta = pct(cur.sessions, prv.sessions);
    if (sessDelta !== null && Math.abs(sessDelta) >= 0.05) {
      findings.push({
        kind: sessDelta > 0 ? 'working' : 'needs',
        category: 'traffic',
        headline:
          sessDelta > 0
            ? `Sessions up ${fmtPctStr(sessDelta)} vs previous period`
            : `Sessions down ${fmtPctStr(Math.abs(sessDelta))} vs previous period`,
        detail: `${fmt(cur.sessions)} sessions this range vs ${fmt(prv.sessions)} last range.`,
        delta: sessDelta,
        action:
          sessDelta > 0
            ? 'Double down on channels that grew (see Acquisition).'
            : 'Check Acquisition for which channels dropped and why.',
      });
    }

    // Engagement rate
    const engDelta = pct(cur.engagementRate, prv.engagementRate);
    if (engDelta !== null && Math.abs(engDelta) >= 0.03) {
      findings.push({
        kind: engDelta > 0 ? 'working' : 'needs',
        category: 'engagement',
        headline:
          engDelta > 0
            ? `Engagement up — visitors are spending more time`
            : `Engagement rate dropped`,
        detail: `${fmtPctStr(cur.engagementRate)} now vs ${fmtPctStr(prv.engagementRate)} before.`,
        delta: engDelta,
        action:
          engDelta > 0
            ? 'Whatever content changes you made are working — keep going.'
            : 'Review high-bounce landing pages in Pages → High bounce.',
      });
    }

    // Bounce rate (inverse)
    const bounceDelta = pct(cur.bounceRate, prv.bounceRate);
    if (bounceDelta !== null && Math.abs(bounceDelta) >= 0.05) {
      findings.push({
        kind: bounceDelta < 0 ? 'working' : 'needs',
        category: 'engagement',
        headline:
          bounceDelta < 0
            ? 'Bounce rate is improving'
            : 'Bounce rate is climbing',
        detail: `${fmtPctStr(cur.bounceRate)} now vs ${fmtPctStr(prv.bounceRate)} before.`,
        delta: bounceDelta,
        action:
          bounceDelta < 0
            ? 'Pages are doing their job holding attention.'
            : 'Triage by channel in Acquisition — one source may be bringing unqualified traffic.',
      });
    }

    // Conversions
    const convDelta = pct(cur.keyEvents, prv.keyEvents);
    if (convDelta !== null && Math.abs(convDelta) >= 0.1) {
      findings.push({
        kind: convDelta > 0 ? 'working' : 'needs',
        category: 'conversion',
        headline:
          convDelta > 0
            ? `Key events up ${fmtPctStr(convDelta)}`
            : `Key events down ${fmtPctStr(Math.abs(convDelta))}`,
        detail: `${fmt(cur.keyEvents)} now vs ${fmt(prv.keyEvents)} before.`,
        delta: convDelta,
        action:
          convDelta > 0
            ? 'Conversions are the scoreboard — see Conversions for which landing pages helped.'
            : 'Compare landing pages side-by-side in Conversions → By landing page.',
      });
    }

    // Channel movers
    const prevChanMap = new Map(
      (prevChan.rows ?? []).map((r) => [
        r.dimensionValues?.[0]?.value ?? '',
        Number(r.metricValues?.[0]?.value ?? 0),
      ])
    );
    for (const r of curChan.rows ?? []) {
      const name = r.dimensionValues?.[0]?.value ?? '';
      const curSess = Number(r.metricValues?.[0]?.value ?? 0);
      const prevSess = prevChanMap.get(name) ?? 0;
      if (curSess < 100 && prevSess < 100) continue; // low-volume noise
      const d = pct(curSess, prevSess);
      if (d === null || Math.abs(d) < 0.2) continue;
      findings.push({
        kind: d > 0 ? 'working' : 'needs',
        category: 'traffic',
        headline: `${name} ${d > 0 ? 'surged' : 'fell'} ${fmtPctStr(Math.abs(d))}`,
        detail: `${fmt(prevSess)} → ${fmt(curSess)} sessions.`,
        delta: d,
        action:
          d > 0
            ? `Understand what drove ${name} growth and replicate it.`
            : `Investigate what broke in ${name} — check UTM changes, paid spend, or referrer sites.`,
      });
    }

    // Page movers (biggest gainers/losers with a sessions floor)
    const prevPageMap = new Map(
      (prevPages.rows ?? []).map((r) => [
        r.dimensionValues?.[0]?.value ?? '',
        Number(r.metricValues?.[0]?.value ?? 0),
      ])
    );
    const pageMovers: { path: string; curr: number; prev: number; delta: number }[] = [];
    for (const r of curPages.rows ?? []) {
      const path = r.dimensionValues?.[0]?.value ?? '';
      const curr = Number(r.metricValues?.[0]?.value ?? 0);
      const prev = prevPageMap.get(path) ?? 0;
      if (curr < 50 && prev < 50) continue;
      const d = pct(curr, prev);
      if (d === null) continue;
      pageMovers.push({ path, curr, prev, delta: d });
    }
    const risingPages = pageMovers
      .filter((m) => m.delta >= 0.3)
      .sort((a, b) => b.curr - a.curr)
      .slice(0, 2);
    const fallingPages = pageMovers
      .filter((m) => m.delta <= -0.3)
      .sort((a, b) => b.prev - a.prev)
      .slice(0, 2);
    for (const m of risingPages) {
      findings.push({
        kind: 'working',
        category: 'content',
        headline: `${m.path || '/'} gained ${fmtPctStr(m.delta)} in views`,
        detail: `${fmt(m.prev)} → ${fmt(m.curr)} page views.`,
        delta: m.delta,
        action: 'See if there are similar pages you can lift with the same treatment.',
      });
    }
    for (const m of fallingPages) {
      findings.push({
        kind: 'needs',
        category: 'content',
        headline: `${m.path || '/'} lost ${fmtPctStr(Math.abs(m.delta))} of views`,
        detail: `${fmt(m.prev)} → ${fmt(m.curr)} page views.`,
        delta: m.delta,
        action: 'Check Search Console for lost rankings on this URL, and cross-reference internal links.',
      });
    }

    // 2. Search Console: quick wins
    if (process.env.GSC_SITE_URL) {
      try {
        const gscEnd = (() => {
          const d = new Date();
          d.setUTCDate(d.getUTCDate() - 2);
          return iso(d);
        })();
        const gscStart = addDays(gscEnd, -(len - 1));
        const gscQ = await gscSearchAnalytics({
          startDate: gscStart,
          endDate: gscEnd,
          dimensions: ['query'],
          rowLimit: 500,
        });
        const qs = (gscQ.rows ?? []).map((r) => ({
          query: r.keys?.[0] ?? '',
          clicks: Number(r.clicks ?? 0),
          impressions: Number(r.impressions ?? 0),
          ctr: Number(r.ctr ?? 0),
          position: Number(r.position ?? 0),
        }));
        const quickWins = qs.filter((q) => q.impressions >= 100 && q.position > 10 && q.position <= 20);
        if (quickWins.length) {
          quickWins.sort((a, b) => b.impressions - a.impressions);
          findings.push({
            kind: 'needs',
            category: 'seo',
            headline: `${quickWins.length} page-2 keyword${quickWins.length === 1 ? '' : 's'} ready to push to page 1`,
            detail: `Top: "${quickWins[0].query}" at pos ${quickWins[0].position.toFixed(1)} with ${fmt(quickWins[0].impressions)} impressions.`,
            action: 'Upgrade the ranking page with stronger intent match, internal links, and a dedicated H1.',
          });
        }

        // High-impression, poor-CTR
        const lowCtr = qs
          .filter((q) => q.impressions >= 500 && q.position <= 10 && q.ctr < 0.02)
          .sort((a, b) => b.impressions - a.impressions);
        if (lowCtr.length) {
          findings.push({
            kind: 'needs',
            category: 'seo',
            headline: `${lowCtr.length} top-10 keyword${lowCtr.length === 1 ? '' : 's'} with weak click-through`,
            detail: `E.g. "${lowCtr[0].query}" — pos ${lowCtr[0].position.toFixed(1)}, only ${fmtPctStr(lowCtr[0].ctr)} CTR.`,
            action: 'Rewrite the title tag and meta description — you have impressions, you\'re just losing the click.',
          });
        }
      } catch {
        // GSC is optional — swallow any error so the rest of insights still loads.
      }
    }

    // Stable order: working first, then needs. Within each, biggest absolute
    // delta first (nulls last).
    findings.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'working' ? -1 : 1;
      return Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0);
    });

    return NextResponse.json({
      range: { startDate, endDate, previousStart: prevStart, previousEnd: prevEnd },
      findings,
      fetched_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
