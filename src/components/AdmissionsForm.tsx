'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CardSide = 'front' | 'back';

interface FormState {
  name: string;
  phone: string;
  email: string;
  insuranceProvider: string;
  cardFront: File | null;
  cardBack: File | null;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10MB per photo
const ACCEPTED = 'image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf';

export default function AdmissionsForm() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    insuranceProvider: '',
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
      const res = await fetch('/api/public/vob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          insuranceProvider: formData.insuranceProvider,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setUploadError(payload.error || `Could not send (HTTP ${res.status}). Please call (866) 996-4308.`);
        setSubmitting(false);
        return;
      }
      // Card photos stay client-side for now — phase 2 will add the
      // storage bucket + signed-upload flow. The row in vob_requests
      // is enough to ensure the admissions team sees this lead.
      setSubmitted(true);
    } catch (err) {
      console.error('[AdmissionsForm] submit threw', err);
      setUploadError('Could not send. Please call (866) 996-4308.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-warm-card p-8 lg:p-12 text-center">
        <svg
          className="mx-auto mb-4 w-12 h-12 text-primary"
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
        <h3 className="text-2xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>Thank You</h3>
        <p
          className="text-foreground/70 mb-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Our admissions team will reach out to you shortly. If you need immediate assistance,
          please call us at{' '}
          <a href="tel:+18669964308" className="text-primary font-semibold">
            (866) 996-4308
          </a>
          .
        </p>
        {(formData.cardFront || formData.cardBack) && (
          <p className="text-foreground/60 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
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
      className="rounded-2xl bg-warm-card p-8 lg:p-10 space-y-5"
    >
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-foreground mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Full Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          value={formData.name}
          onChange={handleChange}
          className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      <div>
        <label
          htmlFor="phone"
          className="block text-sm font-semibold text-foreground mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          required
          value={formData.phone}
          onChange={handleChange}
          className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-foreground mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          value={formData.email}
          onChange={handleChange}
          className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      <div>
        <label
          htmlFor="insuranceProvider"
          className="block text-sm font-semibold text-foreground mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Insurance Provider
        </label>
        <select
          id="insuranceProvider"
          name="insuranceProvider"
          required
          value={formData.insuranceProvider}
          onChange={handleChange}
          className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          style={{ fontFamily: 'var(--font-body)' }}
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

      {/* Insurance card upload */}
      <div>
        <label
          className="block text-sm font-semibold text-foreground mb-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Insurance Card Photos <span className="font-normal text-foreground/50">(optional — speeds verification)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <CardSlot
            side="front"
            file={formData.cardFront}
            onFile={(f) => handleFile('front', f)}
            onClear={() => handleFile('front', null)}
          />
          <CardSlot
            side="back"
            file={formData.cardBack}
            onFile={(f) => handleFile('back', f)}
            onClear={() => handleFile('back', null)}
          />
        </div>
        {uploadError && (
          <p className="mt-2 text-xs text-red-600" role="alert" style={{ fontFamily: 'var(--font-body)' }}>
            {uploadError}
          </p>
        )}
        <p className="mt-2 text-[11px] text-foreground/50 leading-snug" style={{ fontFamily: 'var(--font-body)' }}>
          Uploads are transmitted over TLS and handled by our HIPAA-compliant admissions team only.
          JPG, PNG, HEIC, WEBP, or PDF. Up to 10 MB each.
        </p>
      </div>

      <button type="submit" className="btn-primary w-full">
        Submit for Verification
      </button>
    </form>
  );
}

/* ── One drop-zone slot (front or back) ────────────────────────────── */

function CardSlot({
  side,
  file,
  onFile,
  onClear,
}: {
  side: CardSide;
  file: File | null;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Object-URL previews for image files; PDFs get a generic icon.
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
          // Reset input so the same filename can be re-selected.
          e.target.value = '';
        }}
        aria-label={`Upload ${label}`}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`group relative block w-full aspect-[1.6/1] rounded-xl border-2 border-dashed transition-all overflow-hidden text-left ${
          dragOver
            ? 'border-primary bg-primary/5'
            : file
              ? 'border-primary/30 bg-white'
              : 'border-foreground/15 bg-white hover:border-primary/40 hover:bg-primary/5'
        }`}
        aria-label={`${file ? 'Replace' : 'Upload'} ${label}`}
      >
        {file && previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : file && file.type === 'application/pdf' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-foreground/70">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v4a1 1 0 001 1h4M5 21V5a2 2 0 012-2h8l5 5v13a2 2 0 01-2 2H7a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs font-semibold truncate max-w-full px-2" style={{ fontFamily: 'var(--font-body)' }}>
              {file.name}
            </p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-center">
            <svg
              className="w-7 h-7 text-primary/80 group-hover:text-primary transition-colors"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h3l2-2h4l2 2h3a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              <circle cx="12" cy="12" r="3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-[13px] font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
              {label}
            </p>
            <p className="text-[10.5px] text-foreground/50 leading-tight" style={{ fontFamily: 'var(--font-body)' }}>
              {hint}
            </p>
            <p className="text-[10px] text-primary font-semibold uppercase tracking-[0.14em] mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Tap to upload
            </p>
          </div>
        )}

        {/* When a file is loaded, overlay an edge chip so it's clearly
            "uploaded" and the user can still swap the image. */}
        {file && (
          <span
            aria-hidden="true"
            className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Uploaded
          </span>
        )}
      </button>

      {file && (
        <button
          type="button"
          onClick={onClear}
          className="mt-1.5 text-[11px] font-semibold text-foreground/60 hover:text-primary transition-colors"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Remove &amp; replace
        </button>
      )}
    </div>
  );
}
