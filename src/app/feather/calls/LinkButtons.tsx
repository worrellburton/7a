'use client';

import { useCallback, useEffect, useState } from 'react';

export function CopyCallLinkButton({ callId }: { callId: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/app/calls/${encodeURIComponent(callId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked — leave feedback off */ }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={copied ? 'Copied!' : 'Copy shareable link to this call'}
      className={`inline-flex items-center justify-center w-5 h-5 rounded transition-colors ${copied ? 'text-emerald-600' : 'text-foreground/30 hover:text-foreground/70'}`}
    >
      {copied ? (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 11-5.656-5.656l1.101-1.101m11.314-11.314l1.101-1.101a4 4 0 115.656 5.656l-4 4a4 4 0 01-5.656 0M10 14L14 10" />
        </svg>
      )}
    </button>
  );
}

export function OperatorCallLinkButton({ ctmId, onOpen }: { ctmId: string; onOpen: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/app/calls/${encodeURIComponent(ctmId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  return (
    <span className="inline-flex items-center shrink-0">
      <button
        type="button"
        onClick={copyLink}
        title={copied ? 'Link copied' : 'Copy shareable link'}
        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-warm-bg hover:bg-primary hover:text-white text-foreground/60'}`}
      >
        {copied ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-4 4a4 4 0 11-5.656-5.656l1.101-1.101m11.314-11.314l1.101-1.101a4 4 0 115.656 5.656l-4 4a4 4 0 01-5.656 0M10 14L14 10" />
          </svg>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen(); }}
        title="Open in Call Log"
        className="ml-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 bg-warm-bg hover:bg-primary hover:text-white text-foreground/60"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </span>
  );
}

export function SyncStatusIndicator({ token }: { token: string | null }) {
  const [status, setStatus] = useState<{ last_synced_at: string | null; total_calls: number } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/ctm/sync-status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStatus(await res.json());
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const triggerSync = async () => {
    if (!token || syncing) return;
    setSyncing(true);
    try {
      await fetch('/api/ctm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      await refresh();
    } finally {
      setSyncing(false);
    }
  };

  const ago = (() => {
    if (!status?.last_synced_at) return 'never';
    const diff = Math.max(0, now - new Date(status.last_synced_at).getTime());
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  })();

  return (
    <p className="mt-1 text-[10px] sm:text-[11px] text-foreground/40 inline-flex items-center gap-1.5 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
      <span className="inline-flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${status?.last_synced_at ? 'bg-emerald-500' : 'bg-gray-300'}`} />
        Last synced {ago}
      </span>
      <span className="text-foreground/25">·</span>
      <button
        type="button"
        onClick={triggerSync}
        disabled={syncing || !token}
        className="inline-flex items-center gap-1 text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <svg className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
    </p>
  );
}
