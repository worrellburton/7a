'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';

// Read-only per-alumnus profile renderer. Fetches /api/alumni/profile/[id]
// which already enforces opt-in privacy on phone / email / sobriety.

interface Payload {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  interests: string[];
  availableFor: string[];
  phone: string | null;
  email: string | null;
  sobrietyDate: string | null;
  sobrietyLabel: string | null;
  onMap: boolean;
  onPhoneList: boolean;
  lastSeenAt: string | null;
  lastSignIn: string | null;
}

export default function AlumniProfileViewContent({ userId }: { userId: string }) {
  const { session } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/alumni/profile/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === 'string' ? json.error : 'Could not load profile.');
        return;
      }
      setData(json as Payload);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, userId]);

  useEffect(() => { void load(); }, [load]);

  const location = [data?.city, data?.state].filter(Boolean).join(', ');
  const initial = (data?.fullName || '?').charAt(0).toUpperCase();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">
        &larr; Alumni hub
      </Link>

      {loading ? (
        <p className="mt-6 text-[13px] text-foreground/50">Loading profile…</p>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-[13px] text-red-800">
          {error === 'Not found' ? 'This alumnus does not have a profile yet.' : error}
        </div>
      ) : data ? (
        <>
          {/* Hero — avatar + name + location + sobriety badge */}
          <section className="mt-4 rounded-3xl border border-black/10 bg-white p-6 sm:p-8 flex items-center gap-5 flex-wrap">
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-primary/30"
              />
            ) : (
              <span
                aria-hidden
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 text-primary text-2xl font-bold inline-flex items-center justify-center ring-2 ring-primary/20"
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {data.fullName || 'Alum'}
              </h1>
              {data.jobTitle && <p className="mt-0.5 text-[13.5px] text-foreground/60">{data.jobTitle}</p>}
              {location && <p className="mt-1 text-[13px] text-foreground/55">📍 {location}</p>}
              {data.sobrietyLabel && (
                <p className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] font-semibold">
                  <span aria-hidden>🌱</span>
                  {data.sobrietyLabel}
                </p>
              )}
            </div>
          </section>

          {/* Bio */}
          {data.bio && (
            <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 mb-2">About</p>
              <p className="text-[14px] leading-relaxed text-foreground/85 whitespace-pre-wrap">{data.bio}</p>
            </section>
          )}

          {/* Interests + Available for */}
          {(data.interests.length > 0 || data.availableFor.length > 0) && (
            <section className="mt-5 grid sm:grid-cols-2 gap-4">
              {data.interests.length > 0 && (
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 mb-2">Interests</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {data.interests.map((it) => (
                      <li key={it} className="px-2 py-1 rounded-full bg-warm-bg/60 border border-black/10 text-[12px] text-foreground/75">
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.availableFor.length > 0 && (
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 mb-2">Available for</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {data.availableFor.map((it) => (
                      <li key={it} className="px-2 py-1 rounded-full bg-primary/8 border border-primary/25 text-[12px] text-primary-dark">
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* Contact — only when the alum opted in. Suppress the whole
              card when both phone + email are hidden so we don't render
              an empty "Contact" header. */}
          {(data.phone || data.email) && (
            <section className="mt-5 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-foreground/50 mb-3">Contact</p>
              <div className="flex flex-col gap-2 text-[14px]">
                {data.phone && (
                  <a href={`tel:${data.phone.replace(/[^0-9+]/g, '')}`} className="text-primary font-semibold hover:underline">
                    📞 {data.phone}
                  </a>
                )}
                {data.email && (
                  <a href={`mailto:${data.email}`} className="text-primary font-semibold hover:underline">
                    ✉️ {data.email}
                  </a>
                )}
              </div>
            </section>
          )}
        </>
      ) : null}
    </div>
  );
}
