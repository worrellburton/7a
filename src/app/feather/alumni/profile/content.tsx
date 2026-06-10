'use client';

// Alumni My Profile — the alumni-side equivalent of /app/profile.
// Combines the photo / display-name editor with the alumni-specific
// fields (sobriety date, city, interests, availability, opt-ins).
//
// Super admins can view this page too so they can audit what alumni
// see. When a super admin (or any non-alumni) lands here, the form
// renders read-only with a yellow banner at the top — fields stay
// visible so the super admin can review labels + copy, but nothing
// is editable and Save is hidden.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth, notifyAvatarChanged } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';
import TimeSoberCard from '../_components/TimeSoberCard';

const INTEREST_OPTIONS = [
  'AA', 'NA', 'CMA', 'Wellbriety', 'SMART Recovery', 'Refuge Recovery',
  'Faith-based', 'Yoga', 'Meditation', 'Recovery coaching',
];
const AVAILABLE_OPTIONS = [
  'Peer support calls', 'Coffee meetups', 'Hiking',
  'Service work', 'Sponsor support', 'Newcomer mentoring',
  'Job/career support', 'Family-program help',
];

interface AlumniState {
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

const EMPTY_ALUMNI: AlumniState = {
  sobriety_date: null,
  city: '', state: '', bio: '',
  interests: [], available_for: [],
  phone: '', email_for_alumni: '',
  on_map: false, on_phone_list: false,
  phone_visible: false, email_visible: false,
};

export default function AlumniProfileContent() {
  const { user, session, userKind, isSuperAdmin, avatarUrl } = useAuth();
  const isAlumni = userKind === 'alumni';
  // Super admins (and any non-alumni who somehow lands here) see the
  // page read-only with a banner. Non-super-admin non-alumni get
  // bounced — only alumni and super admins ever reach this code path.
  const readOnly = !isAlumni;

  const [fullName, setFullName] = useState('');
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);
  const [alumni, setAlumni] = useState<AlumniState>(EMPTY_ALUMNI);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const load = useCallback(async () => {
    if (!user?.id) return;
    // Staff record (name + avatar).
    const { data: userRow } = await supabase
      .from('users')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (userRow) {
      setFullName((userRow.full_name as string) || '');
      setHeaderAvatar((userRow.avatar_url as string) || avatarUrl || null);
    }
    // Alumni profile row (might not exist yet on first visit).
    const { data: ap } = await supabase
      .from('alumni_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (ap) {
      setAlumni({
        sobriety_date: ap.sobriety_date ?? null,
        city: ap.city ?? '',
        state: ap.state ?? '',
        bio: ap.bio ?? '',
        interests: Array.isArray(ap.interests) ? ap.interests : [],
        available_for: Array.isArray(ap.available_for) ? ap.available_for : [],
        phone: ap.phone ?? '',
        email_for_alumni: ap.email_for_alumni ?? '',
        on_map: !!ap.on_map,
        on_phone_list: !!ap.on_phone_list,
        phone_visible: !!ap.phone_visible,
        email_visible: !!ap.email_visible,
      });
    }
    setLoaded(true);
  }, [user?.id, avatarUrl]);
  useEffect(() => { void load(); }, [load]);

  async function uploadAvatar(file: File) {
    if (!session?.access_token || !user || readOnly) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'public-images');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        showToast(json.error || 'Upload failed');
        return;
      }
      await db({ action: 'update', table: 'users', data: { avatar_url: json.url }, match: { id: user.id } });
      try { await supabase.auth.updateUser({ data: { avatar_url: json.url } }); } catch { /* non-fatal */ }
      setHeaderAvatar(json.url);
      notifyAvatarChanged();
      showToast('Photo updated');
    } catch (err) {
      showToast(`Upload failed: ${String(err)}`);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!user?.id || readOnly) return;
    setSaving(true);
    try {
      // Update name on users.
      await db({ action: 'update', table: 'users', data: { full_name: fullName.trim() || null }, match: { id: user.id } });
      // Upsert alumni_profiles. sobriety_date is intentionally omitted —
      // the Time-sober card is the sole writer of it (and of the
      // check-in / streak columns), so the profile save can't stomp a
      // fresh check-in or reset.
      const payload = {
        user_id: user.id,
        city: alumni.city.trim() || null,
        state: alumni.state.trim() || null,
        bio: alumni.bio.trim() || null,
        interests: alumni.interests,
        available_for: alumni.available_for,
        phone: alumni.phone.trim() || null,
        email_for_alumni: alumni.email_for_alumni.trim() || null,
        on_map: alumni.on_map,
        on_phone_list: alumni.on_phone_list,
        phone_visible: alumni.phone_visible,
        email_visible: alumni.email_visible,
      };
      const { error } = await supabase.from('alumni_profiles').upsert(payload, { onConflict: 'user_id' });
      if (error) {
        showToast(`Couldn't save: ${error.message}`);
      } else {
        showToast('Profile saved');
        // Fire-and-forget geocode if there's a city.
        if (alumni.city) {
          try {
            await fetch('/api/alumni/geocode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ city: alumni.city, state: alumni.state }),
            });
          } catch { /* non-fatal */ }
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleTag(field: 'interests' | 'available_for', tag: string) {
    setAlumni((prev) => {
      const list = prev[field];
      const next = list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];
      return { ...prev, [field]: next };
    });
  }

  if (!user) return null;
  const email = user.email || '';

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 sm:py-8 max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
      <Link href="/feather/alumni" className="text-[11.5px] text-foreground/55 hover:text-foreground">&larr; Alumni hub</Link>

      {readOnly && (
        <div className="mt-3 mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-amber-900 mb-1">Sample preview</p>
          <p className="text-[13px] text-amber-950">
            You&rsquo;re viewing the alumni My Profile page as {isSuperAdmin ? 'a super admin' : 'a staff member'}.
            Fields are read-only here; alumni use this exact form to set up their own opt-ins, bio, and contact info.
          </p>
        </div>
      )}

      <header className="mt-3 mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary mb-1.5">My profile</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          What you share, and with whom.
        </h1>
        <p className="mt-1 text-sm text-foreground/65 max-w-xl">
          Everything below defaults to private. You decide what other alumni see.
        </p>
      </header>

      {/* Time-sober tracker — owns sobriety_date + check-ins. Hidden in
          the admin read-only preview (it writes the viewer's own row,
          which isn't meaningful when previewing the alumni form). */}
      {!readOnly && <TimeSoberCard />}

      {/* Avatar + name header */}
      <section className="mb-6 flex items-center gap-4 p-4 rounded-2xl border border-black/10 bg-white">
        <div className="relative">
          {headerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={headerAvatar} alt="" referrerPolicy="no-referrer" className="w-20 h-20 rounded-full object-cover border-2 border-primary/40" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {(fullName || email || '?').charAt(0).toUpperCase()}
            </div>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              title="Upload a new photo"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-foreground text-white flex items-center justify-center shadow-md hover:bg-primary transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              )}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAvatar(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10.5px] font-semibold uppercase tracking-[0.16em] text-foreground/55 mb-1">Display name</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={readOnly}
            placeholder="What other alumni will see"
            className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] disabled:bg-warm-bg/40 disabled:text-foreground/50"
          />
          <p className="text-[11px] text-foreground/45 mt-1">{email}</p>
        </div>
      </section>

      {!loaded ? (
        <p className="text-[13px] text-foreground/55 italic">Loading…</p>
      ) : (
        <fieldset disabled={readOnly} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            {/* Sobriety date is now owned by the Time-sober card above
                (toggle + counter + check-in), so it's no longer a raw
                field here — a single source of truth avoids the form's
                save clobbering a check-in or reset. */}
            <Field label="Phone (for the list)">
              <input
                type="tel"
                value={alumni.phone}
                onChange={(e) => setAlumni((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 555 555 5555"
                className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] disabled:bg-warm-bg/40"
              />
            </Field>
            <Field label="City">
              <input
                value={alumni.city}
                onChange={(e) => setAlumni((p) => ({ ...p, city: e.target.value }))}
                placeholder="Sierra Vista"
                className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] disabled:bg-warm-bg/40"
              />
            </Field>
            <Field label="State">
              <input
                value={alumni.state}
                onChange={(e) => setAlumni((p) => ({ ...p, state: e.target.value }))}
                placeholder="AZ"
                maxLength={20}
                className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] disabled:bg-warm-bg/40"
              />
            </Field>
          </div>

          <Field label="Bio · what would you tell a newcomer in your area?">
            <textarea
              value={alumni.bio}
              onChange={(e) => setAlumni((p) => ({ ...p, bio: e.target.value.slice(0, 600) }))}
              rows={3}
              placeholder="Hi, I'm Lilly. Sober since 2023. Hike most weekends, happy to grab coffee or pick up the phone."
              className="w-full rounded-md border border-black/15 bg-white px-2.5 py-1.5 text-[13px] resize-y disabled:bg-warm-bg/40"
            />
            <p className="text-[10.5px] text-foreground/45 mt-1">{alumni.bio.length}/600</p>
          </Field>

          <TagPicker
            label="Programs / interests"
            options={INTEREST_OPTIONS}
            value={alumni.interests}
            onToggle={(t) => toggleTag('interests', t)}
            disabled={readOnly}
          />
          <TagPicker
            label="Available for"
            options={AVAILABLE_OPTIONS}
            value={alumni.available_for}
            onToggle={(t) => toggleTag('available_for', t)}
            disabled={readOnly}
          />

          <div className="rounded-xl bg-warm-bg/60 border border-black/5 p-3 space-y-2">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-foreground/55">Where you appear</p>
            <ToggleRow
              label="Show me on the alumni map"
              description="A pin appears in your city. Other alumni can click it to see your bio + opt-in contact details."
              checked={alumni.on_map}
              onChange={(v) => setAlumni((p) => ({ ...p, on_map: v }))}
            />
            <ToggleRow
              label="Add me to the peer support phone list"
              description="Your name + city + 'available for' tags appear on the list shared at weekly meetings."
              checked={alumni.on_phone_list}
              onChange={(v) => setAlumni((p) => ({ ...p, on_phone_list: v }))}
            />
            <ToggleRow
              label="Show my phone publicly"
              description="If off, other alumni see 'Contact via Feather chat' instead of your number."
              checked={alumni.phone_visible}
              onChange={(v) => setAlumni((p) => ({ ...p, phone_visible: v }))}
              indent
            />
            <ToggleRow
              label="Show my email publicly"
              description="Optional. Defaults to off — most alumni prefer the in-app chat to start a conversation."
              checked={alumni.email_visible}
              onChange={(v) => setAlumni((p) => ({ ...p, email_visible: v }))}
              indent
            />
          </div>

          {!readOnly && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          )}
        </fieldset>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-foreground text-white text-[12.5px] shadow-lg">
          {toast}
        </div>
      )}
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
  label, options, value, onToggle, disabled = false,
}: {
  label: string;
  options: string[];
  value: string[];
  onToggle: (tag: string) => void;
  disabled?: boolean;
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
              disabled={disabled}
              className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors disabled:opacity-60 ${
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
