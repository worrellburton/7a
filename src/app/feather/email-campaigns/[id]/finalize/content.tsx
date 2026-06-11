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
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import { useModal } from '@/lib/ModalProvider';
import { BuildProgress } from '../../BuildProgress';
import { CancelButton } from '../../new/content';

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
  include_phone: boolean;
  include_quote: boolean;
  include_insurance_strip: boolean;
  include_social_footer: boolean;
  dark_mode: boolean;
  featured_blog_id: string | null;
  featured_episode_slug: string | null;
  featured_page_path: string | null;
  featured_equine_id: string | null;
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
  const { session, isAdmin, isSuperAdmin } = useAuth();
  const modal = useModal();
  // The "Super Admin" toggle on /app/admin/user-permissions writes
  // users.is_admin (not is_super_admin), so this surface accepts
  // either. Keeping a single canSend flag means the banner, button
  // disabled state, and button label all flip together.
  const canSend = isAdmin || isSuperAdmin;
  // Preview mode (?preview=1) — entered from the Preview button on
  // the campaigns index. Renders the email + the iterate textarea
  // but suppresses the Send + Schedule controls so a marketer who
  // just wants to tweak a scheduled campaign's content can't
  // accidentally bypass its scheduled_at by clicking Send Now.
  // Iterating still updates generated_html / generated_subject in
  // place; status and scheduled_at are never touched by /build.
  const searchParams = useSearchParams();
  const previewMode = searchParams?.get('preview') === '1';
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [recipients, setRecipients] = useState<DisplayRecipient[]>([]);
  const [iterateNote, setIterateNote] = useState('');
  const [building, setBuilding] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Schedule-send modal state. Mirrors the picker on the recipients
  // page so a marketer who's already on Review and Send doesn't have
  // to step backward to queue a later send time.
  const router = useRouter();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Send-confirm modal. Replaced native window.confirm which is too
  // easy to click past on mobile and gives no real friction for a
  // multi-hundred-recipient blast. Above the SEND_TYPED_THRESHOLD
  // the modal also requires typing the recipient count exactly so
  // a misclick can't fire to a large list.
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sendConfirmTyped, setSendConfirmTyped] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const buildControllerRef = useRef<AbortController | null>(null);
  const onCancelBuild = () => {
    buildControllerRef.current?.abort();
    buildControllerRef.current = null;
  };
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [campaignRes, recipientsRes] = await Promise.all([
      supabase.from('email_campaigns')
        .select('id, generated_html, generated_subject, status, sent_at, prompt, image_urls, use_logos, link_to_website, include_phone, include_quote, include_insurance_strip, include_social_footer, dark_mode, featured_blog_id, featured_episode_slug, featured_page_path, featured_employee_id, featured_equine_id')
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
    const controller = new AbortController();
    buildControllerRef.current = controller;
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
          includePhone: campaign.include_phone,
          includeQuote: campaign.include_quote,
          includeInsuranceStrip: campaign.include_insurance_strip,
          includeSocialFooter: campaign.include_social_footer,
          // Dark mode retired — rebuilds always render the light palette.
          darkMode: false,
          featuredBlogId: campaign.featured_blog_id,
          featuredEpisodeSlug: campaign.featured_episode_slug,
          featuredPagePath: campaign.featured_page_path,
          featuredEquineId: campaign.featured_equine_id,
          featuredEmployeeId: campaign.featured_employee_id,
          previousHtml: campaign.generated_html,
          iterationNote: iterateNote,
        }),
        signal: controller.signal,
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
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      buildControllerRef.current = null;
      setBuilding(false);
    }
  };

  // "Reset failed to pending" path. The send loop only processes
  // recipients with send_status='pending'; once a row is marked
  // failed it stays that way until we explicitly reset it. This
  // gives the marketer a one-click path to retry after fixing the
  // underlying issue (e.g. verifying their Resend domain).
  const onRetryFailed = async () => {
    if (sending) return;
    setError(null);
    try {
      const { error: updErr } = await supabase
        .from('email_campaign_recipients')
        .update({ send_status: 'pending', send_error: null, sent_at: null })
        .eq('campaign_id', campaignId)
        .eq('send_status', 'failed');
      if (updErr) throw new Error(updErr.message);
      // If the campaign was flipped to 'sent' or 'failed' previously,
      // bring it back to 'finalizing' so the Send button works again.
      if (campaign && (campaign.status === 'sent' || campaign.status === 'failed')) {
        await supabase
          .from('email_campaigns')
          .update({ status: 'finalizing', sent_at: null })
          .eq('id', campaignId);
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  // Click-through validation. If it passes, open the confirm modal;
  // actual send fires from `confirmAndSend` below. Keeping the modal
  // step decoupled means a stale-state validation error (no body, no
  // recipients, etc.) can't be hidden under the confirmation flow —
  // we surface it inline first.
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
    const pendingNow = recipients.filter((r) => r.send_status === 'pending').length;
    if (pendingNow === 0) {
      setError('Nothing pending to send. Reset failed to pending if you want to retry.');
      return;
    }
    if (!campaign.generated_subject || campaign.generated_subject.trim().length === 0) {
      setError('Subject line is empty.');
      return;
    }
    setError(null);
    setSendConfirmTyped('');
    setSendConfirmOpen(true);
  };

  const confirmAndSend = async () => {
    if (!session?.access_token || sending) return;
    if (!campaign?.generated_html) return;
    setSendConfirmOpen(false);
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

  // Schedule send · validates the picked datetime, then POSTs to
  // /api/email-campaigns/schedule. On success routes to the
  // Sending schedule view with a banner.
  const onConfirmSchedule = async () => {
    if (!session?.access_token || scheduling) return;
    if (!scheduleDateTime) { setError('Pick a date and time.'); return; }
    const sendAt = new Date(scheduleDateTime);
    if (Number.isNaN(sendAt.getTime())) { setError('That date is not valid.'); return; }
    if (sendAt.getTime() < Date.now()) { setError('Schedule time must be in the future.'); return; }
    setError(null);
    setScheduling(true);
    try {
      const res = await fetch('/api/email-campaigns/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ campaignId, sendAt: sendAt.toISOString() }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || json.ok === false) {
        setError(json.error ?? `HTTP ${res.status}`);
        return;
      }
      setScheduleOpen(false);
      router.push(`/feather/email-campaigns/scheduled?scheduledFor=${encodeURIComponent(sendAt.toISOString())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setScheduling(false);
    }
  };

  // One-click resend of just the failed rows from a sent campaign.
  // Resets `failed` → `pending` + brings the campaign row back to
  // `finalizing` so /api/email-campaigns/send re-enters its loop,
  // then immediately fires the send. Successful rows stay sent
  // because the send route only picks up pending ones.
  const onResendFailed = async () => {
    if (!session?.access_token || sending) return;
    const failedNow = recipients.filter((r) => r.send_status === 'failed').length;
    if (failedNow === 0) return;
    const ok = await modal.confirm(`Resend to ${failedNow} failed recipient${failedNow === 1 ? '' : 's'}?`, {
      message: 'Marks those rows pending and re-fires the send. Successful rows stay sent.',
      confirmLabel: 'Resend',
    });
    if (!ok) return;
    setError(null);
    setSending(true);
    try {
      const { error: updErr } = await supabase
        .from('email_campaign_recipients')
        .update({ send_status: 'pending', send_error: null, sent_at: null })
        .eq('campaign_id', campaignId)
        .eq('send_status', 'failed');
      if (updErr) throw new Error(updErr.message);
      if (campaign && (campaign.status === 'sent' || campaign.status === 'failed')) {
        await supabase
          .from('email_campaigns')
          .update({ status: 'finalizing', sent_at: null })
          .eq('id', campaignId);
      }
      const res = await fetch('/api/email-campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ campaignId }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean; sent?: number; failed?: number; error?: string;
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
        Campaign not found. <Link href="/feather/email-campaigns" className="text-primary underline">Back to campaigns</Link>
      </div>
    );
  }

  const isSent = campaign.status === 'sent';
  const sentCount = recipients.filter((r) => r.send_status === 'sent').length;
  const failedCount = recipients.filter((r) => r.send_status === 'failed').length;
  const pendingCount = recipients.filter((r) => r.send_status === 'pending').length;
  // Sniff the most common Resend failure modes so we can surface an
  // actionable banner at the top of the page instead of leaving the
  // marketer to decode an HTTP status from the per-row line.
  //
  // Three distinct cases land here:
  //   (a) "domain is not verified" / "validation_error" / "testing
  //       emails to your own email" — Resend's sandbox mode (no
  //       verified domain yet). Fix: verify a domain.
  //   (b) "daily_quota_exceeded" — free-tier 100/day cap or paid-
  //       tier daily limit reached. Fix: wait until the cap resets
  //       or upgrade the Resend plan. NOT a sandbox issue and means
  //       the account is actively sending to externals.
  //
  // Quota errors take precedence: if ANY recipient failed with
  // daily_quota_exceeded the account is provably past sandbox (it
  // accepted external sends and Resend metered them), so we suppress
  // the sandbox banner and surface the quota banner instead. This
  // fixes the false-positive where old validation_error rows from a
  // pre-domain-verify send kept the sandbox banner stuck on after
  // the domain was verified and the account hit its daily cap.
  const sendErrorJoined = recipients.map((r) => r.send_error ?? '').join('\n');
  const quotaExceeded = /daily_quota_exceeded|reached your daily email sending quota|HTTP 429/i.test(sendErrorJoined);
  // Drop the bare `validation_error` token from the sandbox-detect
  // regex — it false-positives on every Resend 422 (e.g. broadcast
  // name > 70 chars, missing audience, invalid from address), all
  // of which are unrelated to the no-verified-domain sandbox state.
  // Anchoring on the actual sandbox phrasing keeps the banner
  // accurate without snagging unrelated 422s.
  const resendBlockedByDomain = !quotaExceeded
    && /domain is not verified|verify.*domain|testing emails to your own/i.test(sendErrorJoined);

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
            href={`/feather/email-campaigns/${campaignId}/recipients`}
            className="px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            ← Edit recipients
          </Link>
        )}
        {isSent && canSend && (
          <Link
            href={`/feather/email-campaigns/${campaignId}/recipients`}
            className="px-3.5 py-2 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 inline-flex items-center gap-1.5"
            style={{ fontFamily: 'var(--font-body)' }}
            title="Add more contacts to this campaign. Already-sent recipients are preserved; only newly-added ones receive the email."
          >
            📩 Send to more contacts
          </Link>
        )}
      </header>

      {isSent && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start justify-between gap-3 flex-wrap">
          <p className="text-[12.5px] text-emerald-900" style={{ fontFamily: 'var(--font-body)' }}>
            Sent to {sentCount} recipient{sentCount === 1 ? '' : 's'}
            {failedCount > 0 && ` · ${failedCount} failed`}.
            {campaign.sent_at && ` Sent at ${new Date(campaign.sent_at).toLocaleString()}.`}
          </p>
          {failedCount > 0 && canSend && (
            <button
              type="button"
              onClick={onResendFailed}
              disabled={sending}
              className="shrink-0 px-3.5 py-2 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-body)' }}
              title={`Re-send this campaign to the ${failedCount} recipient${failedCount === 1 ? '' : 's'} whose first attempt failed. Successful rows are skipped.`}
            >
              {sending ? 'Resending…' : `↻ Resend to ${failedCount} failed`}
            </button>
          )}
        </div>
      )}

      {/* Top-of-page actionable error banner. The Resend domain
          verification flow is the single most common cause of a
          batch failing, so we sniff for it and surface the next
          step directly instead of leaving the per-row message as
          the only signal. */}
      {resendBlockedByDomain && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-red-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Resend is in sandbox mode
          </p>
          <p className="text-[13px] text-red-900 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Until a domain is verified, Resend only lets you send emails to the email address that owns the Resend account. That's why every external recipient came back as <code className="bg-red-100 px-1 py-0.5 rounded">validation_error</code>. The fix is a one-time DNS setup on your domain.
          </p>
          <p className="mt-3 text-[12.5px] font-bold uppercase tracking-[0.22em] text-red-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            How to unblock
          </p>
          <ol className="text-[13px] text-red-900 leading-relaxed list-decimal pl-5 space-y-1" style={{ fontFamily: 'var(--font-body)' }}>
            <li>
              Open{' '}
              <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline font-semibold">resend.com/domains</a>{' '}
              and add <code className="bg-red-100 px-1 py-0.5 rounded">sevenarrowsrecoveryarizona.com</code>.
            </li>
            <li>
              Resend gives you 3 DNS records (one MX, two TXT for SPF + DKIM). Add them at your domain registrar (GoDaddy / Squarespace / Cloudflare / wherever the DNS for sevenarrowsrecoveryarizona.com lives). Propagation usually takes 5 to 60 minutes.
            </li>
            <li>
              Once Resend marks the domain as verified, in Vercel set{' '}
              <code className="bg-red-100 px-1 py-0.5 rounded">EMAIL_FROM</code> to something like{' '}
              <code className="bg-red-100 px-1 py-0.5 rounded">&quot;Seven Arrows Recovery &lt;hello@sevenarrowsrecoveryarizona.com&gt;&quot;</code>.
            </li>
            <li>
              Come back here, click <em>Reset failed to pending</em>, then Send. The previously-failed rows go out and the previously-sent rows are not re-sent.
            </li>
          </ol>
          <p className="mt-3 text-[12px] text-red-900/80" style={{ fontFamily: 'var(--font-body)' }}>
            If you need to test before DNS finishes, you can leave <code className="bg-red-100 px-1 py-0.5 rounded">EMAIL_FROM</code> unset and send a test campaign to your own Resend-account email address — that bypass keeps working in sandbox mode.
          </p>
        </div>
      )}

      {/* Daily-quota banner. Shown when Resend returned HTTP 429
          daily_quota_exceeded for at least one recipient. This is
          NOT a sandbox issue — it means the account is sending
          fine but has burned through today's cap. */}
      {quotaExceeded && (
        <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-[12.5px] font-bold uppercase tracking-[0.22em] text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Resend daily quota hit
          </p>
          <p className="text-[13px] text-amber-900 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Resend returned <code className="bg-amber-100 px-1 py-0.5 rounded">daily_quota_exceeded</code> (HTTP 429) for at least one recipient. The free tier caps you at 100 emails/day; paid plans have their own daily ceiling. The cap resets at midnight UTC.
          </p>
          <p className="mt-3 text-[12.5px] font-bold uppercase tracking-[0.22em] text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            How to check usage
          </p>
          <ol className="text-[13px] text-amber-900 leading-relaxed list-decimal pl-5 space-y-1" style={{ fontFamily: 'var(--font-body)' }}>
            <li>
              Open{' '}
              <a href="https://resend.com/emails" target="_blank" rel="noreferrer" className="underline font-semibold">resend.com/emails</a>{' '}
              — every send from today shows up there. The counter at the top of the list = today&apos;s usage.
            </li>
            <li>
              Open{' '}
              <a href="https://resend.com/settings/billing" target="_blank" rel="noreferrer" className="underline font-semibold">resend.com/settings/billing</a>{' '}
              to see your plan&apos;s daily cap and bump it (Pro starts at $20/mo for 50k/mo with a higher daily ceiling).
            </li>
            <li>
              Wait until the cap resets at midnight UTC, then click <em>Reset failed to pending</em> and Send again — only the unsent rows go out.
            </li>
          </ol>
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
            {building && (
              <div className="mt-2">
                <BuildProgress mode="iterate" />
                <div className="mt-2 flex justify-end">
                  <CancelButton onClick={onCancelBuild} />
                </div>
              </div>
            )}
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
        <header className="px-4 py-3 border-b border-black/5 flex items-baseline justify-between flex-wrap gap-2">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
            Recipients · {recipients.length}
            {sentCount > 0 && <span className="ml-2 text-emerald-700">· {sentCount} sent</span>}
            {failedCount > 0 && <span className="ml-2 text-red-700">· {failedCount} failed</span>}
            {pendingCount > 0 && <span className="ml-2 text-foreground/55">· {pendingCount} pending</span>}
          </p>
          {failedCount > 0 && !isSent && (
            <button
              type="button"
              onClick={onRetryFailed}
              disabled={sending}
              className="px-2.5 py-1 rounded-md border border-red-300 bg-red-50 text-[11px] font-semibold text-red-900 hover:bg-red-100 disabled:opacity-50"
            >
              ↻ Reset failed to pending
            </button>
          )}
        </header>
        {recipients.length === 0 ? (
          <p className="px-4 py-8 text-[12.5px] text-foreground/55 italic text-center" style={{ fontFamily: 'var(--font-body)' }}>
            No recipients picked yet. <Link href={`/feather/email-campaigns/${campaignId}/recipients`} className="text-primary underline">Pick some</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-black/5 max-h-[60vh] overflow-y-auto">
            {recipients.map((r) => (
              <RecipientDetailRow key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>

      {error && <p className="mb-3 text-[12px] text-red-700" role="alert">{error}</p>}

      {!isSent && !canSend && (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-amber-900 mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Send blocked
          </p>
          <p className="text-[13px] text-amber-900 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
            Only admins can send email campaigns. You can build, iterate, and queue recipients here, then ask an admin to hit Send.
          </p>
        </div>
      )}

      {previewMode && !isSent && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 mb-3 flex items-center justify-between gap-3" style={{ fontFamily: 'var(--font-body)' }}>
          <p className="text-[12.5px] text-foreground/80">
            <span className="font-bold uppercase tracking-[0.18em] text-[10px] text-primary mr-2">Preview</span>
            Edits here update the email content. The campaign&rsquo;s schedule is unchanged.
          </p>
          <Link
            href="/feather/email-campaigns"
            className="shrink-0 px-3 py-1.5 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold text-foreground/70 hover:bg-white"
          >
            Back to list
          </Link>
        </div>
      )}

      {!isSent && !previewMode && (
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/feather/email-campaigns"
            className="px-4 py-2 rounded-md border border-black/10 bg-white text-[12px] font-semibold text-foreground/70 hover:bg-warm-bg/60"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => {
              setError(null);
              // Default the picker to ~1 hour from now in the local
              // timezone so 'Done' on first interaction always lands
              // a valid future slot.
              if (!scheduleDateTime) {
                const d = new Date(Date.now() + 60 * 60 * 1000);
                const pad = (n: number) => String(n).padStart(2, '0');
                setScheduleDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
              }
              setScheduleOpen(true);
            }}
            disabled={sending || scheduling || recipients.length === 0 || !canSend}
            title={!canSend ? 'Only admins can schedule email campaigns.' : 'Pick a date and time to send this campaign automatically.'}
            className="px-4 py-2 rounded-md border border-primary/40 bg-white text-primary text-[12px] font-semibold uppercase tracking-wider hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Schedule send →
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={sending || pendingCount === 0 || !canSend}
            title={
              !canSend
                ? 'Only admins can send email campaigns.'
                : pendingCount === 0
                  ? 'Nothing pending to send. Reset failed to pending if you want to retry.'
                  : sentCount > 0
                    ? `Sends only to the ${pendingCount} pending recipient${pendingCount === 1 ? '' : 's'}. The ${sentCount} already-sent rows are skipped.`
                    : undefined
            }
            className="px-5 py-2.5 rounded-md bg-primary text-white text-[12.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {sending
              ? 'Sending…'
              : !canSend
              ? 'Send (admins only)'
              : pendingCount === 0
                ? 'Nothing pending'
                : sentCount > 0
                  ? `Send to ${pendingCount} pending`
                  : `Send to ${pendingCount}`}
          </button>
        </div>
      )}

      {/* Schedule-send picker · centered modal mirroring the
          recipients-page version so the picker UI reads the same
          across the funnel. Native datetime-local picks up the
          OS calendar / wheel UI. */}
      {/* Send-confirm modal · replaces the old window.confirm.
          For any send >= SEND_TYPED_THRESHOLD recipients the user
          has to type the recipient count exactly to enable the
          Send button — a hard guard against fat-fingering Send on
          a multi-hundred-recipient blast. Smaller sends are a
          single explicit click instead, no typing. */}
      {sendConfirmOpen && (() => {
        const SEND_TYPED_THRESHOLD = 25;
        const pendingNow = recipients.filter((r) => r.send_status === 'pending').length;
        const sentAlready = recipients.filter((r) => r.send_status === 'sent').length;
        const needsTyping = pendingNow >= SEND_TYPED_THRESHOLD;
        const typedOk = !needsTyping || sendConfirmTyped.trim() === String(pendingNow);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="send-confirm-title">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)] overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
              <header className="px-5 py-4 border-b border-black/5">
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">
                  Confirm send
                </p>
                <h2 id="send-confirm-title" className="mt-0.5 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                  Send this email to {pendingNow.toLocaleString()} {pendingNow === 1 ? 'person' : 'people'}?
                </h2>
              </header>
              <div className="px-5 py-4 space-y-3">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-[13px] text-foreground/80">
                  <p>
                    <strong className="text-primary-dark font-bold">{pendingNow.toLocaleString()}</strong>
                    {' recipient'}{pendingNow === 1 ? '' : 's'}
                    {sentAlready > 0 && (
                      <>
                        {' · '}
                        <span className="text-foreground/55">
                          {sentAlready.toLocaleString()} already sent will be skipped
                        </span>
                      </>
                    )}
                  </p>
                  <p className="mt-1 text-[12px] text-foreground/55">
                    Subject: <span className="text-foreground/80">{campaign?.generated_subject ?? '(no subject)'}</span>
                  </p>
                </div>
                {needsTyping ? (
                  <div>
                    <label className="block">
                      <span className="text-[11px] font-semibold text-foreground/65 mb-1.5 block">
                        Type <span className="text-primary font-bold">{pendingNow}</span> to confirm
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        autoFocus
                        value={sendConfirmTyped}
                        onChange={(e) => setSendConfirmTyped(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && typedOk) void confirmAndSend();
                          if (e.key === 'Escape') setSendConfirmOpen(false);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-black/15 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                        placeholder={String(pendingNow)}
                      />
                    </label>
                    <p className="mt-2 text-[11px] text-foreground/45">
                      Required for sends of {SEND_TYPED_THRESHOLD}+ recipients — a typed match is the only way to fire Send so a misclick can&rsquo;t blast a large list.
                    </p>
                  </div>
                ) : (
                  <p className="text-[12.5px] text-foreground/60">
                    This will send to everyone listed in the recipients panel below. Already-sent rows are skipped automatically.
                  </p>
                )}
              </div>
              <footer className="px-5 py-4 border-t border-black/5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSendConfirmOpen(false)}
                  disabled={sending}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground/70 hover:bg-black/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void confirmAndSend()}
                  disabled={!typedOk || sending}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary hover:bg-primary-dark text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending…' : `Send to ${pendingNow.toLocaleString()}`}
                </button>
              </footer>
            </div>
          </div>
        );
      })()}

      {scheduleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Schedule send">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_30px_60px_-20px_rgba(0,0,0,0.4)] overflow-hidden" style={{ fontFamily: 'var(--font-body)' }}>
            <header className="px-5 py-4 border-b border-black/5 flex items-baseline justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/55">When should this send?</p>
                <h2 className="mt-0.5 text-lg font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                  Schedule send
                </h2>
              </div>
              <button
                type="button"
                onClick={() => { if (!scheduling) setScheduleOpen(false); }}
                className="text-foreground/50 hover:text-foreground text-xl leading-none"
                aria-label="Cancel"
                disabled={scheduling}
              >
                ×
              </button>
            </header>
            <div className="px-5 py-4 space-y-3">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-foreground/55">Date &amp; time</span>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-md border border-black/15 text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <span className="mt-1 block text-[11px] text-foreground/55">
                  Your message will go out at this time. Times are in your local timezone.
                </span>
              </label>
              {error && (
                <p className="text-[12px] text-rose-700" role="alert">{error}</p>
              )}
            </div>
            <footer className="px-5 py-3 border-t border-black/5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { if (!scheduling) setScheduleOpen(false); }}
                disabled={scheduling}
                className="px-3.5 py-2 rounded-md border border-black/10 bg-white text-[11.5px] font-semibold text-foreground/70 hover:bg-warm-bg/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void onConfirmSchedule()}
                disabled={scheduling || !scheduleDateTime}
                className="px-4 py-2 rounded-md bg-primary text-white text-[11.5px] font-semibold uppercase tracking-wider hover:bg-primary/90 disabled:opacity-50"
              >
                {scheduling ? 'Scheduling…' : 'Done'}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

// Detail card for a single recipient — name, email, big status
// badge, and (when present) the full provider error response in a
// scrollable mono block with a copy button. Tries to JSON-pretty
// the body when it's parseable so the marketer can read it.
function RecipientDetailRow({ r }: { r: DisplayRecipient }) {
  const [copied, setCopied] = useState(false);
  const tone = STATUS_BADGE[r.send_status] ?? STATUS_BADGE.pending;
  const isFailed = r.send_status === 'failed';
  const errorDetail = r.send_error ?? '';

  // The send route stores send_error as "HTTP 403: {...json...}". Try
  // to peel the HTTP prefix off and pretty-print the JSON tail so the
  // message is actually readable.
  const formatted = useMemo(() => {
    if (!errorDetail) return '';
    const httpMatch = errorDetail.match(/^(HTTP \d+):?\s*([\s\S]*)$/);
    const status = httpMatch?.[1] ?? '';
    const tail = httpMatch?.[2] ?? errorDetail;
    let pretty = tail;
    try {
      const json = JSON.parse(tail);
      pretty = JSON.stringify(json, null, 2);
    } catch { /* keep as-is */ }
    return status ? `${status}\n\n${pretty}` : pretty;
  }, [errorDetail]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  return (
    <li className={`px-4 py-3 ${isFailed ? 'bg-red-50/40' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>
            {r.contactName || r.email}
          </p>
          <p className="text-[11.5px] text-foreground/55" style={{ fontFamily: 'var(--font-body)' }}>
            {r.email}
          </p>
        </div>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider ${tone}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {r.send_status}
        </span>
      </div>
      {errorDetail && (
        <div className="mt-2 rounded-md border border-red-200 bg-white">
          <header className="flex items-baseline justify-between px-3 py-2 border-b border-red-100">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-red-900" style={{ fontFamily: 'var(--font-body)' }}>
              Provider response
            </p>
            <button
              type="button"
              onClick={onCopy}
              className="text-[10.5px] font-semibold text-red-800 hover:text-red-900"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </header>
          <pre
            className="px-3 py-2 text-[11.5px] text-red-900 whitespace-pre-wrap break-words max-h-48 overflow-y-auto"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
          >
{formatted}
          </pre>
        </div>
      )}
    </li>
  );
}
