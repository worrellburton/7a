import type { Metadata } from 'next';
import Link from 'next/link';
import { getAdminSupabase } from '@/lib/supabase-server';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

// Public unsubscribe page rendered from the email-template footer.
// The HMAC token in ?token=… is verified server-side. If valid,
// the contact's unsubscribed_at is set and the page renders the
// confirmation state. Re-visits (forwarded emails, double-clicks)
// land on the "already unsubscribed" state — no error, no extra
// noise.

export const metadata: Metadata = {
  title: 'Unsubscribe | Seven Arrows Recovery',
  description: 'Unsubscribe from Seven Arrows Recovery marketing emails.',
  robots: 'noindex, nofollow',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const contactId = verifyUnsubscribeToken(token);

  let outcome: 'invalid' | 'unsubscribed' | 'already' | 'error' = 'invalid';
  let displayEmail: string | null = null;

  if (contactId) {
    const admin = getAdminSupabase();
    const { data: existing } = await admin
      .from('contacts')
      .select('id, email, unsubscribed_at')
      .eq('id', contactId)
      .maybeSingle();

    if (!existing) {
      outcome = 'invalid';
    } else if (existing.unsubscribed_at) {
      outcome = 'already';
      displayEmail = existing.email as string | null;
    } else {
      const { error } = await admin
        .from('contacts')
        .update({
          unsubscribed_at: new Date().toISOString(),
          unsubscribed_source: 'email-link',
        })
        .eq('id', contactId);
      if (error) {
        outcome = 'error';
      } else {
        outcome = 'unsubscribed';
        displayEmail = existing.email as string | null;
      }
    }
  }

  return (
    <main className="relative min-h-[100svh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-warm-bg via-warm-bg to-[#e9dccb]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-cover bg-center opacity-15"
        style={{ backgroundImage: 'url(/hero/facility-exterior-mountains.jpg)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-warm-bg via-warm-bg/40 to-transparent"
      />

      <section
        className="relative z-10 w-full max-w-xl mx-auto px-6 py-16 text-center"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-8 w-16 h-16 rounded-full bg-white/85 border border-white shadow-[0_10px_30px_-12px_rgba(60,48,42,0.35)] flex items-center justify-center"
        >
          <span
            className="text-[12px] font-bold uppercase tracking-[0.22em] text-primary"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            7A
          </span>
        </div>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-foreground/45">
          Seven Arrows Recovery
        </p>

        {outcome === 'unsubscribed' && (
          <>
            <h1
              className="mt-3 text-3xl sm:text-4xl font-bold text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              You&apos;re unsubscribed.
            </h1>
            <p className="mt-4 max-w-md mx-auto text-[14.5px] text-foreground/70 leading-relaxed">
              {displayEmail ? (
                <>We won&apos;t send any more marketing emails to <span className="font-semibold text-foreground">{displayEmail}</span>.</>
              ) : (
                <>We won&apos;t send any more marketing emails to you.</>
              )}
              {' '}If this was a mistake, just call us at <a className="font-semibold text-primary" href="tel:+18667181665">(866) 718-1665</a> and we&apos;ll add you back.
            </p>
          </>
        )}

        {outcome === 'already' && (
          <>
            <h1
              className="mt-3 text-3xl sm:text-4xl font-bold text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Already unsubscribed.
            </h1>
            <p className="mt-4 max-w-md mx-auto text-[14.5px] text-foreground/70 leading-relaxed">
              {displayEmail ? (
                <><span className="font-semibold text-foreground">{displayEmail}</span> is already off our marketing list.</>
              ) : (
                <>This email address is already off our marketing list.</>
              )}
            </p>
          </>
        )}

        {outcome === 'invalid' && (
          <>
            <h1
              className="mt-3 text-3xl sm:text-4xl font-bold text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              That unsubscribe link isn&apos;t valid.
            </h1>
            <p className="mt-4 max-w-md mx-auto text-[14.5px] text-foreground/70 leading-relaxed">
              The link may have been mistyped or truncated by your email client. Give us a call at <a className="font-semibold text-primary" href="tel:+18667181665">(866) 718-1665</a> and we&apos;ll take care of it manually.
            </p>
          </>
        )}

        {outcome === 'error' && (
          <>
            <h1
              className="mt-3 text-3xl sm:text-4xl font-bold text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Something went wrong.
            </h1>
            <p className="mt-4 max-w-md mx-auto text-[14.5px] text-foreground/70 leading-relaxed">
              We couldn&apos;t process the unsubscribe right now. Please call us at <a className="font-semibold text-primary" href="tel:+18667181665">(866) 718-1665</a> and we&apos;ll take you off the list immediately.
            </p>
          </>
        )}

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-foreground/15 bg-white/85 backdrop-blur-sm px-5 py-2.5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-foreground hover:border-primary/45 hover:text-primary transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
