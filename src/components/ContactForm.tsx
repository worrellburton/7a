'use client';

import { useState, type FormEvent } from 'react';

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with backend/API
    setSubmitted(true);
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
                  className="w-full px-4 py-3 bg-white text-foreground rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-4 py-3 bg-white text-foreground rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-4 py-3 bg-white text-foreground rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
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
                  className="w-full px-4 py-3 bg-white text-foreground rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="paymentMethod" className="block text-white text-sm font-medium mb-2">
                  Form of Payment
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  required
                  className="w-full px-4 py-3 bg-white text-foreground rounded-sm text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                >
                  <option value="" disabled>Select</option>
                  <option value="insurance">Insurance</option>
                  <option value="private-pay">Private Pay</option>
                  <option value="other">Other</option>
                </select>
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
              <button type="submit" className="btn-primary px-12">
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
