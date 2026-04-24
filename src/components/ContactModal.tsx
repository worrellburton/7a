'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

// Centered overlay modal with a compact contact form. Posts to
// /api/public/contact with source='contact_page' so submissions
// land in the same admin Forms list as /contact-page entries.
//
// Triggered from the floating "Contact Us" CTA (see
// FloatingContactCTA.tsx). Lives at the document root via createPortal
// so the backdrop covers all stacking contexts regardless of the
// caller's z-index.

interface FormState {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  message: '',
};

export default function ContactModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while the modal is open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  // Reset internal state whenever the modal closes so the next open
  // gets a fresh form (and clears any prior success / error).
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => {
      setForm(EMPTY);
      setSubmitted(false);
      setError(null);
    }, 200);
    return () => clearTimeout(t);
  }, [open]);

  if (!mounted || !open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'contact_page',
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          email: form.email,
          message: form.message,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError('Could not send. Please call (866) 996-4308.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Could not send. Please call (866) 996-4308.');
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" aria-hidden="true" />
      <div
        className="relative bg-warm-card rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full text-foreground/50 hover:text-foreground hover:bg-black/5 flex items-center justify-center text-xl leading-none transition-colors"
        >
          ×
        </button>

        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-6">
              <svg className="mx-auto mb-4 w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h3 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: 'var(--font-display)' }}>
                Message Sent
              </h3>
              <p className="text-foreground/70 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                Thank you for reaching out. A member of our team will get back to you shortly. For immediate help, call <a href="tel:8669964308" className="text-primary font-semibold">(866) 996-4308</a>.
              </p>
            </div>
          ) : (
            <>
              <h3 id="contact-modal-title" className="text-xl font-bold text-foreground mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Contact Us
              </h3>
              <p className="text-sm text-foreground/60 mb-5" style={{ fontFamily: 'var(--font-body)' }}>
                Send a message and we&rsquo;ll get back to you. For immediate help, call <a href="tel:8669964308" className="text-primary font-semibold">(866) 996-4308</a>.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="First Name" required>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      type="text"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </Field>
                </div>

                <Field label="Phone">
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>

                <Field label="Email" required>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </Field>

                <Field label="Message" required>
                  <textarea
                    rows={4}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-foreground/15 bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                </Field>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 bg-primary hover:bg-primary-dark text-white rounded-lg px-5 py-3 text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1 text-xs font-semibold text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
        {label}{required && <span className="text-primary">*</span>}
      </span>
      {children}
    </label>
  );
}
