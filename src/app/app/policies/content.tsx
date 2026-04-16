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
  created_at: string;
  updated_at: string;
}

type View = 'list' | 'detail';

const SECTIONS = [
  'Administration',
  'Clinical',
  'Human Resources',
  'Safety & Emergency',
  'Compliance',
  'Financial',
  'Medical',
  'Operations',
  'Quality & Performance',
] as const;

const SECTION_COLORS: Record<string, string> = {
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

/* ── Paste Parsing ─────────────────────────────────────────────── */

// Pull the first non-empty line as a suggested title, look for
// Purpose / Scope lead-ins to split structured content out of the body.
function parsePastedText(raw: string): { name: string; purpose: string | null; scope: string | null; body: string } {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) || '';
  const name = firstNonEmpty.trim().replace(/^#+\s*/, '').slice(0, 200);

  // Find "Purpose" and "Scope" sections if the document uses those headings.
  const getSection = (label: string): string | null => {
    const re = new RegExp(`(^|\\n)\\s*${label}\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(Purpose|Scope|Policy|Procedure|Definitions|Responsibility|References|Revision)\\s*:?\\s*\\n|$)`, 'i');
    const m = text.match(re);
    return m ? m[2].trim() : null;
  };

  const purpose = getSection('Purpose');
  const scope = getSection('Scope');

  return { name, purpose, scope, body: text };
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Formatted Policy Renderer ────────────────────────────────── */

function FormattedPolicy({ policy }: { policy: Policy }) {
  // Split body into paragraphs, preserving headings (lines ending with colon or all-caps)
  const paragraphs = policy.content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header band */}
      <header className="bg-gradient-to-br from-primary/5 to-warm-bg border-b border-gray-100 px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${SECTION_COLORS[policy.section] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{policy.section}</span>
              {policy.policy_number && (
                <span className="text-[11px] font-semibold text-foreground/50 tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                  {policy.policy_number}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight leading-tight">{policy.name}</h1>
          </div>
        </div>

        {/* Metadata strip */}
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
      <div className="px-8 py-6 space-y-4 text-sm text-foreground/80 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
        {policy.purpose && (
          <section>
            <h2 className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-2">Purpose</h2>
            <p className="whitespace-pre-wrap">{policy.purpose}</p>
          </section>
        )}
        {policy.scope && (
          <section>
            <h2 className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-2">Scope</h2>
            <p className="whitespace-pre-wrap">{policy.scope}</p>
          </section>
        )}
        <section>
          <h2 className="text-[11px] font-bold text-foreground/60 uppercase tracking-wider mb-2">Policy</h2>
          <div className="space-y-3">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">{p}</p>
            ))}
          </div>
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

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pasteStep, setPasteStep] = useState<'paste' | 'details'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState<string>(SECTIONS[0]);
  const [formPolicyNumber, setFormPolicyNumber] = useState('');
  const [formPurpose, setFormPurpose] = useState('');
  const [formScope, setFormScope] = useState('');
  const [formBody, setFormBody] = useState('');

  // Filtering
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState<string>('');

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const data = await db({ action: 'select', table: 'policies', order: { column: 'section', ascending: true } });
      if (Array.isArray(data)) setPolicies(data as Policy[]);
      setLoading(false);
    }
    load();
  }, [session]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((p) => {
      if (sectionFilter && p.section !== sectionFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.section.toLowerCase().includes(q) || (p.policy_number || '').toLowerCase().includes(q);
    });
  }, [policies, search, sectionFilter]);

  function openAdd() {
    setAddOpen(true);
    setPasteStep('paste');
    setPasteText('');
    setFormName('');
    setFormSection(SECTIONS[0]);
    setFormPolicyNumber('');
    setFormPurpose('');
    setFormScope('');
    setFormBody('');
  }

  function closeAdd() {
    setAddOpen(false);
  }

  function proceedToDetails() {
    if (!pasteText.trim()) return;
    const parsed = parsePastedText(pasteText);
    setFormName(parsed.name);
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

  if (!user) return null;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="p-4 sm:p-6 lg:p-10">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Policies &amp; Procedures</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {view === 'list' ? 'Paste in policy text and we format it with a proper header.' : 'Viewing policy.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {view === 'detail' && selectedPolicy && (
            <>
              <button onClick={() => markReviewed(selectedPolicy)} className="px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                Mark Reviewed
              </button>
              <button onClick={() => markRevised(selectedPolicy)} className="px-3 py-2 text-xs font-semibold text-foreground/70 bg-white border border-gray-200 rounded-xl hover:bg-warm-bg transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                Mark Revised
              </button>
              <button onClick={() => { setSelectedPolicy(null); setView('list'); }} className="flex items-center gap-2 px-4 py-2 bg-warm-bg text-foreground/70 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                Back
              </button>
            </>
          )}
          {view === 'list' && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors" style={{ fontFamily: 'var(--font-body)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              Add Policy
            </button>
          )}
        </div>
      </div>

      {/* ── LIST VIEW ──────────────────────────────────────────── */}
      {view === 'list' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policies..." className="flex-1 max-w-sm px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none" />
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none">
              <option value="">All sections</option>
              {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

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
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-warm-bg/30">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Section</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Name</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Date Created</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Date Reviewed</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-foreground/50 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Date Revised</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-warm-bg/40 transition-colors group cursor-pointer" onClick={() => { setSelectedPolicy(p); setView('detail'); }}>
                      <td className="px-5 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${SECTION_COLORS[p.section] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{p.section}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-sm font-medium text-foreground">{p.name}</div>
                        {p.policy_number && <div className="text-[11px] text-foreground/40 mt-0.5">{p.policy_number}</div>}
                      </td>
                      <td className="px-5 py-3 text-sm text-foreground/60">{fmtDate(p.date_created)}</td>
                      <td className="px-5 py-3 text-sm text-foreground/60">{fmtDate(p.date_reviewed)}</td>
                      <td className="px-5 py-3 text-sm text-foreground/60">{fmtDate(p.date_revised)}</td>
                      <td className="px-3 py-3 text-right">
                        <button onClick={(e) => { e.stopPropagation(); deletePolicy(p); }} className="p-1.5 rounded-lg text-foreground/30 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-foreground/40">No policies match your search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── DETAIL VIEW ────────────────────────────────────────── */}
      {view === 'detail' && selectedPolicy && (
        <div className="max-w-4xl">
          <FormattedPolicy policy={selectedPolicy} />
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
                    autoFocus
                    rows={14}
                    placeholder="Paste your policy text here...&#10;&#10;Include the title on the first line. Use 'Purpose:' and 'Scope:' headings if you want those auto-extracted."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none font-mono"
                    style={{ fontFamily: 'var(--font-mono, monospace)' }}
                  />
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
                      {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
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
                    <textarea value={formBody} onChange={(e) => setFormBody(e.target.value)} rows={8} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:border-primary focus:outline-none resize-none" />
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
