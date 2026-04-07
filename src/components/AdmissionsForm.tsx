'use client';



import { useState } from 'react';

export default function AdmissionsForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    insuranceProvider: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
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
        <h3 className="text-2xl font-bold text-foreground mb-2">Thank You</h3>
        <p
          className="text-foreground/70"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Our admissions team will reach out to you shortly. If you need immediate assistance,
          please call us at{' '}
          <a href="tel:8669964308" className="text-primary font-semibold">
            (866) 996-4308
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-warm-card p-8 lg:p-12 space-y-6"
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
          <option value="Other">Other</option>
        </select>
      </div>

      <button type="submit" className="btn-primary w-full">
        Submit for Verification
      </button>
    </form>
  );
}
