'use client';

// ------------------------------------------------------------
// Shared client-side QuickBooks connection state + header UI.
//
// Both /app/finance and /app/reports need the same thing: list connected
// companies, let admins pick one, connect another, or disconnect. Rather
// than duplicate the logic, both pages call `useQuickBooksConnection()`
// to get the state + actions, and render <QuickBooksHeader /> inline.
// ------------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useModal } from '@/lib/ModalProvider';

export interface QuickBooksCompany {
  realm_id: string;
  expires_at: string;
  updated_at: string;
}

interface UseQuickBooksConnectionOptions {
  // When true the hook will load the company list on mount. Pages that
  // only need the header without listing can set this to false.
  autoLoad?: boolean;
}

export function useQuickBooksConnection(opts: UseQuickBooksConnectionOptions = {}) {
  const { autoLoad = true } = opts;
  const searchParams = useSearchParams();
  const { confirm } = useModal();

  const [companies, setCompanies] = useState<QuickBooksCompany[] | null>(null);
  const [selectedRealm, setSelectedRealm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Surface OAuth callback feedback in the URL.
  useEffect(() => {
    const err = searchParams.get('error');
    const connected = searchParams.get('connected');
    const justConnectedRealm = searchParams.get('realm_id');
    if (err) {
      setError(decodeURIComponent(err));
    } else if (connected) {
      showToast('QuickBooks connected successfully');
      if (justConnectedRealm) setSelectedRealm(justConnectedRealm);
    }
  }, [searchParams, showToast]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/quickbooks/data?report=list', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) setError('Admin access required');
        else if (res.status === 401) setError('Please sign in');
        return;
      }
      const body = (await res.json()) as { companies?: QuickBooksCompany[] };
      const list = body.companies || [];
      setCompanies(list);
      setSelectedRealm((cur) => cur ?? (list[0]?.realm_id ?? null));
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) return;
    loadCompanies();
  }, [autoLoad, loadCompanies]);

  const handleConnect = useCallback(() => {
    window.location.href = '/api/quickbooks/auth';
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!selectedRealm) return;
    const ok = await confirm('Disconnect this QuickBooks company?', {
      message: `Realm ${selectedRealm} will be revoked at Intuit. You can reconnect at any time.`,
      confirmLabel: 'Disconnect',
      tone: 'danger',
    });
    if (!ok) return;
    const res = await fetch(
      `/api/quickbooks/disconnect?realm_id=${encodeURIComponent(selectedRealm)}`,
      { method: 'POST', credentials: 'include' }
    );
    if (res.ok) {
      showToast('Disconnected');
      setSelectedRealm(null);
      loadCompanies();
    } else {
      showToast('Failed to disconnect');
    }
  }, [selectedRealm, confirm, loadCompanies, showToast]);

  return {
    companies,
    selectedRealm,
    setSelectedRealm,
    loadingList: companies === null,
    hasCompanies: !!companies && companies.length > 0,
    error,
    setError,
    toast,
    showToast,
    loadCompanies,
    handleConnect,
    handleDisconnect,
  };
}

// Human-readable relative time for the "last updated" indicator.
export function fmtRelativeTime(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.round((now - then) / 1000));
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

interface HeaderProps {
  title: string;
  subtitle: string;
  hasCompanies: boolean;
  selectedRealm: string | null;
  lastUpdated: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function QuickBooksHeader({
  title,
  subtitle,
  hasCompanies,
  selectedRealm,
  lastUpdated,
  onConnect,
  onDisconnect,
}: HeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
      <div>
        <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">{title}</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          {subtitle}
        </p>
      </div>
      <div className="flex items-center">
        {hasCompanies ? (
          <QuickBooksConnectionPill
            lastUpdated={lastUpdated}
            canDisconnect={!!selectedRealm}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
          />
        ) : (
          <button
            onClick={onConnect}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2ca01c] text-white rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-[#248a17] transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Connect to QuickBooks
          </button>
        )}
      </div>
    </div>
  );
}

// Compact connection pill with overflow menu for connect-another /
// disconnect. Replaces the old three-row stack (pill + updated line +
// two buttons) which felt loud and cluttered.
function QuickBooksConnectionPill({
  lastUpdated,
  canDisconnect,
  onConnect,
  onDisconnect,
}: {
  lastUpdated: string | null;
  canDisconnect: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <div className="inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900">
        <span className="relative flex w-2 h-2 shrink-0">
          <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-semibold" style={{ fontFamily: 'var(--font-body)' }}>
          Connected
        </span>
        {lastUpdated && (
          <span
            className="text-[11px] text-emerald-700/60 tabular-nums font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            · {fmtRelativeTime(lastUpdated)}
          </span>
        )}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Connection options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="ml-1 w-6 h-6 rounded-full inline-flex items-center justify-center text-emerald-800/60 hover:bg-emerald-100 hover:text-emerald-900 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-30 w-56 py-1.5 rounded-xl bg-white shadow-xl border border-gray-100 animate-[fadeSlideUp_0.15s_ease-out]"
        >
          <button
            role="menuitem"
            onClick={() => { setMenuOpen(false); onConnect(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-warm-bg/60 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5 text-foreground/50 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Connect another company
          </button>
          {canDisconnect && (
            <button
              role="menuitem"
              onClick={() => { setMenuOpen(false); onDisconnect(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5L21 3m0 0h-5.25M21 3v5.25M9 4.5H6a2.25 2.25 0 00-2.25 2.25v12a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-3" />
              </svg>
              Disconnect this company
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface RealmPickerProps {
  companies: QuickBooksCompany[];
  selectedRealm: string | null;
  onSelect: (realm: string) => void;
}

export function QuickBooksRealmPicker({ companies, selectedRealm, onSelect }: RealmPickerProps) {
  if (companies.length <= 1) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {companies.map((c) => (
        <button
          key={c.realm_id}
          onClick={() => onSelect(c.realm_id)}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            selectedRealm === c.realm_id
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-warm-bg/50 border-gray-200 text-foreground/60 hover:bg-warm-bg'
          }`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Realm {c.realm_id}
        </button>
      ))}
    </div>
  );
}

export function QuickBooksGettingStarted() {
  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
      <p className="text-xs font-semibold text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
        Getting started
      </p>
      <p className="text-xs text-amber-800" style={{ fontFamily: 'var(--font-body)' }}>
        Click <strong>Connect to QuickBooks</strong> to authorize an Intuit company. Make sure{' '}
        <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_CLIENT_ID</code> and{' '}
        <code className="bg-amber-100 px-1 py-0.5 rounded">QUICKBOOKS_CLIENT_SECRET</code> are set
        in the deployment env, and the redirect URI{' '}
        <code className="bg-amber-100 px-1 py-0.5 rounded">
          {typeof window !== 'undefined' ? window.location.origin : ''}/api/quickbooks/callback
        </code>{' '}
        is registered on Intuit&apos;s developer portal.
      </p>
    </div>
  );
}

export function QuickBooksToast({ toast }: { toast: string | null }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeSlideUp_0.3s_ease-out]">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-white text-sm font-medium shadow-xl">
        <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {toast}
      </div>
    </div>
  );
}
