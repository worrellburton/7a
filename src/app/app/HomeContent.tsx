'use client';

import { useAuth } from '@/lib/AuthProvider';

export default function HomeContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Welcome back, {user.user_metadata?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Here&apos;s an overview of your recovery journey.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Days in Program', value: '--', color: 'bg-primary/10 text-primary' },
          { label: 'Sessions Completed', value: '--', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Next Appointment', value: '--', color: 'bg-blue-50 text-blue-600' },
          { label: 'Goals Met', value: '--', color: 'bg-amber-50 text-amber-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-foreground/40 mb-2" style={{ fontFamily: 'var(--font-body)' }}>{stat.label}</p>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity feed placeholder */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-foreground mb-4">Recent Activity</h2>
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-warm-bg flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
            Your activity will appear here as your treatment progresses.
          </p>
        </div>
      </div>
    </div>
  );
}
