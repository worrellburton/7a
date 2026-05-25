'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Meetup {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  city: string | null;
  state: string | null;
  region: string | null;
  rsvp_url: string | null;
  survey_url: string | null;
}

export default function MeetupsContent() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('alumni_meetups')
      .select('id, title, description, event_date, event_time, city, state, region, rsvp_url, survey_url')
      .eq('is_published', true)
      .order('event_date', { ascending: true });
    setMeetups((data ?? []) as Meetup[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = meetups.filter((m) => m.event_date >= today);
  const past = meetups.filter((m) => m.event_date < today).reverse();

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Reunions & meetups</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Find each other in person.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-xl">
          The annual reunion plus regional mini-reunions across Arizona. RSVPs go through the link on each card.
        </p>
      </header>

      {loading ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : (
        <>
          <Section title="Upcoming" empty="Nothing scheduled yet. Watch this space — the team posts new dates here as they confirm.">
            {upcoming.map((m) => <MeetupCard key={m.id} m={m} />)}
          </Section>
          {past.length > 0 && (
            <Section title="Past reunions">
              {past.map((m) => <MeetupCard key={m.id} m={m} past />)}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty?: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const hasContent = items.some((c) => c !== null && c !== undefined && c !== false);
  return (
    <section className="mb-8">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55 mb-3">{title}</p>
      {hasContent ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div> : (
        empty && <p className="text-[13px] text-foreground/50 italic">{empty}</p>
      )}
    </section>
  );
}

function MeetupCard({ m, past = false }: { m: Meetup; past?: boolean }) {
  const dateLabel = new Date(m.event_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <article className={`rounded-2xl border p-5 transition-colors ${past ? 'border-black/5 bg-warm-bg/30' : 'border-primary/20 bg-white hover:border-primary/40'}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary mb-1.5">{m.region ?? 'Reunion'}</p>
      <h3 className="text-[16px] font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{m.title}</h3>
      <p className="mt-1 text-[12px] text-foreground/55">
        {dateLabel}{m.event_time ? ` · ${m.event_time}` : ''}
        {(m.city || m.state) && ` · ${[m.city, m.state].filter(Boolean).join(', ')}`}
      </p>
      {m.description && <p className="mt-2 text-[13px] text-foreground/70 leading-relaxed">{m.description}</p>}
      {!past && (m.rsvp_url || m.survey_url) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.rsvp_url && (
            <a href={m.rsvp_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90">
              RSVP →
            </a>
          )}
          {m.survey_url && (
            <a href={m.survey_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-black/10 bg-white text-foreground/75 text-[11.5px] font-semibold hover:bg-warm-bg/60">
              Take the survey
            </a>
          )}
        </div>
      )}
    </article>
  );
}
