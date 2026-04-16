'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { ImageCropModal } from '@/components/ImageCropModal';

interface VetVisit {
  date: string;
  reason: string;
  notes: string;
  doc_urls: string[];
}

interface Horse {
  id: string;
  name: string;
  age: number | null;
  body_score: number | null;
  weight: string;
  works_in: string;
  rideable: string;
  shoe_schedule: string;
  behavior: string;
  needs_next_steps: string;
  internal_info: string;
  ownership_papers: string;
  owner: string;
  notes: string;
  vet_visits: VetVisit[];
  document_urls: string[];
  image_url: string | null;
  created_at: string;
}

const rideableColor = (v: string) => {
  if (v === 'Yes') return 'bg-emerald-50 text-emerald-700';
  if (v === 'No') return 'bg-red-50 text-red-600';
  return 'bg-amber-50 text-amber-700';
};

const bodyScoreColor = (s: number | null) => {
  if (!s) return 'text-foreground/50';
  if (s <= 3) return 'text-red-600 font-bold';
  if (s >= 6) return 'text-amber-600 font-bold';
  return 'text-emerald-600 font-bold';
};

export default function HorseContent() {
  const { user, session } = useAuth();
  const params = useParams<{ horseId: string }>();
  const router = useRouter();
  const horseId = params?.horseId || '';

  const [horse, setHorse] = useState<Horse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const vetFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadVetVisitRef = useRef<number | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [showVetForm, setShowVetForm] = useState(false);
  const [vetFormDate, setVetFormDate] = useState('');
  const [vetFormReason, setVetFormReason] = useState('');
  const [vetFormNotes, setVetFormNotes] = useState('');

  useEffect(() => {
    if (!session?.access_token || !horseId) return;
    async function load() {
      try {
        const data = await db({ action: 'select', table: 'equine', match: { id: horseId } });
        if (Array.isArray(data) && data.length > 0) {
          const h = data[0] as Record<string, unknown>;
          setHorse({
            ...(h as unknown as Horse),
            owner: (h.owner as string) || 'GOD',
            notes: (h.notes as string) || '',
            vet_visits: Array.isArray(h.vet_visits) ? (h.vet_visits as VetVisit[]) : [],
            document_urls: Array.isArray(h.document_urls) ? (h.document_urls as string[]) : [],
          });
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    }
    load();
  }, [session, horseId]);

  const updateField = async (field: string, value: string) => {
    if (!horse) return;
    const parsed =
      field === 'age' ? (parseInt(value) || null)
      : field === 'body_score' ? (parseFloat(value) || null)
      : value;
    setHorse({ ...horse, [field]: parsed } as Horse);
    try {
      await db({ action: 'update', table: 'equine', data: { [field]: parsed }, match: { id: horse.id } });
    } catch { /* column may not exist yet */ }
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditField(field);
    setEditValue(currentValue || '');
  };
  const saveEdit = () => {
    if (editField) updateField(editField, editValue);
    setEditField('');
    setEditValue('');
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!horse || !e.target.files?.length) return;
    setUploading('doc');
    const file = e.target.files[0];
    const { url } = await uploadFile(file);
    if (url) {
      const newUrls = [...(horse.document_urls || []), url];
      await db({ action: 'update', table: 'equine', data: { document_urls: newUrls }, match: { id: horse.id } });
      setHorse({ ...horse, document_urls: newUrls });
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (!file.type.startsWith('image/')) return;
    setCropFile(file);
  };

  const saveCroppedImage = async (cropped: File) => {
    if (!horse) return;
    setCropFile(null);
    setUploadingImage(true);
    const { url } = await uploadFile(cropped);
    if (url) {
      await db({ action: 'update', table: 'equine', data: { image_url: url }, match: { id: horse.id } });
      setHorse({ ...horse, image_url: url });
    }
    setUploadingImage(false);
  };

  const removeDoc = async (docIndex: number) => {
    if (!horse) return;
    const newUrls = horse.document_urls.filter((_, i) => i !== docIndex);
    await db({ action: 'update', table: 'equine', data: { document_urls: newUrls }, match: { id: horse.id } });
    setHorse({ ...horse, document_urls: newUrls });
  };

  const addVetVisit = async () => {
    if (!horse || !vetFormDate) return;
    const visit: VetVisit = { date: vetFormDate, reason: vetFormReason, notes: vetFormNotes, doc_urls: [] };
    const newVisits = [...(horse.vet_visits || []), visit].sort((a, b) => b.date.localeCompare(a.date));
    await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horse.id } });
    setHorse({ ...horse, vet_visits: newVisits });
    setShowVetForm(false);
    setVetFormDate('');
    setVetFormReason('');
    setVetFormNotes('');
  };

  const removeVetVisit = async (visitIndex: number) => {
    if (!horse) return;
    const newVisits = horse.vet_visits.filter((_, i) => i !== visitIndex);
    await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horse.id } });
    setHorse({ ...horse, vet_visits: newVisits });
  };

  const handleVetDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!horse || uploadVetVisitRef.current == null || !e.target.files?.length) return;
    const vi = uploadVetVisitRef.current;
    setUploading(`vet-${vi}`);
    const file = e.target.files[0];
    const { url } = await uploadFile(file);
    if (url) {
      const newVisits = [...horse.vet_visits];
      newVisits[vi] = { ...newVisits[vi], doc_urls: [...newVisits[vi].doc_urls, url] };
      await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horse.id } });
      setHorse({ ...horse, vet_visits: newVisits });
    }
    setUploading(null);
    if (vetFileInputRef.current) vetFileInputRef.current.value = '';
  };

  const removeVetDoc = async (visitIndex: number, docIndex: number) => {
    if (!horse) return;
    const newVisits = [...horse.vet_visits];
    newVisits[visitIndex] = {
      ...newVisits[visitIndex],
      doc_urls: newVisits[visitIndex].doc_urls.filter((_, i) => i !== docIndex),
    };
    await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horse.id } });
    setHorse({ ...horse, vet_visits: newVisits });
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !horse) {
    return (
      <div className="p-4 sm:p-6 lg:p-10">
        <Link href="/app/equine" className="text-sm text-primary hover:underline" style={{ fontFamily: 'var(--font-body)' }}>
          &larr; Back to Horses
        </Link>
        <div className="mt-6 text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          Horse not found.
        </div>
      </div>
    );
  }

  const renderEditable = (field: string, value: string, className = '') => {
    if (editField === field) {
      return (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditField(''); }}
          className="text-sm px-1.5 py-0.5 rounded border border-gray-200 focus:border-primary focus:outline-none bg-white"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      );
    }
    return (
      <span
        className={`cursor-text hover:text-foreground transition-colors ${className}`}
        onClick={() => startEdit(field, value)}
      >
        {value || <span className="text-foreground/20">—</span>}
      </span>
    );
  };

  const renderEditableArea = (field: string, value: string, placeholder: string) => {
    if (editField === field) {
      return (
        <textarea
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={saveEdit}
          rows={3}
          className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full resize-none bg-white"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      );
    }
    return (
      <p
        className="text-sm text-foreground/70 cursor-text hover:text-foreground transition-colors"
        style={{ fontFamily: 'var(--font-body)' }}
        onClick={() => startEdit(field, value)}
      >
        {value || <span className="text-foreground/20 italic">{placeholder}</span>}
      </p>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl">
      <input ref={fileInputRef} type="file" accept="*/*" onChange={handleDocUpload} className="hidden" />
      <input ref={vetFileInputRef} type="file" accept="*/*" onChange={handleVetDocUpload} className="hidden" />
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      <button
        onClick={() => router.push('/app/equine')}
        className="text-sm text-foreground/50 hover:text-primary transition-colors mb-4 inline-flex items-center gap-1"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        Back to Horses
      </button>

      <div className="mb-6 flex items-center gap-4">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingImage}
          className="relative w-20 h-20 rounded-full overflow-hidden border border-gray-200 bg-warm-bg flex items-center justify-center group/photo shrink-0 hover:ring-2 hover:ring-primary/40 transition-all"
          aria-label="Upload horse photo"
        >
          {uploadingImage ? (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : horse.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={horse.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-foreground/40">{(horse.name || '?').charAt(0).toUpperCase()}</span>
          )}
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z" /></svg>
          </span>
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">{horse.name}</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Click photo to upload &middot; Click any field to edit
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Age</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('age', String(horse.age || ''))}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Rate my Body</p>
            <div className={`text-sm ${bodyScoreColor(horse.body_score)}`} style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('body_score', String(horse.body_score || ''), bodyScoreColor(horse.body_score))}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Weight</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('weight', horse.weight)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Works In</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('works_in', horse.works_in)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Rideable</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>
              {editField === 'rideable' ? (
                renderEditable('rideable', horse.rideable)
              ) : (
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium cursor-text ${rideableColor(horse.rideable)}`}
                  onClick={() => startEdit('rideable', horse.rideable)}
                >
                  {horse.rideable || '—'}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Shoes</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('shoe_schedule', horse.shoe_schedule)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Owner</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('owner', horse.owner)}</div>
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Ownership Papers</p>
            <div className="text-sm text-foreground/70" style={{ fontFamily: 'var(--font-body)' }}>{renderEditable('ownership_papers', horse.ownership_papers)}</div>
          </div>
        </div>
      </div>

      {/* Behavior / Needs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Behavior</p>
          {renderEditableArea('behavior', horse.behavior, 'No notes')}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Needs / Next Steps</p>
          {renderEditableArea('needs_next_steps', horse.needs_next_steps, 'No notes')}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Internal Info</p>
          {renderEditableArea('internal_info', horse.internal_info, 'No notes')}
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Notes</p>
          {renderEditableArea('notes', horse.notes, 'Click to add notes...')}
        </div>
      </div>

      {/* Vet Visits */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-body)' }}>Vet Visits ({(horse.vet_visits || []).length})</h2>
          <button
            onClick={() => setShowVetForm(!showVetForm)}
            className="text-xs text-primary hover:underline font-medium"
            style={{ fontFamily: 'var(--font-body)' }}
          >+ Add Visit</button>
        </div>
        {showVetForm && (
          <div className="bg-warm-bg/30 rounded-xl p-3 border border-gray-100 mb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-foreground/40 block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Date</label>
                <input type="date" value={vetFormDate} onChange={e => setVetFormDate(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white" style={{ fontFamily: 'var(--font-body)' }} />
              </div>
              <div>
                <label className="text-[10px] text-foreground/40 block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Reason</label>
                <input type="text" value={vetFormReason} onChange={e => setVetFormReason(e.target.value)} placeholder="Checkup, vaccines..." className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white" style={{ fontFamily: 'var(--font-body)' }} />
              </div>
              <div>
                <label className="text-[10px] text-foreground/40 block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Notes</label>
                <input type="text" value={vetFormNotes} onChange={e => setVetFormNotes(e.target.value)} placeholder="Details..." className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-white" style={{ fontFamily: 'var(--font-body)' }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addVetVisit} disabled={!vetFormDate} className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40" style={{ fontFamily: 'var(--font-body)' }}>Save Visit</button>
              <button onClick={() => setShowVetForm(false)} className="px-3 py-1.5 rounded-lg text-xs text-foreground/50 hover:bg-warm-bg" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
            </div>
          </div>
        )}
        {(horse.vet_visits || []).length > 0 ? (
          <div className="space-y-1.5">
            {horse.vet_visits.map((visit, vi) => (
              <div key={vi} className="bg-warm-bg/20 rounded-xl px-3 py-2.5 border border-gray-100 group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{visit.date}</span>
                    {visit.reason && <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{visit.reason}</span>}
                  </div>
                  <button onClick={() => removeVetVisit(vi)} className="text-foreground/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {visit.notes && <p className="text-xs text-foreground/50 mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>{visit.notes}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {visit.doc_urls.map((url, di) => {
                    const fname = decodeURIComponent(url.split('/').pop() || 'Doc');
                    return (
                      <div key={di} className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg text-xs group/doc border border-gray-100">
                        <svg className="w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-primary truncate max-w-[120px]" style={{ fontFamily: 'var(--font-body)' }}>{fname}</a>
                        <button onClick={() => removeVetDoc(vi, di)} className="text-foreground/20 hover:text-red-500 opacity-0 group-hover/doc:opacity-100">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => { uploadVetVisitRef.current = vi; vetFileInputRef.current?.click(); }}
                    disabled={uploading === `vet-${vi}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-gray-300 text-[10px] text-foreground/30 hover:border-primary hover:text-primary disabled:opacity-50"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {uploading === `vet-${vi}` ? (
                      <div className="w-2.5 h-2.5 border border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    )}
                    Attach
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-foreground/30 italic" style={{ fontFamily: 'var(--font-body)' }}>No vet visits recorded.</p>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-body)' }}>Documents</h2>
        <div className="flex flex-wrap gap-2">
          {(horse.document_urls || []).map((url, i) => {
            const filename = decodeURIComponent(url.split('/').pop() || 'Document');
            return (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-bg/20 rounded-lg border border-gray-100 group">
                <svg className="w-3.5 h-3.5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground/60 hover:text-primary transition-colors truncate max-w-[150px]" style={{ fontFamily: 'var(--font-body)' }}>{filename}</a>
                <button onClick={() => removeDoc(i)} className="text-foreground/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            );
          })}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading === 'doc'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-foreground/40 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {uploading === 'doc' ? (
              <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
            Attach Document
          </button>
        </div>
      </div>

      {cropFile && (
        <ImageCropModal
          file={cropFile}
          title="Crop horse photo"
          onSave={saveCroppedImage}
          onCancel={() => setCropFile(null)}
        />
      )}
    </div>
  );
}
