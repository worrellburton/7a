'use client';

import { useAuth } from '@/lib/AuthProvider';

export default function ComplianceContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Compliance</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Regulatory compliance tracking and documentation.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 text-center py-20">
        <div className="w-14 h-14 rounded-2xl bg-warm-bg flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-foreground/25" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground/50 mb-1">Coming soon</p>
        <p className="text-xs text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
          Compliance tracking features are being developed.
        </p>
      </div>
    </div>
  );
}
