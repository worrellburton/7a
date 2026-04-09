'use client';

import { useAuth } from '@/lib/AuthProvider';
import { getAuthToken } from '@/lib/db';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Call {
  id: number;
  name: string;
  caller_number: string;
  caller_number_formatted: string;
  tracking_number: string;
  tracking_number_formatted: string;
  receiving_number: string;
  receiving_number_formatted: string;
  duration: number;
  talk_time: number;
  ring_time: number;
  direction: string;
  source: string;
  source_name: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  called_at: string;
  tracking_label: string;
  audio: string;
  tag_list: string[];
  status: string;
  voicemail: boolean;
  first_call: boolean;
  business_number: string;
  score: number | null;
  notes: string;
}

interface CTMResponse {
  calls?: Call[];
  total_entries?: number;
  total_pages?: number;
  page?: number;
  per_page?: number;
  error?: string;
}

type Tab = 'calls' | 'sources';

async function ctmFetch(endpoint: string, params?: Record<string, string | number>): Promise<CTMResponse> {
  const token = getAuthToken();
  const res = await fetch('/api/ctm', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, params }),
  });
  return res.json();
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Phoenix' });
  } catch { return dateStr; }
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });
  } catch { return ''; }
}

const directionStyle: Record<string, string> = {
  inbound: 'bg-emerald-50 text-emerald-700',
  outbound: 'bg-blue-50 text-blue-700',
};

export default function CallsContent() {
  const { user, session } = useAuth();
  const [tab, setTab] = useState<Tab>('calls');
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('all');
  const [sources, setSources] = useState<{ name: string; count: number }[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Discover account ID first
  useEffect(() => {
    if (!session?.access_token) return;
    async function discoverAccount() {
      // CTM accounts endpoint to get the account ID
      const data = await ctmFetch('/accounts.json');
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      // The response might be an array of accounts or a single account
      const accounts = (data as Record<string, unknown>).accounts as { id: number }[] | undefined;
      if (accounts && accounts.length > 0) {
        setAccountId(String(accounts[0].id));
      } else if ((data as Record<string, unknown>).id) {
        setAccountId(String((data as Record<string, unknown>).id));
      } else {
        // Try common pattern: the response itself might list calls
        setError('Could not determine CTM account ID. Check API credentials.');
        setLoading(false);
      }
    }
    discoverAccount();
  }, [session]);

  const fetchCalls = useCallback(async (p: number) => {
    if (!accountId) return;
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = { page: p, per_page: 25 };
    if (searchQuery) params.search = searchQuery;
    if (dateFilter) params.start_date = dateFilter;
    if (directionFilter !== 'all') params.direction = directionFilter;

    const data = await ctmFetch(`/accounts/${accountId}/calls.json`, params);

    if (data.error) {
      setError(data.error);
      setLoading(false);
      return;
    }

    if (data.calls) {
      setCalls(data.calls);
      setTotalPages(data.total_pages || 1);
      setTotalEntries(data.total_entries || 0);
      setPage(data.page || p);

      // Build sources summary
      const sourceMap = new Map<string, number>();
      data.calls.forEach((c: Call) => {
        const src = c.source_name || c.source || 'Unknown';
        sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
      });
      setSources(Array.from(sourceMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count));
    }

    setLoading(false);
  }, [accountId, searchQuery, dateFilter, directionFilter]);

  useEffect(() => {
    if (accountId) fetchCalls(1);
  }, [accountId, fetchCalls]);

  const playRecording = (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingAudio(null);
    audio.play();
    audioRef.current = audio;
    setPlayingAudio(url);
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Calls</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Call tracking powered by CTM
            {totalEntries > 0 && <span> &middot; {totalEntries.toLocaleString()} total calls</span>}
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 mb-6">
          <p className="text-sm text-red-700 font-medium">CTM API Error</p>
          <p className="text-xs text-red-500 mt-1" style={{ fontFamily: 'var(--font-body)' }}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-warm-bg rounded-xl p-1 w-fit">
        {(['calls', 'sources'] as Tab[]).map(t => {
          const label = t === 'calls' ? 'Call Log' : 'Sources';
          return (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'}`} style={{ fontFamily: 'var(--font-body)' }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      {tab === 'calls' && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchCalls(1); }}
            placeholder="Search calls..."
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-100 bg-white focus:outline-none focus:border-primary w-48"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <input
            type="date"
            value={dateFilter}
            onChange={e => { setDateFilter(e.target.value); }}
            className="px-3 py-1.5 rounded-lg text-sm border border-gray-100 bg-white focus:outline-none focus:border-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <div className="relative">
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/70 focus:outline-none focus:border-primary cursor-pointer"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound</option>
              <option value="outbound">Outbound</option>
            </select>
            <svg className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
          </div>
          <button onClick={() => fetchCalls(1)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-foreground text-white hover:bg-foreground/80 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            Search
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Call Log Tab */}
      {tab === 'calls' && !loading && (
        <>
          {calls.length === 0 && !error ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
              <svg className="w-12 h-12 mx-auto text-foreground/15 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No calls found</p>
            </div>
          ) : calls.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-warm-bg/50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Date / Time</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Caller</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Direction</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Source</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Duration</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Location</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Recording</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map(call => {
                      const expanded = expandedId === call.id;
                      return (
                        <tr key={call.id} onClick={() => setExpandedId(expanded ? null : call.id)} className="border-b border-gray-50 hover:bg-warm-bg/20 transition-colors cursor-pointer">
                          <td className="px-5 py-3.5">
                            <div className="text-sm font-medium text-foreground whitespace-nowrap">{formatDate(call.called_at)}</div>
                            <div className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{formatTime(call.called_at)}</div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="text-sm font-medium text-foreground">{call.caller_number_formatted || call.caller_number || 'Unknown'}</div>
                            {call.name && call.name !== 'Unknown' && <div className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>{call.name}</div>}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${directionStyle[call.direction] || 'bg-gray-100 text-gray-600'}`}>
                              {call.direction || 'unknown'}
                            </span>
                            {call.voicemail && <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ml-1">VM</span>}
                            {call.first_call && <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ml-1">1st</span>}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-foreground/60 max-w-[180px] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                            {call.source_name || call.source || '—'}
                          </td>
                          <td className="px-5 py-3.5 text-sm font-mono text-foreground whitespace-nowrap">
                            {formatDuration(call.duration)}
                          </td>
                          <td className="px-5 py-3.5 text-sm text-foreground/50 whitespace-nowrap hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>
                            {[call.city, call.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                            {call.audio ? (
                              <button
                                onClick={() => playRecording(call.audio)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${playingAudio === call.audio ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                                style={{ fontFamily: 'var(--font-body)' }}
                              >
                                {playingAudio === call.audio ? (
                                  <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>Stop</>
                                ) : (
                                  <><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>Play</>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-foreground/20">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3.5">
                            <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-warm-bg/30">
                  <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    Page {page} of {totalPages} &middot; {totalEntries.toLocaleString()} calls
                  </p>
                  <div className="flex items-center gap-1">
                    <button disabled={page <= 1} onClick={() => fetchCalls(page - 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/60 hover:bg-warm-bg disabled:opacity-30 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Prev</button>
                    <button disabled={page >= totalPages} onClick={() => fetchCalls(page + 1)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-100 text-foreground/60 hover:bg-warm-bg disabled:opacity-30 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Sources Tab */}
      {tab === 'sources' && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {sources.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Load calls first to see source breakdown</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-warm-bg/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Source</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Calls</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(s => {
                    const pct = totalEntries > 0 ? Math.round((s.count / calls.length) * 100) : 0;
                    return (
                      <tr key={s.name} className="border-b border-gray-50">
                        <td className="px-5 py-3.5 text-sm font-medium text-foreground">{s.name}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-foreground">{s.count}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-warm-bg rounded-full max-w-[120px]">
                              <div className="h-2 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-foreground/40 w-8" style={{ fontFamily: 'var(--font-body)' }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
