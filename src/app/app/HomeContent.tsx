'use client';

import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface RecentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in: string | null;
}

function isOnlineNow(lastSignIn: string | null): boolean {
  if (!lastSignIn) return false;
  const diff = Date.now() - new Date(lastSignIn).getTime();
  return diff < 15 * 60 * 1000; // within 15 minutes
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HomeContent() {
  const { user } = useAuth();
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    if (!user) return;

    async function fetchRecentUsers() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, last_sign_in')
        .gte('last_sign_in', today.toISOString())
        .order('last_sign_in', { ascending: false });

      if (data) setRecentUsers(data);
    }

    fetchRecentUsers();
  }, [user]);

  if (!user) return null;

  return (
    <div className="p-6 lg:p-10">
      {/* Recent users row */}
      {recentUsers.length > 0 && (
        <div className="flex items-center gap-3 mb-8">
          <span className="text-xs font-medium text-foreground/40 uppercase tracking-wider mr-1" style={{ fontFamily: 'var(--font-body)' }}>
            Active today
          </span>
          <div className="flex -space-x-2">
            {recentUsers.map((u) => {
              const online = isOnlineNow(u.last_sign_in);
              return (
                <div key={u.id} className="relative group">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.full_name || ''}
                      className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 hover:z-10 ${
                        online
                          ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                          : 'border-white'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 hover:z-10 ${
                        online
                          ? 'border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] bg-primary text-white'
                          : 'border-white bg-primary text-white'
                      }`}
                    >
                      {(u.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-foreground text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <p className="font-medium">{u.full_name || 'User'}</p>
                    <p className="text-white/60">{online ? 'Online now' : `Last active ${timeAgo(u.last_sign_in)}`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          { label: 'Days in Program', value: '--' },
          { label: 'Sessions Completed', value: '--' },
          { label: 'Next Appointment', value: '--' },
          { label: 'Goals Met', value: '--' },
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
