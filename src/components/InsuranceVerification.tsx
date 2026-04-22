'use client';



import { useState, type FormEvent } from 'react';

export default function InsuranceVerification() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    insurance: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-16 lg:py-20 bg-white" aria-labelledby="insurance-heading">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-soft p-8 lg:p-12">
          <div className="text-center mb-8">
            <p className="section-label justify-center mb-3">Insurance Verification</p>
            <h2 id="insurance-heading" className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-3">
              Verify Your Benefits in Minutes
            </h2>
            <p className="text-foreground/60 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
              Most major insurance plans cover addiction treatment. We&apos;ll check your benefits
              and get back to you within 15 minutes.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <svg className="w-14 h-14 mx-auto mb-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-bold mb-2">We&apos;re On It</h3>
              <p className="text-foreground/60">Our admissions team will verify your benefits and call you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="vob-name" className="block text-sm font-medium text-foreground mb-1">Your Name</label>
                <input
                  type="text"
                  id="vob-name"
                  required
                  placeholder="Full name"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="vob-phone" className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                <input
                  type="tel"
                  id="vob-phone"
                  required
                  placeholder="(555) 555-5555"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="vob-insurance" className="block text-sm font-medium text-foreground mb-1">Insurance Provider</label>
                <select
                  id="vob-insurance"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none appearance-none bg-white"
                  value={formData.insurance}
                  onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
                >
                  <option value="" disabled>Select provider</option>
                  <option value="aetna">Aetna</option>
                  <option value="bcbs">Blue Cross Blue Shield</option>
                  <option value="cigna">Cigna</option>
                  <option value="humana">Humana</option>
                  <option value="united">UnitedHealthcare</option>
                  <option value="tricare">TRICARE</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="sm:col-span-3 text-center pt-2">
                <button type="submit" className="btn-primary px-10">
                  Verify My Insurance
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
