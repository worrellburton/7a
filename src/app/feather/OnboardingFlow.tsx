'use client';

// Staff welcome flow — a one-time, skippable 5-card overlay shown to
// team members (userKind !== 'alumni') on login until they finish it.
// Every field is optional; "Skip for now" closes without marking it
// done, so they're prompted again next login. Progress is saved per
// card (users.onboarding_step) so a drop-off resumes where they left.
//
// All writes go to the signed-in user's own `users` row via the same
// RLS-permitted self-update the profile editor uses, so no new API
// route is needed. Admin-managed fields (job_title, department_id) are
// intentionally NOT collected here — those stay admin-assigned.

import { useEffect, useRef, useState } from 'react';
import { useAuth, notifyAvatarChanged } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

interface Answers {
  full_name: string;
  pronouns: string;
  hometown: string;
  phone: string;
  bio: string;
  credentials: string;
  favorite_quote: string;
  favorite_seven_arrows: string;
  public_team: boolean;
}

const EMPTY: Answers = {
  full_name: '',
  pronouns: '',
  hometown: '',
  phone: '',
  bio: '',
  credentials: '',
  favorite_quote: '',
  favorite_seven_arrows: '',
  public_team: false,
};

const TOTAL = 5;

export default function OnboardingFlow({
  onClose,
  onComplete,
}: {
  onClose: () => void;     // "Skip for now" — leaves onboarding_completed_at null
  onComplete: () => void;  // finished — onboarding_completed_at set
}) {
  const { user, session, avatarUrl: authAvatar, refreshAvatar } = useAuth();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(EMPTY);
  const [avatar, setAvatar] = useState<string | null>(authAvatar);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Prefill from the user's current row + resume at their saved step.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await db({
          action: 'select',
          table: 'users',
          match: { id: user.id },
          select: 'full_name, pronouns, hometown, phone, bio, credentials, favorite_quote, favorite_seven_arrows, public_team, avatar_url, onboarding_step',
        });
        if (cancelled || !Array.isArray(rows) || !rows[0]) return;
        const r = rows[0] as Record<string, unknown>;
        setA({
          full_name: (r.full_name as string) ?? (user.user_metadata?.full_name as string) ?? '',
          pronouns: (r.pronouns as string) ?? '',
          hometown: (r.hometown as string) ?? '',
          phone: (r.phone as string) ?? '',
          bio: (r.bio as string) ?? '',
          credentials: (r.credentials as string) ?? '',
          favorite_quote: (r.favorite_quote as string) ?? '',
          favorite_seven_arrows: (r.favorite_seven_arrows as string) ?? '',
          public_team: r.public_team === true,
        });
        setAvatar((r.avatar_url as string) ?? authAvatar);
        const savedStep = typeof r.onboarding_step === 'number' ? r.onboarding_step : 0;
        setStep(Math.min(Math.max(savedStep, 0), TOTAL - 1));
      } catch { /* prefill is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((p) => ({ ...p, [k]: v }));

  // Persist the whole answer set (best-effort) plus a tracking patch.
  async function persist(extra: Record<string, unknown>) {
    if (!user?.id) return;
    await db({
      action: 'update',
      table: 'users',
      match: { id: user.id },
      data: {
        full_name: a.full_name.trim() || null,
        pronouns: a.pronouns.trim() || null,
        hometown: a.hometown.trim() || null,
        phone: a.phone.trim() || null,
        bio: a.bio.trim() || null,
        credentials: a.credentials.trim() || null,
        favorite_quote: a.favorite_quote.trim() || null,
        favorite_seven_arrows: a.favorite_seven_arrows.trim() || null,
        public_team: a.public_team,
        ...extra,
      },
    }).catch(() => { /* non-fatal — nothing here is required */ });
  }

  async function next() {
    setSaving(true);
    const nextStep = Math.min(step + 1, TOTAL - 1);
    await persist({ onboarding_step: nextStep });
    setSaving(false);
    setStep(nextStep);
  }

  async function finish() {
    setSaving(true);
    await persist({ onboarding_step: TOTAL, onboarding_completed_at: new Date().toISOString() });
    setSaving(false);
    onComplete();
  }

  async function uploadAvatar(file: File) {
    if (!session?.access_token || !user?.id) return;
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
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) return;
      await db({ action: 'update', table: 'users', match: { id: user.id }, data: { avatar_url: json.url } });
      try { await supabase.auth.updateUser({ data: { avatar_url: json.url } }); } catch { /* non-fatal */ }
      setAvatar(json.url);
      refreshAvatar();
      notifyAvatarChanged();
    } finally {
      setUploading(false);
    }
  }

  const firstName = (a.full_name || (user?.user_metadata?.full_name as string) || '').trim().split(' ')[0];

  const cards: { title: string; subtitle: string; body: React.ReactNode }[] = [
    {
      title: firstName ? `Welcome, ${firstName} 👋` : 'Welcome 👋',
      subtitle: 'Let’s set up your profile. This takes about a minute, and everything is optional — skip anything you’d rather not share.',
      body: (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden border border-black/10 bg-warm-bg/60 shrink-0 group"
              aria-label="Upload a profile photo"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                  {(firstName || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                {uploading ? '…' : 'Change'}
              </span>
            </button>
            <div className="text-[12.5px] text-foreground/60">
              <p className="font-semibold text-foreground">Profile photo</p>
              <p>Shows up on the team page, chat, and the home orbit.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); }}
            />
          </div>
          <Field label="Your name">
            <input value={a.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCx} placeholder="First Last" />
          </Field>
          <Field label="Pronouns (optional)">
            <input value={a.pronouns} onChange={(e) => set('pronouns', e.target.value)} className={inputCx} placeholder="she/her · he/him · they/them" />
          </Field>
        </div>
      ),
    },
    {
      title: 'Where you’re from',
      subtitle: 'A little context so the team can connect with you.',
      body: (
        <div className="space-y-4">
          <Field label="Hometown">
            <input value={a.hometown} onChange={(e) => set('hometown', e.target.value)} className={inputCx} placeholder="City, State" />
          </Field>
          <Field label="Phone (optional)">
            <input value={a.phone} onChange={(e) => set('phone', e.target.value)} className={inputCx} placeholder="(555) 555-5555" inputMode="tel" />
          </Field>
        </div>
      ),
    },
    {
      title: 'Your story',
      subtitle: 'A short intro that shows on your team profile.',
      body: (
        <div className="space-y-4">
          <Field label="Short bio">
            <textarea value={a.bio} onChange={(e) => set('bio', e.target.value)} rows={4} className={`${inputCx} resize-y`} placeholder="What you do at Seven Arrows, and a bit about you." />
          </Field>
          <Field label="Credentials (optional)">
            <input value={a.credentials} onChange={(e) => set('credentials', e.target.value)} className={inputCx} placeholder="LCSW, LAC, …" />
          </Field>
        </div>
      ),
    },
    {
      title: 'A little personality',
      subtitle: 'Optional, but it makes the team page feel human.',
      body: (
        <div className="space-y-4">
          <Field label="A quote you live by">
            <input value={a.favorite_quote} onChange={(e) => set('favorite_quote', e.target.value)} className={inputCx} placeholder="“…”" />
          </Field>
          <Field label="Which of the Seven Arrows resonates with you?">
            <input value={a.favorite_seven_arrows} onChange={(e) => set('favorite_seven_arrows', e.target.value)} className={inputCx} placeholder="e.g. Courage, Connection, Purpose…" />
          </Field>
        </div>
      ),
    },
    {
      title: 'You’re all set',
      subtitle: 'One last choice, then you’re in.',
      body: (
        <div className="space-y-4">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-black/10 bg-warm-bg/40 cursor-pointer">
            <input type="checkbox" checked={a.public_team} onChange={(e) => set('public_team', e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]" />
            <span className="text-[13px] text-foreground/80">
              <span className="font-semibold text-foreground">Show me on the public team page</span>
              <br />Your name, photo, and bio appear on sevenarrowsrecoveryarizona.com. You can change this anytime in My Profile.
            </span>
          </label>
          <p className="text-[12.5px] text-foreground/55">
            Everything you entered lives in your profile — update it whenever you like.
          </p>
        </div>
      ),
    },
  ];

  const card = cards[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden">
        {/* Header: progress dots + skip */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL}`}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-primary' : i < step ? 'w-2 bg-primary/50' : 'w-2 bg-foreground/15'}`} />
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-[12px] text-foreground/45 hover:text-foreground transition-colors">
            Skip for now
          </button>
        </div>

        <div className="px-6 pt-4 pb-2">
          <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>{card.title}</h2>
          <p className="mt-1 text-[13px] text-foreground/60 leading-relaxed">{card.subtitle}</p>
        </div>

        <div className="px-6 py-4">{card.body}</div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-black/5 bg-warm-bg/30">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
            className="px-3 py-2 rounded-lg text-[13px] text-foreground/60 hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            Back
          </button>
          {step < TOTAL - 1 ? (
            <button
              type="button"
              onClick={() => void next()}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Continue'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCx = 'w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-foreground/45">{label}</span>
      {children}
    </label>
  );
}
