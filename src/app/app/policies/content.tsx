'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { logActivity } from '@/lib/activity';
import { useEffect, useMemo, useState } from 'react';

/* ── Types ─────────────────────────────────────────────────────── */

interface Policy {
  id: string;
  section: string;
  name: string;
  policy_number: string | null;
  content: string;
  purpose: string | null;
  scope: string | null;
  date_created: string;
  date_reviewed: string | null;
  date_revised: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  department_id: string | null;
}

interface PolicyDepartment {
  id: string;
  name: string;
  color: string | null;
  hidden: boolean;
}

interface PolicySection {
  id: string;
  name: string;
  sort_order: number;
}

interface PolicyActivity {
  id: string;
  type: string;
  target_id: string;
  user_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

type View = 'list' | 'detail';

const DEFAULT_SECTION_COLORS: Record<string, string> = {
  'Administration': 'bg-slate-50 text-slate-700 border-slate-200',
  'Clinical': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Human Resources': 'bg-blue-50 text-blue-700 border-blue-200',
  'Safety & Emergency': 'bg-red-50 text-red-700 border-red-200',
  'Compliance': 'bg-purple-50 text-purple-700 border-purple-200',
  'Financial': 'bg-amber-50 text-amber-700 border-amber-200',
  'Medical': 'bg-rose-50 text-rose-700 border-rose-200',
  'Operations': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Quality & Performance': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function sectionBadgeClass(name: string) {
  return DEFAULT_SECTION_COLORS[name] || 'bg-gray-50 text-gray-700 border-gray-200';
}

/* ── Paste Parsing ─────────────────────────────────────────────── */

// Pull the first non-empty line as a suggested title, look for
// Purpose / Scope lead-ins to split structured content out of the body.
function parsePastedText(raw: string): { name: string; policyNumber: string | null; section: string | null; purpose: string | null; scope: string | null; body: string } {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');

  // Extract metadata from key:value lines at the top
  let policyNumber: string | null = null;
  let section: string | null = null;
  let subject: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const kv = trimmed.match(/^(Policy\s*(?:Number|#|No\.?)?|Section|Subject)\s*:\s*(.+?)\s*$/i);
    if (!kv) break;
    const key = kv[1].toLowerCase();
    const val = kv[2];
    if (key.startsWith('policy')) policyNumber = val;
    else if (key === 'section') section = val;
    else if (key === 'subject') subject = val;
  }

  // Use Subject as name if found, otherwise first non-empty line
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
  const name = (subject || firstNonEmpty.trim().replace(/^#+\s*/, '')).slice(0, 200);

  const getSection = (label: string): string | null => {
    const re = new RegExp(`(^|\\n)\\s*${label}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(Purpose|Scope|Policy|Procedure|Definitions|Responsibility|References|Revision)\\s*:?\\s*\\n|$)`, 'i');
    const m = text.match(re);
    return m ? m[2].trim() : null;
  };

  const purpose = getSection('Purpose');
  const scope = getSection('Scope');

  return { name, policyNumber, section, purpose, scope, body: text };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── PDF Generation (via print-to-PDF in a new window) ────────── */

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderBlocksToHtml(raw: string): string {
  // Inline the structured body parser's blocks as plain HTML for the print window.
  const text = raw.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');
  const lines = text.split('\n').map((l) => l.replace(/\t+/g, ' ').replace(/[ ]{2,}/g, ' ').trimEnd());
  const metaRe = /^([A-Za-z][\w .&/#-]{0,40}?)\s*:\s+(.+?)\s*$/;
  const headingRe = /^([A-Za-z][\w &/-]{0,40})\s*:\s*$/;
  const listRe = /^([A-Za-z]|\d{1,2})\s*[.)]\s+(.+)$/;

  const out: string[] = [];
  let i = 0;

  const metaRows: Array<[string, string]> = [];
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    const m = l.match(metaRe);
    if (m && m[2].length < 120 && !/\.$/.test(m[2]) && !listRe.test(l)) {
      metaRows.push([m[1].trim(), m[2].trim()]);
      i++;
    } else break;
  }
  if (metaRows.length >= 2) {
    out.push('<dl class="meta">');
    for (const [k, v] of metaRows) {
      out.push(`<dt>${escapeHtml(k)}:</dt><dd>${escapeHtml(v)}</dd>`);
    }
    out.push('</dl>');
  } else if (metaRows.length === 1) {
    out.push(`<p>${escapeHtml(metaRows[0][0])}: ${escapeHtml(metaRows[0][1])}</p>`);
  }

  let para: string[] = [];
  let list: Array<[string, string]> = [];
  const flushPara = () => { if (para.length) { out.push(`<p>${escapeHtml(para.join(' ').trim())}</p>`); para = []; } };
  const flushList = () => {
    if (list.length) {
      out.push('<ol class="lettered">');
      for (const [marker, t] of list) out.push(`<li><span class="m">${escapeHtml(marker)}.</span> ${escapeHtml(t)}</li>`);
      out.push('</ol>');
      list = [];
    }
  };

  for (; i < lines.length; i++) {
    const l = lines[i];
    const trimmed = l.trim();
    if (!trimmed) { flushPara(); flushList(); continue; }
    const lm = trimmed.match(listRe);
    if (lm) { flushPara(); list.push([lm[1], lm[2].trim()]); continue; }
    if (list.length && /^\s/.test(l)) {
      const last = list[list.length - 1];
      last[1] = (last[1] + ' ' + trimmed).trim();
      continue;
    }
    flushList();
    const hm = trimmed.match(headingRe);
    if (hm) { flushPara(); out.push(`<h3>${escapeHtml(hm[1].trim())}</h3>`); continue; }
    para.push(trimmed);
  }
  flushPara();
  flushList();
  return out.join('\n');
}

function policyToPrintHtml(p: Policy, origin: string): string {
  const section = escapeHtml(p.section);
  const number = p.policy_number ? escapeHtml(p.policy_number) : '';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `
    <article class="policy">
      <div class="brand-band">
        <img src="${origin}/images/logo.png" alt="Seven Arrows Recovery" class="logo" />
        <div class="brand-name">Seven Arrows Recovery</div>
        <div class="meta-top">
          <span class="section">${section}</span>
          ${number ? `<span class="num">${number}</span>` : ''}
          <span class="ver">v${p.version ?? 1}</span>
        </div>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="dates">
          <div><span>Created</span> ${escapeHtml(fmtDate(p.date_created))}</div>
          <div><span>Reviewed</span> ${escapeHtml(fmtDate(p.date_reviewed))}</div>
          <div><span>Revised</span> ${escapeHtml(fmtDate(p.date_revised))}</div>
        </div>
      </div>
      ${p.purpose ? `<section><h2>Purpose</h2>${renderBlocksToHtml(p.purpose)}</section>` : ''}
      ${p.scope ? `<section><h2>Scope</h2>${renderBlocksToHtml(p.scope)}</section>` : ''}
      <section><h2>Policy</h2>${renderBlocksToHtml(p.content)}</section>
      <div class="footer">
        <span>Seven Arrows Recovery &middot; ${escapeHtml(p.section)}</span>
        <span>Printed ${escapeHtml(today)}</span>
      </div>
    </article>
  `;
}

const BRAND_PRIMARY = '#a0522d';
const BRAND_DARK = '#3d1a0e';
const BRAND_BG = '#f5f0eb';

const PRINT_CSS = `
  @page { size: letter; margin: 0.6in; }
  @page :first { margin-top: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 0; font-size: 11pt; line-height: 1.5; }
  .policy { page-break-after: always; padding: 0 0 24pt 0; }
  .policy:last-child { page-break-after: auto; }
  .brand-band { background: linear-gradient(135deg, ${BRAND_BG} 0%, #fff 100%); border-top: 3pt solid ${BRAND_PRIMARY}; padding: 14pt 16pt; margin-bottom: 14pt; }
  .logo { height: 44pt; width: auto; display: block; margin-bottom: 4pt; }
  .brand-name { font-size: 9pt; color: ${BRAND_DARK}; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
  .meta-top { display: flex; gap: 10pt; align-items: center; margin: 10pt 0 6pt 0; font-size: 9pt; color: #555; }
  .meta-top .section { background: ${BRAND_PRIMARY}; color: #fff; padding: 2pt 10pt; border-radius: 10pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; font-size: 8pt; }
  .meta-top .num { font-weight: 600; letter-spacing: 0.05em; color: ${BRAND_DARK}; }
  .meta-top .ver { background: ${BRAND_PRIMARY}15; color: ${BRAND_PRIMARY}; padding: 2pt 8pt; border-radius: 10pt; font-weight: 700; border: 1pt solid ${BRAND_PRIMARY}30; }
  h1 { font-size: 20pt; margin: 2pt 0 10pt 0; letter-spacing: -0.01em; color: ${BRAND_DARK}; font-weight: 700; }
  h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.1em; color: ${BRAND_PRIMARY}; margin: 18pt 0 8pt 0; font-weight: 800; border-bottom: 1pt solid ${BRAND_PRIMARY}40; padding-bottom: 3pt; }
  h3 { font-size: 12pt; font-weight: 700; margin: 10pt 0 4pt 0; color: ${BRAND_DARK}; }
  p { margin: 0 0 8pt 0; }
  .dates { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; font-size: 9pt; border-top: 1pt solid #e5dcd0; padding-top: 8pt; margin-top: 10pt; }
  .dates span { display: block; color: #888; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2pt; }
  dl.meta { background: ${BRAND_BG}; border: 1pt solid #e5dcd0; border-radius: 6pt; padding: 8pt 12pt; display: grid; grid-template-columns: max-content 1fr; column-gap: 16pt; row-gap: 4pt; font-size: 10pt; margin: 0 0 10pt 0; }
  dl.meta dt { font-weight: 700; color: ${BRAND_DARK}; }
  ol.lettered { list-style: none; padding-left: 26pt; margin: 0 0 8pt 0; }
  ol.lettered li { position: relative; margin-bottom: 5pt; }
  ol.lettered li .m { position: absolute; left: -26pt; font-weight: 700; color: ${BRAND_PRIMARY}; width: 22pt; text-align: right; }
  .footer { margin-top: 20pt; padding-top: 8pt; border-top: 1pt solid #e5dcd0; font-size: 8pt; color: #999; display: flex; justify-content: space-between; letter-spacing: 0.04em; }
  .cover { text-align: center; padding: 80pt 0 40pt 0; page-break-after: always; }
  .cover .logo { height: 80pt; margin: 0 auto 24pt auto; }
  .cover h1 { font-size: 28pt; color: ${BRAND_DARK}; margin: 0 0 8pt 0; border: none; }
  .cover .sub { font-size: 12pt; color: ${BRAND_PRIMARY}; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 600; }
  .cover .count { margin-top: 40pt; font-size: 10pt; color: #666; }
  .cover .date { margin-top: 6pt; font-size: 9pt; color: #888; }
`;

function openPrintWindow(title: string, bodyHtml: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  // Wait for the logo image to load before triggering print so it makes it into the PDF.
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title><style>${PRINT_CSS}</style></head><body>${bodyHtml}<script>
    (function(){
      var imgs = Array.from(document.images);
      var remaining = imgs.filter(function(i){ return !i.complete; }).length;
      function done(){ setTimeout(function(){ window.print(); }, 300); }
      if (remaining === 0) { done(); return; }
      imgs.forEach(function(i){
        if (!i.complete) {
          i.addEventListener('load', function(){ remaining--; if (remaining === 0) done(); });
          i.addEventListener('error', function(){ remaining--; if (remaining === 0) done(); });
        }
      });
    })();
  <\/script></body></html>`);
  win.document.close();
}

function printPolicy(p: Policy) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  openPrintWindow(p.name, policyToPrintHtml(p, origin));
}

function printAllPolicies(policies: Policy[]) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const grouped: Record<string, Policy[]> = {};
  for (const p of policies) {
    (grouped[p.section] ||= []).push(p);
  }
  const sections = Object.keys(grouped).sort();
  const cover = `
    <div class="cover">
      <img src="${origin}/images/logo.png" alt="Seven Arrows Recovery" class="logo" />
      <h1>Policies &amp; Procedures</h1>
      <div class="sub">Seven Arrows Recovery</div>
      <div class="count">${policies.length} ${policies.length === 1 ? 'policy' : 'policies'} across ${sections.length} ${sections.length === 1 ? 'section' : 'sections'}</div>
      <div class="date">Generated ${escapeHtml(today)}</div>
    </div>
  `;
  const body = cover + sections
    .flatMap((sec) => grouped[sec].sort((a, b) => a.name.localeCompare(b.name)).map((p) => policyToPrintHtml(p, origin)))
    .join('\n');
  openPrintWindow('Seven Arrows Recovery — Policies & Procedures', body);
}

/* ── HTML → Text (Google Docs paste) ──────────────────────────── */

// Roman numerals for <ol type="I">
function toRoman(n: number): string {
  const vals: Array<[number, string]> = [[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];
  let out = '';
  for (const [v, r] of vals) { while (n >= v) { out += r; n -= v; } }
  return out;
}

function listMarker(type: string, idx: number): string {
  if (type === 'A') return String.fromCharCode(65 + (idx % 26));
  if (type === 'a') return String.fromCharCode(97 + (idx % 26));
  if (type === 'I') return toRoman(idx + 1).toUpperCase();
  if (type === 'i') return toRoman(idx + 1).toLowerCase();
  return String(idx + 1);
}

// Walk an HTML DOM and produce plain text that preserves paragraphs and
// lettered/numbered list markers. Handles Google Docs-style <ol type="A">.
function htmlToFormattedText(root: Node): string {
  const out: string[] = [];

  function walk(node: Node) {
    if (node.nodeType === 3) {
      const t = (node.textContent || '').replace(/\u00A0/g, ' ');
      out.push(t);
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') { out.push('\n'); return; }
    if (tag === 'style' || tag === 'script' || tag === 'meta' || tag === 'link') return;

    if (tag === 'ol') {
      const type = el.getAttribute('type') || '1';
      const start = parseInt(el.getAttribute('start') || '1', 10);
      let idx = 0;
      out.push('\n');
      for (const child of Array.from(el.children)) {
        if (child.tagName.toLowerCase() === 'li') {
          const marker = listMarker(type, start - 1 + idx);
          out.push(marker + '. ');
          for (const sub of Array.from(child.childNodes)) walk(sub);
          out.push('\n');
          idx++;
        }
      }
      out.push('\n');
      return;
    }

    if (tag === 'ul') {
      out.push('\n');
      for (const child of Array.from(el.children)) {
        if (child.tagName.toLowerCase() === 'li') {
          out.push('• ');
          for (const sub of Array.from(child.childNodes)) walk(sub);
          out.push('\n');
        }
      }
      out.push('\n');
      return;
    }

    if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'blockquote', 'tr', 'pre'].includes(tag)) {
      const last = out[out.length - 1] || '';
      if (!last.endsWith('\n')) out.push('\n');
      for (const child of Array.from(el.childNodes)) walk(child);
      out.push('\n');
      return;
    }

    if (tag === 'td' || tag === 'th') {
      for (const child of Array.from(el.childNodes)) walk(child);
      out.push('\t');
      return;
    }

    for (const child of Array.from(el.childNodes)) walk(child);
  }

  walk(root);
  return out.join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

// onPaste handler that prefers text/html so Google Docs list markers (A, B, C…) survive.
function handleSmartPaste(e: React.ClipboardEvent<HTMLTextAreaElement>, value: string, setValue: (v: string) => void) {
  const html = e.clipboardData.getData('text/html');
  if (!html) return; // fall through to default plain-text paste
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const converted = htmlToFormattedText(doc.body);
    if (!converted) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + converted + value.slice(end);
    setValue(next);
    // Restore caret to end of inserted content
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + converted.length;
    });
  } catch {
    /* fall back to default paste */
  }
}

/* ── Structured Body Parser ───────────────────────────────────── */

type MetaRow = { label: string; value: string };
type ListItem = { marker: string; text: string };
type Block =
  | { kind: 'metadata'; rows: MetaRow[] }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; items: ListItem[] }
  | { kind: 'paragraph'; text: string };

const META_LINE = /^([A-Za-z][\w .&/#-]{0,40}?)\s*:\s+(.+?)\s*$/;
const HEADING_LINE = /^([A-Za-z][\w &/-]{0,40})\s*:\s*$/;
const LIST_LINE = /^([A-Za-z]|\d{1,2})\s*[.)]\s+(.+)$/;

function parseBody(raw: string): Block[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');
  const lines = text.split('\n').map((l) => l.replace(/\t+/g, ' ').replace(/[ ]{2,}/g, ' ').trimEnd());

  const blocks: Block[] = [];
  let i = 0;

  // Leading metadata block — consecutive "Label: value" lines from the top
  const metaRows: MetaRow[] = [];
  while (i < lines.length) {
    const l = lines[i].trim();
    if (!l) { i++; continue; }
    const m = l.match(META_LINE);
    if (m && m[2].length < 120 && !/\.$/.test(m[2]) && !LIST_LINE.test(l)) {
      metaRows.push({ label: m[1].trim(), value: m[2].trim() });
      i++;
    } else {
      break;
    }
  }
  if (metaRows.length >= 2) blocks.push({ kind: 'metadata', rows: metaRows });
  else if (metaRows.length === 1) {
    // Not enough to treat as a table — re-emit as paragraph
    blocks.push({ kind: 'paragraph', text: `${metaRows[0].label}: ${metaRows[0].value}` });
  }

  let buffer: string[] = [];
  let listItems: ListItem[] = [];

  function flushParagraph() {
    if (buffer.length > 0) {
      const text = buffer.join(' ').trim();
      if (text) blocks.push({ kind: 'paragraph', text });
      buffer = [];
    }
  }
  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ kind: 'list', items: listItems });
      listItems = [];
    }
  }

  for (; i < lines.length; i++) {
    const l = lines[i];
    const trimmed = l.trim();
    if (!trimmed) { flushParagraph(); flushList(); continue; }

    const listMatch = trimmed.match(LIST_LINE);
    if (listMatch) {
      flushParagraph();
      listItems.push({ marker: listMatch[1], text: listMatch[2].trim() });
      continue;
    }

    // Continuation of a list item (line starts with whitespace OR previous was a list)
    if (listItems.length > 0 && /^\s/.test(l)) {
      const last = listItems[listItems.length - 1];
      last.text = (last.text + ' ' + trimmed).trim();
      continue;
    }

    flushList();

    const headingMatch = trimmed.match(HEADING_LINE);
    if (headingMatch) {
      flushParagraph();
      blocks.push({ kind: 'heading', text: headingMatch[1].trim() });
      continue;
    }

    buffer.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

/* ── Formatted Policy Renderer ────────────────────────────────── */

function StructuredBody({ content }: { content: string }) {
  const blocks = parseBody(content);
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-4 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
      {blocks.map((b, i) => {
        if (b.kind === 'metadata') {
          return (
            <dl key={i} className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1.5 bg-warm-bg/40 rounded-xl border border-gray-100 px-4 py-3 text-[13px]">
              {b.rows.map((r, j) => (
                <div key={j} className="contents">
                  <dt className="font-semibold text-foreground/70">{r.label}:</dt>
                  <dd className="text-foreground/90">{r.value}</dd>
                </div>
              ))}
            </dl>
          );
        }
        if (b.kind === 'heading') {
          return <h3 key={i} className="text-base font-bold text-foreground mt-5 first:mt-0">{b.text}</h3>;
        }
        if (b.kind === 'list') {
          return (
            <ol key={i} className="space-y-2 pl-10">
              {b.items.map((it, j) => (
                <li key={j} className="relative">
                  <span className="absolute -left-10 w-8 text-right font-semibold text-foreground/70">{it.marker}.</span>
                  <span>{it.text}</span>
                </li>
              ))}
            </ol>
          );
        }
        return <p key={i} className="whitespace-pre-wrap">{b.text}</p>;
      })}
    </div>
  );
}

function FormattedPolicy({ policy }: { policy: Policy }) {
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header band */}
      <header className="bg-gradient-to-br from-primary/5 to-warm-bg border-b border-gray-100 px-8 py-6">
        <div className="flex items-center gap-4 mb-5">
          <img src="/images/logo.png" alt="Seven Arrows Recovery" className="h-10 w-auto" />
          <span className="text-[10px] font-semibold text-primary/70 uppercase tracking-[0.15em]" style={{ fontFamily: 'var(--font-body)' }}>
            Seven Arrows Recovery
          </span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${sectionBadgeClass(policy.section)}`}>{policy.section}</span>
              {policy.policy_number && (
                <span className="text-[11px] font-semibold text-foreground/50 tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                  {policy.policy_number}
                </span>
              )}
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold tabular-nums">
                v{policy.version ?? 1}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">{policy.name}</h1>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200/60">
          <div>
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Date Created</p>
            <p className="text-xs font-medium text-foreground">{fmtDate(policy.date_created)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Date Reviewed</p>
            <p className="text-xs font-medium text-foreground">{fmtDate(policy.date_reviewed)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-foreground/40 uppercase tracking-wider mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Date Revised</p>
            <p className="text-xs font-medium text-foreground">{fmtDate(policy.date_revised)}</p>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="px-8 py-6 space-y-6">
        {policy.purpose && (
          <section>
            <h2 className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-2">Purpose</h2>
            <StructuredBody content={policy.purpose} />
          </section>
        )}
        {policy.scope && (
          <section>
            <h2 className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-2">Scope</h2>
            <StructuredBody content={policy.scope} />
          </section>
        )}
        <section>
          <h2 className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-2">Policy</h2>
          <StructuredBody content={policy.content} />
        </section>
      </div>
    </article>
  );
}

/* ── Main Component ──────────────────────────────────────────── */

export default function PoliciesContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();

  const [view, setView] = useState<View>('list');
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  // Sections
  const [sections, setSections] = useState<PolicySection[]>([]);
  const sectionNames = useMemo(
    () => (sections.length ? sections.map((s) => s.name) : Object.keys(DEFAULT_SECTION_COLORS)),
    [sections]
  );
  const [manageSectionsOpen, setManageSectionsOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteStep, setPasteStep] = useState<'paste' | 'details'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState<string>('');
  const [formPolicyNumber, setFormPolicyNumber] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formScope, setFormScope] = useState('');
  const [formBody, setFormBody] = useState('');

  // Filtering
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  // Department filter sentinel: '' = all, '__none__' = policies with
  // no department assigned, otherwise a department uuid.
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSection, setBulkSection] = useState<string>('');
  // Bulk department change. '' = no change selected, '__none__' = clear
  // department on selected rows, otherwise a department uuid.
  const [bulkDepartment, setBulkDepartment] = useState<string>('');
  const [applyingBulk, setApplyingBulk] = useState(false);

  // Departments — loaded alongside policies, used by the filter
  // dropdown, the per-row badge, the create/edit form, and the bulk
  // toolbar. A read failure degrades gracefully: the dropdown hides,
  // existing policies still render with a fallback em-dash.
  const [departments, setDepartments] = useState<PolicyDepartment[]>([]);
  const [formDepartmentId, setFormDepartmentId] = useState<string | null>(null);
  const departmentMap = useMemo(() => {
    const m = new Map<string, PolicyDepartment>();
    for (const d of departments) m.set(d.id, d);
    return m;
  }, [departments]);
  const visibleDepartments = useMemo(
    () => departments.filter((d) => !d.hidden),
    [departments],
  );

  // Inline name edit
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<'section' | 'name' | 'department' | 'date_created' | 'date_reviewed' | 'date_revised'>('section');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Edit policy mode (detail view)
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Policy>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Activity for selected policy
  const [policyActivity, setPolicyActivity] = useState<PolicyActivity[]>([]);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [pols, secs, depts] = await Promise.all([
        db({ action: 'select', table: 'policies', order: { column: 'section', ascending: true } }),
        db({ action: 'select', table: 'policy_sections', order: { column: 'sort_order', ascending: true } }),
        // Soft-fail the departments select so a permissions miss on
        // the departments table doesn't blank the whole Policies page.
        db({ action: 'select', table: 'departments', select: 'id, name, color, hidden, display_order', order: { column: 'display_order', ascending: true } }).catch(() => null),
      ]);
      if (Array.isArray(pols)) setPolicies(pols as Policy[]);
      if (Array.isArray(secs)) setSections(secs as PolicySection[]);
      if (Array.isArray(depts)) {
        setDepartments(depts as PolicyDepartment[]);
      } else if (depts !== null) {
        // Reached if the call resolved with something non-array but
        // not the catch — log + carry on rendering.
        console.warn('[policies] departments returned non-array, falling back to empty list');
      }
      setLoading(false);
    }
    load();
  }, [session]);

  // Pick a default for form/bulk section when sections load
  useEffect(() => {
    if (sectionNames.length > 0) {
      if (!formSection) setFormSection(sectionNames[0]);
      if (!bulkSection) setBulkSection(sectionNames[0]);
    }
  }, [sectionNames, formSection, bulkSection]);

  // Load activity for selected policy
  useEffect(() => {
    if (!selectedPolicy || !session?.access_token) { setPolicyActivity([]); return; }
    async function loadActivity() {
      const data = await db({
        action: 'select',
        table: 'activity_log',
        match: { target_kind: 'policy', target_id: selectedPolicy!.id },
        order: { column: 'created_at', ascending: false },
      });
      if (Array.isArray(data)) setPolicyActivity(data as PolicyActivity[]);
    }
    loadActivity();
  }, [selectedPolicy, session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matched = policies.filter((p) => {
      if (sectionFilter && p.section !== sectionFilter) return false;
      if (departmentFilter === '__none__') {
        if (p.department_id != null) return false;
      } else if (departmentFilter) {
        if (p.department_id !== departmentFilter) return false;
      }
      if (!q) return true;
      const deptName = p.department_id ? (departmentMap.get(p.department_id)?.name || '') : '';
      return (
        p.name.toLowerCase().includes(q) ||
        p.section.toLowerCase().includes(q) ||
        (p.policy_number || '').toLowerCase().includes(q) ||
        deptName.toLowerCase().includes(q)
      );
    });
    const cmp = (a: Policy, b: Policy): number => {
      const get = (p: Policy): string => {
        if (sortBy === 'section') return p.section || '';
        if (sortBy === 'name') return p.name || '';
        if (sortBy === 'department') {
          // Sort by department name so the column reads alphabetically;
          // empty string sorts before any name, which puts unassigned
          // policies at the top of an asc sort and the bottom of desc.
          return p.department_id ? (departmentMap.get(p.department_id)?.name || '') : '';
        }
        if (sortBy === 'date_created') return p.date_created || '';
        if (sortBy === 'date_reviewed') return p.date_reviewed || '';
        return p.date_revised || '';
      };
      const va = get(a), vb = get(b);
      if (va === vb) return 0;
      return va < vb ? -1 : 1;
    };
    const sorted = [...matched].sort(cmp);
    if (sortDir === 'desc') sorted.reverse();
    return sorted;
  }, [policies, search, sectionFilter, departmentFilter, sortBy, sortDir, departmentMap]);

  function openAdd() {
    setAddOpen(true);
    setPasteStep('paste');
    setPasteText('');
    setFormName('');
    setFormSection(sectionNames[0] || '');
    setFormPolicyNumber('');
    setFormPurpose('');
    setFormScope('');
    setFormBody('');
    setFormDepartmentId(null);
  }

  function closeAdd() {
    setAddOpen(false);
  }

  function proceedToDetails() {
    if (!pasteText.trim()) return;
    const parsed = parsePastedText(pasteText);
    setFormName(parsed.name);
    setFormPolicyNumber(parsed.policyNumber || '');
    if (parsed.section) {
      const match = sectionNames.find((s) => s.toLowerCase().includes(parsed.section!.toLowerCase()) || parsed.section!.toLowerCase().includes(s.toLowerCase()));
      if (match) setFormSection(match);
    }
    setFormPurpose(parsed.purpose || '');
    setFormScope(parsed.scope || '');
    setFormBody(parsed.body);
    setPasteStep('details');
  }

  async function savePolicy() {
    if (!user) return;
    if (!formName.trim() || !formBody.trim() || !formSection) return;
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      section: formSection,
      name: formName.trim(),
      policy_number: formPolicyNumber.trim() || null,
      content: formBody.trim(),
      purpose: formPurpose.trim() || null,
      scope: formScope.trim() || null,
      date_created: today,
      date_reviewed: today,
      date_revised: null,
      department_id: formDepartmentId,
    };
    const data = await db({ action: 'insert', table: 'policies', data: payload });
    if (data && (data as Policy).id) {
      setPolicies((prev) => [data as Policy, ...prev]);
      logActivity({ userId: user.id, type: 'policy.created', targetKind: 'policy', targetId: (data as Policy).id, targetLabel: payload.name, targetPath: '/app/policies' });
      closeAdd();
    }
    setSaving(false);
  }

  async function markReviewed(p: Policy) {
    const today = new Date().toISOString().slice(0, 10);
    const res = await db({ action: 'update', table: 'policies', data: { date_reviewed: today }, match: { id: p.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, date_reviewed: today } : x)));
      if (selectedPolicy?.id === p.id) setSelectedPolicy({ ...p, date_reviewed: today });
      if (user) logActivity({ userId: user.id, type: 'policy.reviewed', targetKind: 'policy', targetId: p.id, targetLabel: p.name, targetPath: '/app/policies' });
    }
  }

  async function markRevised(p: Policy) {
    const today = new Date().toISOString().slice(0, 10);
    const res = await db({ action: 'update', table: 'policies', data: { date_revised: today, date_reviewed: today }, match: { id: p.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, date_revised: today, date_reviewed: today } : x)));
      if (selectedPolicy?.id === p.id) setSelectedPolicy({ ...p, date_revised: today, date_reviewed: today });
      if (user) logActivity({ userId: user.id, type: 'policy.revised', targetKind: 'policy', targetId: p.id, targetLabel: p.name, targetPath: '/app/policies' });
    }
  }

  async function deletePolicy(p: Policy) {
    const ok = await confirm(`Delete "${p.name}"?`, { message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const res = await db({ action: 'delete', table: 'policies', match: { id: p.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setPolicies((prev) => prev.filter((x) => x.id !== p.id));
      if (selectedPolicy?.id === p.id) {
        setSelectedPolicy(null);
        setView('list');
      }
      if (user) logActivity({ userId: user.id, type: 'policy.deleted', targetKind: 'policy', targetId: p.id, targetLabel: p.name, targetPath: '/app/policies' });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const visibleIds = filtered.map((p) => p.id);
      const allSelected = visibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      return next;
    });
  }

  async function applyBulkSection() {
    if (selectedIds.size === 0 || !bulkSection) return;
    setApplyingBulk(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map((id) => db({ action: 'update', table: 'policies', data: { section: bulkSection }, match: { id } }))
    );
    const okIds = ids.filter((_, i) => results[i] && (results[i] as { ok?: boolean }).ok);
    setPolicies((prev) => prev.map((p) => (okIds.includes(p.id) ? { ...p, section: bulkSection } : p)));
    if (user) {
      okIds.forEach((id) => {
        const p = policies.find((x) => x.id === id);
        if (p) logActivity({ userId: user.id, type: 'policy.updated', targetKind: 'policy', targetId: id, targetLabel: p.name, targetPath: '/app/policies', metadata: { section: bulkSection } });
      });
    }
    setSelectedIds(new Set());
    setApplyingBulk(false);
  }

  async function applyBulkDepartment() {
    if (selectedIds.size === 0 || !bulkDepartment) return;
    const nextDepartmentId = bulkDepartment === '__none__' ? null : bulkDepartment;
    setApplyingBulk(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(
      ids.map((id) => db({ action: 'update', table: 'policies', data: { department_id: nextDepartmentId }, match: { id } }))
    );
    const okIds = ids.filter((_, i) => results[i] && (results[i] as { ok?: boolean }).ok);
    setPolicies((prev) => prev.map((p) => (okIds.includes(p.id) ? { ...p, department_id: nextDepartmentId } : p)));
    if (user) {
      const deptName = nextDepartmentId ? (departmentMap.get(nextDepartmentId)?.name || null) : null;
      okIds.forEach((id) => {
        const p = policies.find((x) => x.id === id);
        if (p) logActivity({ userId: user.id, type: 'policy.updated', targetKind: 'policy', targetId: id, targetLabel: p.name, targetPath: '/app/policies', metadata: { department_id: nextDepartmentId, department: deptName } });
      });
    }
    setSelectedIds(new Set());
    setApplyingBulk(false);
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    const ok = await confirm(`Delete ${selectedIds.size} ${selectedIds.size === 1 ? 'policy' : 'policies'}?`, { message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    setApplyingBulk(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(ids.map((id) => db({ action: 'delete', table: 'policies', match: { id } })));
    const okIds = ids.filter((_, i) => results[i] && (results[i] as { ok?: boolean }).ok);
    setPolicies((prev) => prev.filter((p) => !okIds.includes(p.id)));
    if (user) {
      okIds.forEach((id) => {
        const p = policies.find((x) => x.id === id);
        if (p) logActivity({ userId: user.id, type: 'policy.deleted', targetKind: 'policy', targetId: id, targetLabel: p.name, targetPath: '/app/policies' });
      });
    }
    setSelectedIds(new Set());
    setApplyingBulk(false);
  }

  async function saveRename(p: Policy) {
    const next = editingNameValue.trim();
    if (!next || next === p.name) {
      setEditingNameId(null);
      return;
    }
    const res = await db({ action: 'update', table: 'policies', data: { name: next }, match: { id: p.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: next } : x)));
      if (selectedPolicy?.id === p.id) setSelectedPolicy({ ...p, name: next });
      if (user) logActivity({ userId: user.id, type: 'policy.renamed', targetKind: 'policy', targetId: p.id, targetLabel: next, targetPath: '/app/policies', metadata: { from: p.name, to: next } });
    }
    setEditingNameId(null);
  }

  async function addSection() {
    const name = newSectionName.trim();
    if (!name) return;
    setSavingSection(true);
    const nextOrder = (sections[sections.length - 1]?.sort_order ?? 0) + 10;
    const res = await db({ action: 'insert', table: 'policy_sections', data: { name, sort_order: nextOrder } });
    if (res && (res as PolicySection).id) {
      setSections((prev) => [...prev, res as PolicySection]);
      setNewSectionName('');
    }
    setSavingSection(false);
  }

  async function removeSection(sec: PolicySection) {
    const inUse = policies.some((p) => p.section === sec.name);
    if (inUse) {
      await confirm(`Can't delete "${sec.name}"`, { message: 'This section is used by one or more policies. Reassign them first.', confirmLabel: 'OK', tone: 'danger' });
      return;
    }
    const ok = await confirm(`Delete "${sec.name}"?`, { message: 'This section will be removed.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const res = await db({ action: 'delete', table: 'policy_sections', match: { id: sec.id } });
    if (res && (res as { ok?: boolean }).ok) {
      setSections((prev) => prev.filter((s) => s.id !== sec.id));
    }
  }

  function enterEditMode() {
    if (!selectedPolicy) return;
    setEditForm({
      name: selectedPolicy.name,
      section: selectedPolicy.section,
      policy_number: selectedPolicy.policy_number,
      content: selectedPolicy.content,
      purpose: selectedPolicy.purpose,
      scope: selectedPolicy.scope,
      department_id: selectedPolicy.department_id,
    });
    setEditMode(true);
  }

  async function saveEdit() {
    if (!selectedPolicy || !user) return;
    const changes: string[] = [];
    if (editForm.name !== selectedPolicy.name) changes.push('name');
    if (editForm.section !== selectedPolicy.section) changes.push('section');
    if ((editForm.policy_number || '') !== (selectedPolicy.policy_number || '')) changes.push('policy #');
    if ((editForm.purpose || '') !== (selectedPolicy.purpose || '')) changes.push('purpose');
    if ((editForm.scope || '') !== (selectedPolicy.scope || '')) changes.push('scope');
    if (editForm.content !== selectedPolicy.content) changes.push('body');
    if ((editForm.department_id ?? null) !== (selectedPolicy.department_id ?? null)) changes.push('department');
    if (changes.length === 0) { setEditMode(false); return; }

    setSavingEdit(true);
    const today = new Date().toISOString().slice(0, 10);
    const nextVersion = (selectedPolicy.version || 1) + 1;

    // Snapshot the current version before overwriting
    await db({
      action: 'insert',
      table: 'policy_versions',
      data: {
        policy_id: selectedPolicy.id,
        version: selectedPolicy.version || 1,
        name: selectedPolicy.name,
        section: selectedPolicy.section,
        policy_number: selectedPolicy.policy_number,
        content: selectedPolicy.content,
        purpose: selectedPolicy.purpose,
        scope: selectedPolicy.scope,
        saved_by: user.id,
        saved_by_name: user.user_metadata?.full_name || user.email || null,
        change_summary: `Changed: ${changes.join(', ')}`,
      },
    });

    const payload = {
      name: (editForm.name || '').trim() || selectedPolicy.name,
      section: editForm.section || selectedPolicy.section,
      policy_number: (editForm.policy_number || '').toString().trim() || null,
      content: (editForm.content || '').trim() || selectedPolicy.content,
      purpose: (editForm.purpose || '').toString().trim() || null,
      scope: (editForm.scope || '').toString().trim() || null,
      department_id: editForm.department_id ?? null,
      version: nextVersion,
      date_revised: today,
      date_reviewed: today,
    };
    const res = await db({ action: 'update', table: 'policies', data: payload, match: { id: selectedPolicy.id } });
    if (res && (res as { ok?: boolean }).ok) {
      const updated: Policy = { ...selectedPolicy, ...payload } as Policy;
      setSelectedPolicy(updated);
      setPolicies((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      logActivity({
        userId: user.id,
        type: 'policy.updated',
        targetKind: 'policy',
        targetId: updated.id,
        targetLabel: updated.name,
        targetPath: '/app/policies',
        metadata: { version: nextVersion, changes },
      });
      // Refresh activity
      const act = await db({ action: 'select', table: 'activity_log', match: { target_kind: 'policy', target_id: updated.id }, order: { column: 'created_at', ascending: false } });
      if (Array.isArray(act)) setPolicyActivity(act as PolicyActivity[]);
      setEditMode(false);
    }
    setSavingEdit(false);
  }

  if (!user) return null;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Policies &amp; Procedures</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {view === 'list' ? 'Paste in policy text and we format it with a proper header.' : 'Viewing policy.'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {view === 'detail' && selectedPolicy && !editMode && (
            <>
              <button onClick={() => printPolicy(selectedPolicy)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829q-.528-.05-1.05-.122a2.625 2.625 0 0 1-2.175-2.98l.65-4.297A2.625 2.625 0 0 1 6.697 4.125h10.606a2.625 2.625 0 0 1 2.553 2.305l.65 4.298a2.625 2.625 0 0 1-2.175 2.98 49 49 0 0 1-1.051.122m-10.56 0a48.6 48.6 0 0 1 10.56 0m-10.56 0-.621 4.968a3 3 0 0 0 2.978 3.377h5.266a3 3 0 0 0 2.978-3.377l-.622-4.968" /></svg>
                PDF
              </button>
              <button onClick={enterEditMode} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>
                Edit
              </button>
              <button onClick={() => markReviewed(selectedPolicy)} className="px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                Mark Reviewed
              </button>
              <button onClick={() => markRevised(selectedPolicy)} className="px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                Mark Revised
              </button>
            </>
          )}
          {view === 'list' && (
            <>
              <button onClick={() => printAllPolicies(filtered)} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors disabled:opacity-40" style={{ fontFamily: 'var(--font-body)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829q-.528-.05-1.05-.122a2.625 2.625 0 0 1-2.175-2.98l.65-4.297A2.625 2.625 0 0 1 6.697 4.125h10.606a2.625 2.625 0 0 1 2.553 2.305l.65 4.298a2.625 2.625 0 0 1-2.175 2.98 49 49 0 0 1-1.051.122m-10.56 0a48.6 48.6 0 0 1 10.56 0m-10.56 0-.621 4.968a3 3 0 0 0 2.978 3.377h5.266a3 3 0 0 0 2.978-3.377l-.622-4.968" /></svg>
                Export PDF
              </button>
              <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add Policy
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policies..." className="flex-1 min-w-[160px] max-w-sm px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
              <option value="">All sections</option>
              {sectionNames.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {visibleDepartments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                aria-label="Filter by department"
              >
                <option value="">All departments</option>
                <option value="__none__">No department</option>
                {visibleDepartments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            <button onClick={() => setManageSectionsOpen(true)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-foreground/70 hover:bg-warm-bg transition-colors whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="hidden sm:inline">Manage sections</span>
              <span className="sm:hidden">Sections</span>
            </button>
          </div>

          {/* Bulk toolbar — appears when any rows are selected */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
              <span className="text-sm font-semibold text-foreground">{selectedIds.size} selected</span>
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <span className="text-xs text-foreground/60">Section:</span>
                <select value={bulkSection} onChange={(e) => setBulkSection(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-primary focus:outline-none">
                  {sectionNames.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <button onClick={applyBulkSection} disabled={applyingBulk} className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                  Apply
                </button>
                {visibleDepartments.length > 0 && (
                  <>
                    <span className="text-xs text-foreground/60 ml-1">Dept:</span>
                    <select
                      value={bulkDepartment}
                      onChange={(e) => setBulkDepartment(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-primary focus:outline-none"
                      aria-label="Bulk set department"
                    >
                      <option value="">— pick —</option>
                      <option value="__none__">No department</option>
                      {visibleDepartments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={applyBulkDepartment}
                      disabled={applyingBulk || !bulkDepartment}
                      className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Apply dept
                    </button>
                  </>
                )}
                <button onClick={bulkDelete} disabled={applyingBulk} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                  Delete
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 text-foreground/50 text-xs font-semibold hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                  Clear
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : policies.length === 0 ? (
            <div className="text-center py-20 text-foreground/40">
              <svg className="w-12 h-12 mx-auto mb-3 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 4h6l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
                <path d="M14 4v4h4" />
              </svg>
              <p className="text-sm font-medium">No policies yet</p>
              <p className="text-xs mt-1">Paste in your first policy to get started.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-gray-100 bg-warm-bg/30">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p.id))}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    {([
                      { key: 'section', label: 'Section', alwaysShow: true },
                      { key: 'name', label: 'Name', alwaysShow: true },
                      { key: 'department', label: 'Department', alwaysShow: false },
                      { key: 'date_created', label: 'Created', alwaysShow: false },
                      { key: 'date_reviewed', label: 'Reviewed', alwaysShow: false },
                      { key: 'date_revised', label: 'Revised', alwaysShow: false },
                    ] as const).map((col) => (
                      <th
                        key={col.key}
                        onClick={() => {
                          if (sortBy === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          else { setSortBy(col.key); setSortDir(col.key.startsWith('date_') ? 'desc' : 'asc'); }
                        }}
                        className={`text-left px-3 sm:px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider cursor-pointer select-none hover:text-foreground/80 transition-colors ${col.alwaysShow ? '' : 'hidden md:table-cell'}`}
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortBy === col.key && (
                            <svg className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75 12 8.25l7.5 7.5" /></svg>
                          )}
                        </span>
                      </th>
                    ))}
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className={`border-b border-gray-100 last:border-0 transition-colors group ${selectedIds.has(p.id) ? 'bg-primary/5' : 'hover:bg-warm-bg/40'}`}>
                      <td className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-3 sm:px-5 py-3 cursor-pointer" onClick={() => { setSelectedPolicy(p); setView('detail'); }}>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${sectionBadgeClass(p.section)}`}>{p.section}</span>
                      </td>
                      <td className="px-3 sm:px-5 py-3">
                        {editingNameId === p.id ? (
                          <input
                            autoFocus
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onBlur={() => saveRename(p)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); saveRename(p); }
                              if (e.key === 'Escape') { e.preventDefault(); setEditingNameId(null); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm font-medium rounded border border-primary/40 focus:border-primary focus:outline-none"
                          />
                        ) : (
                          <div
                            onClick={(e) => { e.stopPropagation(); setEditingNameId(p.id); setEditingNameValue(p.name); }}
                            className="text-sm font-medium text-foreground cursor-text hover:bg-warm-bg/60 rounded px-2 py-1 -mx-2 -my-1"
                            title="Click to rename"
                          >
                            {p.name}
                          </div>
                        )}
                        {p.policy_number && <div className="text-[11px] text-foreground/40 mt-0.5 px-2">{p.policy_number}</div>}
                      </td>
                      <td className="px-3 sm:px-5 py-3 cursor-pointer hidden md:table-cell" onClick={() => { setSelectedPolicy(p); setView('detail'); }}>
                        {(() => {
                          const d = p.department_id ? departmentMap.get(p.department_id) : null;
                          if (!d) return <span className="text-foreground/30 text-sm">—</span>;
                          return (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full bg-warm-bg/70 border border-black/5 text-foreground/75 whitespace-nowrap">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: d.color || '#a0522d' }}
                                aria-hidden="true"
                              />
                              {d.name}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-3 sm:px-5 py-3 text-sm text-foreground/60 cursor-pointer hidden md:table-cell" onClick={() => { setSelectedPolicy(p); setView('detail'); }}>{fmtDate(p.date_created)}</td>
                      <td className="px-3 sm:px-5 py-3 text-sm text-foreground/60 cursor-pointer hidden md:table-cell" onClick={() => { setSelectedPolicy(p); setView('detail'); }}>{fmtDate(p.date_reviewed)}</td>
                      <td className="px-3 sm:px-5 py-3 text-sm text-foreground/60 cursor-pointer hidden md:table-cell" onClick={() => { setSelectedPolicy(p); setView('detail'); }}>{fmtDate(p.date_revised)}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); deletePolicy(p); }} className="p-1.5 rounded-lg text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-sm text-foreground/40">No policies match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MANAGE SECTIONS MODAL ─────────────────────────────── */}
      {manageSectionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setManageSectionsOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-1">Manage sections</h2>
              <p className="text-xs text-foreground/50 mb-5" style={{ fontFamily: 'var(--font-body)' }}>Add new policy sections or remove unused ones.</p>

              <div className="flex items-center gap-2 mb-4">
                <input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }}
                  placeholder="New section name"
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                />
                <button onClick={addSection} disabled={savingSection || !newSectionName.trim()} className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                  Add
                </button>
              </div>

              <ul className="border border-gray-100 rounded-xl bg-warm-bg/20 divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {sections.length === 0 && (
                  <li className="px-3 py-6 text-center text-xs text-foreground/40">No sections yet.</li>
                )}
                {sections.map((sec) => {
                  const inUse = policies.some((p) => p.section === sec.name);
                  return (
                    <li key={sec.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${sectionBadgeClass(sec.name)}`}>{sec.name}</span>
                        {inUse && <span className="text-[10px] text-foreground/40">in use</span>}
                      </div>
                      <button onClick={() => removeSection(sec)} className="p-1.5 rounded-lg text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex justify-end mt-5">
                <button onClick={() => setManageSectionsOpen(false)} className="px-5 py-2.5 text-foreground/50 text-sm font-medium hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL VIEW ────────────────────────────────────────── */}
      {view === 'detail' && selectedPolicy && (
        <div className="max-w-4xl mx-auto">
          <button onClick={() => { setSelectedPolicy(null); setView('list'); setEditMode(false); }} className="flex items-center gap-2 mb-4 px-4 py-2 bg-warm-bg text-foreground/70 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
            Back
          </button>

          {editMode ? (
            <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">Edit policy</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Name</label>
                  <input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Policy #</label>
                  <input value={editForm.policy_number || ''} onChange={(e) => setEditForm({ ...editForm, policy_number: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Section</label>
                <select value={editForm.section || ''} onChange={(e) => setEditForm({ ...editForm, section: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
                  {sectionNames.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {visibleDepartments.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Department</label>
                  <select
                    value={editForm.department_id ?? ''}
                    onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value || null })}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="">— No department —</option>
                    {visibleDepartments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Purpose</label>
                <textarea value={editForm.purpose || ''} onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Scope</label>
                <textarea value={editForm.scope || ''} onChange={(e) => setEditForm({ ...editForm, scope: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Body</label>
                <textarea
                  value={editForm.content || ''}
                  onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                  onPaste={(e) => handleSmartPaste(e, editForm.content || '', (v) => setEditForm({ ...editForm, content: v }))}
                  rows={14}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-y"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={saveEdit} disabled={savingEdit} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                  {savingEdit ? 'Saving…' : `Save as v${(selectedPolicy.version ?? 1) + 1}`}
                </button>
                <button onClick={() => setEditMode(false)} className="px-5 py-2.5 text-foreground/50 text-sm font-medium hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                  Cancel
                </button>
              </div>
            </article>
          ) : (
            <FormattedPolicy policy={selectedPolicy} />
          )}

          {/* Activity panel */}
          {!editMode && (
            <section className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                Activity
              </h2>
              {policyActivity.length === 0 ? (
                <p className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>No activity yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {policyActivity.map((a) => {
                    const when = new Date(a.created_at);
                    const label: Record<string, string> = {
                      'policy.created': 'Created',
                      'policy.updated': 'Updated',
                      'policy.reviewed': 'Marked reviewed',
                      'policy.revised': 'Marked revised',
                      'policy.renamed': 'Renamed',
                      'policy.deleted': 'Deleted',
                    };
                    const verb = label[a.type] || a.type;
                    const meta = a.metadata || {};
                    let detail = '';
                    if (a.type === 'policy.updated' && Array.isArray((meta as { changes?: string[] }).changes)) {
                      const changes = (meta as { changes: string[] }).changes;
                      const v = (meta as { version?: number }).version;
                      detail = `${v ? `v${v} — ` : ''}changed ${changes.join(', ')}`;
                    } else if (a.type === 'policy.renamed' && (meta as { from?: string }).from) {
                      detail = `"${(meta as { from: string }).from}" → "${(meta as { to?: string }).to || ''}"`;
                    } else if (a.type === 'policy.updated' && (meta as { section?: string }).section) {
                      detail = `section → ${(meta as { section: string }).section}`;
                    }
                    return (
                      <li key={a.id} className="py-2.5 flex items-start gap-3 text-xs">
                        <span className="mt-0.5 shrink-0 w-2 h-2 rounded-full bg-primary/30" />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground/80"><span className="font-semibold">{verb}</span>{detail ? ` — ${detail}` : ''}</p>
                          <p className="text-[10px] text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                            {when.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      )}

      {/* ── ADD MODAL ──────────────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={closeAdd}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-lg font-bold text-foreground mb-1">Add Policy</h2>
              <p className="text-xs text-foreground/50 mb-5" style={{ fontFamily: 'var(--font-body)' }}>
                {pasteStep === 'paste' ? 'Paste the raw policy text. We\'ll detect the title and sections automatically.' : 'Review and assign a section before saving.'}
              </p>

              {pasteStep === 'paste' && (
                <>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    onPaste={(e) => handleSmartPaste(e, pasteText, setPasteText)}
                    autoFocus
                    rows={14}
                    placeholder="Paste directly from Google Docs or Word — A, B, C list markers and metadata blocks are preserved automatically."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none"
                    style={{ fontFamily: 'var(--font-body)' }}
                  />
                  <p className="mt-2 text-[11px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                    Tip: this field reads your clipboard's rich text, so lettered lists from Google Docs come through correctly.
                  </p>
                  <div className="flex items-center gap-3 mt-5">
                    <button onClick={proceedToDetails} disabled={!pasteText.trim()} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                      Continue
                    </button>
                    <button onClick={closeAdd} className="px-5 py-2.5 text-foreground/40 text-sm font-medium hover:text-foreground/70 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {pasteStep === 'details' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Section</label>
                    <select value={formSection} onChange={(e) => setFormSection(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
                      {sectionNames.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {visibleDepartments.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Department</label>
                      <select
                        value={formDepartmentId ?? ''}
                        onChange={(e) => setFormDepartmentId(e.target.value || null)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none"
                      >
                        <option value="">— No department —</option>
                        {visibleDepartments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Name</label>
                      <input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Policy # (optional)</label>
                      <input value={formPolicyNumber} onChange={(e) => setFormPolicyNumber(e.target.value)} placeholder="e.g. CL-001" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Purpose (optional)</label>
                    <textarea value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Scope (optional)</label>
                    <textarea value={formScope} onChange={(e) => setFormScope(e.target.value)} rows={2} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground/50 uppercase tracking-wider mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>Body</label>
                    <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} onPaste={(e) => handleSmartPaste(e, formBody, setFormBody)} rows={8} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={savePolicy} disabled={saving || !formName.trim() || !formBody.trim()} className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50" style={{ fontFamily: 'var(--font-body)' }}>
                      {saving ? 'Saving...' : 'Add Policy'}
                    </button>
                    <button onClick={() => setPasteStep('paste')} className="px-5 py-2.5 text-foreground/60 text-sm font-medium hover:text-foreground transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                      Back
                    </button>
                    <button onClick={closeAdd} className="ml-auto px-5 py-2.5 text-foreground/40 text-sm font-medium hover:text-foreground/70 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
