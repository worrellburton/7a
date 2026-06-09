'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/upload';

type CardSide = 'front' | 'back';

// Upload a single card photo to the private `vob-cards` bucket. The
// bucket's storage RLS allows public INSERT (anon + authenticated).
// Returns either the storage path on success or the underlying error
// message — the form bubbles failures up to the visitor instead of
// dropping them silently like the previous implementation did.
async function uploadCard(
  file: File,
  side: CardSide,
): Promise<{ path: string | null; error: string | null }> {
  // Compress images aggressively so phone-sized JPEGs stay under the
  // bucket's 10 MB cap. PDFs pass through unchanged.
  const prepared = file.type.startsWith('image/') ? await compressImage(file, { maxEdge: 1800, targetBytes: 2 * 1024 * 1024 }) : file;
  const ext = (prepared.name.split('.').pop() || 'jpg').toLowerCase();
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const path = `${token}/${side}.${ext}`;
  const { error } = await supabase.storage.from('vob-cards').upload(path, prepared, {
    contentType: prepared.type || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false,
  });
  if (error) {
    console.error(`[AdmissionsForm] upload (${side}) failed:`, error.message);
    return { path: null, error: error.message };
  }
  return { path, error: null };
}

interface FormState {
  name: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  insuranceProvider: string;
  memberId: string;
  cardFront: File | null;
  cardBack: File | null;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB per photo
const ACCEPTED = 'image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf';

// `dark` flips every field, label, and slot to the dark-mode
// treatment used by the footer-adjacent InsuranceVerification
// section. Cards become glowing copper-ringed dropzones; inputs
// become translucent white with light borders + light focus
// rings; the submit button gets the warm gradient hover.
export default function AdmissionsForm({ dark = false }: { dark?: boolean } = {}) {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    insuranceProvider: '',
    memberId: '',
    cardFront: null,
    cardBack: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const handleFile = useCallback((side: CardSide, file: File | null) => {
    setUploadError(null);
    if (!file) {
      setFormData((prev) => ({ ...prev, [side === 'front' ? 'cardFront' : 'cardBack']: null }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError(`That file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please keep it under 10 MB.`);
      return;
    }
    if (!ACCEPTED.split(',').some((t) => file.type === t.trim())) {
      setUploadError('Please upload a JPG, PNG, HEIC, WEBP, or PDF image of your card.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      [side === 'front' ? 'cardFront' : 'cardBack']: file,
    }));
  }, []);

  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    setSubmitting(true);
    try {
      // Upload card photos to the `vob-cards` storage bucket first.
      // Surface any storage error to the visitor before sending the
      // form — silently dropping the photo (the old behavior) means
      // the admissions team thinks they have a card and the visitor
      // thinks the upload worked.
      const [front, back] = await Promise.all([
        formData.cardFront ? uploadCard(formData.cardFront, 'front') : Promise.resolve({ path: null, error: null }),
        formData.cardBack ? uploadCard(formData.cardBack, 'back') : Promise.resolve({ path: null, error: null }),
      ]);
      const uploadFailure = front.error || back.error;
      if (uploadFailure) {
        setUploadError(`Card photo upload failed (${uploadFailure}). Please try again or call (866) 718-1665.`);
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/public/vob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          dateOfBirth: formData.dateOfBirth || null,
          insuranceProvider: formData.insuranceProvider,
          memberId: formData.memberId || null,
          cardFrontPath: front.path,
          cardBackPath: back.path,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setUploadError(payload.error || `Could not send (HTTP ${res.status}). Please call (866) 718-1665.`);
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error('[AdmissionsForm] submit threw', err);
      setUploadError('Could not send. Please call (866) 718-1665.');
    } finally {
      setSubmitting(false);
    }
  }

  // Dark vs. light style tokens — kept as locals so the JSX below
  // stays readable. `dark` callers (the footer-adjacent block)
  // get translucent-white inputs over the brown bg; `light`
  // callers (legacy embeds) keep the original warm-card chrome.
  const wrap = dark
    ? 'rounded-2xl bg-white/[0.04] supports-[backdrop-filter]:bg-white/[0.06] backdrop-blur-xl border border-white/10 p-6 lg:p-8 shadow-[0_28px_80px_-30px_rgba(0,0,0,0.6)]'
    : 'rounded-2xl bg-warm-card p-8 lg:p-10';
  const labelCls = dark
    ? 'block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 mb-1'
    : 'block text-sm font-semibold text-foreground mb-1';
  // Switched the dark-mode background from `bg-white/[0.06] +
  // backdrop-blur` to a SOLID rgba color. The translucent-over-
  // backdrop-blur combo rendered inconsistently on native date /
  // select inputs (mobile browsers composite their own chrome on
  // top of those, which made DOB look noticeably darker than the
  // text inputs above it). A solid rgba bg gives every input the
  // exact same visual weight regardless of how the browser styles
  // the native control inside.
  //
  // The `[&::-webkit-date-and-time-value]:text-white` rule keeps
  // the date input's user-entered value the same color as the text
  // inputs; the empty "mm/dd/yyyy" hint stays at the browser's
  // default light-mode color because [color-scheme:dark] (applied
  // at the call site) flips it to a matching white/35 tone.
  const inputCls = dark
    ? 'w-full rounded-lg border border-white/15 bg-[rgba(255,255,255,0.07)] px-3.5 py-2.5 text-[14px] text-white placeholder-white/35 [&::-webkit-date-and-time-value]:text-white [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:hover:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-200/40 focus:border-amber-200/40 transition-colors'
    : 'w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
  const optionalCls = dark ? 'font-normal text-white/35' : 'font-normal text-foreground/50';

  if (submitted) {
    return (
      <div className={`${wrap} text-center`}>
        <svg
          className={`mx-auto mb-4 w-12 h-12 ${dark ? 'text-amber-200' : 'text-primary'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h3 className={`text-2xl font-bold mb-2 ${dark ? 'text-white' : 'text-foreground'}`} style={{ fontFamily: 'var(--font-display)' }}>Thank You</h3>
        <p
          className={dark ? 'text-white/70 mb-2' : 'text-foreground/70 mb-2'}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Our admissions team will reach out to you shortly. If you need immediate assistance,
          please call us at{' '}
          <a href="tel:+18667181665" className={dark ? 'text-amber-200 font-semibold' : 'text-primary font-semibold'}>
            (866) 718-1665
          </a>
          .
        </p>
        {(formData.cardFront || formData.cardBack) && (
          <p className={dark ? 'text-white/55 text-sm' : 'text-foreground/60 text-sm'} style={{ fontFamily: 'var(--font-body)' }}>
            We&rsquo;ve received your insurance card
            {formData.cardFront && formData.cardBack ? ' (front &amp; back)' : formData.cardFront ? ' (front)' : ' (back)'}
            {' '}and will verify your benefits within minutes.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`${wrap} space-y-4`}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {/* Phase 3 — 2-column grid for the six primary fields so the
          whole form fits inside ~700px of vertical space on
          desktop. Below sm: stacks to single column for thumb
          ergonomics. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label htmlFor="name" className={labelCls}>Full name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            autoComplete="name"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="phone" className={labelCls}>Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            autoComplete="tel"
            inputMode="tel"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            inputMode="email"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="dateOfBirth" className={labelCls}>Date of birth</label>
          <input
            type="date"
            id="dateOfBirth"
            name="dateOfBirth"
            required
            value={formData.dateOfBirth}
            onChange={handleChange}
            max={new Date().toISOString().slice(0, 10)}
            className={`${inputCls} ${dark ? '[color-scheme:dark]' : ''}`}
          />
        </div>
        <div>
          <label htmlFor="insuranceProvider" className={labelCls}>Insurance provider</label>
          <select
            id="insuranceProvider"
            name="insuranceProvider"
            required
            value={formData.insuranceProvider}
            onChange={handleChange}
            className={`${inputCls} ${dark ? '[color-scheme:dark]' : ''}`}
          >
            <option value="">Select your provider</option>
            <option value="Aetna">Aetna</option>
            <option value="Blue Cross Blue Shield">Blue Cross Blue Shield</option>
            <option value="Cigna">Cigna</option>
            <option value="Humana">Humana</option>
            <option value="UnitedHealthcare">UnitedHealthcare</option>
            <option value="TRICARE">TRICARE</option>
            <option value="Anthem">Anthem</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="memberId" className={labelCls}>
            Member ID <span className={optionalCls}>(optional)</span>
          </label>
          <input
            type="text"
            id="memberId"
            name="memberId"
            value={formData.memberId}
            onChange={handleChange}
            autoComplete="off"
            inputMode="text"
            className={inputCls}
          />
        </div>
      </div>

      {/* Insurance-card uploads — glowing copper slots below the
          six primary fields. Phase 7 styling lives inside CardSlot
          (it now reads `dark` itself to flip the chrome). */}
      <div>
        <label className={labelCls}>
          Insurance card photos <span className={optionalCls}>(optional · speeds verification)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <CardSlot
            side="front"
            dark={dark}
            file={formData.cardFront}
            onFile={(f) => handleFile('front', f)}
            onClear={() => handleFile('front', null)}
          />
          <CardSlot
            side="back"
            dark={dark}
            file={formData.cardBack}
            onFile={(f) => handleFile('back', f)}
            onClear={() => handleFile('back', null)}
          />
        </div>
        {uploadError && (
          <p className={`mt-2 text-xs ${dark ? 'text-rose-300' : 'text-red-600'}`} role="alert">
            {uploadError}
          </p>
        )}
      </div>

      {/* Phase 8 — submit button. Dark variant gets the warm copper
          gradient with a brighten-on-hover; light variant keeps
          the existing btn-primary. */}
      <button
        type="submit"
        disabled={submitting}
        className={
          dark
            ? 'w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-[13.5px] font-semibold uppercase tracking-[0.16em] text-white bg-gradient-to-r from-[#bc6b4a] via-[#c97a55] to-[#bc6b4a] bg-[length:180%_100%] bg-[position:0%_0%] hover:bg-[position:100%_0%] transition-[background-position,transform,box-shadow] duration-700 ease-out hover:-translate-y-px shadow-[0_18px_44px_-18px_rgba(188,107,74,0.85)] disabled:opacity-50 disabled:cursor-not-allowed'
            : 'btn-primary w-full'
        }
      >
        {submitting ? 'Sending…' : 'Submit for verification'}
        {!submitting && <span aria-hidden="true">→</span>}
      </button>

      <p className={`text-[10.5px] leading-snug ${dark ? 'text-white/40' : 'text-foreground/50'}`}>
        Uploads transmitted over TLS, handled by our HIPAA-compliant admissions team only. JPG, PNG, HEIC, WEBP, or PDF — up to 10 MB each.
      </p>
    </form>
  );
}

/* ── One drop-zone slot (front or back) ────────────────────────────── */

function CardSlot({
  side,
  dark = false,
  file,
  onFile,
  onClear,
}: {
  side: CardSide;
  dark?: boolean;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  const label = side === 'front' ? 'Front of card' : 'Back of card';
  const hint = side === 'front' ? 'Member ID, name, plan' : 'Customer service number';

  // Phase 7 — glowing card slot. On dark mode we wrap the button
  // in a `.glow-wrap` that paints a soft copper aura via box-shadow
  // (animated breathing for ambient draw + brighter on hover/drag).
  // On light mode we keep the original outlined drop-zone treatment.
  const buttonCls = dark
    ? `group relative block w-full aspect-[2.6/1] max-h-[112px] rounded-xl border-2 border-dashed transition-all overflow-hidden text-left ${
        dragOver
          ? 'border-amber-200/80 bg-white/[0.10]'
          : file
            ? 'border-amber-200/40 bg-white/[0.06]'
            : 'border-white/15 bg-white/[0.04] hover:border-amber-200/60 hover:bg-white/[0.07]'
      }`
    : `group relative block w-full aspect-[2.6/1] max-h-[112px] rounded-xl border-2 border-dashed transition-all overflow-hidden text-left ${
        dragOver
          ? 'border-primary bg-primary/5'
          : file
            ? 'border-primary/30 bg-white'
            : 'border-foreground/15 bg-white hover:border-primary/40 hover:bg-primary/5'
      }`;

  // Inline glow style — animated via the keyframes block at the
  // bottom of this component (scoped style jsx tag). dragOver +
  // file states intensify the glow.
  const glowStyle: React.CSSProperties = dark
    ? {
        boxShadow:
          dragOver
            ? '0 0 0 1px rgba(252,211,77,0.55), 0 0 48px -4px rgba(252,211,77,0.55), 0 12px 40px -8px rgba(188,107,74,0.5)'
            : file
              ? '0 0 0 1px rgba(252,211,77,0.18), 0 0 38px -8px rgba(252,211,77,0.35), 0 10px 28px -10px rgba(188,107,74,0.5)'
              : '0 0 0 1px rgba(188,107,74,0.10), 0 0 32px -8px rgba(188,107,74,0.35), 0 8px 22px -12px rgba(0,0,0,0.4)',
        borderRadius: '0.75rem',
        transition: 'box-shadow 280ms ease-out',
      }
    : {};

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
        aria-label={`Upload ${label}`}
      />

      {/* glow wrapper — keeps the button's overflow:hidden intact
          while letting the aura paint OUTSIDE the rounded edge. */}
      <div style={glowStyle} className={dark ? 'card-slot-glow' : ''}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={buttonCls}
          aria-label={`${file ? 'Replace' : 'Upload'} ${label}`}
        >
          {file && previewUrl ? (
            <img
              src={previewUrl}
              alt={label}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : file && file.type === 'application/pdf' ? (
            <div className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 ${dark ? 'text-white/75' : 'text-foreground/70'}`}>
              <svg className={`w-8 h-8 ${dark ? 'text-amber-200' : 'text-primary'}`} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 001 1h4M5 21V5a2 2 0 012-2h8l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xs font-semibold truncate max-w-full px-2">
                {file.name}
              </p>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center">
              <svg
                className={`w-7 h-7 ${dark ? 'text-amber-200/80 group-hover:text-amber-100' : 'text-primary/80 group-hover:text-primary'} transition-colors`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <circle cx="12" cy="12" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className={`text-[12.5px] font-semibold ${dark ? 'text-white' : 'text-foreground'}`}>
                {label}
              </p>
              <p className={`text-[10px] leading-tight ${dark ? 'text-white/45' : 'text-foreground/50'}`}>
                {hint}
              </p>
              <p className={`text-[9.5px] font-semibold uppercase tracking-[0.14em] mt-0.5 ${dark ? 'text-amber-200/85' : 'text-primary'}`}>
                Tap to upload
              </p>
            </div>
          )}

          {file && (
            <span
              aria-hidden="true"
              className={`absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm ${
                dark ? 'bg-amber-200 text-[#1a0e0a]' : 'bg-white/95 text-primary'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Uploaded
            </span>
          )}
        </button>
      </div>

      {file && (
        <button
          type="button"
          onClick={onClear}
          className={`mt-1.5 text-[11px] font-semibold transition-colors ${
            dark ? 'text-white/55 hover:text-amber-200' : 'text-foreground/60 hover:text-primary'
          }`}
        >
          Remove &amp; replace
        </button>
      )}

      {/* Ambient breathing — small, scoped, respects reduced-motion. */}
      <style jsx>{`
        .card-slot-glow {
          animation: card-slot-breathe 4.5s ease-in-out infinite;
        }
        @keyframes card-slot-breathe {
          0%, 100% { filter: brightness(1) saturate(1); }
          50%      { filter: brightness(1.08) saturate(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .card-slot-glow { animation: none; }
        }
      `}</style>
    </div>
  );
}
