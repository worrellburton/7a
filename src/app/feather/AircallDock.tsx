'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AIRCALL_DIAL_EVENT } from '@/lib/aircall-dial';

// Embedded Aircall "Everywhere" softphone. Mounted by PlatformShell for
// staff ONLY on the Calls page (the dedicated calling surface) — it
// doesn't follow the operator onto other pages. The actual telephony
// (audio, dial pad, answer / hold / transfer) lives in Aircall's
// workspace iframe; we wrap it in a dock, react to its events (screen-pop
// / refresh signals), and forward click-to-call requests in.
//
// Loading the iframe is opt-in (a one-time "Connect phone" click,
// remembered in localStorage) so it only loads for operators who use it;
// the flag re-hydrates `connected` each time the Calls page mounts the dock.
//
// Mobile: the bottom dock eats scarce screen real estate, so on phones the
// connect / sign-in control lives at the TOP and the persistent dock only
// appears once the operator is actually logged into Aircall. Before that
// the workspace stays mounted off-screen (so it can load + ring) and opens
// as a panel only when the operator taps "Sign in". Desktop is unchanged.

const CONNECTED_KEY = 'sa-aircall-connected';
const WORKSPACE_DOM_ID = 'aircall-workspace';

interface IncomingInfo { from?: string; to?: string; call_id?: number | string }

function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function AircallDock() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [incoming, setIncoming] = useState<IncomingInfo | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // The SDK instance. Untyped beyond our shim; held in a ref so React
  // re-renders never re-instantiate the workspace (which would reload the
  // iframe and drop an in-progress call).
  const phoneRef = useRef<import('aircall-everywhere').default | null>(null);
  const initStartedRef = useRef(false);

  // Hydrate the opt-in flag.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem(CONNECTED_KEY) === '1') setConnected(true);
  }, []);

  // Track the phone breakpoint so the dock can relocate its controls.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // Initialise the Aircall workspace once the user has opted in and the
  // container is in the DOM. Dynamically imported so the SDK never ends
  // up in the SSR/initial bundle.
  useEffect(() => {
    if (!connected || initStartedRef.current) return;
    initStartedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const { default: AircallWorkspace } = await import('aircall-everywhere');
        if (cancelled) return;
        const phone = new AircallWorkspace({
          domToLoadWorkspace: `#${WORKSPACE_DOM_ID}`,
          size: 'auto',
          onLogin: () => setLoggedIn(true),
          onLogout: () => setLoggedIn(false),
        });
        phone.on('incoming_call', (data) => {
          setIncoming(data as IncomingInfo);
          setOpen(true);
          window.dispatchEvent(new CustomEvent('aircall:incoming', { detail: data }));
        });
        phone.on('call_end_ringtone', (data) => {
          // Answered or missed — keep the banner until the call ends.
          window.dispatchEvent(new CustomEvent('aircall:answered', { detail: data }));
        });
        phone.on('outgoing_call', (data) => {
          setIncoming(null);
          window.dispatchEvent(new CustomEvent('aircall:outgoing', { detail: data }));
        });
        phone.on('call_ended', (data) => {
          setIncoming(null);
          // The webhook + Realtime already refresh the log; this is a
          // belt-and-suspenders nudge for any open Calls view.
          window.dispatchEvent(new CustomEvent('aircall:call_ended', { detail: data }));
        });
        phoneRef.current = phone;
      } catch (err) {
        console.error('[AircallDock] failed to load workspace', err);
        initStartedRef.current = false;
      }
    })();
    return () => { cancelled = true; };
  }, [connected]);

  // Forward click-to-call requests from anywhere in feather.
  const handleDial = useCallback((number: string) => {
    if (!connected) {
      // Opt in first, then the operator can place the call once logged in.
      setConnected(true);
      window.localStorage.setItem(CONNECTED_KEY, '1');
    }
    setOpen(true);
    const phone = phoneRef.current;
    if (phone) {
      phone.send('dial_number', { phone_number: number }, () => {});
    }
  }, [connected]);

  useEffect(() => {
    const onDial = (e: Event) => {
      const detail = (e as CustomEvent).detail as { number?: string };
      if (detail?.number) handleDial(detail.number);
    };
    window.addEventListener(AIRCALL_DIAL_EVENT, onDial);
    return () => window.removeEventListener(AIRCALL_DIAL_EVENT, onDial);
  }, [handleDial]);

  const connect = () => {
    setConnected(true);
    setOpen(true);
    if (typeof window !== 'undefined') window.localStorage.setItem(CONNECTED_KEY, '1');
  };

  // Not connected yet → a small launcher. On mobile it sits at the top so
  // it doesn't camp at the bottom of the screen.
  if (!connected) {
    return (
      <button
        onClick={connect}
        className={`fixed z-[60] inline-flex items-center gap-2 rounded-full bg-primary text-white pl-3 pr-4 py-2.5 shadow-lg hover:bg-primary-dark transition-colors ${isMobile ? 'top-3 left-1/2 -translate-x-1/2' : 'bottom-5 right-5'}`}
        style={{ fontFamily: 'var(--font-body)' }}
        aria-label="Connect Aircall phone"
      >
        <PhoneIcon />
        <span className="text-xs font-semibold uppercase tracking-wider">Connect phone</span>
      </button>
    );
  }

  // Connected. On mobile the persistent bottom dock only appears once the
  // operator is logged in; until then we keep the workspace mounted (so it
  // can load + ring) but moved off-screen, and surface a top launcher that
  // opens it as a sign-in panel on demand.
  const mobileNeedsLogin = isMobile && loggedIn !== true;
  const overlay = mobileNeedsLogin && open;        // full-width sign-in panel
  const hiddenMounted = mobileNeedsLogin && !open; // mounted, parked off-screen

  const containerClass = hiddenMounted
    ? 'fixed left-[-9999px] top-0 z-[60]'
    : overlay
      ? 'fixed inset-x-3 top-16 bottom-3 z-[60] flex flex-col'
      : 'fixed bottom-5 right-5 z-[60]';
  const headerWidth = overlay ? 'w-full' : 'w-[340px] max-w-[calc(100vw-2.5rem)]';
  const hostWrapClass = overlay
    ? 'bg-white border-x border-b border-foreground/10 rounded-b-2xl shadow-lg overflow-hidden flex-1'
    : `bg-white border-x border-b border-foreground/10 rounded-b-2xl shadow-lg overflow-hidden transition-all ${open ? 'opacity-100' : 'h-0 opacity-0 pointer-events-none'}`;
  const hostClass = overlay ? 'w-full h-full' : 'w-[340px] max-w-[calc(100vw-2.5rem)] h-[480px]';

  return (
    <>
      {/* Mobile top launcher — appears only while sign-in is still needed. */}
      {mobileNeedsLogin && !open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 rounded-full bg-foreground/90 text-white pl-3 pr-4 py-2 shadow-lg"
          style={{ fontFamily: 'var(--font-body)' }}
          aria-label="Sign in to Aircall"
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <PhoneIcon />
          <span className="text-xs font-semibold uppercase tracking-wider">Sign in to Aircall</span>
        </button>
      )}

      <div className={containerClass} style={{ fontFamily: 'var(--font-body)' }}>
        {/* Dock header / launcher bar. */}
        <div className={`flex items-center justify-between gap-2 rounded-t-2xl bg-foreground/90 text-white px-3 py-2 shadow-lg ${headerWidth}`}>
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 rounded-full ${loggedIn ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider truncate">
              {incoming ? `Incoming · ${incoming.from ?? ''}` : loggedIn === false ? 'Aircall · sign in' : loggedIn ? 'Aircall phone' : 'Aircall · sign in'}
            </span>
          </button>
          <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Minimise' : 'Expand'} className="text-white/70 hover:text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={open ? 'M19 9l-7 7-7-7' : 'M5 15l7-7 7 7'} />
            </svg>
          </button>
        </div>

        {/* Incoming-call banner with a jump to the live log (dock mode). */}
        {incoming && open && !overlay && (
          <div className="bg-emerald-50 border-x border-emerald-200 px-3 py-2 w-[340px] max-w-[calc(100vw-2.5rem)] flex items-center justify-between gap-2">
            <span className="text-xs text-emerald-800 truncate">📞 {incoming.from ?? 'Unknown'} calling…</span>
            <button onClick={() => router.push('/feather/calls')} className="text-[11px] font-semibold text-emerald-700 hover:underline shrink-0">Open log</button>
          </div>
        )}

        {/* Workspace iframe host. Kept mounted whenever connected (so it
            rings even when minimised / parked off-screen); collapsed to
            zero height when the dock is closed rather than unmounted. */}
        <div className={hostWrapClass} aria-hidden={!open && !overlay}>
          <div id={WORKSPACE_DOM_ID} className={hostClass} />
        </div>
      </div>
    </>
  );
}
