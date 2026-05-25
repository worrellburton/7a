'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';

// Shared alumni profile editor. Modal-style panel rendered from
// the Alumni hub + every "Add me to…" CTA across the portal.
// One source of truth for opt-ins so a user doesn't have to
// manage on_map / on_phone_list / contact-visibility in three
// different places.
//
// Reads + upserts public.alumni_profiles. Row-level security
// scopes both reads (own row) and writes (auth.uid() = user_id),
// so there's no service-role roundtrip — the supabase browser
// client handles it.

export interface AlumniProfileState {
  sobriety_date: string | null;
  city: string;
  state: string;
  bio: string;
  interests: string[];
  available_for: string[];
  phone: string;
  email_for_alumni: string;
  on_map: boolean;
  on_phone_list: boolean;
  phone_visible: boolean;
  email_visible: boolean;
}

// Curated tag pickers — small enough to fit on a phone, broad
// enough to cover the common "what can you offer / what helps
// you" combinations alumni described in the planning notes.
const INTEREST_OPTIONS = [
  'AA', 'NA', 'CMA', 'Wellbriety', 'SMART Recovery', 'Refuge Recovery',
  'Faith-based', 'Yoga', 'Meditation', 'Recovery coaching',
];
const AVAILABLE_OPTIONS = [
  'Peer support calls', 'Coffee meetups', 'Hiking',
  'Service work', 'Sponsor support', 'Newcomer mentoring',
  'Job/career support', 'Family-program help',
];

const EMPTY: AlumniProfileState = {
  sobriety_date: null,
  city: '', state: '', bio: '',
  interests: [], available_for: [],
  phone: '', email_for_alumni: '',
  on_map: false, on_phone_list: false,
  phone_visible: false, email_visible: false,
};

export default function AlumniProfileEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: (profile: AlumniProfileState) => void;
}) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<AlumniProfileState>(EMPTY);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile({
          sobriety_date: data.sobriety_date ?? null,
          city: data.city ?? '',
          state: data.state ?? '',
          bio: data.bio ?? '',
          interests: Array.isArray(data.interests) ? data.interests : [],
          available_for: Array.isArray(data.available_for) ? data.available_for : [],
          phone: data.phone ?? '',
          email_for_alumni: data.email_for_alumni ?? '',
          on_map: !!data.on_map,
          on_phone_list: !!data.on_phone_list,
          phone_visible: !!data.phone_visible,
          email_visible: !!data.email_visible,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);

  async function save() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        user_id: user.id,
        sobriety_date: profile.sobriety_date || null,
        city: profile.city.trim() || null,
        state: profile.state.trim() || null,
        bio: profile.bio.trim() || null,
        interests: profile.interests,
        available_for: profile.available_for,
        phone: profile.phone.trim() || null,
        email_for_alumni: profile.email_for_alumni.trim() || null,
        on_map: profile.on_map,
        on_phone_list: profile.on_phone_list,
        phone_visible: profile.phone_visible,
        email_visible: profile.email_visible,
      };
      const { error } = await supabase
        .from('alumni_profiles')
        .upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      // Fire-and-mostly-forget geocode. If the user has on_map=true
      // (or might toggle it on later), we need lat/lng for the map
      // page to render their pin. The endpoint is idempotent and
      // short-circuits when city + lat/lng already match, so calling
      // it on every save is cheap. Failure here doesn't roll back
      // the profile save — the map just shows no pin until the
      // next successful geocode.
      if (profile.city) {
        try {
          await fetch('/api/alumni/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city: profile.city, state: profile.state }),
          });
        } catch { /* non-fatal */ }
      }
      onSaved?.(profile);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(list: string[], tag: string): string[] {
    return list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alumni-profile-heading"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <header className="px-5 pt-5 pb-3 border-b border-black/5">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary mb-1">My alumni profile</p>
          <h2 id="alumni-profile-heading" className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            What you share, and with whom
          </h2>
          <p className="text-[12px] text-foreground/55 mt-1">
            Everything below defaults to private. You decide what other alumni see.
          </p>
        </header>

        {loading ? (
          <div className="px-5 py-12 text-center text-[13px] text-foreground/55">Loading…</div>
        ) : (
          <div className="px-5 py-4 space-y-5">
            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</div>
            )}

            {/* Identity basics */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Sobriety date">
                <input
                  type="date"
                  value={profile.sobriety_date ?? ''}
                  onChange={(e) => setProfile((p) => ({ ...p, sobriety_date: e.target.value || null }))}
                  className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]"
                />
              </Field>
              <Field label="City">
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                  placeholder="Sierra Vista"
                  className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]"
                />
              </Field>
              <Field label="State">
                <input
                  type="text"
                  value={profile.state}
                  onChange={(e) => setProfile((p) => ({ ...p, state: e.target.value }))}
                  placeholder="AZ"
                  maxLength={20}
                  className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]"
                />
              </Field>
              <Field label="Phone (for the list)">
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+1 555 555 5555"
                  className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px]"
                />
              </Field>
            </div>

            <Field label="Bio · what would you tell a newcomer in your area?">
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value.slice(0, 600) }))}
                rows={3}
                placeholder="Hi, I'm Lilly. Sober since 2023. Hike most weekends, happy to grab coffee or pick up the phone."
                className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] resize-y"
              />
              <p className="text-[10.5px] text-foreground/45 mt-1">{profile.bio.length}/600</p>
            </Field>

            <TagPicker
              label="Programs / interests"
              options={INTEREST_OPTIONS}
              value={profile.interests}
              onChange={(next) => setProfile((p) => ({ ...p, interests: next }))}
              onToggle={(t) => setProfile((p) => ({ ...p, interests: toggleTag(p.interests, t) }))}
            />
            <TagPicker
              label="Available for"
              options={AVAILABLE_OPTIONS}
              value={profile.available_for}
              onChange={(next) => setProfile((p) => ({ ...p, available_for: next }))}
              onToggle={(t) => setProfile((p) => ({ ...p, available_for: toggleTag(p.available_for, t) }))}
            />

            {/* Opt-ins */}
            <div className="rounded-xl bg-warm-bg/60 border border-black/5 p-3 space-y-2">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55">Where you appear</p>
              <ToggleRow
                label="Show me on the alumni map"
                description="A pin appears in your city. Other alumni can click it to see your bio + opt-in contact details."
                checked={profile.on_map}
                onChange={(v) => setProfile((p) => ({ ...p, on_map: v }))}
              />
              <ToggleRow
                label="Add me to the peer support phone list"
                description="Your name + city + 'available for' tags appear on the list shared at weekly meetings."
                checked={profile.on_phone_list}
                onChange={(v) => setProfile((p) => ({ ...p, on_phone_list: v }))}
              />
              <ToggleRow
                label="Show my phone publicly"
                description="If off, other alumni see 'Contact via Feather chat' instead of your number."
                checked={profile.phone_visible}
                onChange={(v) => setProfile((p) => ({ ...p, phone_visible: v }))}
                indent
              />
              <ToggleRow
                label="Show my email publicly"
                description="Optional. Defaults to off — most alumni prefer the in-app chat to start a conversation."
                checked={profile.email_visible}
                onChange={(v) => setProfile((p) => ({ ...p, email_visible: v }))}
                indent
              />
            </div>
          </div>
        )}

        <footer className="px-5 py-3 border-t border-black/5 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-black/10 text-foreground/65 text-[12.5px] font-semibold hover:bg-warm-bg/60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="px-4 py-1.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </footer>
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

function TagPicker({
  label, options, value, onToggle,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange?: (next: string[]) => void;
  onToggle: (tag: string) => void;
}) {
  return (
    <div>
      <p className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors ${
                on
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-foreground/65 border-black/10 hover:bg-warm-bg/60'
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange, indent = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  indent?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${indent ? 'pl-3 border-l-2 border-primary/15' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`shrink-0 mt-0.5 relative inline-flex items-center h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-foreground/20'
        }`}
      >
        <span
          className={`absolute top-0.5 inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground leading-tight">{label}</p>
        <p className="text-[11px] text-foreground/55 leading-snug mt-0.5">{description}</p>
      </div>
    </div>
  );
}
