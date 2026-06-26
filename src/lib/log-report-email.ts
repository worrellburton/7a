// Server-side renderer for the weekly 🪵 Log Report email.
//
// Returns one HTML string suitable for posting to Resend's
// `html` field (and also for srcDoc-ing into an iframe in the
// in-app preview popup). Two visual "pages" separated by a soft
// page-break divider so a desktop client treats them as a tall
// scroll and a printed PDF cleanly splits them into two sheets.
//
// All styling is inline — no <style> blocks, no external CSS,
// no web fonts. Outlook needs table-based layout, so the body is
// composed entirely of <table> elements with role=presentation.
//
// Phase 2 wires the renderer + a stub data shape. Phase 3 swaps
// the stub for real /contact_logs aggregations.

export interface LogReportMethodCount {
  method: string;
  count: number;
  durationSec: number;
  // Methods that are system-generated (the rep clicked Add / filled
  // a field) rather than active outreach (Phone / Email / etc.).
  // Drives a separate stack in the KPI band so a CSV import of 100
  // contacts doesn't read as 100 touchpoints in the weekly recap.
  isDataMethod: boolean;
}

export interface LogReportLeaderRow {
  userId: string;
  name: string;
  avatarUrl: string | null;
  logs: number;          // total (outreach + data) for sort stability
  outreachLogs: number;  // Phone / In Person / Email / etc.
  dataLogs: number;      // Data Entry + New Contact
  durationSec: number;
}

export interface LogReportAreaRow {
  area: string;
  count: number;
}

export interface LogReportContactRow {
  name: string;
  company: string | null;
  touches: number;
  lastMethod: string | null;
  lastAt: string;
}

// A self-contained slice of the week's logs — used to render the
// report in two parts: one for Email Campaign logs, one for
// everything else. Each segment carries its own counts + breakdowns
// so the two parts read as independent recaps.
export interface LogReportSegment {
  counts: {
    total: number;
    uniqueContacts: number;
    uniqueReps: number;
    totalDurationSec: number;
  };
  byMethod: LogReportMethodCount[];
  leaderboard: LogReportLeaderRow[];
  topAreas: LogReportAreaRow[];
  topContacts: LogReportContactRow[];
}

export interface LogReportData {
  window: {
    startsAt: string;        // ISO
    endsAt: string;          // ISO
    label: string;           // e.g. "May 14 – May 20, 2026"
  };
  counts: {
    total: number;           // all logs in the window
    outreach: number;        // logs whose method is an outreach touchpoint
    dataWork: number;        // logs whose method is Data Entry / New Contact
    newContacts: number;     // subset of dataWork — adds only
    fieldFills: number;      // subset of dataWork — Data Entry only
    uniqueContacts: number;
    uniqueReps: number;
    totalDurationSec: number;
  };
  byMethod: LogReportMethodCount[];   // sorted desc by count
  leaderboard: LogReportLeaderRow[];  // sorted desc by outreach then total
  topAreas: LogReportAreaRow[];       // sorted desc by count, top 8
  topContacts: LogReportContactRow[]; // sorted desc by touches, top 10
  // Two-part split — Email Campaign sends vs everything else. The
  // renderer builds one part per segment so the bulk campaign
  // outreach gets its own dedicated recap separate from phone /
  // in-person / manual email / data work.
  emailCampaigns: LogReportSegment;
  everythingElse: LogReportSegment;
  generatedAt: string;                // ISO timestamp the report was rendered
  appOrigin?: string;                 // for the in-email "Open dashboard" CTA
}

// Methods that count as "data work" rather than outreach. Kept
// next to the type definitions so consumers (data builder + the
// renderer below + the preview stub at the bottom of this file)
// agree on the split.
export const DATA_METHODS: ReadonlySet<string> = new Set(['Data Entry', 'New Contact']);
export function isDataMethod(method: string | null | undefined): boolean {
  return !!method && DATA_METHODS.has(method);
}

// ─── Palette ─────────────────────────────────────────────────────
// Mirror the Seven Arrows email-campaign palette so the Log
// Report doesn't drift from the marketing emails the same audience
// already gets.
const SAND     = '#faf6f1';
const BONE     = '#ffffff';
const COPPER   = '#b87333';
const COPPER_DEEP = '#8b5523';
const INK      = '#2c1810';
const INK_MUTE = '#6b5544';
const HAIRLINE = 'rgba(44,24,16,0.12)';

const FONT_BODY  = `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const FONT_SERIF = `'Cormorant Garamond', 'Iowan Old Style', 'Hoefler Text', Georgia, serif`;

const SITE_ORIGIN_FALLBACK = 'https://sevenarrowsrecoveryarizona.com';
const PHONE_DISPLAY = '(866) 718-1665';
const PHONE_TEL     = 'tel:+18667181665';

// ─── Helpers ────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    c === '&' ? '&amp;'
    : c === '<' ? '&lt;'
    : c === '>' ? '&gt;'
    : c === '"' ? '&quot;'
    : '&#39;'
  ));
}

function fmtDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function fmtShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

// ─── Section builders ───────────────────────────────────────────

function header(data: LogReportData): string {
  const dateLine = `${fmtShortDate(data.window.startsAt)} – ${fmtShortDate(data.window.endsAt)}`;
  return `
    <tr>
      <td style="padding:48px 40px 24px 40px;text-align:center;background:${BONE};">
        <div style="font-family:${FONT_BODY};font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${COPPER};margin-bottom:12px;">
          Seven Arrows Recovery · Weekly Recap
        </div>
        <div style="font-family:${FONT_BODY};font-size:40px;line-height:1;margin-bottom:14px;" role="img" aria-label="log">🪵</div>
        <h1 style="font-family:${FONT_SERIF};font-size:34px;line-height:1.1;font-weight:500;color:${INK};margin:0 0 8px 0;letter-spacing:-0.01em;">
          The week in logs
        </h1>
        <p style="font-family:${FONT_BODY};font-size:13.5px;color:${INK_MUTE};margin:0 0 16px 0;">
          ${escapeHtml(dateLine)}
        </p>
        <p style="font-family:${FONT_BODY};font-size:13px;line-height:1.6;color:${INK_MUTE};margin:0 auto;max-width:460px;">
          A <strong style="color:${INK};font-weight:600;">log</strong> is one recorded interaction with a contact &mdash; a phone call, an in-person visit, a text, an email, a dropped-off voicemail, a <strong style="color:${INK};font-weight:600;">new contact added</strong>, or a previously-empty field <strong style="color:${INK};font-weight:600;">filled in</strong>. Outreach touches count toward the headline; adds and field fills count as <em>data work</em> in the breakdowns below.
        </p>
      </td>
    </tr>
  `;
}

function kpiBand(stats: Array<[string, string, string?]>): string {
  // Generic four-slot KPI band. Each caller passes its own
  // [label, value, optional-subline] tuples so the Emails part and
  // the Everything-else part can headline different numbers.
  return `
    <tr>
      <td style="padding:8px 24px 0 24px;background:${BONE};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          <tr>
            ${stats.map(([label, value, subline]) => `
              <td style="padding:16px 12px;text-align:center;background:${SAND};border-radius:12px;vertical-align:top;width:25%;">
                <div style="font-family:${FONT_BODY};font-size:9.5px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${INK_MUTE};margin-bottom:6px;">
                  ${escapeHtml(label)}
                </div>
                <div style="font-family:${FONT_SERIF};font-size:26px;font-weight:500;line-height:1;color:${INK};">
                  ${escapeHtml(value)}
                </div>
                ${subline ? `<div style="font-family:${FONT_BODY};font-size:10.5px;color:${INK_MUTE};margin-top:6px;">+ ${escapeHtml(subline)}</div>` : ''}
              </td>
              <td style="width:8px;background:${BONE};">&nbsp;</td>
            `).join('')}
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function divider(): string {
  return `
    <tr>
      <td style="padding:40px 40px;background:${BONE};">
        <div style="height:1px;background:${HAIRLINE};font-size:0;line-height:0;">&nbsp;</div>
      </td>
    </tr>
  `;
}

function sectionTitle(label: string, subhead?: string): string {
  return `
    <tr>
      <td style="padding:0 40px 16px 40px;background:${BONE};">
        <div style="font-family:${FONT_BODY};font-size:10.5px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${COPPER};">
          ${escapeHtml(label)}
        </div>
        ${subhead ? `<div style="font-family:${FONT_BODY};font-size:13px;color:${INK_MUTE};margin-top:4px;">${escapeHtml(subhead)}</div>` : ''}
      </td>
    </tr>
  `;
}

// A bold part header — bigger than sectionTitle — that announces one
// of the report's two halves (Emails / Everything else).
function partLabel(eyebrow: string, title: string, subhead?: string): string {
  return `
    <tr>
      <td style="padding:8px 40px 18px 40px;background:${BONE};">
        <div style="font-family:${FONT_BODY};font-size:10.5px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${COPPER};margin-bottom:6px;">
          ${escapeHtml(eyebrow)}
        </div>
        <div style="font-family:${FONT_SERIF};font-size:24px;line-height:1.15;font-weight:500;color:${INK};">
          ${escapeHtml(title)}
        </div>
        ${subhead ? `<div style="font-family:${FONT_BODY};font-size:12.5px;color:${INK_MUTE};margin-top:4px;">${escapeHtml(subhead)}</div>` : ''}
      </td>
    </tr>
  `;
}

function leaderboard(rows: LogReportLeaderRow[], emptyLabel = 'No teammates logged anything this week — the leaderboard is empty.'): string {
  if (rows.length === 0) {
    return `
      <tr>
        <td style="padding:0 40px 24px 40px;background:${BONE};">
          <p style="font-family:${FONT_BODY};font-size:13px;color:${INK_MUTE};margin:0;font-style:italic;">
            ${escapeHtml(emptyLabel)}
          </p>
        </td>
      </tr>
    `;
  }
  // Rank by outreach logs so the leader bar reflects who actually
  // ran touchpoints, not who imported a spreadsheet. Data-log count
  // is annotated as a smaller line under the duration so the work
  // is still acknowledged.
  const maxOutreach = Math.max(...rows.map((r) => r.outreachLogs), 1);
  return `
    <tr>
      <td style="padding:0 40px 24px 40px;background:${BONE};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          ${rows.map((row, idx) => {
            const pct = Math.max(4, Math.round((row.outreachLogs / maxOutreach) * 100));
            const initials = initialsFor(row.name);
            const dataLine = row.dataLogs > 0
              ? `<div style="font-family:${FONT_BODY};font-size:11px;color:${INK_MUTE};">+ ${fmtNumber(row.dataLogs)} data work</div>`
              : '';
            return `
              <tr>
                <td style="padding:8px 0 8px 0;vertical-align:middle;width:32px;">
                  <div style="width:28px;height:28px;border-radius:14px;background:${SAND};color:${COPPER};font-family:${FONT_BODY};font-size:10.5px;font-weight:700;text-align:center;line-height:28px;">${escapeHtml(initials)}</div>
                </td>
                <td style="padding:8px 12px;vertical-align:middle;">
                  <div style="font-family:${FONT_BODY};font-size:13.5px;color:${INK};font-weight:600;">
                    ${idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : ''}${escapeHtml(row.name)}
                  </div>
                  <div style="margin-top:4px;height:6px;background:${SAND};border-radius:3px;overflow:hidden;">
                    <div style="height:6px;width:${pct}%;background:${COPPER};border-radius:3px;">&nbsp;</div>
                  </div>
                </td>
                <td style="padding:8px 0 8px 0;vertical-align:middle;text-align:right;width:96px;">
                  <div style="font-family:${FONT_BODY};font-size:13px;color:${INK};font-weight:700;">${fmtNumber(row.outreachLogs)} outreach</div>
                  <div style="font-family:${FONT_BODY};font-size:11px;color:${INK_MUTE};">${fmtDuration(row.durationSec)}</div>
                  ${dataLine}
                </td>
              </tr>
            `;
          }).join('')}
        </table>
      </td>
    </tr>
  `;
}

function pageBreak(): string {
  // Tall vertical gap that reads as a fold to the screen reader
  // and forces a clean break when the email is printed to PDF.
  return `
    <tr>
      <td style="padding:0;background:${BONE};">
        <div style="page-break-before:always;height:0;font-size:0;line-height:0;">&nbsp;</div>
        <div style="height:32px;background:linear-gradient(180deg, ${BONE} 0%, ${SAND} 100%);font-size:0;line-height:0;">&nbsp;</div>
      </td>
    </tr>
  `;
}

function methodsTable(byMethod: LogReportMethodCount[]): string {
  if (byMethod.length === 0) {
    return `
      <tr>
        <td style="padding:0 40px 24px 40px;background:${BONE};">
          <p style="font-family:${FONT_BODY};font-size:13px;color:${INK_MUTE};margin:0;font-style:italic;">
            No method data logged this week.
          </p>
        </td>
      </tr>
    `;
  }
  const total = byMethod.reduce((a, b) => a + b.count, 0) || 1;
  return `
    <tr>
      <td style="padding:0 40px 24px 40px;background:${BONE};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          ${byMethod.map((m) => {
            const pct = Math.round((m.count / total) * 100);
            // Visually demote data methods (Data Entry, New Contact)
            // so they read as 'admin work, not outreach' on first
            // scan: muted label + a muted bar in INK_MUTE instead of
            // the copper outreach bar, plus a small 'data' tag.
            const barColor = m.isDataMethod ? INK_MUTE : COPPER_DEEP;
            const labelColor = m.isDataMethod ? INK_MUTE : INK;
            const tag = m.isDataMethod
              ? `<span style="margin-left:8px;font-size:9.5px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${INK_MUTE};">Data</span>`
              : '';
            return `
              <tr>
                <td style="padding:6px 0;vertical-align:middle;font-family:${FONT_BODY};font-size:13px;color:${labelColor};">
                  ${escapeHtml(m.method)}${tag}
                </td>
                <td style="padding:6px 12px;vertical-align:middle;">
                  <div style="height:6px;background:${SAND};border-radius:3px;overflow:hidden;">
                    <div style="height:6px;width:${pct}%;background:${barColor};border-radius:3px;">&nbsp;</div>
                  </div>
                </td>
                <td style="padding:6px 0;vertical-align:middle;text-align:right;width:80px;font-family:${FONT_BODY};font-size:12.5px;color:${INK_MUTE};">
                  ${fmtNumber(m.count)} · ${pct}%
                </td>
              </tr>
            `;
          }).join('')}
        </table>
      </td>
    </tr>
  `;
}

function areasTable(topAreas: LogReportAreaRow[]): string {
  if (topAreas.length === 0) {
    return `
      <tr>
        <td style="padding:0 40px 24px 40px;background:${BONE};">
          <p style="font-family:${FONT_BODY};font-size:13px;color:${INK_MUTE};margin:0;font-style:italic;">
            No locations tagged this week.
          </p>
        </td>
      </tr>
    `;
  }
  return `
    <tr>
      <td style="padding:0 40px 24px 40px;background:${BONE};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          ${topAreas.map((a) => `
            <tr>
              <td style="padding:6px 0;font-family:${FONT_BODY};font-size:13px;color:${INK};">${escapeHtml(a.area)}</td>
              <td style="padding:6px 0;text-align:right;font-family:${FONT_BODY};font-size:12.5px;color:${INK_MUTE};">${fmtNumber(a.count)}</td>
            </tr>
          `).join('')}
        </table>
      </td>
    </tr>
  `;
}

function topContactsTable(topContacts: LogReportContactRow[], emptyLabel = 'No contacts touched this week.'): string {
  if (topContacts.length === 0) {
    return `
      <tr>
        <td style="padding:0 40px 24px 40px;background:${BONE};">
          <p style="font-family:${FONT_BODY};font-size:13px;color:${INK_MUTE};margin:0;font-style:italic;">
            ${escapeHtml(emptyLabel)}
          </p>
        </td>
      </tr>
    `;
  }
  return `
    <tr>
      <td style="padding:0 40px 24px 40px;background:${BONE};">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
          ${topContacts.map((c) => `
            <tr>
              <td style="padding:8px 0;vertical-align:top;">
                <div style="font-family:${FONT_BODY};font-size:13px;color:${INK};font-weight:600;">${escapeHtml(c.name)}</div>
                ${c.company ? `<div style="font-family:${FONT_BODY};font-size:11.5px;color:${INK_MUTE};">${escapeHtml(c.company)}</div>` : ''}
              </td>
              <td style="padding:8px 0;text-align:right;vertical-align:top;width:140px;">
                <div style="font-family:${FONT_BODY};font-size:12.5px;color:${INK};">${fmtNumber(c.touches)} touchpoint${c.touches === 1 ? '' : 's'}</div>
                ${c.lastMethod ? `<div style="font-family:${FONT_BODY};font-size:11px;color:${INK_MUTE};">${escapeHtml(c.lastMethod)} · ${escapeHtml(fmtShortDate(c.lastAt))}</div>` : ''}
              </td>
            </tr>
          `).join('')}
        </table>
      </td>
    </tr>
  `;
}

function cta(data: LogReportData): string {
  const origin = data.appOrigin || SITE_ORIGIN_FALLBACK;
  const href = `${origin}/feather/contacts`;
  return `
    <tr>
      <td style="padding:8px 40px 48px 40px;background:${BONE};text-align:center;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:18px 40px;background:${COPPER};color:${BONE};text-decoration:none;font-family:${FONT_BODY};font-size:13px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;border-radius:2px;">
          Open the outreach dashboard
        </a>
      </td>
    </tr>
  `;
}

function footer(): string {
  return `
    <tr>
      <td style="padding:24px 40px 40px 40px;background:${BONE};text-align:center;border-top:1px solid ${HAIRLINE};">
        <div style="font-family:${FONT_SERIF};font-style:italic;font-size:14px;color:${INK};margin-bottom:6px;">
          Seven Arrows Recovery
        </div>
        <div style="font-family:${FONT_BODY};font-size:10.5px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${COPPER};margin-bottom:10px;">
          sevenarrowsrecoveryarizona.com
        </div>
        <div style="font-family:${FONT_BODY};font-size:12.5px;color:${INK};font-style:italic;line-height:1.55;">
          Questions about a contact on the list? Call <a href="${PHONE_TEL}" style="color:${COPPER};text-decoration:underline;">${PHONE_DISPLAY}</a> — we pick up.
        </div>
      </td>
    </tr>
  `;
}

// ─── Top-level renderer ─────────────────────────────────────────

export function renderLogReportEmail(data: LogReportData): string {
  // Two-part body. Part 1 is the bulk email-campaign sends; Part 2 is
  // every other kind of log (phone, in-person, text, manual email,
  // data work, …). Older callers that predate the split fall back to
  // a single "everything" segment so the email still renders.
  const emailCampaigns: LogReportSegment = data.emailCampaigns ?? emptySegment();
  const everythingElse: LogReportSegment = data.everythingElse ?? segmentFromLegacy(data);

  const campaignStats: Array<[string, string, string?]> = [
    ['Emails sent', fmtNumber(emailCampaigns.counts.total)],
    ['Reps', fmtNumber(emailCampaigns.counts.uniqueReps)],
    ['Contacts', fmtNumber(emailCampaigns.counts.uniqueContacts)],
    ['Time', fmtDuration(emailCampaigns.counts.totalDurationSec)],
  ];
  const elseDataWork = everythingElse.byMethod
    .filter((m) => m.isDataMethod)
    .reduce((a, b) => a + b.count, 0);
  const elseStats: Array<[string, string, string?]> = [
    ['Logs', fmtNumber(everythingElse.counts.total), elseDataWork > 0 ? `${fmtNumber(elseDataWork)} data work` : ''],
    ['Reps', fmtNumber(everythingElse.counts.uniqueReps)],
    ['Contacts', fmtNumber(everythingElse.counts.uniqueContacts)],
    ['Time on the phones', fmtDuration(everythingElse.counts.totalDurationSec)],
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subjectFor(data))}</title>
</head>
<body style="margin:0;padding:0;background:${SAND};color:${INK};">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${SAND};border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:640px;background:${BONE};border-collapse:collapse;box-shadow:0 4px 20px rgba(44,24,16,0.06);border-radius:4px;">
          ${header(data)}

          ${partLabel('Part 1', 'Email Campaigns', 'Every email campaign your team sent this week')}
          ${kpiBand(campaignStats)}
          ${sectionTitle('Campaign leaderboard', 'Who sent the most campaign email')}
          ${leaderboard(emailCampaigns.leaderboard, 'No email campaigns went out this week.')}
          ${sectionTitle('Most-reached contacts', 'People who received the most campaign email this week')}
          ${topContactsTable(emailCampaigns.topContacts, 'No contacts received a campaign this week.')}

          ${divider()}
          ${pageBreak()}

          ${partLabel('Part 2', 'Everything else', 'Phone, in-person, text, manual email, voicemail, and data work — every non-campaign log')}
          ${kpiBand(elseStats)}
          ${sectionTitle('How the team reached out', 'Mix of phone, in-person, text, and the rest')}
          ${methodsTable(everythingElse.byMethod)}
          ${sectionTitle('Where the work landed', 'Top areas by logs')}
          ${areasTable(everythingElse.topAreas)}
          ${sectionTitle('Leaderboard', 'Most non-email logs this week')}
          ${leaderboard(everythingElse.leaderboard)}
          ${sectionTitle('Top contacts', 'People who saw the most attention')}
          ${topContactsTable(everythingElse.topContacts)}

          ${cta(data)}
          ${footer()}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Fallbacks for callers that build a LogReportData without the
// two-part segments (e.g. an older cached payload). They keep the
// renderer total-failure-proof rather than throwing on a missing key.
function emptySegment(): LogReportSegment {
  return {
    counts: { total: 0, uniqueContacts: 0, uniqueReps: 0, totalDurationSec: 0 },
    byMethod: [],
    leaderboard: [],
    topAreas: [],
    topContacts: [],
  };
}
function segmentFromLegacy(data: LogReportData): LogReportSegment {
  return {
    counts: {
      total: data.counts.total,
      uniqueContacts: data.counts.uniqueContacts,
      uniqueReps: data.counts.uniqueReps,
      totalDurationSec: data.counts.totalDurationSec,
    },
    byMethod: data.byMethod,
    leaderboard: data.leaderboard,
    topAreas: data.topAreas,
    topContacts: data.topContacts,
  };
}

export function subjectFor(data: LogReportData): string {
  return `🪵 Weekly Log Report · ${fmtShortDate(data.window.startsAt)}–${fmtShortDate(data.window.endsAt)}`;
}

// ─── Stub data ───────────────────────────────────────────────────
// Used by Phase 2 endpoints + the in-app preview popup until
// Phase 3 swaps in the real aggregation. Mirrors the shape the
// real query will return so the renderer doesn't need a separate
// 'demo mode'.
export function buildStubLogReportData(): LogReportData {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return {
    window: {
      startsAt: weekStart.toISOString(),
      endsAt: now.toISOString(),
      label: `${fmtShortDate(weekStart.toISOString())} – ${fmtShortDate(now.toISOString())}`,
    },
    counts: {
      total: 99,
      outreach: 87,
      dataWork: 12,
      newContacts: 7,
      fieldFills: 5,
      uniqueContacts: 41,
      uniqueReps: 5,
      totalDurationSec: 4.2 * 3600,
    },
    byMethod: [
      { method: 'Phone',         count: 38, durationSec: 2.5 * 3600, isDataMethod: false },
      { method: 'In Person',     count: 18, durationSec: 1.0 * 3600, isDataMethod: false },
      { method: 'Text Message',  count: 14, durationSec: 0,           isDataMethod: false },
      { method: 'Left Message',  count: 11, durationSec: 0.5 * 3600, isDataMethod: false },
      { method: 'New Contact',   count:  7, durationSec: 0,           isDataMethod: true  },
      { method: 'Email',         count:  6, durationSec: 0.2 * 3600, isDataMethod: false },
      { method: 'Data Entry',    count:  5, durationSec: 0,           isDataMethod: true  },
    ],
    leaderboard: [
      { userId: '1', name: 'Sakina Mayan',         avatarUrl: null, logs: 24, outreachLogs: 22, dataLogs: 2, durationSec: 1.3 * 3600 },
      { userId: '2', name: 'Brendan Kenney',       avatarUrl: null, logs: 24, outreachLogs: 21, dataLogs: 3, durationSec: 1.1 * 3600 },
      { userId: '3', name: 'Lindsay Rothschild',   avatarUrl: null, logs: 18, outreachLogs: 16, dataLogs: 2, durationSec: 0.9 * 3600 },
      { userId: '4', name: 'Pamela Calvo',         avatarUrl: null, logs: 17, outreachLogs: 14, dataLogs: 3, durationSec: 0.5 * 3600 },
      { userId: '5', name: 'Donald MacKillop',     avatarUrl: null, logs: 14, outreachLogs: 12, dataLogs: 2, durationSec: 0.4 * 3600 },
    ],
    topAreas: [
      { area: 'Tucson, AZ',     count: 22 },
      { area: 'Phoenix, AZ',    count: 18 },
      { area: 'Scottsdale, AZ', count: 12 },
      { area: 'Mesa, AZ',       count:  9 },
      { area: 'Sedona, AZ',     count:  5 },
    ],
    topContacts: [
      { name: 'Maria Gonzalez', company: 'Tucson Recovery Network', touches: 6, lastMethod: 'Phone', lastAt: now.toISOString() },
      { name: 'Robert Chen',    company: 'Banner Behavioral',       touches: 5, lastMethod: 'In Person', lastAt: now.toISOString() },
      { name: 'Jennifer Park',  company: 'AZ Sober Living',         touches: 4, lastMethod: 'Phone', lastAt: now.toISOString() },
      { name: 'David Wilson',   company: null,                       touches: 4, lastMethod: 'Text Message', lastAt: now.toISOString() },
      { name: 'Emily Roberts',  company: 'Yavapai Counseling',      touches: 3, lastMethod: 'Phone', lastAt: now.toISOString() },
    ],
    emailCampaigns: {
      counts: { total: 950, uniqueContacts: 540, uniqueReps: 2, totalDurationSec: 0 },
      byMethod: [{ method: 'Email Campaign', count: 950, durationSec: 0, isDataMethod: false }],
      leaderboard: [
        { userId: '3', name: 'Lindsay Rothschild', avatarUrl: null, logs: 620, outreachLogs: 620, dataLogs: 0, durationSec: 0 },
        { userId: '2', name: 'Gwen Henderson',     avatarUrl: null, logs: 330, outreachLogs: 330, dataLogs: 0, durationSec: 0 },
      ],
      topAreas: [{ area: 'Tucson, AZ', count: 210 }, { area: 'Phoenix, AZ', count: 180 }],
      topContacts: [
        { name: 'Maria Gonzalez', company: 'Tucson Recovery Network', touches: 2, lastMethod: 'Email Campaign', lastAt: now.toISOString() },
        { name: 'Jennifer Park',  company: 'AZ Sober Living',         touches: 1, lastMethod: 'Email Campaign', lastAt: now.toISOString() },
      ],
    },
    everythingElse: {
      counts: { total: 93, uniqueContacts: 39, uniqueReps: 5, totalDurationSec: 4.0 * 3600 },
      byMethod: [
        { method: 'Phone',         count: 38, durationSec: 2.5 * 3600, isDataMethod: false },
        { method: 'In Person',     count: 18, durationSec: 1.0 * 3600, isDataMethod: false },
        { method: 'Text Message',  count: 14, durationSec: 0,           isDataMethod: false },
        { method: 'Left Message',  count: 11, durationSec: 0.5 * 3600, isDataMethod: false },
        { method: 'New Contact',   count:  7, durationSec: 0,           isDataMethod: true  },
        { method: 'Data Entry',    count:  5, durationSec: 0,           isDataMethod: true  },
      ],
      leaderboard: [
        { userId: '1', name: 'Sakina Mayan',         avatarUrl: null, logs: 22, outreachLogs: 20, dataLogs: 2, durationSec: 1.24 * 3600 },
        { userId: '2', name: 'Brendan Kenney',       avatarUrl: null, logs: 21, outreachLogs: 18, dataLogs: 3, durationSec: 1.0 * 3600 },
        { userId: '3', name: 'Lindsay Rothschild',   avatarUrl: null, logs: 17, outreachLogs: 15, dataLogs: 2, durationSec: 0.86 * 3600 },
        { userId: '4', name: 'Pamela Calvo',         avatarUrl: null, logs: 17, outreachLogs: 14, dataLogs: 3, durationSec: 0.5 * 3600 },
        { userId: '5', name: 'Donald MacKillop',     avatarUrl: null, logs: 14, outreachLogs: 12, dataLogs: 2, durationSec: 0.4 * 3600 },
      ],
      topAreas: [
        { area: 'Tucson, AZ',     count: 19 },
        { area: 'Phoenix, AZ',    count: 16 },
        { area: 'Scottsdale, AZ', count: 12 },
        { area: 'Mesa, AZ',       count:  9 },
        { area: 'Sedona, AZ',     count:  5 },
      ],
      topContacts: [
        { name: 'Robert Chen',    company: 'Banner Behavioral',       touches: 5, lastMethod: 'In Person', lastAt: now.toISOString() },
        { name: 'Maria Gonzalez', company: 'Tucson Recovery Network', touches: 4, lastMethod: 'Phone', lastAt: now.toISOString() },
        { name: 'David Wilson',   company: null,                       touches: 4, lastMethod: 'Text Message', lastAt: now.toISOString() },
        { name: 'Jennifer Park',  company: 'AZ Sober Living',         touches: 3, lastMethod: 'Phone', lastAt: now.toISOString() },
        { name: 'Emily Roberts',  company: 'Yavapai Counseling',      touches: 3, lastMethod: 'Phone', lastAt: now.toISOString() },
      ],
    },
    generatedAt: now.toISOString(),
  };
}
