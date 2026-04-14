'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useEffect, useState } from 'react';

export default function ProfileContent() {
  const { user, session } = useAuth();
  const [jobTitle, setJobTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!session?.access_token || !user) return;
    async function load() {
      const data = await db({ action: 'select', table: 'users', match: { id: user!.id }, select: 'full_name, job_title' });

      if (Array.isArray(data) && data[0]) {
        setFullName(data[0].full_name || '');
        setJobTitle(data[0].job_title || '');
      }
      setLoaded(true);
    }
    load();
  }, [session, user]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const result = await db({
      action: 'update',
      table: 'users',
      data: {
        full_name: fullName.trim() || null,
        job_title: jobTitle.trim() || null,
      },
      match: { id: user.id },
    });

    if (result?.error) {
      showToast(`Failed to save: ${result.error}`);
    } else {
      showToast('Profile updated');
    }
    setSaving(false);
  }

  if (!user) return null;

  const avatarUrl = user.user_metadata?.avatar_url;
  const email = user.email || '';
  const provider = user.app_metadata?.provider || 'email';

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">My Profile</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Manage your account information.
        </p>
      </div>

      <div className="max-w-lg">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* Avatar & Email header */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                {(fullName || email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-foreground">{fullName || 'Unknown'}</p>
              <p className="text-sm text-foreground/40">{email}</p>
              <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 rounded-full bg-warm-bg text-xs font-medium text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
                {provider === 'google' && (
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {provider}
              </span>
            </div>
          </div>

          {!loaded ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Full Name</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Job Title</label>
                <input
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                  placeholder="e.g. Clinical Director"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Email</label>
                <input
                  value={email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-100 text-sm bg-warm-bg/50 text-foreground/50 cursor-not-allowed"
                />
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
