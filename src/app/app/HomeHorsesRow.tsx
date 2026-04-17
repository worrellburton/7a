'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface HomeHorse {
  id: string;
  name: string;
  image_url: string | null;
  age: number | null;
  weight: number | null;
  works_in: string | null;
  rideable: string | null;
}

interface WeightLog { horse_id: string; weight_lbs: number | null; logged_at: string }
interface FeedLog { horse_id: string; feed_type: string | null; amount: number | null; unit: string | null; logged_at: string }

function fmtRelative(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const hr = ms / 3600000;
  if (hr < 1) return `${Math.max(1, Math.round(ms / 60000))}m ago`;
  if (hr < 24) return `${Math.round(hr)}h ago`;
  const d = hr / 24;
  if (d < 14) return `${Math.round(d)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HomeHorsesRow() {
  const { session } = useAuth();
  const router = useRouter();
  const [horses, setHorses] = useState<HomeHorse[]>([]);
  const [weights, setWeights] = useState<WeightLog[]>([]);
  const [feeds, setFeeds] = useState<FeedLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      const [hs, ws, fs] = await Promise.all([
        db({ action: 'select', table: 'equine', order: { column: 'name', ascending: true } }),
        db({ action: 'select', table: 'equine_weight_logs', order: { column: 'logged_at', ascending: false } }),
        db({ action: 'select', table: 'equine_feed_logs', order: { column: 'logged_at', ascending: false } }),
      ]);
      if (Array.isArray(hs)) setHorses(hs as HomeHorse[]);
      if (Array.isArray(ws)) setWeights(ws as WeightLog[]);
      if (Array.isArray(fs)) setFeeds(fs as FeedLog[]);
      setLoading(false);
    })();
  }, [session]);

  const active = useMemo(
    () => horses.filter((h) => h.image_url && ((h.rideable || '').toLowerCase() !== 'no')),
    [horses]
  );

  const lastWeightFor = (horseId: string): WeightLog | null =>
    weights.find((w) => w.horse_id === horseId) || null;
  const lastFeedFor = (horseId: string): FeedLog | null =>
    feeds.find((f) => f.horse_id === horseId) || null;

  if (loading || active.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 px-4 sm:px-6">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
          Horses on the team
        </p>
        <span className="text-[10px] text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
          {active.length} active
        </span>
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {active.map((h) => {
          const lastWeight = lastWeightFor(h.id);
          const lastFeed = lastFeedFor(h.id);
          return (
            <button
              key={h.id}
              onClick={() => router.push(`/app/equine/${h.id}`)}
              className="relative group"
              title={h.name}
            >
              {h.image_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={h.image_url} alt={h.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm group-hover:ring-2 group-hover:ring-primary/40 transition-all" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-warm-bg flex items-center justify-center text-foreground/50 text-xs font-semibold border-2 border-white shadow-sm">
                  {h.name.charAt(0)}
                </div>
              )}
              <div className="hidden sm:block absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white rounded-xl border border-gray-100 shadow-xl px-3 py-2 min-w-[220px] text-left">
                  <p className="text-sm font-semibold text-foreground whitespace-nowrap">{h.name}</p>
                  <p className="text-[11px] text-foreground/50 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                    {h.age != null ? `${h.age} years` : 'Age unknown'}
                    {h.works_in ? ` · ${h.works_in}` : ''}
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
                    <span className="text-foreground/40">Weight</span>
                    <span className="text-foreground/80 text-right">
                      {lastWeight?.weight_lbs ? `${lastWeight.weight_lbs} lbs` : h.weight ? `${h.weight} lbs` : '—'}
                    </span>
                    <span className="text-foreground/40">Last fed</span>
                    <span className="text-foreground/80 text-right">
                      {lastFeed ? `${lastFeed.amount ?? ''}${lastFeed.unit ? ' ' + lastFeed.unit : ''} ${lastFeed.feed_type || ''} · ${fmtRelative(lastFeed.logged_at)}`.trim() : '—'}
                    </span>
                    {lastWeight && (
                      <>
                        <span className="text-foreground/40">Weighed</span>
                        <span className="text-foreground/80 text-right">{fmtRelative(lastWeight.logged_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
