'use client';

import { useAuth } from '@/lib/AuthProvider';
import { getAuthToken } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Call {
  id: number;
  caller_number: string;
  caller_number_formatted: string;
  direction: string;
  called_at: string;
  city: string;
  state: string;
  talk_time: number;
  voicemail: boolean;
}

interface ScoreRow {
  caller_name: string | null;
  client_type: string | null;
  fit_score: number | null;
  summary: string;
}

interface Account { id: number }

const MEANINGFUL_THRESHOLD = 60;

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  d = new Date(String(dateStr).replace(' ', 'T').replace(' +', '+').replace(' -', '-'));
  if (!isNaN(d.getTime())) return d;
  const n = Number(dateStr);
  if (n > 1e9 && n < 2e10) return new Date(n * 1000);
  return null;
}

async function ctmFetch(endpoint: string, params?: Record<string, string | number>) {
  const token = getAuthToken();
  const res = await fetch('/api/ctm', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, params }),
  });
  return res.json();
}

function formatTimeAz(d: Date): string {
  try {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
  } catch {
    return '';
  }
}

export default function HomeMeaningfulCallsRow() {
  const { session } = useAuth();
  const router = useRouter();
  const [meaningful, setMeaningful] = useState<Array<{ call: Call; score: ScoreRow }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    let cancelled = false;

    (async () => {
      try {
        // Discover account
        const acctRes = await ctmFetch('/accounts.json');
        const accounts = (acctRes as { accounts?: Account[] })?.accounts;
        if (!accounts || accounts.length === 0) return;
        const accountId = String(accounts[0].id);

        // Today's window (Arizona)
        const todayAz = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
        const start = `${todayAz}T00:00:00-07:00`;
        const end = `${todayAz}T23:59:59-07:00`;

        // Fetch today's calls
        const data = await ctmFetch(`/accounts/${accountId}/calls.json`, {
          page: 1,
          per_page: 100,
          start_date: start,
          end_date: end,
        });
        if (cancelled) return;
        const calls: Call[] = Array.isArray((data as { calls?: Call[] }).calls) ? (data as { calls: Call[] }).calls : [];

        if (calls.length === 0) {
          setMeaningful([]);
          setLoading(false);
          return;
        }

        // Score lookup
        const callIds = calls.map((c) => String(c.id));
        const scoresRes = await fetch('/api/claude/calls/scores-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ callIds }),
        });
        if (cancelled) return;
        if (!scoresRes.ok) {
          setLoading(false);
          return;
        }
        const scoresData = await scoresRes.json();
        const scores: Record<string, ScoreRow> = scoresData.scores || {};

        const out: Array<{ call: Call; score: ScoreRow }> = [];
        for (const c of calls) {
          const s = scores[String(c.id)];
          if (!s) continue;
          if ((s.fit_score ?? 0) >= MEANINGFUL_THRESHOLD) {
            out.push({ call: c, score: s });
          }
        }
        // Most recent first
        out.sort((a, b) => {
          const da = parseDate(a.call.called_at)?.getTime() ?? 0;
          const db = parseDate(b.call.called_at)?.getTime() ?? 0;
          return db - da;
        });
        setMeaningful(out);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [session]);

  if (loading) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 px-4 sm:px-6">
      <div className="flex items-baseline justify-between group relative">
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider inline-flex items-center gap-1.5 cursor-help" style={{ fontFamily: 'var(--font-body)' }}>
          Meaningful calls today
          <svg className="w-3 h-3 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </p>
        <span className="text-[10px] text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
          {meaningful.length} {meaningful.length === 1 ? 'call' : 'calls'}
        </span>
        {/* Header hover tooltip */}
        <div className="absolute left-0 top-full mt-1.5 z-30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-foreground text-white rounded-xl shadow-xl px-3 py-2 max-w-xs">
            <p className="text-[11px] text-white/90" style={{ fontFamily: 'var(--font-body)' }}>
              These are the calls 7A received today that are from potential incoming clients.
            </p>
          </div>
        </div>
      </div>

      {meaningful.length === 0 ? (
        <button
          onClick={() => router.push('/app/calls')}
          className="w-full text-left bg-white rounded-2xl border border-gray-100 px-4 py-3 hover:border-primary/40 hover:shadow-sm transition-all"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <p className="text-xs text-foreground/50">No meaningful calls yet today · open Calls →</p>
        </button>
      ) : (
        <div className="flex items-center gap-2.5 flex-wrap">
          {meaningful.map(({ call, score }) => {
            const d = parseDate(call.called_at);
            const time = d ? formatTimeAz(d) : '';
            const name = score.caller_name || call.caller_number_formatted || call.caller_number || 'Unknown';
            const initial = (name.match(/[A-Za-z]/)?.[0] || '?').toUpperCase();
            const location = [call.city, call.state].filter(Boolean).join(', ');
            return (
              <button
                key={call.id}
                onClick={() => router.push('/app/calls')}
                className="group relative bg-white rounded-full border border-blue-200 shadow-sm pl-1 pr-3 py-1 flex items-center gap-2 hover:shadow-md hover:border-blue-300 transition-all"
                title={name}
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                  {initial}
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-foreground whitespace-nowrap max-w-[140px] truncate">{name}</p>
                  <p className="text-[10px] text-blue-700 font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                    {time}{score.fit_score != null && ` · ${score.fit_score}/100`}
                  </p>
                </div>
                <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white rounded-xl border border-gray-100 shadow-xl px-3 py-2 min-w-[240px] max-w-sm text-left">
                    <p className="text-sm font-semibold text-foreground whitespace-nowrap">{name}</p>
                    <p className="text-[11px] text-foreground/60 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      {time}{location ? ` · ${location}` : ''}
                    </p>
                    {score.client_type && (
                      <p className="text-[11px] text-blue-700 font-semibold mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                        {score.client_type}
                      </p>
                    )}
                    {score.summary && (
                      <p className="text-[11px] text-foreground/70 mt-1.5 line-clamp-3" style={{ fontFamily: 'var(--font-body)' }}>
                        {score.summary}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
