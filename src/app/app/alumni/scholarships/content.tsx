'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Scholarship {
  id: string;
  name: string;
  description: string | null;
  eligibility: string | null;
  deadline: string | null;
  contact_email: string | null;
}

export default function ScholarshipsContent() {
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('alumni_scholarships')
      .select('id, name, description, eligibility, deadline, contact_email')
      .eq('is_active', true)
      .order('deadline', { ascending: true, nullsFirst: false });
    setRows((data ?? []) as Scholarship[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Scholarships</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Help with what comes after treatment.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-xl">
          Continuing-care, education, and sober-living awards from Seven Arrows + partner foundations.
          Contact the coordinator listed on each card for next steps.
        </p>
      </header>

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 bg-warm-bg/40 px-6 py-10 text-center">
          <p className="text-3xl mb-2" aria-hidden="true">🎓</p>
          <p className="text-[13px] text-foreground/60">No active scholarships yet. We&rsquo;ll publish them here as they open.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {rows.map((s) => (
            <article key={s.id} className="rounded-2xl border border-primary/20 bg-white p-5">
              <h2 className="text-[16px] font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</h2>
              {s.description && <p className="mt-2 text-[13px] text-foreground/70 leading-relaxed">{s.description}</p>}
              {s.eligibility && (
                <p className="mt-2 text-[12px] text-foreground/55">
                  <strong className="text-foreground/75 font-semibold">Eligibility: </strong>{s.eligibility}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-[11.5px]">
                {s.deadline ? (
                  <span className="text-foreground/55">
                    Deadline: <span className="font-semibold text-foreground/75">{new Date(s.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </span>
                ) : <span className="text-foreground/45">Rolling</span>}
                {s.contact_email && (
                  <a href={`mailto:${s.contact_email}`} className="text-primary font-semibold hover:underline">Apply →</a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
