import { jsPDF } from 'jspdf';
import type { RecoveryReportPayload, CallLogRow } from './content';

// Multi-page branded PDF for the Recovery.com report. We render
// every section in pure jsPDF primitives (no canvas snapshot) so
// the file stays small and the text inside the PDF is selectable.
//
// Pages:
//   1. Cover — Seven Arrows mark, report title, date window, total
//      calls hero stat, key takeaways
//   2. Stats overview — 8 KPI tiles
//   3. Daily volume — bar chart drawn with rect primitives
//   4. Distributions — fit, sentiment, client type
//   5. Operator scoreboard — table
//   6+. Comprehensive call log — table that paginates as needed

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
  pdf.text('SEVEN ARROWS RECOVERY', MARGIN_X, 32);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(COLOR.faint);
  pdf.text('Recovery.com performance report', MARGIN_X + 150, 32);

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
  pdf.text('sevenarrowsrecoveryarizona.com', MARGIN_X, PAGE_H - MARGIN_BOTTOM + 30);
  pdf.text(`Page ${ctx.pageNumber}`, PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM + 30, { align: 'right' });
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

// ─── Cover page ─────────────────────────────────────────────────

function drawCoverPage(ctx: PageContext, data: RecoveryReportPayload) {
  const { pdf } = ctx;

  // Brand bar.
  pdf.setFillColor(COLOR.primary);
  pdf.rect(0, 0, PAGE_W, 6, 'F');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.setTextColor(COLOR.primary);
  pdf.text('SEVEN ARROWS RECOVERY', MARGIN_X, 56);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.faint);
  pdf.text('Patient portal · sevenarrowsrecoveryarizona.com', MARGIN_X, 70);

  // Title block.
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(COLOR.text);
  pdf.text('Recovery.com', MARGIN_X, 200);
  pdf.setFontSize(28);
  pdf.setTextColor(COLOR.primary);
  pdf.text('call performance', MARGIN_X, 232);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(COLOR.muted);
  const blurb = pdf.splitTextToSize(
    'Every call CTM attributes to the Recovery.com listing — volume, lead quality, operator handling, and conversion likelihood — for the window below.',
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
  pdf.text(`${fmtDate(data.range.from)}  →  ${fmtDate(data.range.to)}`, MARGIN_X, 340);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(COLOR.faint);
  pdf.text('GENERATED', MARGIN_X + 260, 320);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(COLOR.text);
  pdf.text(new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }), MARGIN_X + 260, 340);

  // Hero KPI tiles.
  const tileY = 380;
  const tileW = (PAGE_W - MARGIN_X * 2 - 12 * 2) / 3;
  const tileH = 90;
  const tiles: { label: string; value: string; sub?: string }[] = [
    {
      label: 'Total calls',
      value: data.overview.total.toLocaleString(),
      sub: `${data.overview.uniqueCallers} unique callers`,
    },
    {
      label: 'Meaningful (fit ≥ 60)',
      value: data.overview.meaningful.toLocaleString(),
      sub: `${Math.round(data.overview.meaningfulPct * 100)}% of all calls`,
    },
    {
      label: 'High fit (≥ 75)',
      value: data.overview.highFit.toLocaleString(),
      sub:
        data.overview.scoredCount > 0
          ? `${Math.round((data.overview.highFit / data.overview.scoredCount) * 100)}% of scored`
          : '—',
    },
  ];
  tiles.forEach((t, i) => {
    const x = MARGIN_X + i * (tileW + 12);
    pdf.setFillColor(COLOR.card);
    pdf.roundedRect(x, tileY, tileW, tileH, 6, 6, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7);
    pdf.setTextColor(COLOR.faint);
    pdf.text(t.label.toUpperCase(), x + 14, tileY + 22);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(COLOR.primary);
    pdf.text(t.value, x + 14, tileY + 56);
    if (t.sub) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(COLOR.muted);
      pdf.text(t.sub, x + 14, tileY + 74);
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

  const meaningfulPct = Math.round(data.overview.meaningfulPct * 100);
  const conversionPct =
    data.overview.scoredCount > 0
      ? Math.round((data.overview.highFit / data.overview.scoredCount) * 100)
      : 0;
  const topClient = data.clientTypes[0]?.label ?? null;
  const topClientCount = data.clientTypes[0]?.count ?? 0;
  const topOperator = data.operators[0] ?? null;

  const lines = [
    `${data.overview.total.toLocaleString()} calls landed via Recovery.com in this window — ${meaningfulPct}% of them met the meaningful threshold (fit ≥ 60).`,
    data.overview.scoredCount > 0
      ? `Of the calls our AI was able to score, ${conversionPct}% landed in the high-fit bucket (≥ 75) — the strongest indicator of admit-readiness.`
      : `AI scoring hasn't run on this window yet, so lead-quality stats aren't available.`,
    topClient
      ? `The dominant caller profile was "${topClient}" (${topClientCount} of ${data.overview.scoredCount} scored calls).`
      : '',
    topOperator
      ? `${topOperator.name} fielded the most Recovery.com calls (${topOperator.count})${topOperator.avgScore != null ? ` with an average AI handling score of ${topOperator.avgScore.toFixed(1)}/100` : ''}.`
      : '',
    data.overview.missed > 0
      ? `${data.overview.missed} inbound call${data.overview.missed === 1 ? '' : 's'} went to voicemail or hung up before a 3-second talk window — review the call log on the last pages for callbacks.`
      : 'Every inbound call in this window cleared the 3-second talk threshold.',
  ].filter(Boolean);

  let y = startY + 18;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(COLOR.text);
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(`• ${line}`, PAGE_W - MARGIN_X * 2);
    pdf.text(wrapped, MARGIN_X, y);
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

  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
  const conversionPct = data.overview.scoredCount > 0 ? data.overview.highFit / data.overview.scoredCount : 0;
  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: 'Total calls', value: data.overview.total.toLocaleString() },
    { label: 'Inbound', value: data.overview.inbound.toLocaleString(), sub: `${data.overview.outbound} outbound` },
    { label: 'Meaningful', value: data.overview.meaningful.toLocaleString(), sub: fmtPct(data.overview.meaningfulPct) },
    { label: 'High fit (≥ 75)', value: data.overview.highFit.toLocaleString(), sub: `${fmtPct(conversionPct)} of scored` },
    { label: 'Avg call score', value: data.overview.avgCallScore ? data.overview.avgCallScore.toFixed(1) : '—', sub: 'AI handling 0–100' },
    { label: 'Avg fit score', value: data.overview.avgFitScore ? data.overview.avgFitScore.toFixed(1) : '—', sub: 'Lead quality 0–100' },
    { label: 'Avg duration', value: fmtDuration(data.overview.avgDuration), sub: `${fmtDuration(data.overview.avgTalkTime)} talk` },
    { label: 'Missed inbound', value: data.overview.missed.toLocaleString(), sub: 'VM + < 3s talk' },
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
    ctx.pdf.text(t.label.toUpperCase(), x + 10, y + 16);
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(20);
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(t.value, x + 10, y + 44);
    if (t.sub) {
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setFontSize(7);
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(t.sub, x + 10, y + 60);
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

  // Bars.
  daily.forEach((d, i) => {
    const x = innerLeft + i * slot + (slot - barW) / 2;
    const totalH = (innerH * d.count) / max;
    const meaningfulH = (innerH * d.meaningful) / max;
    ctx.pdf.setFillColor('#bc6b4a');
    ctx.pdf.rect(x, innerBottom - totalH, barW, totalH, 'F');
    if (meaningfulH > 0) {
      ctx.pdf.setFillColor('#10b981');
      ctx.pdf.rect(x, innerBottom - meaningfulH, barW, meaningfulH, 'F');
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
  ctx.pdf.text('All calls', innerLeft + 14, legendY + 7);
  ctx.pdf.setFillColor('#10b981');
  ctx.pdf.rect(innerLeft + 80, legendY, 8, 8, 'F');
  ctx.pdf.text('Meaningful (fit ≥ 60)', innerLeft + 94, legendY + 7);

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

// ─── Distributions page ─────────────────────────────────────────

function drawDistributionsPage(ctx: PageContext, data: RecoveryReportPayload) {
  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  drawSectionHeading(ctx, 'LEAD QUALITY', 'Fit-score buckets');
  ctx.cursorY += 6;
  drawHorizontalBars(
    ctx,
    data.fitHistogram.map((r) => ({ label: r.label, value: r.count, color: bucketColor(r.range) })),
  );
  ctx.cursorY += 16;

  drawSectionHeading(ctx, 'TONE', 'Sentiment breakdown');
  ctx.cursorY += 6;
  const sentimentTotal = data.sentiment.reduce((s, r) => s + r.count, 0);
  drawHorizontalBars(
    ctx,
    data.sentiment.map((r) => ({
      label: `${r.key.charAt(0).toUpperCase()}${r.key.slice(1)}`,
      value: r.count,
      color:
        r.key === 'positive'
          ? '#10b981'
          : r.key === 'negative'
            ? '#dc2626'
            : r.key === 'neutral'
              ? '#94a3b8'
              : '#a89d93',
      suffix: sentimentTotal > 0 ? `${Math.round((r.count / sentimentTotal) * 100)}%` : undefined,
    })),
  );
  ctx.cursorY += 16;

  if (data.clientTypes.length > 0) {
    drawSectionHeading(ctx, 'MIX', 'Client type');
    ctx.cursorY += 6;
    const ctTotal = data.clientTypes.reduce((s, r) => s + r.count, 0);
    drawHorizontalBars(
      ctx,
      data.clientTypes.slice(0, 8).map((r) => ({
        label: r.label,
        value: r.count,
        color: COLOR.primary,
        suffix: ctTotal > 0 ? `${Math.round((r.count / ctTotal) * 100)}%` : undefined,
      })),
    );
  }

  drawFooter(ctx);
}

function bucketColor(range: string): string {
  if (range === '75-100') return '#059669';
  if (range === '60-74') return '#10b981';
  if (range === '40-59') return '#d97706';
  if (range === '20-39') return '#ea580c';
  return '#dc2626';
}

interface HBar {
  label: string;
  value: number;
  color: string;
  suffix?: string;
}

function drawHorizontalBars(ctx: PageContext, rows: HBar[]) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const labelW = 120;
  const valueW = 60;
  const barLeft = MARGIN_X + labelW;
  const barRight = PAGE_W - MARGIN_X - valueW;
  const barW = barRight - barLeft;
  const rowH = 18;
  ensureRoom(ctx, rows.length * rowH + 12);
  for (const r of rows) {
    const y = ctx.cursorY;
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(r.label, MARGIN_X, y + 11);

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
    const valueLabel = r.suffix ? `${r.value} · ${r.suffix}` : String(r.value);
    ctx.pdf.text(valueLabel, PAGE_W - MARGIN_X, y + 11, { align: 'right' });
    ctx.cursorY += rowH;
  }
}

// ─── Operator scoreboard ────────────────────────────────────────

function drawOperatorPage(ctx: PageContext, data: RecoveryReportPayload) {
  if (data.operators.length === 0) return;
  ensureRoom(ctx, 220);
  ctx.pdf.addPage();
  ctx.pageNumber++;
  ctx.cursorY = MARGIN_TOP;
  drawHeader(ctx);

  drawSectionHeading(ctx, 'TEAM', 'Operator handling');
  ctx.cursorY += 6;

  const cols = [
    { label: 'Operator', x: MARGIN_X },
    { label: 'Calls', x: MARGIN_X + 240, align: 'right' as const },
    { label: 'Avg score', x: MARGIN_X + 300, align: 'right' as const },
    { label: 'Meaningful', x: MARGIN_X + 380, align: 'right' as const },
    { label: 'High fit', x: PAGE_W - MARGIN_X, align: 'right' as const },
  ];
  drawTableHeader(ctx, cols);

  for (const r of data.operators) {
    ensureRoom(ctx, 18);
    const y = ctx.cursorY + 11;
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(r.name, cols[0].x, y);
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.text(String(r.count), cols[1].x, y, { align: 'right' });
    ctx.pdf.text(r.avgScore != null ? r.avgScore.toFixed(1) : '—', cols[2].x, y, { align: 'right' });
    ctx.pdf.setTextColor(COLOR.emerald);
    ctx.pdf.text(String(r.meaningful), cols[3].x, y, { align: 'right' });
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(String(r.highFit), cols[4].x, y, { align: 'right' });
    ctx.pdf.setDrawColor(COLOR.hairline);
    ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
    ctx.cursorY += 18;
  }

  // Repeat callers — slot in here if there's room, otherwise it
  // gets its own page.
  if (data.repeatCallers.length > 0) {
    ctx.cursorY += 24;
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
      ctx.pdf.text(r.phone, rcCols[0].x, y);
      ctx.pdf.setFont('helvetica', 'normal');
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text([r.city, r.state].filter(Boolean).join(', ') || '—', rcCols[1].x, y);
      ctx.pdf.setTextColor(COLOR.primary);
      ctx.pdf.text(String(r.calls), rcCols[2].x, y, { align: 'right' });
      ctx.pdf.setTextColor(COLOR.muted);
      ctx.pdf.text(fmtDateTime(r.firstAt), rcCols[3].x, y);
      ctx.pdf.text(fmtDateTime(r.lastAt), rcCols[4].x, y, { align: 'right' });
      ctx.pdf.setDrawColor(COLOR.hairline);
      ctx.pdf.line(MARGIN_X, ctx.cursorY + 18, PAGE_W - MARGIN_X, ctx.cursorY + 18);
      ctx.cursorY += 18;
    }
  }

  drawFooter(ctx);
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
  ctx.pdf.text(`${calls.length.toLocaleString()} calls in this window.`, MARGIN_X, ctx.cursorY + 18);
  ctx.cursorY += 28;

  for (const c of calls) {
    drawCallEntry(ctx, c);
  }
  drawFooter(ctx);
}

function drawCallEntry(ctx: PageContext, c: CallLogRow) {
  // Estimate row height up-front so we can decide whether to break.
  const summaryWrapped = c.summary
    ? ctx.pdf.splitTextToSize(c.summary, PAGE_W - MARGIN_X * 2 - 6)
    : [];
  const blockH = 18 + 12 + summaryWrapped.length * 11 + (c.next_steps ? 12 : 0) + 10;
  ensureRoom(ctx, blockH);

  const startY = ctx.cursorY;
  // Top metadata line.
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(10);
  ctx.pdf.setTextColor(COLOR.text);
  const headline = c.caller_name || c.caller_number || 'Unknown caller';
  ctx.pdf.text(headline, MARGIN_X, startY + 12);

  // Right-side score chips.
  let chipX = PAGE_W - MARGIN_X;
  if (c.fit_score != null) {
    chipX = drawChip(ctx, chipX, startY + 4, `Fit ${c.fit_score}`, fitColor(c.fit_score));
  }
  if (c.score != null) {
    chipX = drawChip(ctx, chipX, startY + 4, `Score ${c.score}`, scoreColor(c.score));
  }

  // Sub-line: time · duration · location · operator · client type.
  const subParts: string[] = [];
  subParts.push(fmtDateTime(c.called_at));
  subParts.push(fmtDuration(c.duration));
  const loc = [c.city, c.state].filter(Boolean).join(', ');
  if (loc) subParts.push(loc);
  if (c.operator_name) subParts.push(`Operator: ${c.operator_name}`);
  if (c.client_type) subParts.push(c.client_type);
  if (c.voicemail) subParts.push('Voicemail');
  ctx.pdf.setFont('helvetica', 'normal');
  ctx.pdf.setFontSize(8);
  ctx.pdf.setTextColor(COLOR.muted);
  ctx.pdf.text(subParts.join('  ·  '), MARGIN_X, startY + 26);

  // Summary.
  let y = startY + 40;
  if (summaryWrapped.length > 0) {
    ctx.pdf.setFont('helvetica', 'normal');
    ctx.pdf.setFontSize(9);
    ctx.pdf.setTextColor(COLOR.text);
    ctx.pdf.text(summaryWrapped, MARGIN_X, y);
    y += summaryWrapped.length * 11;
  }
  if (c.next_steps) {
    ctx.pdf.setFont('helvetica', 'bold');
    ctx.pdf.setFontSize(8);
    ctx.pdf.setTextColor(COLOR.primary);
    ctx.pdf.text(`→ ${c.next_steps}`, MARGIN_X, y + 4);
    y += 12;
  }

  // Hairline separator.
  ctx.pdf.setDrawColor(COLOR.hairline);
  ctx.pdf.setLineWidth(0.4);
  ctx.pdf.line(MARGIN_X, y + 6, PAGE_W - MARGIN_X, y + 6);
  ctx.cursorY = y + 14;
}

function drawChip(ctx: PageContext, anchorRight: number, y: number, text: string, color: string): number {
  const padX = 6;
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(8);
  const w = ctx.pdf.getTextWidth(text) + padX * 2;
  const x = anchorRight - w;
  ctx.pdf.setFillColor(color);
  ctx.pdf.roundedRect(x, y, w, 12, 3, 3, 'F');
  ctx.pdf.setTextColor('#ffffff');
  ctx.pdf.text(text, x + padX, y + 8.5);
  return x - 4;
}

function fitColor(v: number): string {
  if (v >= 75) return '#059669';
  if (v >= 60) return '#10b981';
  if (v >= 40) return '#d97706';
  return '#dc2626';
}

function scoreColor(v: number): string {
  if (v >= 80) return '#059669';
  if (v >= 60) return '#3b82f6';
  if (v >= 40) return '#d97706';
  return '#dc2626';
}

// ─── Common helpers ─────────────────────────────────────────────

function drawSectionHeading(ctx: PageContext, eyebrow: string, title: string) {
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(7);
  ctx.pdf.setTextColor(COLOR.primary);
  ctx.pdf.text(eyebrow, MARGIN_X, ctx.cursorY);
  ctx.pdf.setFontSize(15);
  ctx.pdf.setTextColor(COLOR.text);
  ctx.pdf.text(title, MARGIN_X, ctx.cursorY + 18);
  ctx.cursorY += 28;
}

function drawTableHeader(ctx: PageContext, cols: { label: string; x: number; align?: 'left' | 'right' }[]) {
  ctx.pdf.setFont('helvetica', 'bold');
  ctx.pdf.setFontSize(7);
  ctx.pdf.setTextColor(COLOR.faint);
  for (const c of cols) {
    ctx.pdf.text(c.label.toUpperCase(), c.x, ctx.cursorY + 10, { align: c.align });
  }
  ctx.pdf.setDrawColor(COLOR.hairline);
  ctx.pdf.setLineWidth(0.5);
  ctx.pdf.line(MARGIN_X, ctx.cursorY + 16, PAGE_W - MARGIN_X, ctx.cursorY + 16);
  ctx.cursorY += 20;
}

// ─── Public entry ───────────────────────────────────────────────

export async function downloadRecoveryComPdf(data: RecoveryReportPayload): Promise<void> {
  const ctx = newDoc();
  drawCoverPage(ctx, data);
  drawStatsPage(ctx, data);
  drawDistributionsPage(ctx, data);
  drawOperatorPage(ctx, data);
  drawCallLogPages(ctx, data.callLog);

  const stamp = new Date().toISOString().slice(0, 10);
  ctx.pdf.save(`recovery-com-report-${stamp}.pdf`);
}
