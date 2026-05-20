'use client';

// Phase 8 + 9 + 10 — finalize and send.
//
// Shows the rendered email, the full recipient list, and lets the
// marketer iterate the body one more time before pulling the
// trigger. The Send button calls /api/email-campaigns/send which
// fans out to every recipient via Resend (or logs + records as
// sent_simulated when RESEND_API_KEY isn't configured), then
// flips status='sent' on the campaign row.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface CampaignRow {
  id: string;
  generated_html: string | null;
  generated_subject: string | null;
  status: string;
  sent_at: string | null;
  prompt: string;
  image_urls: string[];
  use_logos: boolean;
  link_to_website: boolean;
  featured_blog_id: string | null;
  featured_employee_id: string | null;
}

interface RecipientRow {
  id: string;
  email: string;
  send_status: string;
  send_error: string | null;
  contacts: { name: string } | { name: string }[] | null;
}

interface DisplayRecipient {
  id: string;
  email: string;
  send_status: string;
  send_error: string | null;
  contactName: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-warm-bg/60 text-foreground/70 border-black/10',
  sent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  skipped: 'bg-amber-50 text-amber-800 border-amber-200',
};

export default function FinalizeContent({ campaignId }: { campaignId: string }) {
  const { session } = useAuth();
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [recipients, setRecipients] = useState<DisplayRecipient[]>([]);
  const [iterateNote, setIterateNote] = useState('');
  const [building, setBuilding] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [campaignRes, recipientsRes] = await Promise.all([
      supabase.from('email_campaigns')
        .select('id, generated_html, generated_subject, status, sent_at, prompt, image_urls, use_logos, link_to_website, featured_blog_id, featured_employee_id')
        .eq('id', campaignId)
        .maybeSingle(),
      supabase.from('email_campaign_recipients')
        .select('id, email, send_status, send_error, contacts(name)')
        .eq('campaign_id', campaignId)
        .order('email', { ascending: true }),
    ]);
    setCampaign(campaignRes.data as CampaignRow | null);
    const rows = (recipientsRes.data ?? []) as RecipientRow[];
    setRecipients(rows.map((r): DisplayRecipient => {
      const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
      return {
        id: r.id,
        email: r.email,
        send_status: r.send_status,
        send_error: r.send_error,
        contactName: c?.name ?? '',
      };
    }));
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled) return;
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const onIterate = async () => {
    if (!campaign || !session?.access_token || iterateNote.trim().length === 0 || building) return;
    setError(null);
    setBuilding(true);
    try {
      const res = await fetch('/api/email-campaigns/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          prompt: campaign.prompt,
          imageUrls: campaign.image_urls,
          useLogos: campaign.use_logos,
          linkToWebsite: campaign.link_to_website,
          featuredBlogId: campaign.featured_blog_id,
          featuredEmployeeId: campaign.featured_employee_id,
          previousHtml: campaign.generated_html,
          iterationNote: iterateNote,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { html?: string; subject?: string; error?: string };
      if (!res.ok || !json.html) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      // Persist the new HTML + (optionally) subject.
      await supabase
        .from('email_campaigns')
        .update({
          generated_html: json.html,
          generated_subject: json.subject || campaign.generated_subject,
          last_iteration_note: iterateNote,
        })
        .eq('id', campaignId);
      setIterateNote('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  };

  const onSend = async () => {
    if (!session?.access_token || sending) return;
    if (!campaign?.generated_html) {
      setError('No email body to send.');
      return;
    }
    if (recipients.length === 0) {
      setError('No recipients selected.');
      return;
    }
    if (!campaign.generated_subject || campaign.generated_subject.trim().length === 0) {
      setError('Subject line is empty.');
      return;
    }
    const ok = window.confirm(`Send this email to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}?`);
    if (!ok) return;
    setError(null);
    setSending(true);
    try {
      const res = await fetch('/api/email-campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ campaignId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: number;
        failed?: number;
        simulated?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-10 text-center text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-10 text-center text-[12.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
        Campaign not found. <Link href="/app/email-campaigns" className="text-primary underline">Back to campaigns</Link>
      </div>
    );
  }

  const isSent = campaign.status === 'sent';
  const sentCount = recipients.filter((r) => r.send_status === 'sent').length;
  const failedCount = recipients.filter((r) => r.send_status === 'failed').length;

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto">
      <header className="mb-5 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/45">
            Email Campaigns · Finalize
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            {isSent ? 'Campaign sent' : 'Review and send'}
          </h1>
          {campaign.generated_subject && (
            <p className="mt-1 text-[13px] text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="font-semibold">Subject:</span> {campaign.generated_subject}
            </p>
          )}
        </div>
        {!isSent && (
          <Link
            href={`/app/email-campaigns/${campaignId}/recipients`}
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            ← Edit recipients
          </Link>
        )}
      </header>

      {isSent && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-[12.5px] text-emerald-900" style={{ fontFamily: 'var(--font-body)' }}>
            Sent to {sentCount} recipient{sentCount === 1 ? '' : 's'}
            {failedCount > 0 && ` · ${failedCount} failed`}.
            {campaign.sent_at && ` Sent at ${new Date(campaign.sent_at).toLocaleString()}.`}
          </p>
        </div>
      )}

      <section className="rounded-2xl border border-black/10 bg-white p-4 mb-4">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-2">
          Email design
        </p>
        <div className="rounded-xl border border-black/10 overflow-hidden bg-warm-bg/30">
          <iframe
            srcDoc={campaign.generated_html ?? ''}
            title="Email preview"
            sandbox=""
            className="w-full h-[560px] bg-white"
          />
        </div>

        {!isSent && (
          <div className="mt-4 rounded-xl border border-black/10 bg-warm-bg/30 p-3">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55 mb-1.5">
              One more iteration?
            </p>
            <textarea
              value={iterateNote}
              onChange={(e) => setIterateNote(e.target.value)}
              rows={2}
              placeholder="Add a P.S. about insurance. Make the CTA button bigger. Soften the closing line."
              className="w-full px-3 py-2 rounded-md border border-black/10 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={onIterate}
                disabled={building || iterateNote.trim().length === 0}
                className="px-3 py-1.5 rounded-md bg-foreground text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-foreground/85 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {building ? 'Iterating…' : 'Iterate'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-black/10 bg-white mb-4">
        <header className="px-4 py-3 border-b border-black/5">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Recipients · {recipients.length}
          </p>
        </header>
        {recipients.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
            No recipients picked yet. <Link href={`/app/email-campaigns/${campaignId}/recipients`} className="text-primary underline">Pick some</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 max-h-[40vh] overflow-y-auto">
            {recipients.map((r) => {
              const tone = STATUS_BADGE[r.send_status] ?? STATUS_BADGE.pending;
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-foreground truncate" style={{ fontFamily: 'var(--font-body)' }}>
                      {r.contactName || r.email}
                    </p>
                    <p className="text-[11px] text-foreground/55 truncate" style={{ fontFamily: 'var(--font-body)' }}>
                      {r.email}{r.send_error ? ` · ${r.send_error}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${tone}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {r.send_status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className="mb-3 text-[12px] text-red-700" role="alert">{error}</p>}

      {!isSent && (
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/app/email-campaigns"
            className="px-4 py-2 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSend}
            disabled={sending || recipients.length === 0}
            className="px-5 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {sending ? 'Sending…' : `Send to ${recipients.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
