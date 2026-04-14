'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

interface JobDescription {
  id: string;
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  department_id: string | null;
}

interface Signature {
  id: string;
  job_description_id: string;
  signer_user_id: string | null;
  signer_name: string | null;
  signer_email: string | null;
  sent_by_name: string | null;
  sent_at: string;
  signed_at: string | null;
  signature_data_url: string | null;
  signature_typed: string | null;
  pdf_storage_path: string | null;
}

interface Department {
  id: string;
  name: string;
  color: string | null;
}

export default function SignContent() {
  const { user, session } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sigId = params?.id || '';

  const [sig, setSig] = useState<Signature | null>(null);
  const [job, setJob] = useState<JobDescription | null>(null);
  const [dept, setDept] = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [saving, setSaving] = useState(false);
  const [signed, setSigned] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  useEffect(() => {
    if (!session?.access_token || !sigId) return;
    let cancelled = false;
    async function load() {
      const sigRows = await db({ action: 'select', table: 'jd_signatures', match: { id: sigId } });
      if (cancelled) return;
      if (!Array.isArray(sigRows) || sigRows.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const s = sigRows[0] as Signature;
      setSig(s);
      if (s.signed_at) setSigned(true);
      const jobRows = await db({ action: 'select', table: 'job_descriptions', match: { id: s.job_description_id } });
      if (cancelled) return;
      if (Array.isArray(jobRows) && jobRows.length > 0) {
        const j = jobRows[0] as Record<string, unknown>;
        const loaded: JobDescription = {
          id: String(j.id),
          title: (j.title as string) || '',
          summary: (j.summary as string) || '',
          responsibilities: Array.isArray(j.responsibilities) ? (j.responsibilities as string[]) : [],
          requirements: Array.isArray(j.requirements) ? (j.requirements as string[]) : [],
          department_id: (j.department_id as string | null) || null,
        };
        setJob(loaded);
        if (loaded.department_id) {
          const d = await db({ action: 'select', table: 'departments', match: { id: loaded.department_id } });
          if (!cancelled && Array.isArray(d) && d.length > 0) setDept(d[0] as Department);
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, sigId]);

  function canvasCoords(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * c.width, y: ((e.clientY - rect.top) / rect.height) * c.height };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = canvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = canvasCoords(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2d1b0f';
    ctx.lineTo(x, y);
    ctx.stroke();
    hasInk.current = true;
  }

  function onPointerUp() {
    drawing.current = false;
  }

  function clearCanvas() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
  }

  function buildSignedPdf(j: JobDescription, opts: {
    signerName: string;
    signedAt: string;
    signatureImg: string | null;
    typedName: string | null;
    deptName: string | null;
  }): Blob {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 54;
    let y = 54;
    const lineHeight = 13;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#a0522d');
    doc.text('SEVEN ARROWS RECOVERY', marginX, y);
    y += 20;

    doc.setTextColor('#111');
    doc.setFontSize(18);
    doc.text(j.title || 'Untitled Role', marginX, y);
    y += 18;
    if (opts.deptName) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#555');
      doc.text(opts.deptName, marginX, y);
      y += 14;
    }
    doc.setDrawColor(229, 220, 206);
    doc.line(marginX, y, pageW - marginX, y);
    y += 14;

    const writeHeading = (label: string) => {
      if (y > pageH - 120) { doc.addPage(); y = 54; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor('#2d1b0f');
      doc.text(label, marginX, y);
      y += lineHeight + 2;
      doc.setDrawColor(229, 220, 206);
      doc.line(marginX, y - 8, pageW - marginX, y - 8);
    };

    const writeBody = (text: string) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor('#111');
      const lines = doc.splitTextToSize(text, pageW - marginX * 2);
      for (const line of lines) {
        if (y > pageH - 120) { doc.addPage(); y = 54; }
        doc.text(line, marginX, y);
        y += lineHeight;
      }
    };

    const writeNumbered = (items: string[]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      items.forEach((item, i) => {
        const num = `${i + 1}.`;
        const lines = doc.splitTextToSize(item, pageW - marginX * 2 - 22);
        if (y > pageH - 120) { doc.addPage(); y = 54; }
        doc.setTextColor('#a0522d');
        doc.text(num, marginX, y);
        doc.setTextColor('#111');
        lines.forEach((line: string, idx: number) => {
          if (idx > 0 && y > pageH - 120) { doc.addPage(); y = 54; }
          doc.text(line, marginX + 22, y);
          y += lineHeight;
        });
        y += 2;
      });
    };

    if ((j.summary || '').trim()) {
      writeHeading('Position Summary');
      writeBody(j.summary);
      y += 6;
    }
    if (j.responsibilities.length > 0) {
      writeHeading('Responsibilities');
      writeNumbered(j.responsibilities);
      y += 6;
    }
    if (j.requirements.length > 0) {
      writeHeading('Requirements');
      writeNumbered(j.requirements);
      y += 6;
    }

    // Signature block — always on the last page, leave ~140pt clearance.
    if (y > pageH - 160) { doc.addPage(); y = 54; }
    y = Math.max(y + 20, pageH - 160);
    doc.setDrawColor(229, 220, 206);
    doc.line(marginX, y, pageW - marginX, y);
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor('#2d1b0f');
    doc.text('Signature', marginX, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#333');
    doc.text(`Signed by: ${opts.signerName}`, marginX, y);
    y += lineHeight;
    doc.text(`Signed at: ${new Date(opts.signedAt).toLocaleString()}`, marginX, y);
    y += lineHeight + 6;

    if (opts.signatureImg) {
      try {
        doc.addImage(opts.signatureImg, 'PNG', marginX, y, 180, 60);
        y += 68;
      } catch {
        // ignore image errors, fall back to typed
      }
    }
    if (opts.typedName) {
      doc.setFont('times', 'italic');
      doc.setFontSize(16);
      doc.setTextColor('#2d1b0f');
      doc.text(opts.typedName, marginX, y);
      y += lineHeight + 4;
    }

    return doc.output('blob');
  }

  async function submitSignature() {
    if (!sig || !job) return;
    const dataUrl = hasInk.current ? canvasRef.current?.toDataURL('image/png') || null : null;
    const typed = typedName.trim();
    if (!dataUrl && !typed) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const signerName = sig.signer_name || user?.user_metadata?.full_name || user?.email || 'Team member';

    // Build signed PDF and upload to Supabase Storage; path is stored on the
    // signature row so admins can download the signed copy later. If the
    // upload fails we still persist the raw signature data so nothing is lost.
    let pdfPath: string | null = null;
    try {
      const blob = buildSignedPdf(job, {
        signerName,
        signedAt: nowIso,
        signatureImg: dataUrl,
        typedName: typed || null,
        deptName: dept?.name || null,
      });
      const file = new File([blob], `signed-${job.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'jd'}.pdf`, {
        type: 'application/pdf',
      });
      const { url } = await uploadFile(file, 'jd-signatures');
      if (url) pdfPath = url;
    } catch {
      // swallow — row still saves without pdf
    }

    await db({
      action: 'update',
      table: 'jd_signatures',
      data: {
        signed_at: nowIso,
        signature_data_url: dataUrl,
        signature_typed: typed || null,
        pdf_storage_path: pdfPath,
      },
      match: { id: sig.id },
    });
    setSig({ ...sig, signed_at: nowIso, signature_data_url: dataUrl, signature_typed: typed, pdf_storage_path: pdfPath });
    setSigned(true);
    setSaving(false);
  }

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !sig || !job) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <p className="text-sm text-foreground/60" style={{ fontFamily: 'var(--font-body)' }}>
            This signature request could not be found.
          </p>
          <button
            onClick={() => router.push('/app')}
            className="mt-4 text-xs text-primary hover:underline"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-3xl">
      <Link
        href="/app"
        className="text-xs text-foreground/50 hover:text-foreground inline-flex items-center gap-1 mb-4"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Home
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
        <div className="mb-6">
          <p className="text-[10px] text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>
            Job Description for Signature
          </p>
          <h1 className="text-xl lg:text-2xl font-semibold text-foreground tracking-tight">{job.title}</h1>
          {dept && (
            <span
              className="inline-block mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: (dept.color || '#a0522d') + '1f', color: dept.color || '#a0522d', fontFamily: 'var(--font-body)' }}
            >
              {dept.name}
            </span>
          )}
        </div>

        {job.summary.trim() && (
          <section className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Position Summary
            </p>
            <p className="text-sm text-foreground/80 leading-6 whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>
              {job.summary}
            </p>
          </section>
        )}

        {job.responsibilities.length > 0 && (
          <section className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Responsibilities
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground/80 leading-6" style={{ fontFamily: 'var(--font-body)' }}>
              {job.responsibilities.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </section>
        )}

        {job.requirements.length > 0 && (
          <section className="mb-6">
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
              Requirements
            </p>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-foreground/80 leading-6" style={{ fontFamily: 'var(--font-body)' }}>
              {job.requirements.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-8 border-t border-gray-100 pt-6">
          {signed ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm" style={{ fontFamily: 'var(--font-body)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Signed {sig.signed_at ? new Date(sig.signed_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
              </div>
              {sig.signature_data_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sig.signature_data_url} alt="Signature" className="mt-4 max-h-32 mx-auto" />
              )}
              {sig.signature_typed && (
                <p className="mt-3 text-foreground/80" style={{ fontFamily: 'var(--font-display)', fontSize: '24px' }}>
                  {sig.signature_typed}
                </p>
              )}
              <p className="mt-2 text-[11px] text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>
                {sig.signer_name || user.email}
              </p>
              {sig.pdf_storage_path && (
                <a
                  href={sig.pdf_storage_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Download signed PDF
                </a>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>
                Your Signature
              </p>
              <p className="text-xs text-foreground/60 mb-3" style={{ fontFamily: 'var(--font-body)' }}>
                By signing below you acknowledge you have read and agree to this job description.
              </p>

              <div className="mb-3">
                <label className="text-[10px] text-foreground/40 uppercase tracking-wider block mb-1" style={{ fontFamily: 'var(--font-body)' }}>
                  Type your full name
                </label>
                <input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder={sig.signer_name || 'Full name'}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>

              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>
                    Draw signature
                  </label>
                  <button
                    onClick={clearCanvas}
                    className="text-[11px] text-foreground/50 hover:text-foreground"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    Clear
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerUp}
                  className="w-full h-40 border border-dashed border-gray-300 rounded-lg bg-white touch-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => router.push('/app')}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg text-xs text-foreground/60 hover:bg-warm-bg disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={submitSignature}
                  disabled={saving || (!typedName.trim() && !hasInk.current)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {saving && <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Signing…' : 'Sign & Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
