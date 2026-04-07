'use client';



import { useState } from 'react';

export default function ContactPageForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
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
        <h3 className="text-2xl font-bold text-foreground mb-2">Message Sent</h3>
        <p
          className="text-foreground/70"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Thank you for reaching out. A member of our team will get back to you as soon as
          possible. For immediate help, call{' '}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="firstName"
            className="block text-sm font-semibold text-foreground mb-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-sm font-semibold text-foreground mb-1"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
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
          htmlFor="message"
          className="block text-sm font-semibold text-foreground mb-1"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          value={formData.message}
          onChange={handleChange}
          className="w-full rounded-lg border border-foreground/20 bg-white px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      </div>

      <button type="submit" className="btn-primary w-full">
        Send Message
      </button>
    </form>
  );
}
