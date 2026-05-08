'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthProvider';
import { supabase } from '@/lib/supabase';
import JdReminderModalPreview from '@/app/app/levers/JdReminderModalPreview';

// Global listener mounted once at the platform-shell level. Subscribes
// to public.lever_pulls INSERTs filtered to the current user's id and
// renders the matching modal full-screen when one arrives. Also reads
// the pending row on mount so a pull that landed while the user was
// signed out (or on another tab) still surfaces on next load.
//
// Currently dispatches one lever_type ("jd_reminder"); adding more
// levers is a switch-case addition here plus a sibling modal
// component.

interface LeverPullRow {
  id: string;
  lever_type: string;
  target_user_id: string;
  pulled_by_name: string | null;
  pulled_at: string;
  status: 'pending' | 'dismissed' | 'completed';
  metadata: { jd_title?: string | null; jd_signature_id?: string | null };
}

export default function LeverPullListener() {
  const { user } = useAuth();
  const [active, setActive] = useState<LeverPullRow | null>(null);

  // Defensive guard: a jd_reminder pull might have been queued *before*
  // the user signed (signing happens via a different code path that
  // doesn't write to lever_pulls). Without this check the popup would
  // re-fire on every page load until the super admin manually
  // marked it completed. We re-resolve the row's signature from
  // jd_signatures.signer_user_id matching this user to avoid trusting
  // metadata that's bypassable from the client. If the JD is already
  // signed, mark the pull completed and swallow the row.
  const dropIfAlreadySigned = async (row: LeverPullRow): Promise<boolean> => {
    if (row.lever_type !== 'jd_reminder' || !user?.id) return false;
    const sigId = row.metadata?.jd_signature_id;
    if (!sigId) return false;
    const { data: sig } = await supabase
      .from('jd_signatures')
      .select('id, signed_at, signer_user_id')
      .eq('id', sigId)
      .eq('signer_user_id', user.id)
      .maybeSingle();
    if (!sig?.signed_at) return false;
    void supabase
      .from('lever_pulls')
      .update({ status: 'completed', acknowledged_at: new Date().toISOString() })
      .eq('id', row.id);
    return true;
  };

  // Initial fetch: any pending pulls already waiting for this user.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('lever_pulls')
        .select('id, lever_type, target_user_id, pulled_by_name, pulled_at, status, metadata')
        .eq('target_user_id', user.id)
        .eq('status', 'pending')
        .order('pulled_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      const row = (data ?? [])[0] as LeverPullRow | undefined;
      if (!row) return;
      if (await dropIfAlreadySigned(row)) return;
      setActive(row);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Realtime: pop the modal the moment a super admin pulls.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`lever-pulls-${user.id}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lever_pulls',
          filter: `target_user_id=eq.${user.id}`,
        },
        async (payload) => {
          const row = payload.new as LeverPullRow;
          if (row.status !== 'pending') return;
          if (await dropIfAlreadySigned(row)) return;
          setActive(row);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  if (!user || !active) return null;

  if (active.lever_type === 'jd_reminder') {
    const jdTitle = active.metadata?.jd_title ?? null;
    return (
      <JdReminderModalPreview
        recipientName={user.user_metadata?.full_name ?? user.email ?? null}
        jdTitle={jdTitle}
        pulledByName={active.pulled_by_name}
        onAcknowledge={async () => {
          // Mark completed when the user clicks Open & sign — the
          // Link navigates them away, so this fires-and-forgets.
          void supabase
            .from('lever_pulls')
            .update({ status: 'completed', acknowledged_at: new Date().toISOString() })
            .eq('id', active.id);
          setActive(null);
        }}
        onDismiss={async () => {
          void supabase
            .from('lever_pulls')
            .update({ status: 'dismissed', acknowledged_at: new Date().toISOString() })
            .eq('id', active.id);
          setActive(null);
        }}
      />
    );
  }

  // Unknown lever_type — close gracefully so a future lever rolling
  // out before its modal handler doesn't lock the user out of the
  // page.
  return null;
}
