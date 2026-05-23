// Rewrites <a href="..."> in a campaign's HTML to append GA4 UTM
// parameters before the email ships. Lets Google Analytics
// attribute every email-driven session back to the campaign that
// drove it (which subject, which recipient cohort, which feature
// pillar) without bloating the stored HTML — the campaign's
// generated_html stays UTM-free so preview / iterate cycles read
// clean, and only the per-recipient send body gets the rewrite.
//
// Convention follows Google's recommended channel mapping:
//   utm_source   = "email"          (consistent platform tag so
//                                    the GA Default Channel Group
//                                    bucket "Email" picks every
//                                    campaign click up)
//   utm_medium   = "email"
//   utm_campaign = <slug of subject> (human-readable in GA Reports)
//   utm_id       = <campaign uuid>   (stable across subject edits)
//   utm_content  = optional link role (e.g. "cta", "blog",
//                                     "footer", "logo") so multiple
//                  links inside one email don't collapse into one
//                  row in GA's "Top campaigns" view.
//
// We only touch links pointing at our own domain — outbound links
// to Instagram, Brandfetch logos, mailto: / tel: / # anchors, and
// the unsubscribe URL all pass through untouched.

const SITE_HOSTS = new Set([
  'sevenarrowsrecoveryarizona.com',
  'www.sevenarrowsrecoveryarizona.com',
]);

export function slugifySubject(subject: string | null | undefined): string {
  const s = (subject ?? '').trim().toLowerCase();
  if (!s) return 'untitled';
  return s
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'untitled';
}

interface CampaignAttribution {
  campaignId: string;
  subject: string | null;
}

interface RewriteOptions {
  /** Hosts we'll touch. Defaults to the Seven Arrows site. Anything
   *  else is left alone so external links (Instagram, the
   *  unsubscribe URL on a different host, Brandfetch logos) keep
   *  their original href. */
  siteHosts?: Set<string>;
  /** Optional URL prefix to skip even on a matching host — used to
   *  shield /unsubscribe (its HMAC token isn't broken by extra
   *  params but we don't want unsubscribes attributed to "email"
   *  in GA Reports anyway). */
  skipPathPrefixes?: string[];
}

const DEFAULT_SKIP_PREFIXES = ['/unsubscribe'];

// Heuristic guess at a useful utm_content label from the anchor's
// inner text. Avoids overfitting — short labels read well in GA
// (cta, footer, logo, blog), and very long anchors collapse to a
// short slug.
function deriveUtmContent(anchorText: string | null): string | null {
  if (!anchorText) return null;
  const cleaned = anchorText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  if (!cleaned) return null;
  if (/unsubscribe/.test(cleaned)) return 'unsubscribe';
  if (/(tel:|call|\(866\) ?718)/i.test(cleaned)) return 'phone';
  if (/continue reading|read more|read episode|on the journal/.test(cleaned)) return 'blog';
  if (/admissions|begin admissions|verify insurance|verify benefits/.test(cleaned)) return 'admissions';
  if (/tour/.test(cleaned)) return 'tour';
  if (/instagram|facebook|linkedin/.test(cleaned)) return 'social';
  if (/^\s*$/.test(cleaned)) return null;
  // Default: slugify the visible label, capped at 40 chars.
  return slugifySubject(cleaned).slice(0, 40);
}

export function addUtmsToCampaignHtml(html: string, campaign: CampaignAttribution, opts: RewriteOptions = {}): string {
  const siteHosts = opts.siteHosts ?? SITE_HOSTS;
  const skipPrefixes = opts.skipPathPrefixes ?? DEFAULT_SKIP_PREFIXES;
  const campaignSlug = slugifySubject(campaign.subject);

  // Match the full <a ... href="..." ...> tag so we have access to
  // the surrounding tag (to peek at adjacent attributes if needed)
  // and the inner text for utm_content. Non-greedy on the closing
  // > so we don't accidentally swallow a following tag.
  const ANCHOR_RE = /<a\b([^>]*?)href=(["'])(.*?)\2([^>]*?)>([\s\S]*?)<\/a>/gi;

  return html.replace(ANCHOR_RE, (match, beforeHref: string, quote: string, hrefRaw: string, afterHref: string, inner: string) => {
    const href = hrefRaw.trim();
    // Skip non-http URLs, fragment-only, and anything we can't
    // parse — let those pass through verbatim.
    if (!href || href.startsWith('#') || /^(mailto:|tel:|data:)/i.test(href)) return match;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return match;
    }
    if (!siteHosts.has(url.host)) return match;
    if (skipPrefixes.some((p) => url.pathname.startsWith(p))) return match;
    // Don't double-tag — if the link is already carrying utm_source,
    // the marketer (or a previous run) set it explicitly. Respect it.
    if (url.searchParams.has('utm_source')) return match;

    url.searchParams.set('utm_source', 'email');
    url.searchParams.set('utm_medium', 'email');
    url.searchParams.set('utm_campaign', campaignSlug);
    url.searchParams.set('utm_id', campaign.campaignId);
    const content = deriveUtmContent(inner);
    if (content) url.searchParams.set('utm_content', content);

    const rewritten = url.toString();
    return `<a${beforeHref}href=${quote}${rewritten}${quote}${afterHref}>${inner}</a>`;
  });
}
