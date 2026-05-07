import { jsPDF } from 'jspdf';
import type { RecoveryReportPayload, CallLogRow, AnalyticsPayload } from './content';

// Multi-page branded PDF for the Recovery.com report. We render
// every section in pure jsPDF primitives (no canvas snapshot) so
// the file stays small and the text inside the PDF is selectable.
//
// Pages:
//   1. Cover — Seven Arrows mark, report title, date window, total
//      calls hero stat, key takeaways
//   2. Stats overview — KPI tiles + daily volume chart
//   3. Attribution — top tracking labels / numbers / sources
//   4. Geography — top cities + states
//   5. Timing — hour-of-day / day-of-week
//   6. Analytics (GA4) — sessions, sources, landing pages, etc.
//   7+. Comprehensive call log — table that paginates as needed

const PAGE_W = 612; // letter width in pt
const PAGE_H = 792; // letter height in pt
const MARGIN_X = 48;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 64;

const COLOR = {
  text: '#1a1a1a',
  muted: '#71665e',
  faint: '#a89d93',
  hairline: '#e6dfd5',
  card: '#f5f0eb',
  primary: '#bc6b4a',
  primaryDark: '#6b2a14',
  emerald: '#059669',
  amber: '#d97706',
  red: '#dc2626',
} as const;

interface PageContext {
  pdf: jsPDF;
  cursorY: number;
  pageNumber: number;
}

function newDoc(): PageContext {
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  return { pdf, cursorY: MARGIN_TOP, pageNumber: 1 };
}

function ensureRoom(ctx: PageContext, needed: number) {
  if (ctx.cursorY + needed > PAGE_H - MARGIN_BOTTOM) {
    drawFooter(ctx);
    ctx.pdf.addPage();
    ctx.pageNumber++;
    ctx.cursorY = MARGIN_TOP;
    drawHeader(ctx);
  }
}

function drawHeader(ctx: PageContext) {
  const { pdf } = ctx;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.primary);
  pdf.text(asciiSafe('SEVEN ARROWS RECOVERY'), MARGIN_X, 32);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(COLOR.faint);
  pdf.text(asciiSafe('Recovery.com performance report'), MARGIN_X + 150, 32);

  pdf.setDrawColor(COLOR.hairline);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, 40, PAGE_W - MARGIN_X, 40);
}

function drawFooter(ctx: PageContext) {
  const { pdf } = ctx;
  pdf.setDrawColor(COLOR.hairline);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, PAGE_H - MARGIN_BOTTOM + 16, PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.faint);
  pdf.text(asciiSafe('sevenarrowsrecoveryarizona.com'), MARGIN_X, PAGE_H - MARGIN_BOTTOM + 30);
  pdf.text(asciiSafe(`Page ${ctx.pageNumber}`), PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM + 30, { align: 'right' });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fmtDuration(s: number): string {
  if (!Number.isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Helvetica's WinAnsi encoding (jsPDF's default) doesn't include
// the unicode glyphs we lean on in the on-screen UI (>=, ->, em
// dash, curly quotes). When we feed those characters in raw, jsPDF
// either drops them or substitutes look-alikes that throw off line
// widths. Anywhere we hand a string to pdf.text we route it through
// asciiSafe first so the printed copy stays clean.
function asciiSafe(input: string): string {
  return input
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/—|–/g, '-')
    .replace(/•/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...');
}

// PII redaction for the printed report. The PDF is intended to be
// shared with marketing partners + executives, so we keep the data
// useful (last-4 phone digits, location) but strip the pieces that
// directly identify the caller.
function redactPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return `(***) ***-${digits.slice(-4)}`;
}

// ─── Cover page ─────────────────────────────────────────────────

function drawCoverPage(ctx: PageContext, data: RecoveryReportPayload) {
  const { pdf } = ctx;

  // Brand bar.
  pdf.setFillColor(COLOR.primary);
  pdf.rect(0, 0, PAGE_W, 6, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(COLOR.primary);
  pdf.text(asciiSafe('SEVEN ARROWS RECOVERY'), MARGIN_X, 56);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.faint);
  pdf.text(asciiSafe('Patient portal - sevenarrowsrecoveryarizona.com'), MARGIN_X, 70);

  // Title block.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(COLOR.text);
  pdf.text(asciiSafe('Recovery.com'), MARGIN_X, 200);
  pdf.setFontSize(28);
  pdf.setTextColor(COLOR.primary);
  pdf.text(asciiSafe('call performance'), MARGIN_X, 232);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(COLOR.muted);
  const blurb = pdf.splitTextToSize(
    asciiSafe(
      'Every call CTM attributes to the Recovery.com listing - call volume, tracking-line attribution, and caller geography for the window below.',
    ),
    PAGE_W - MARGIN_X * 2,
  );
  pdf.text(blurb, MARGIN_X, 260);

  // Window + generated.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.faint);
  pdf.text('REPORT WINDOW', MARGIN_X, 320);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(COLOR.text);
  pdf.text(asciiSafe(`${fmtDate(data.range.from)}  ->  ${fmtDate(data.range.to)}`), MARGIN_X, 340);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.faint);
  pdf.text('GENERATED', MARGIN_X + 260, 320);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(COLOR.text);
  pdf.text(
    asciiSafe(
      new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }),
    ),
    MARGIN_X + 260,
    340,
  );

  // Hero KPI tiles — 4 across.
  const tileY = 380;
  const tileGap = 10;
  const tileW = (PAGE_W - MARGIN_X * 2 - tileGap * 3) / 4;
  const tileH = 90;
  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Total calls',
      value: data.overview.total.toLocaleString(),
      sub: `${data.overview.uniqueCallers} unique callers`,
    },
    {
      label: 'Inbound',
      value: data.overview.inbound.toLocaleString(),
      sub: `${data.overview.outbound} outbound`,
    },
    {
      label: 'Voicemails',
      value: data.overview.voicemails.toLocaleString(),
      sub: 'Of total calls',
    },
    {
      label: 'Missed inbound',
      value: data.overview.missed.toLocaleString(),
      sub: 'Voicemail + < 3s talk',
    },
  ];
  tiles.forEach((t, i) => {
    const x = MARGIN_X + i * (tileW + tileGap);
    pdf.setFillColor(COLOR.card);
    pdf.roundedRect(x, tileY, tileW, tileH, 6, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(COLOR.faint);
    pdf.text(asciiSafe(t.label.toUpperCase()), x + 12, tileY + 22);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(t.value.length > 4 ? 22 : 26);
    pdf.setTextColor(COLOR.primary);
    pdf.text(asciiSafe(t.value), x + 12, tileY + 56);
    if (t.sub) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.setTextColor(COLOR.muted);
      pdf.text(asciiSafe(t.sub), x + 12, tileY + 74);
    }
  });

  // Takeaways.
  drawTakeaways(ctx, data, tileY + tileH + 30);

  drawFooter(ctx);
}

function drawTakeaways(ctx: PageContext, data: RecoveryReportPayload, startY: number) {
  const { pdf } = ctx;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.primary);
  pdf.text('KEY TAKEAWAYS', MARGIN_X, startY);

  const topLabel = data.trackingLabels[0] ?? null;
  const topSource = data.sources[0] ?? null;
  const topCity = data.cities[0] ?? null;

  const rawLines = [
    `${data.overview.total.toLocaleString()} calls landed via Recovery.com in this window (${data.overview.inbound} inbound, ${data.overview.outbound} outbound).`,
    `${data.overview.uniqueCallers.toLocaleString()} unique callers reached the listing.`,
    topLabel
      ? `The "${topLabel.label}" tracking line fielded the most calls (${topLabel.count}).`
      : '',
    topSource
      ? `Top CTM source variant: "${topSource.label}" with ${topSource.count} calls.`
      : '',
    topCity
      ? `${topCity.city}${topCity.state ? `, ${topCity.state}` : ''} was the busiest caller city (${topCity.count} calls).`
      : '',
    data.overview.missed > 0
      ? `${data.overview.missed} inbound call${data.overview.missed === 1 ? '' : 's'} went to voicemail or hung up before a 3-second talk window - review the call log on the last pages for callbacks.`
      : 'Every inbound call in this window cleared the 3-second talk threshold.',
  ].filter(Boolean);

  let y = startY + 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(COLOR.text);
  // Bullet column: indent the wrapped text so the second line of a
  // long bullet aligns under the first letter, not the bullet glyph.
  const bulletGutter = 12;
  const bodyW = PAGE_W - MARGIN_X * 2 - bulletGutter;
  for (const line of rawLines) {
    const wrapped = pdf.splitTextToSize(asciiSafe(line), bodyW);
    pdf.text('-', MARGIN_X, y);
    pdf.text(wrapped, MARGIN_X + bulletGutter, y);
    y += wrapped.length * 14 + 4;
  }
}

// ─── Stats page ─────────────────────────────────────────────────

function drawStatsPage(ctx: PageContext, data: RecoveryReportPayload) {
  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  drawSectionHeading(ctx, 'OVERVIEW', 'Headline numbers');
  ctx.cursorY += 8;

  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: 'Total calls', value: data.overview.total.toLocaleString() },
    { label: 'Inbound', value: data.overview.inbound.toLocaleString(), sub: `${data.overview.outbound} outbound` },
    { label: 'Unique callers', value: data.overview.uniqueCallers.toLocaleString(), sub: 'Distinct phone numbers' },
    { label: 'Voicemails', value: data.overview.voicemails.toLocaleString(), sub: 'Of total calls' },
    { label: 'Avg duration', value: fmtDuration(data.overview.avgDuration), sub: `${fmtDuration(data.overview.avgTalkTime)} talk` },
    { label: 'Total talk time', value: fmtDuration(data.overview.totalTalkTime), sub: `${fmtDuration(data.overview.totalDuration)} ringtime` },
    { label: 'Missed inbound', value: data.overview.missed.toLocaleString(), sub: 'VM + < 3s talk' },
    { label: 'Outbound', value: data.overview.outbound.toLocaleString(), sub: 'Calls placed' },
  ];

  const cols = 4;
  const tileW = (PAGE_W - MARGIN_X * 2 - 10 * (cols - 1)) / cols;
  const tileH = 70;
  let row = 0;
  let col = 0;
  for (const t of tiles) {
    const x = MARGIN_X + col * (tileW + 10);
    const y = ctx.cursorY + row * (tileH + 10);
    ctx.pdf.setFillColor(COLOR.card);
    ctx.pdf.roundedRect(x, y, tileW, tileH, 5, 5, 'F');
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text(asciiSafe(t.label.toUpperCase()), x + 10, y + 16);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(20);
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(asciiSafe(t.value), x + 10, y + 44);
    if (t.sub) {
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(7);
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(asciiSafe(t.sub), x + 10, y + 60);
    }
    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  }
  ctx.cursorY += (row + 1) * (tileH + 10) + 16;

  // Daily volume chart.
  drawDailyVolumeChart(ctx, data.dailyCounts);
  drawFooter(ctx);
}

function drawDailyVolumeChart(ctx: PageContext, daily: RecoveryReportPayload['dailyCounts']) {
  if (daily.length === 0) return;
  ensureRoom(ctx, 220);
  drawSectionHeading(ctx, 'VOLUME', 'Daily call volume');
  ctx.cursorY += 6;

  const startY = ctx.cursorY;
  const chartH = 160;
  const chartW = PAGE_W - MARGIN_X * 2;
  const chartLeft = MARGIN_X;
  const innerLeft = chartLeft + 30;
  const innerRight = chartLeft + chartW - 8;
  const innerTop = startY + 12;
  const innerBottom = startY + chartH - 22;
  const innerW = innerRight - innerLeft;
  const innerH = innerBottom - innerTop;
  const max = Math.max(1, ...daily.map((d) => d.count));
  const slot = innerW / daily.length;
  const barW = Math.max(1, slot * 0.7);

  // Y-axis grid + ticks.
  const tickStep = niceTickStep(max);
  ctx.pdf.setDrawColor(COLOR.hairline);
  ctx.pdf.setLineWidth(0.5);
  for (let v = 0; v <= max; v += tickStep) {
    const y = innerBottom - (innerH * v) / max;
    ctx.pdf.line(innerLeft, y, innerRight, y);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text(String(v), innerLeft - 4, y + 2, { align: 'right' });
  }

  // Bars — total in primary, missed overlaid in red.
  daily.forEach((d, i) => {
    const x = innerLeft + i * slot + (slot - barW) / 2;
    const totalH = (innerH * d.count) / max;
    const missedH = (innerH * d.missed) / max;
    ctx.pdf.setFillColor('#bc6b4a');
    ctx.pdf.rect(x, innerBottom - totalH, barW, totalH, 'F');
    if (missedH > 0) {
      ctx.pdf.setFillColor('#dc2626');
      ctx.pdf.rect(x, innerBottom - missedH, barW, missedH, 'F');
    }
  });

  // X-axis labels (sparse).
  const stride = Math.max(1, Math.ceil(daily.length / 8));
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(7);
  ctx.pdf.setTextColor(COLOR.faint);
  daily.forEach((d, i) => {
    if (i % stride !== 0 && i !== daily.length - 1) return;
    const x = innerLeft + i * slot + slot / 2;
    const date = new Date(d.date + 'T00:00:00');
    ctx.pdf.text(
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      x,
      innerBottom + 14,
      { align: 'center' },
    );
  });

  // Legend.
  const legendY = innerBottom + 32;
  ctx.pdf.setFillColor('#bc6b4a');
  ctx.pdf.rect(innerLeft, legendY, 8, 8, 'F');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(8);
  ctx.pdf.setTextColor(COLOR.muted);
  ctx.pdf.text(asciiSafe('All calls'), innerLeft + 14, legendY + 7);
  ctx.pdf.setFillColor('#dc2626');
  ctx.pdf.rect(innerLeft + 80, legendY, 8, 8, 'F');
  ctx.pdf.text(asciiSafe('Missed inbound'), innerLeft + 94, legendY + 7);

  ctx.cursorY = legendY + 22;
}

function niceTickStep(max: number): number {
  if (max <= 5) return 1;
  if (max <= 10) return 2;
  if (max <= 25) return 5;
  if (max <= 50) return 10;
  if (max <= 100) return 20;
  if (max <= 250) return 50;
  return Math.ceil(max / 5);
}

// ─── Attribution page (tracking labels / numbers / sources) ────

function drawAttributionPage(ctx: PageContext, data: RecoveryReportPayload) {
  if (
    data.trackingLabels.length === 0 &&
    data.trackingNumbers.length === 0 &&
    data.sources.length === 0
  ) {
    return;
  }
  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  if (data.trackingLabels.length > 0) {
    drawSectionHeading(ctx, 'ATTRIBUTION', 'Top tracking labels');
    ctx.cursorY += 6;
    drawHorizontalBars(
      ctx,
      data.trackingLabels.map((r) => ({ label: r.label, value: r.count, color: COLOR.primary })),
    );
    ctx.cursorY += 16;
  }

  if (data.trackingNumbers.length > 0) {
    drawSectionHeading(ctx, 'ATTRIBUTION', 'Top tracking numbers');
    ctx.cursorY += 6;
    drawHorizontalBars(
      ctx,
      data.trackingNumbers.map((r) => ({ label: r.number, value: r.count, color: COLOR.primaryDark })),
    );
    ctx.cursorY += 16;
  }

  if (data.sources.length > 0) {
    drawSectionHeading(ctx, 'ATTRIBUTION', 'Top sources');
    ctx.cursorY += 6;
    drawHorizontalBars(
      ctx,
      data.sources.map((r) => ({ label: r.label, value: r.count, color: COLOR.emerald })),
    );
  }

  drawFooter(ctx);
}

// ─── Geography page ─────────────────────────────────────────────

function drawGeoPage(ctx: PageContext, data: RecoveryReportPayload) {
  if (data.cities.length === 0 && data.states.length === 0) return;
  ensureRoom(ctx, 200);
  if (ctx.cursorY === MARGIN_TOP) {
    // already at top of fresh page
  } else {
    ctx.pdf.addPage();
    ctx.pageNumber++;
    ctx.cursorY = MARGIN_TOP;
    drawHeader(ctx);
  }

  if (data.cities.length > 0) {
    drawSectionHeading(ctx, 'GEOGRAPHY', 'Top caller cities');
    ctx.cursorY += 6;
    const cols = [
      { label: 'City', x: MARGIN_X },
      { label: 'State', x: MARGIN_X + 280 },
      { label: 'Calls', x: PAGE_W - MARGIN_X, align: 'right' as const },
    ];
    drawTableHeader(ctx, cols);
    for (const r of data.cities) {
      ensureRoom(ctx, 18);
      const y = ctx.cursorY + 11;
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setFontSize(9);
      ctx.pdf.setTextColor(COLOR.text);
      ctx.pdf.text(asciiSafe(r.city), cols[0].x, y);
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(asciiSafe(r.state ?? '-'), cols[1].x, y);
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setTextColor(COLOR.primary);
      ctx.pdf.text(String(r.count), cols[2].x, y, { align: 'right' });
      ctx.pdf.setDrawColor(COLOR.hairline);
      ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
      ctx.cursorY += 18;
    }
    ctx.cursorY += 16;
  }

  if (data.states.length > 0) {
    ensureRoom(ctx, 60 + data.states.length * 16);
    drawSectionHeading(ctx, 'GEOGRAPHY', 'Top caller states');
    ctx.cursorY += 6;
    drawHorizontalBars(
      ctx,
      data.states.map((r) => ({ label: r.state, value: r.count, color: '#3b82f6' })),
    );
  }

  drawFooter(ctx);
}

// ─── Timing page (hour + day of week) ──────────────────────────

function drawTimingPage(ctx: PageContext, data: RecoveryReportPayload) {
  const hourlyHas = data.hourlyCounts.some((h) => h.count > 0);
  const dowHas = data.dowCounts.some((d) => d.count > 0);
  if (!hourlyHas && !dowHas) return;

  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  drawSectionHeading(ctx, 'TIMING', 'When calls arrive');
  ctx.cursorY += 4;

  const startY = ctx.cursorY;
  const halfW = (PAGE_W - MARGIN_X * 2 - 16) / 2;
  const chartH = 140;

  // Hour-of-day chart (left).
  if (hourlyHas) {
    const left = MARGIN_X;
    const innerLeft = left + 28;
    const innerRight = left + halfW - 4;
    const innerTop = startY + 16;
    const innerBottom = startY + chartH - 18;
    const innerW = innerRight - innerLeft;
    const innerH = innerBottom - innerTop;
    const max = Math.max(1, ...data.hourlyCounts.map((h) => h.count));
    const slot = innerW / 24;
    const barW = slot * 0.7;
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text('BY HOUR (PHOENIX)', left, startY + 8);
    data.hourlyCounts.forEach((h, i) => {
      const x = innerLeft + i * slot + (slot - barW) / 2;
      const totalH = (innerH * h.count) / max;
      ctx.pdf.setFillColor('#bc6b4a');
      ctx.pdf.rect(x, innerBottom - totalH, barW, totalH, 'F');
    });
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    [
      [0, '12am'],
      [6, '6am'],
      [12, 'noon'],
      [18, '6pm'],
    ].forEach(([h, label]) => {
      const x = innerLeft + (h as number) * slot + slot / 2;
      ctx.pdf.text(asciiSafe(label as string), x, innerBottom + 12, { align: 'center' });
    });
  }

  // Day-of-week chart (right).
  if (dowHas) {
    const left = MARGIN_X + halfW + 16;
    const max = Math.max(1, ...data.dowCounts.map((d) => d.count));
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text('BY DAY OF WEEK', left, startY + 8);
    let y = startY + 22;
    for (const d of data.dowCounts) {
      const pct = d.count / max;
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setFontSize(8);
      ctx.pdf.setTextColor(COLOR.text);
      ctx.pdf.text(asciiSafe(d.label), left, y + 7);
      const trackLeft = left + 36;
      const trackW = halfW - 36 - 50;
      ctx.pdf.setFillColor(COLOR.card);
      ctx.pdf.roundedRect(trackLeft, y + 1, trackW, 8, 2, 2, 'F');
      ctx.pdf.setFillColor('#10b981');
      ctx.pdf.roundedRect(trackLeft, y + 1, trackW * pct, 8, 2, 2, 'F');
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(8);
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(String(d.count), left + halfW - 8, y + 7, { align: 'right' });
      y += 14;
    }
  }
  ctx.cursorY = startY + chartH + 12;

  // Repeat callers — slot in here if there's room.
  if (data.repeatCallers.length > 0) {
    ensureRoom(ctx, 60 + data.repeatCallers.length * 18);
    drawSectionHeading(ctx, 'PERSISTENCE', 'Repeat callers');
    ctx.cursorY += 6;
    const rcCols = [
      { label: 'Phone', x: MARGIN_X },
      { label: 'Location', x: MARGIN_X + 130 },
      { label: 'Calls', x: MARGIN_X + 280, align: 'right' as const },
      { label: 'First', x: MARGIN_X + 360 },
      { label: 'Last', x: PAGE_W - MARGIN_X, align: 'right' as const },
    ];
    drawTableHeader(ctx, rcCols);
    for (const r of data.repeatCallers) {
      ensureRoom(ctx, 18);
      const y = ctx.cursorY + 11;
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setFontSize(9);
      ctx.pdf.setTextColor(COLOR.text);
      ctx.pdf.text(redactPhone(r.phone), rcCols[0].x, y);
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(asciiSafe([r.city, r.state].filter(Boolean).join(', ') || '-'), rcCols[1].x, y);
      ctx.pdf.setTextColor(COLOR.primary);
      ctx.pdf.text(String(r.calls), rcCols[2].x, y, { align: 'right' });
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(asciiSafe(fmtDateTime(r.firstAt)), rcCols[3].x, y);
      ctx.pdf.text(asciiSafe(fmtDateTime(r.lastAt)), rcCols[4].x, y, { align: 'right' });
      ctx.pdf.setDrawColor(COLOR.hairline);
      ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
      ctx.cursorY += 18;
    }
  }

  drawFooter(ctx);
}

interface HBar {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}

function drawHorizontalBars(ctx: PageContext, rows: HBar[]) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const labelW = 220;
  const valueW = 60;
  const barLeft = MARGIN_X + labelW;
  const barRight = PAGE_W - MARGIN_X - valueW;
  const barW = barRight - barLeft;
  const rowH = 18;
  ensureRoom(ctx, rows.length * rowH + 12);
  for (const r of rows) {
    ensureRoom(ctx, rowH);
    const y = ctx.cursorY;
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(COLOR.text);
    const labelClipped = ctx.pdf.splitTextToSize(asciiSafe(r.label), labelW - 8)[0];
    ctx.pdf.text(labelClipped, MARGIN_X, y + 11);

    // Track + filled bar.
    ctx.pdf.setFillColor(COLOR.card);
    ctx.pdf.roundedRect(barLeft, y + 4, barW, 8, 2, 2, 'F');
    const fillW = (barW * r.value) / max;
    if (fillW > 0) {
      ctx.pdf.setFillColor(r.color);
      ctx.pdf.roundedRect(barLeft, y + 4, fillW, 8, 2, 2, 'F');
    }
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(COLOR.text);
    const valueLabel = r.suffix ? `${r.value}  ${r.suffix}` : String(r.value);
    ctx.pdf.text(asciiSafe(valueLabel), PAGE_W - MARGIN_X, y + 11, { align: 'right' });
    ctx.cursorY += rowH;
  }
}

// ─── Call log ───────────────────────────────────────────────────

function drawCallLogPages(ctx: PageContext, calls: CallLogRow[]) {
  if (calls.length === 0) return;
  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  drawSectionHeading(ctx, 'DETAIL', 'Comprehensive call log');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(COLOR.muted);
  ctx.pdf.text(
    asciiSafe(
      `${calls.length.toLocaleString()} calls in this window. Phone numbers are redacted; only the last four digits of each number are shown.`,
    ),
    MARGIN_X,
    ctx.cursorY + 18,
  );
  ctx.cursorY += 36;

  const cols = [
    { label: 'When', x: MARGIN_X },
    { label: 'Caller', x: MARGIN_X + 120 },
    { label: 'Location', x: MARGIN_X + 220 },
    { label: 'Dir', x: MARGIN_X + 330 },
    { label: 'Duration', x: MARGIN_X + 380, align: 'right' as const },
    { label: 'Tracking', x: MARGIN_X + 410 },
    { label: 'Source', x: PAGE_W - MARGIN_X, align: 'right' as const },
  ];
  drawTableHeader(ctx, cols);

  for (const c of calls) {
    ensureRoom(ctx, 18);
    const y = ctx.cursorY + 11;
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(COLOR.muted);
    ctx.pdf.text(asciiSafe(fmtDateTime(c.called_at)), cols[0].x, y);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(redactPhone(c.caller_number), cols[1].x, y);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setTextColor(COLOR.muted);
    const loc = [c.city, c.state].filter(Boolean).join(', ') || '-';
    ctx.pdf.text(asciiSafe(loc), cols[2].x, y);
    ctx.pdf.text(asciiSafe(c.direction || '-'), cols[3].x, y);
    ctx.pdf.text(asciiSafe(fmtDuration(c.duration)), cols[4].x, y, { align: 'right' });
    const tracking = c.tracking_label || c.tracking_number || '-';
    const trackingClipped = ctx.pdf.splitTextToSize(asciiSafe(tracking), 110)[0];
    ctx.pdf.text(trackingClipped, cols[5].x, y);
    const src = c.source || '-';
    const srcClipped = ctx.pdf.splitTextToSize(asciiSafe(src), 110)[0];
    ctx.pdf.text(srcClipped, cols[6].x, y, { align: 'right' });
    if (c.voicemail) {
      ctx.pdf.setTextColor(COLOR.amber);
      ctx.pdf.setFontSize(7);
      ctx.pdf.text('VM', cols[1].x + 60, y);
    }
    ctx.pdf.setDrawColor(COLOR.hairline);
    ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
    ctx.cursorY += 18;
  }
  drawFooter(ctx);
}

// ─── Common helpers ─────────────────────────────────────────────

function drawSectionHeading(ctx: PageContext, eyebrow: string, title: string) {
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(7);
  ctx.pdf.setTextColor(COLOR.primary);
  ctx.pdf.text(asciiSafe(eyebrow), MARGIN_X, ctx.cursorY);
  ctx.pdf.setFontSize(15);
  ctx.pdf.setTextColor(COLOR.text);
  ctx.pdf.text(asciiSafe(title), MARGIN_X, ctx.cursorY + 18);
  ctx.cursorY += 28;
}

function drawTableHeader(ctx: PageContext, cols: { label: string; x: number; align?: 'left' | 'right' }[]) {
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(7);
  ctx.pdf.setTextColor(COLOR.faint);
  for (const c of cols) {
    ctx.pdf.text(asciiSafe(c.label.toUpperCase()), c.x, ctx.cursorY + 10, { align: c.align });
  }
  ctx.pdf.setDrawColor(COLOR.hairline);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.line(MARGIN_X, ctx.cursorY + 16, PAGE_W - MARGIN_X, ctx.cursorY + 16);
  ctx.cursorY += 20;
}

// ─── Analytics page (GA4) ───────────────────────────────────────

function drawAnalyticsPage(ctx: PageContext, analytics: AnalyticsPayload | null) {
  // Skip entirely when there's nothing useful to print.
  if (!analytics || !analytics.configured || analytics.error) return;
  if (!analytics.summary || analytics.summary.sessions === 0) return;

  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  drawSectionHeading(ctx, 'WEBSITE', 'Traffic via Recovery.com');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(9);
  ctx.pdf.setTextColor(COLOR.muted);
  const subtitle = analytics.range
    ? `Sessions, users, and engagement attributed to Recovery.com referrals (Google Analytics 4) for ${analytics.range.startDate} through ${analytics.range.endDate}.`
    : 'Sessions, users, and engagement attributed to Recovery.com referrals (Google Analytics 4).';
  const wrappedSub = ctx.pdf.splitTextToSize(asciiSafe(subtitle), PAGE_W - MARGIN_X * 2);
  ctx.pdf.text(wrappedSub, MARGIN_X, ctx.cursorY);
  ctx.cursorY += wrappedSub.length * 12 + 8;

  // KPI tiles — sessions, users, duration, engagement, bounce, etc.
  const summary = analytics.summary;
  const previous = analytics.previous ?? null;
  const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const fmtSecs = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    if (m === 0) return `${sec}s`;
    return `${m}m ${sec}s`;
  };
  const tiles: { label: string; value: string; delta?: string }[] = [
    { label: 'Sessions', value: summary.sessions.toLocaleString(), delta: deltaLabel(summary.sessions, previous?.sessions) },
    { label: 'Active users', value: summary.activeUsers.toLocaleString(), delta: deltaLabel(summary.activeUsers, previous?.activeUsers) },
    { label: 'New users', value: summary.newUsers.toLocaleString(), delta: deltaLabel(summary.newUsers, previous?.newUsers) },
    { label: 'Pageviews', value: summary.pageViews.toLocaleString(), delta: deltaLabel(summary.pageViews, previous?.pageViews) },
    { label: 'Avg session', value: fmtSecs(summary.avgSessionDurationSec), delta: deltaLabel(summary.avgSessionDurationSec, previous?.avgSessionDurationSec) },
    { label: 'Pages / session', value: summary.pagesPerSession.toFixed(2), delta: deltaLabel(summary.pagesPerSession, previous?.pagesPerSession) },
    { label: 'Engagement', value: fmtPct(summary.engagementRate), delta: deltaLabel(summary.engagementRate, previous?.engagementRate) },
    { label: 'Bounce rate', value: fmtPct(summary.bounceRate), delta: deltaLabel(summary.bounceRate, previous?.bounceRate, true) },
  ];
  const cols = 4;
  const tileW = (PAGE_W - MARGIN_X * 2 - 10 * (cols - 1)) / cols;
  const tileH = 70;
  let row = 0;
  let col = 0;
  for (const t of tiles) {
    const x = MARGIN_X + col * (tileW + 10);
    const y = ctx.cursorY + row * (tileH + 10);
    ctx.pdf.setFillColor(COLOR.card);
    ctx.pdf.roundedRect(x, y, tileW, tileH, 5, 5, 'F');
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(6.5);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text(asciiSafe(t.label.toUpperCase()), x + 10, y + 16);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(20);
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(asciiSafe(t.value), x + 10, y + 44);
    if (t.delta) {
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(7);
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(asciiSafe(t.delta), x + 10, y + 60);
    }
    col++;
    if (col >= cols) {
      col = 0;
      row++;
    }
  }
  ctx.cursorY += (row + 1) * (tileH + 10) + 16;

  // Per-source split (recoverycom vs rehabpath).
  drawAnalyticsSources(ctx, analytics);

  // Daily sessions chart.
  drawAnalyticsDailyChart(ctx, analytics.daily ?? []);

  // Hour-of-day + day-of-week distribution.
  drawAnalyticsTimePatterns(ctx, analytics);

  // Top cities table.
  drawAnalyticsCities(ctx, analytics.cities ?? []);

  // Geo + device + events — three small column lists.
  if (
    (analytics.countries && analytics.countries.length > 0) ||
    (analytics.devices && analytics.devices.length > 0) ||
    (analytics.events && analytics.events.length > 0)
  ) {
    ensureRoom(ctx, 200);
    drawSectionHeading(ctx, 'BREAKDOWNS', 'Geography, devices, events');
    ctx.cursorY += 4;
    const colW = (PAGE_W - MARGIN_X * 2 - 16 * 2) / 3;
    const headStartY = ctx.cursorY;
    const colX = [MARGIN_X, MARGIN_X + colW + 16, MARGIN_X + (colW + 16) * 2];

    const drawMiniList = (
      x: number,
      heading: string,
      rows: { left: string; right: string }[],
    ) => {
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setFontSize(7);
      ctx.pdf.setTextColor(COLOR.faint);
      ctx.pdf.text(asciiSafe(heading), x, headStartY);
      ctx.pdf.setDrawColor(COLOR.hairline);
      ctx.pdf.line(x, headStartY + 6, x + colW, headStartY + 6);
      let y = headStartY + 18;
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(9);
      for (const r of rows) {
        const left = ctx.pdf.splitTextToSize(asciiSafe(r.left), colW - 50)[0];
        ctx.pdf.setTextColor(COLOR.text);
        ctx.pdf.text(left, x, y);
        ctx.pdf.setTextColor(COLOR.muted);
        ctx.pdf.text(asciiSafe(r.right), x + colW, y, { align: 'right' });
        y += 13;
      }
      return y;
    };

    let lowest = headStartY;

    if (analytics.countries && analytics.countries.length > 0) {
      const total = analytics.countries.reduce((s, r) => s + r.sessions, 0) || 1;
      const lines = analytics.countries.slice(0, 7).map((r) => ({
        left: r.country || '(unknown)',
        right: `${r.sessions}  ${Math.round((r.sessions / total) * 100)}%`,
      }));
      lowest = Math.max(lowest, drawMiniList(colX[0], 'TOP COUNTRIES', lines));
    }
    if (analytics.devices && analytics.devices.length > 0) {
      const total = analytics.devices.reduce((s, r) => s + r.sessions, 0) || 1;
      const lines = analytics.devices.map((r) => ({
        left: r.device.charAt(0).toUpperCase() + r.device.slice(1),
        right: `${r.sessions}  ${Math.round((r.sessions / total) * 100)}%`,
      }));
      lowest = Math.max(lowest, drawMiniList(colX[1], 'DEVICES', lines));
    }
    if (analytics.events && analytics.events.length > 0) {
      const interesting = analytics.events
        .filter((r) =>
          /click|submit|conversion|call|book|tour|verify|chat|signup|contact|cta|begin|purchase|download/i.test(r.name),
        )
        .slice(0, 7);
      const display = interesting.length > 0 ? interesting : analytics.events.slice(0, 7);
      const lines = display.map((r) => ({ left: r.name, right: r.count.toLocaleString() }));
      lowest = Math.max(lowest, drawMiniList(colX[2], 'TOP EVENTS', lines));
    }
    ctx.cursorY = lowest + 12;
  }

  // Top landing pages table.
  if (analytics.landing && analytics.landing.length > 0) {
    ensureRoom(ctx, 80 + Math.min(analytics.landing.length, 10) * 18);
    drawSectionHeading(ctx, 'PAGES', 'Top landing pages');
    ctx.cursorY += 4;
    const lpCols = [
      { label: 'Path', x: MARGIN_X },
      { label: 'Sessions', x: MARGIN_X + 280, align: 'right' as const },
      { label: 'Users', x: MARGIN_X + 340, align: 'right' as const },
      { label: 'Engagement', x: MARGIN_X + 410, align: 'right' as const },
      { label: 'Bounce', x: PAGE_W - MARGIN_X, align: 'right' as const },
    ];
    drawTableHeader(ctx, lpCols);
    for (const r of analytics.landing.slice(0, 10)) {
      ensureRoom(ctx, 18);
      const y = ctx.cursorY + 11;
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(8);
      ctx.pdf.setTextColor(COLOR.text);
      const truncatedPath = ctx.pdf.splitTextToSize(asciiSafe(r.path || '/'), 270)[0];
      ctx.pdf.text(truncatedPath, lpCols[0].x, y);
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setTextColor(COLOR.primary);
      ctx.pdf.text(String(r.sessions), lpCols[1].x, y, { align: 'right' });
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setTextColor(COLOR.text);
      ctx.pdf.text(String(r.activeUsers), lpCols[2].x, y, { align: 'right' });
      ctx.pdf.setTextColor(COLOR.emerald);
      ctx.pdf.text(`${(r.engagementRate * 100).toFixed(0)}%`, lpCols[3].x, y, { align: 'right' });
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(`${(r.bounceRate * 100).toFixed(0)}%`, lpCols[4].x, y, { align: 'right' });
      ctx.pdf.setDrawColor(COLOR.hairline);
      ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
      ctx.cursorY += 18;
    }
  }

  drawFooter(ctx);
}

function drawAnalyticsDailyChart(ctx: PageContext, daily: { date: string; sessions: number; activeUsers: number; pageViews: number }[]) {
  if (daily.length === 0) return;
  ensureRoom(ctx, 200);
  drawSectionHeading(ctx, 'DAILY', 'Sessions over time');
  ctx.cursorY += 4;
  const startY = ctx.cursorY;
  const chartH = 150;
  const chartW = PAGE_W - MARGIN_X * 2;
  const innerLeft = MARGIN_X + 30;
  const innerRight = MARGIN_X + chartW - 8;
  const innerTop = startY + 12;
  const innerBottom = startY + chartH - 22;
  const innerW = innerRight - innerLeft;
  const innerH = innerBottom - innerTop;
  const max = Math.max(1, ...daily.map((d) => d.sessions));
  const slot = innerW / daily.length;
  const barW = Math.max(1, slot * 0.7);
  const tickStep = niceTickStep(max);
  ctx.pdf.setDrawColor(COLOR.hairline);
  ctx.pdf.setLineWidth(0.5);
  for (let v = 0; v <= max; v += tickStep) {
    const y = innerBottom - (innerH * v) / max;
    ctx.pdf.line(innerLeft, y, innerRight, y);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text(String(v), innerLeft - 4, y + 2, { align: 'right' });
  }
  daily.forEach((d, i) => {
    const x = innerLeft + i * slot + (slot - barW) / 2;
    const totalH = (innerH * d.sessions) / max;
    ctx.pdf.setFillColor('#3b82f6');
    ctx.pdf.rect(x, innerBottom - totalH, barW, totalH, 'F');
  });
  const stride = Math.max(1, Math.ceil(daily.length / 8));
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(7);
  ctx.pdf.setTextColor(COLOR.faint);
  daily.forEach((d, i) => {
    if (i % stride !== 0 && i !== daily.length - 1) return;
    const x = innerLeft + i * slot + slot / 2;
    const date = new Date(d.date + 'T00:00:00');
    ctx.pdf.text(
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      x,
      innerBottom + 14,
      { align: 'center' },
    );
  });
  ctx.cursorY = innerBottom + 26;
}

function drawAnalyticsSources(ctx: PageContext, analytics: AnalyticsPayload) {
  const sources = analytics.sources ?? [];
  if (sources.length === 0) return;
  ensureRoom(ctx, 80 + sources.length * 18);
  drawSectionHeading(
    ctx,
    'SOURCES',
    `Recovery.com network split (${(analytics.sourceFilter ?? []).join(' / ')})`,
  );
  ctx.cursorY += 4;
  const cols = [
    { label: 'Source', x: MARGIN_X },
    { label: 'Sessions', x: MARGIN_X + 200, align: 'right' as const },
    { label: 'Users', x: MARGIN_X + 270, align: 'right' as const },
    { label: 'Avg session', x: MARGIN_X + 360, align: 'right' as const },
    { label: 'Engagement', x: MARGIN_X + 450, align: 'right' as const },
    { label: 'Bounce', x: PAGE_W - MARGIN_X, align: 'right' as const },
  ];
  drawTableHeader(ctx, cols);
  const fmtSecs = (s: number) => {
    if (!Number.isFinite(s) || s <= 0) return '0s';
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    if (m === 0) return `${sec}s`;
    return `${m}m ${sec}s`;
  };
  for (const r of sources) {
    ensureRoom(ctx, 18);
    const y = ctx.cursorY + 11;
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(asciiSafe(r.source), cols[0].x, y);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(String(r.sessions), cols[1].x, y, { align: 'right' });
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(String(r.activeUsers), cols[2].x, y, { align: 'right' });
    ctx.pdf.setTextColor(COLOR.muted);
    ctx.pdf.text(fmtSecs(r.avgSessionDurationSec), cols[3].x, y, { align: 'right' });
    ctx.pdf.setTextColor(COLOR.emerald);
    ctx.pdf.text(`${(r.engagementRate * 100).toFixed(0)}%`, cols[4].x, y, { align: 'right' });
    ctx.pdf.setTextColor(COLOR.muted);
    ctx.pdf.text(`${(r.bounceRate * 100).toFixed(0)}%`, cols[5].x, y, { align: 'right' });
    ctx.pdf.setDrawColor(COLOR.hairline);
    ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
    ctx.cursorY += 18;
  }
  ctx.cursorY += 14;
}

function drawAnalyticsTimePatterns(ctx: PageContext, analytics: AnalyticsPayload) {
  const hourly = analytics.hourly ?? [];
  const dayOfWeek = analytics.dayOfWeek ?? [];
  const hourlyHasData = hourly.some((h) => h.sessions > 0);
  const dayHasData = dayOfWeek.some((d) => d.sessions > 0);
  if (!hourlyHasData && !dayHasData) return;

  ensureRoom(ctx, 200);
  drawSectionHeading(ctx, 'TIMING', 'When Recovery.com traffic arrives');
  ctx.cursorY += 4;

  const startY = ctx.cursorY;
  const halfW = (PAGE_W - MARGIN_X * 2 - 16) / 2;
  const chartH = 120;

  // Hour-of-day chart (left).
  if (hourlyHasData) {
    const left = MARGIN_X;
    const innerLeft = left + 28;
    const innerRight = left + halfW - 4;
    const innerTop = startY + 16;
    const innerBottom = startY + chartH - 18;
    const innerW = innerRight - innerLeft;
    const innerH = innerBottom - innerTop;
    const max = Math.max(1, ...hourly.map((h) => h.sessions));
    const slot = innerW / 24;
    const barW = slot * 0.7;
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text('BY HOUR (PHOENIX)', left, startY + 8);
    hourly.forEach((h, i) => {
      const x = innerLeft + i * slot + (slot - barW) / 2;
      const totalH = (innerH * h.sessions) / max;
      ctx.pdf.setFillColor('#3b82f6');
      ctx.pdf.rect(x, innerBottom - totalH, barW, totalH, 'F');
    });
    // Axis labels: 12am / 6am / noon / 6pm.
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    [
      [0, '12am'],
      [6, '6am'],
      [12, 'noon'],
      [18, '6pm'],
    ].forEach(([h, label]) => {
      const x = innerLeft + (h as number) * slot + slot / 2;
      ctx.pdf.text(asciiSafe(label as string), x, innerBottom + 12, { align: 'center' });
    });
  }

  // Day-of-week chart (right).
  if (dayHasData) {
    const left = MARGIN_X + halfW + 16;
    const max = Math.max(1, ...dayOfWeek.map((d) => d.sessions));
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(7);
    ctx.pdf.setTextColor(COLOR.faint);
    ctx.pdf.text('BY DAY OF WEEK', left, startY + 8);
    let y = startY + 22;
    for (const d of dayOfWeek) {
      const pct = d.sessions / max;
      ctx.pdf.setFont('helvetica', 'bold');
      ctx.pdf.setFontSize(8);
      ctx.pdf.setTextColor(COLOR.text);
      ctx.pdf.text(asciiSafe(d.label), left, y + 7);
      // Track + filled bar.
      const trackLeft = left + 36;
      const trackW = halfW - 36 - 50;
      ctx.pdf.setFillColor(COLOR.card);
      ctx.pdf.roundedRect(trackLeft, y + 1, trackW, 8, 2, 2, 'F');
      ctx.pdf.setFillColor('#10b981');
      ctx.pdf.roundedRect(trackLeft, y + 1, trackW * pct, 8, 2, 2, 'F');
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(8);
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(String(d.sessions), left + halfW - 8, y + 7, { align: 'right' });
      y += 14;
    }
  }
  ctx.cursorY = startY + chartH + 6;
}

function drawAnalyticsCities(ctx: PageContext, cities: NonNullable<AnalyticsPayload['cities']>) {
  if (cities.length === 0) return;
  ensureRoom(ctx, 80 + Math.min(cities.length, 12) * 16);
  drawSectionHeading(ctx, 'GEO', 'Top cities');
  ctx.cursorY += 4;
  const cols = [
    { label: 'City', x: MARGIN_X },
    { label: 'Region / country', x: MARGIN_X + 180 },
    { label: 'Sessions', x: MARGIN_X + 380, align: 'right' as const },
    { label: 'Users', x: MARGIN_X + 440, align: 'right' as const },
    { label: 'Engagement', x: PAGE_W - MARGIN_X, align: 'right' as const },
  ];
  drawTableHeader(ctx, cols);
  for (const r of cities.slice(0, 12)) {
    ensureRoom(ctx, 16);
    const y = ctx.cursorY + 11;
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(asciiSafe(r.city || '(unknown)'), cols[0].x, y);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setTextColor(COLOR.muted);
    ctx.pdf.text(asciiSafe([r.region, r.country].filter(Boolean).join(' - ') || '-'), cols[1].x, y);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(String(r.sessions), cols[2].x, y, { align: 'right' });
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(String(r.activeUsers), cols[3].x, y, { align: 'right' });
    ctx.pdf.setTextColor(COLOR.emerald);
    ctx.pdf.text(`${(r.engagementRate * 100).toFixed(0)}%`, cols[4].x, y, { align: 'right' });
    ctx.pdf.setDrawColor(COLOR.hairline);
    ctx.pdf.line(MARGIN_X, ctx.cursorY + 16, PAGE_W - MARGIN_X, ctx.cursorY + 16);
    ctx.cursorY += 16;
  }
  ctx.cursorY += 14;
}

function deltaLabel(next: number, prev: number | undefined, lowerIsBetter = false): string | undefined {
  if (prev == null || prev === 0) return undefined;
  const change = (next - prev) / prev;
  const pct = Math.abs(change * 100).toFixed(0);
  const arrow = change >= 0 ? 'up' : 'down';
  // Indicate good/bad in plain text since we can't color-tune chips
  // here easily; "Lower is better" handles the bounce-rate framing.
  if (lowerIsBetter) {
    return `${arrow} ${pct}% vs prior  (lower is better)`;
  }
  return `${arrow} ${pct}% vs prior`;
}

// ─── Public entry ───────────────────────────────────────────────

export async function downloadRecoveryComPdf(
  data: RecoveryReportPayload,
  analytics: AnalyticsPayload | null = null,
): Promise<void> {
  const ctx = newDoc();
  drawCoverPage(ctx, data);
  drawStatsPage(ctx, data);
  drawAttributionPage(ctx, data);
  drawGeoPage(ctx, data);
  drawTimingPage(ctx, data);
  drawAnalyticsPage(ctx, analytics);
  drawCallLogPages(ctx, data.callLog);

  const stamp = new Date().toISOString().slice(0, 10);
  ctx.pdf.save(`recovery-com-report-${stamp}.pdf`);
}
