'use client';

// Staff welcome flow (v2) — a one-time, skippable 3-page overlay shown to
// team members (userKind !== 'alumni') on login until they finish it.
// Every field is optional. "Skip for now" closes without completing, so
// they're prompted again next login; progress saves per page so a
// drop-off resumes where they left. All writes go to the signed-in
// user's own `users` row via the same RLS-permitted self-update the
// profile editor uses — admin-managed fields (job_title, department_id)
// are intentionally not collected here.
//
// Profile photo is optional, and on upload the user crops it (no
// dependency — a small canvas pan/zoom cropper below). Steps animate in;
// all glyphs are inline SVG (no emojis).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, notifyAvatarChanged } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { db } from '@/lib/db';

// Bump to re-prompt everyone whose last-completed version is older.
// PlatformShell shows the flow while users.onboarding_version < this.
export const ONBOARDING_VERSION = 1;
const TOTAL = 3;

interface Answers {
  full_name: string;
  pronouns: string;
  bio: string;
  credentials: string;
  hometown: string;
  favorite_quote: string;
  phone: string;
  public_team: boolean;
}

const EMPTY: Answers = {
  full_name: '', pronouns: '', bio: '', credentials: '',
  hometown: '', favorite_quote: '', phone: '', public_team: false,
};

export default function OnboardingFlow({
  onClose,
  onComplete,
}: {
  onClose: () => void;     // "Skip for now" — leaves the flow incomplete
  onComplete: () => void;  // finished — version stamped
}) {
  const { user, session, avatarUrl: authAvatar, refreshAvatar } = useAuth();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = back (drives slide)
  const [a, setA] = useState<Answers>(EMPTY);
  const [avatar, setAvatar] = useState<string | null>(authAvatar);
  const [cropSrc, setCropSrc] = useState<string | null>(null); // object URL while cropping
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
          action: 'select', table: 'users', match: { id: user.id },
          select: 'full_name, pronouns, bio, credentials, hometown, favorite_quote, phone, public_team, avatar_url, onboarding_step',
        });
        if (cancelled || !Array.isArray(rows) || !rows[0]) return;
        const r = rows[0] as Record<string, unknown>;
        setA({
          full_name: (r.full_name as string) ?? (user.user_metadata?.full_name as string) ?? '',
          pronouns: (r.pronouns as string) ?? '',
          bio: (r.bio as string) ?? '',
          credentials: (r.credentials as string) ?? '',
          hometown: (r.hometown as string) ?? '',
          favorite_quote: (r.favorite_quote as string) ?? '',
          phone: (r.phone as string) ?? '',
          public_team: r.public_team === true,
        });
        setAvatar((r.avatar_url as string) ?? authAvatar);
        const saved = typeof r.onboarding_step === 'number' ? r.onboarding_step : 0;
        setStep(Math.min(Math.max(saved, 0), TOTAL - 1));
      } catch { /* prefill is best-effort */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((p) => ({ ...p, [k]: v }));

  async function persist(extra: Record<string, unknown>) {
    if (!user?.id) return;
    await db({
      action: 'update', table: 'users', match: { id: user.id },
      data: {
        full_name: a.full_name.trim() || null,
        pronouns: a.pronouns.trim() || null,
        bio: a.bio.trim() || null,
        credentials: a.credentials.trim() || null,
        hometown: a.hometown.trim() || null,
        favorite_quote: a.favorite_quote.trim() || null,
        phone: a.phone.trim() || null,
        public_team: a.public_team,
        ...extra,
      },
    }).catch(() => { /* non-fatal — nothing here is required */ });
  }

  async function go(nextStep: number) {
    setDir(nextStep > step ? 1 : -1);
    if (nextStep > step) {
      setSaving(true);
      await persist({ onboarding_step: Math.min(nextStep, TOTAL - 1) });
      setSaving(false);
    }
    setStep(Math.min(Math.max(nextStep, 0), TOTAL - 1));
  }

  async function finish() {
    setSaving(true);
    await persist({ onboarding_step: TOTAL, onboarding_completed_at: new Date().toISOString(), onboarding_version: ONBOARDING_VERSION });
    setSaving(false);
    onComplete();
  }

  // ── Avatar: pick → crop → upload ──────────────────────────────
  function pickFile(f: File | null) {
    if (!f) return;
    setCropSrc(URL.createObjectURL(f));
  }

  const uploadCropped = useCallback(async (blob: Blob) => {
    if (!session?.access_token || !user?.id) { setCropSrc(null); return; }
    setUploading(true);
    setCropSrc(null);
    try {
      const fd = new FormData();
      fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
      fd.append('bucket', 'public-images');
      const res = await fetch('/api/upload', {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: fd,
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
  }, [session?.access_token, user?.id, refreshAvatar]);

  const firstName = (a.full_name || (user?.user_metadata?.full_name as string) || '').trim().split(' ')[0];

  const STEPS = [
    { icon: <UserGlyph />, title: firstName ? `Welcome, ${firstName}` : 'Welcome', sub: 'Let’s set up your profile. Takes about a minute, and everything is optional.' },
    { icon: <PencilGlyph />, title: 'A bit about you', sub: 'A short intro for your team profile.' },
    { icon: <LinkGlyph />, title: 'Staying connected', sub: 'One last thing, then you’re in.' },
  ];
  const cur = STEPS[step];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-sm" style={{ fontFamily: 'var(--font-body)' }}>
      <style>{onbCss}</style>
      <div className="onb-shell w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-black/5 overflow-hidden">
        {/* Header: progress + skip */}
        <div className="flex items-center justify-between px-6 pt-5">
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL}`}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <span key={i} className="h-1.5 rounded-full bg-foreground/12 overflow-hidden" style={{ width: i === step ? '1.75rem' : '0.5rem', transition: 'width 350ms cubic-bezier(0.22,1,0.36,1)' }}>
                <span className="block h-full rounded-full bg-primary" style={{ width: i <= step ? '100%' : '0%', transition: 'width 450ms cubic-bezier(0.22,1,0.36,1)' }} />
              </span>
            ))}
          </div>
          <button type="button" onClick={onClose} className="text-[12px] text-foreground/45 hover:text-foreground transition-colors">Skip for now</button>
        </div>

        {/* Animated step body — re-mounts on step change to replay the entry */}
        <div key={step} className="onb-card px-6 pt-4 pb-2" style={{ ['--dir' as string]: String(dir) }}>
          <div className="flex items-center gap-2.5 text-primary">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">{cur.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-foreground leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{cur.title}</h2>
            </div>
          </div>
          <p className="mt-2 text-[13px] text-foreground/60 leading-relaxed">{cur.sub}</p>

          <div className="mt-4 space-y-4">
            {step === 0 && (
              <>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="onb-avatar relative w-20 h-20 rounded-full overflow-hidden border border-black/10 bg-warm-bg/60 shrink-0 group"
                    aria-label="Upload a profile photo"
                  >
                    {avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-primary"><CameraGlyph /></span>
                    )}
                    <span className="absolute inset-0 bg-foreground/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                      {uploading ? '…' : avatar ? 'Change' : 'Add'}
                    </span>
                  </button>
                  <div className="text-[12.5px] text-foreground/60">
                    <p className="font-semibold text-foreground">Profile photo <span className="font-normal text-foreground/45">· optional</span></p>
                    <p>Shows on the team page, chat, and the home orbit. You’ll crop it after picking.</p>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pickFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
                </div>
                <Field label="Your name"><input value={a.full_name} onChange={(e) => set('full_name', e.target.value)} className={inputCx} placeholder="First Last" /></Field>
                <Field label="Pronouns (optional)"><input value={a.pronouns} onChange={(e) => set('pronouns', e.target.value)} className={inputCx} placeholder="she/her · he/him · they/them" /></Field>
              </>
            )}
            {step === 1 && (
              <>
                <Field label="Short bio"><textarea value={a.bio} onChange={(e) => set('bio', e.target.value)} rows={4} className={`${inputCx} resize-y`} placeholder="What you do at Seven Arrows, and a bit about you." /></Field>
                <Field label="Credentials (optional)"><input value={a.credentials} onChange={(e) => set('credentials', e.target.value)} className={inputCx} placeholder="LCSW, LAC, …" /></Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Hometown"><input value={a.hometown} onChange={(e) => set('hometown', e.target.value)} className={inputCx} placeholder="City, State" /></Field>
                  <Field label="A quote you live by"><input value={a.favorite_quote} onChange={(e) => set('favorite_quote', e.target.value)} className={inputCx} placeholder="“…”" /></Field>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <Field label="Phone (optional)"><input value={a.phone} onChange={(e) => set('phone', e.target.value)} className={inputCx} placeholder="(555) 555-5555" inputMode="tel" /></Field>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-black/10 bg-warm-bg/40 cursor-pointer hover:border-primary/30 transition-colors">
                  <input type="checkbox" checked={a.public_team} onChange={(e) => set('public_team', e.target.checked)} className="mt-0.5 w-4 h-4 accent-[var(--color-primary)]" />
                  <span className="text-[13px] text-foreground/80">
                    <span className="font-semibold text-foreground">Show me on the public team page</span>
                    <br />Your name, photo, and bio appear on sevenarrowsrecoveryarizona.com. Change it anytime in My Profile.
                  </span>
                </label>
                <p className="text-[12.5px] text-foreground/55">Everything you entered lives in your profile — update it whenever you like.</p>
              </>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-black/5 bg-warm-bg/30">
          <button type="button" onClick={() => void go(step - 1)} disabled={step === 0 || saving} className="px-3 py-2 rounded-lg text-[13px] text-foreground/60 hover:text-foreground disabled:opacity-0 disabled:pointer-events-none transition-colors">Back</button>
          {step < TOTAL - 1 ? (
            <button type="button" onClick={() => void go(step + 1)} disabled={saving} className="onb-cta px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all inline-flex items-center gap-1.5">
              {saving ? 'Saving…' : 'Continue'}<ArrowGlyph />
            </button>
          ) : (
            <button type="button" onClick={() => void finish()} disabled={saving} className="onb-cta px-5 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 disabled:opacity-60 transition-all inline-flex items-center gap-1.5">
              {saving ? 'Saving…' : 'Finish'}<CheckGlyph />
            </button>
          )}
        </div>
      </div>

      {cropSrc && <AvatarCropper src={cropSrc} onCancel={() => setCropSrc(null)} onCropped={uploadCropped} />}
    </div>
  );
}

// ── No-dependency avatar cropper (pan + zoom, circular) ──────────
function AvatarCropper({ src, onCancel, onCropped }: { src: string; onCancel: () => void; onCropped: (b: Blob) => void }) {
  const VIEW = 256;
  const OUT = 480;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  const displayScale = useCallback((z: number) => (nat ? (VIEW / Math.min(nat.w, nat.h)) * z : 1), [nat]);
  const clamp = useCallback((p: { x: number; y: number }, z: number) => {
    if (!nat) return p;
    const ds = displayScale(z);
    const dw = nat.w * ds, dh = nat.h * ds;
    return { x: Math.min(0, Math.max(VIEW - dw, p.x)), y: Math.min(0, Math.max(VIEW - dh, p.y)) };
  }, [nat, displayScale]);

  function onLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const im = e.currentTarget;
    const n = { w: im.naturalWidth, h: im.naturalHeight };
    setNat(n);
    const ds = (VIEW / Math.min(n.w, n.h)) * 1;
    setPos({ x: (VIEW - n.w * ds) / 2, y: (VIEW - n.h * ds) / 2 });
  }
  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const nx = drag.current.ox + (e.clientX - drag.current.px);
    const ny = drag.current.oy + (e.clientY - drag.current.py);
    setPos(clamp({ x: nx, y: ny }, zoom));
  }
  function onPointerUp() { drag.current = null; }
  function onZoom(z: number) {
    const ds = displayScale(zoom), ds2 = displayScale(z);
    const cx = (VIEW / 2 - pos.x) / ds, cy = (VIEW / 2 - pos.y) / ds;
    setZoom(z);
    setPos(clamp({ x: VIEW / 2 - cx * ds2, y: VIEW / 2 - cy * ds2 }, z));
  }
  function confirm() {
    const im = imgRef.current;
    if (!im || !nat) return;
    const ds = displayScale(zoom);
    const sx = -pos.x / ds, sy = -pos.y / ds, ss = VIEW / ds;
    const canvas = document.createElement('canvas');
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(im, sx, sy, ss, ss, 0, 0, OUT, OUT);
    canvas.toBlob((b) => { if (b) onCropped(b); }, 'image/jpeg', 0.9);
  }
  const ds = displayScale(zoom);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-foreground/55 backdrop-blur-sm" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="onb-shell bg-white rounded-3xl shadow-2xl border border-black/5 p-6 w-full max-w-sm">
        <h3 className="text-base font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>Position your photo</h3>
        <p className="text-[12px] text-foreground/55 mb-4">Drag to reposition, slide to zoom.</p>
        <div
          className="relative mx-auto rounded-full overflow-hidden bg-warm-bg/60 ring-1 ring-black/10 cursor-grab active:cursor-grabbing touch-none select-none"
          style={{ width: VIEW, height: VIEW }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onLoad}
            draggable={false}
            className="absolute max-w-none pointer-events-none"
            style={{ left: pos.x, top: pos.y, width: nat ? nat.w * ds : 'auto', height: nat ? nat.h * ds : 'auto' }}
          />
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/70 shadow-[inset_0_0_0_9999px_rgba(0,0,0,0)]" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-foreground/40"><CameraGlyph small /></span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => onZoom(parseFloat(e.target.value))} className="flex-1 accent-[var(--color-primary)]" aria-label="Zoom" />
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg text-[13px] text-foreground/60 hover:text-foreground transition-colors">Cancel</button>
          <button type="button" onClick={confirm} className="onb-cta px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-all">Use photo</button>
        </div>
      </div>
    </div>
  );
}

const inputCx = 'w-full px-3 py-2 rounded-lg border border-black/10 bg-white text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block mb-1 text-[11.5px] font-semibold uppercase tracking-wider text-foreground/45">{label}</span>
      {children}
    </label>
  );
}

const onbCss = `
  .onb-shell { animation: onb-pop 280ms cubic-bezier(0.22,1,0.36,1) backwards; }
  @keyframes onb-pop { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
  .onb-card { animation: onb-slide 320ms cubic-bezier(0.22,1,0.36,1) backwards; }
  @keyframes onb-slide { from { opacity: 0; transform: translateX(calc(var(--dir, 1) * 26px)); } to { opacity: 1; transform: none; } }
  .onb-avatar { animation: onb-ring 360ms ease-out backwards; }
  @keyframes onb-ring { from { transform: scale(0.9); } to { transform: scale(1); } }
  .onb-cta:hover:not(:disabled) { transform: translateY(-1px); }
  @media (prefers-reduced-motion: reduce) {
    .onb-shell, .onb-card, .onb-avatar { animation-duration: 0.01ms !important; }
    .onb-cta:hover { transform: none; }
  }
`;

// ── Inline SVG glyphs (no emojis) ────────────────────────────────
const ico = 'none';
function UserGlyph() {
  return <svg className="w-5 h-5" fill={ico} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0zM4.5 20.1a7.5 7.5 0 0 1 15 0A17.9 17.9 0 0 1 12 21.75c-2.68 0-5.22-.58-7.5-1.65z" /></svg>;
}
function PencilGlyph() {
  return <svg className="w-5 h-5" fill={ico} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>;
}
function LinkGlyph() {
  return <svg className="w-5 h-5" fill={ico} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a3 3 0 0 0 4.24 0l3-3a3 3 0 0 0-4.24-4.24l-1.5 1.5" /><path d="M15 12a3 3 0 0 0-4.24 0l-3 3a3 3 0 1 0 4.24 4.24l1.5-1.5" /></svg>;
}
function CameraGlyph({ small }: { small?: boolean } = {}) {
  return <svg className={small ? 'w-3.5 h-3.5' : 'w-6 h-6'} fill={ico} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h0a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="3.25" /></svg>;
}
function ArrowGlyph() {
  return <svg className="w-3.5 h-3.5" fill={ico} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
function CheckGlyph() {
  return <svg className="w-3.5 h-3.5" fill={ico} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
}
