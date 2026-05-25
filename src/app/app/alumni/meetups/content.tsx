'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
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
  const { user } = useAuth();
  const [proposeOpen, setProposeOpen] = useState(false);

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-4xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/app/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>
      <header className="mt-3 mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">Reunions & meetups</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          Find each other in person.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-xl">
          The annual reunion plus regional mini-reunions across Arizona. RSVPs go through the link on each card.
        </p>
        </div>
        <button
          type="button"
          onClick={() => setProposeOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-white text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/90 shrink-0"
        >
          ➕ Propose a meetup
        </button>
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

      {proposeOpen && user?.id && (
        <ProposeMeetupModal
          userId={user.id}
          onClose={() => setProposeOpen(false)}
          onSubmitted={() => { setProposeOpen(false); void load(); }}
        />
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

function ProposeMeetupModal({ userId, onClose, onSubmitted }: {
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [city, setCity] = useState('');
  const [state, setStateField] = useState('');
  const [region, setRegion] = useState('');
  const [rsvpUrl, setRsvpUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setSaving(true); setError(null);
    try {
      const { error } = await supabase.from('alumni_meetups').insert({
        title: title.trim(),
        description: description.trim() || null,
        event_date: eventDate,
        event_time: eventTime.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        region: region.trim() || null,
        rsvp_url: rsvpUrl.trim() || null,
        is_published: false,
        created_by: userId,
      });
      if (error) throw error;
      setSubmitted(true);
      // Give the success message a beat to read, then close so the
      // page reloads its publish-only meetup list.
      window.setTimeout(onSubmitted, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ fontFamily: 'var(--font-body)' }}>
        <header className="px-5 pt-5 pb-3 border-b border-black/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">Propose a meetup</p>
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>What are you putting on the calendar?</h2>
          <p className="text-[12px] text-foreground/55 mt-1">Submitted proposals go to a staff review before they publish to the meetups page. You&rsquo;ll see them in the moderation queue if you&rsquo;re staff.</p>
        </header>
        <div className="px-5 py-4 space-y-3">
          {submitted ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
              ✓ Submitted for review. Staff will publish or follow up shortly.
            </div>
          ) : (
            <>
              {error && <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>}
              <Field label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Phoenix coffee meetup" className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date">
                  <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
                </Field>
                <Field label="Time (optional)">
                  <input value={eventTime} onChange={(e) => setEventTime(e.target.value)} placeholder="6:00 PM" className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
                </Field>
                <Field label="City">
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Phoenix" className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
                </Field>
                <Field label="State">
                  <input value={state} onChange={(e) => setStateField(e.target.value)} placeholder="AZ" maxLength={20} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
                </Field>
              </div>
              <Field label="Region (optional)">
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Phoenix area" className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
              </Field>
              <Field label="RSVP link (optional)">
                <input type="url" value={rsvpUrl} onChange={(e) => setRsvpUrl(e.target.value)} placeholder="https://…" className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]" />
              </Field>
              <Field label="What are folks gathering for?">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] resize-y" />
              </Field>
            </>
          )}
        </div>
        {!submitted && (
          <footer className="px-5 py-3 border-t border-black/5 flex items-center justify-end gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-md border border-black/10 text-foreground/65 text-[12.5px] font-semibold hover:bg-warm-bg/60">Cancel</button>
            <button onClick={() => void submit()} disabled={saving || !title.trim() || !eventDate}
              className="px-4 py-1.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50">
              {saving ? 'Submitting…' : 'Submit for review'}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">{label}</span>
      {children}
    </label>
  );
}
