'use client';



import { useState, useRef, useEffect, type FormEvent } from 'react';

const paymentOptions = [
  {
    value: 'insurance',
    label: 'Insurance',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    value: 'private-pay',
    label: 'Private Pay',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
        <path d="M7 15h4" />
      </svg>
    ),
  },
  {
    value: 'other',
    label: 'Other',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

function CustomSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = paymentOptions.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 bg-white text-left rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none flex items-center justify-between gap-2"
        style={{ color: selected ? '#1a1a1a' : '#9ca3af' }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          {selected ? (
            <>
              <span className="text-primary">{selected.icon}</span>
              <span style={{ color: '#1a1a1a' }}>{selected.label}</span>
            </>
          ) : (
            'Select'
          )}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
          role="listbox"
        >
          {paymentOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-2.5 transition-colors ${
                  value === option.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-warm-bg'
                }`}
                style={{ color: value === option.value ? undefined : '#1a1a1a' }}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                role="option"
                aria-selected={value === option.value}
              >
                <span className={value === option.value ? 'text-primary' : 'text-gray-400'}>
                  {option.icon}
                </span>
                {option.label}
                {value === option.value && (
                  <svg className="w-4 h-4 ml-auto text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ContactForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    telephone: '',
    email: '',
    paymentMethod: '',
    consent: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'footer',
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.telephone,
          email: formData.email,
          payment_method: formData.paymentMethod,
          consent: formData.consent,
          page_url: typeof window !== 'undefined' ? window.location.href : null,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setSubmitError(payload.error || `Could not send (HTTP ${res.status}). Please call (866) 996-4308.`);
        return;
      }
      setSubmitted(true);
    } catch (err) {
      console.error('[ContactForm] submit threw', err);
      setSubmitError('Could not send. Please call (866) 996-4308.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="relative py-20 lg:py-28"
      style={{ background: 'var(--color-dark-section)' }}
      aria-labelledby="contact-heading"
    >
      {/* Decorative background icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none" aria-hidden="true">
        <svg className="w-96 h-96 text-primary" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="0.5" />
          <line x1="20" y1="2" x2="20" y2="38" stroke="currentColor" strokeWidth="0.5" />
          <line x1="2" y1="20" x2="38" y2="20" stroke="currentColor" strokeWidth="0.5" />
          <line x1="7" y1="7" x2="33" y2="33" stroke="currentColor" strokeWidth="0.5" />
          <line x1="33" y1="7" x2="7" y2="33" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="20" cy="20" r="4" fill="currentColor" />
        </svg>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.25em] text-primary uppercase mb-4">
            Let Us Help You
          </p>
          <h2
            id="contact-heading"
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight"
          >
            Take the First Step Towards the Rest of Your Life.
          </h2>
        </div>

        {submitted ? (
          <div className="text-center text-white py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-2xl font-bold mb-2">Thank You</h3>
            <p className="text-white/70">We&apos;ll be in touch with you shortly. Your journey to recovery starts now.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-white text-sm font-medium mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  required
                  placeholder="First Name"
                  className="w-full px-4 py-3 bg-white rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  style={{ color: '#1a1a1a' }}
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-white text-sm font-medium mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  required
                  placeholder="Last Name"
                  className="w-full px-4 py-3 bg-white rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  style={{ color: '#1a1a1a' }}
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="telephone" className="block text-white text-sm font-medium mb-2">
                  Telephone
                </label>
                <input
                  type="tel"
                  id="telephone"
                  name="telephone"
                  required
                  placeholder="Telephone"
                  className="w-full px-4 py-3 bg-white rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  style={{ color: '#1a1a1a' }}
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-white text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  placeholder="Email"
                  className="w-full px-4 py-3 bg-white rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  style={{ color: '#1a1a1a' }}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-white text-sm font-medium mb-2">
                  Form of Payment
                </label>
                <CustomSelect
                  value={formData.paymentMethod}
                  onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                />
              </div>
            </div>

            <div>
              <p className="text-white text-sm font-medium mb-2">Consent</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  checked={formData.consent}
                  onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                />
                <span className="text-white/80 text-sm leading-relaxed">
                  I agree to allow Seven Arrows Recovery to contact me via phone call, text message or email.
                </span>
              </label>
            </div>

            <div className="text-center pt-4">
              {submitError && (
                <p className="mb-3 text-red-400 text-sm">{submitError}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-12 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send'}
              </button>
              {submitError && (
                <p
                  role="alert"
                  className="mt-4 text-sm text-[#ffb59a]"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {submitError}
                </p>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
