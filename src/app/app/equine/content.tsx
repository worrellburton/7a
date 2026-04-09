'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import { useEffect, useRef, useState } from 'react';

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
  document_urls: string[];
  created_at: string;
}

const defaultHorses: Omit<Horse, 'id' | 'created_at'>[] = [
  { name: 'Arrow', age: 10, body_score: 5, weight: '1015 lbs', works_in: 'EAP only / Not broken', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Less spooky / Good', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Boots off, doing good, no noticeable pain', ownership_papers: '', document_urls: [] },
  { name: 'Chika', age: 6, body_score: 5, weight: '865 lbs', works_in: 'EAP only / Not broken', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Good', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Check scab, is dried and closed, starting to peel. Slight limp', ownership_papers: '', document_urls: [] },
  { name: 'Wanda', age: 12, body_score: 5, weight: '835 lbs', works_in: 'EAP / TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Tight Lead for Cinch / Good', needs_next_steps: 'Lunge', internal_info: 'Healthier weight. Can go on rides', ownership_papers: '', document_urls: [] },
  { name: 'Kate', age: 21, body_score: 5, weight: '927 lbs', works_in: 'EAP / TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Tight Lead for Cinch / Good', needs_next_steps: 'Vertebrae and hips - gain weight / muscle', internal_info: 'Looks good, better weight. Topline needs more muscle but overall healthy', ownership_papers: 'Kate_Ownership_Paper.pdf', document_urls: [] },
  { name: 'Jack', age: 9, body_score: 5.5, weight: '969 lbs', works_in: 'EAP', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Good', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Good boy, covered in fly bites but overall healthy', ownership_papers: '', document_urls: [] },
  { name: 'Miklo', age: 15, body_score: 3, weight: '1075 lbs', works_in: 'FR / EAP with 2 staff', rideable: 'No', shoe_schedule: '8 weeks', behavior: 'Moody sensitive', needs_next_steps: 'For advanced riders', internal_info: 'Vet came out 1/21/26. Has sand and suspected ulcers. Feed schedule has been changed to try to get him eating more. No riding / NO EAP.', ownership_papers: '', document_urls: [] },
  { name: 'Red Feather', age: 26, body_score: 5, weight: '969 lbs', works_in: 'EAP with 2 staff / TF', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Sensitive', needs_next_steps: 'Lunging', internal_info: '1/21 Lunged, was checked out at first but after some changes of direction did amazing. Much less testing and attitude than there was.', ownership_papers: '', document_urls: [] },
  { name: 'Dandy', age: 22, body_score: 5, weight: '938 lbs', works_in: 'TR', rideable: 'No', shoe_schedule: '8 weeks', behavior: 'Good', needs_next_steps: 'Lunging', internal_info: 'Lairus rode on monday ride, said he did good. Can go on rides with smaller riders. Max weight 160lbs (estimate)', ownership_papers: 'Dandy_Ownership_Paper.pdf', document_urls: [] },
  { name: 'Wellbriety (Wally)', age: 21, body_score: 6, weight: '1132 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Hard to Catch / Good / Sensitive', needs_next_steps: 'Lunging', internal_info: '12/31 Lunged. Untrusting and seemed uncomfortable. Couldn\'t keep him at a walk', ownership_papers: '', document_urls: [] },
  { name: 'Cowboy', age: 26, body_score: 5, weight: '965 lbs', works_in: 'EAP only', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Good / Spunky', needs_next_steps: 'Gain weight', internal_info: 'Farrier found an abscess in each front foot. Moved to drier pen. Still limping and has scabs on hocks', ownership_papers: '', document_urls: [] },
  { name: 'RW', age: 5, body_score: 5.5, weight: '923 lbs', works_in: 'Not broken', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Sensitive / Nips', needs_next_steps: 'Breaking', internal_info: 'Plan to break / been working on halter lead commands and touching', ownership_papers: '', document_urls: [] },
  { name: 'Clyde', age: 21, body_score: 6, weight: '1001 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Good', needs_next_steps: '', internal_info: 'Overall healthy, no concerns', ownership_papers: '', document_urls: [] },
  { name: 'Scout', age: 19, body_score: 6, weight: '1150 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Good', needs_next_steps: 'Pain meds as needed', internal_info: 'Mostly used for beginners and light riders, steady weight', ownership_papers: 'Scout', document_urls: [] },
  { name: 'Authentic Self', age: 11, body_score: 5.5, weight: '1065 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Sensitive / Spooky / Good', needs_next_steps: 'Ground work / Lunging', internal_info: 'Ground work needed. Working on leading, standing beside him without him backing up, picking feet', ownership_papers: '', document_urls: [] },
  { name: 'Murphy', age: 11, body_score: 5, weight: '1035 lbs', works_in: 'In work TR', rideable: 'For staff', shoe_schedule: '8 weeks', behavior: 'Sensitive', needs_next_steps: 'Ground work / Lunging', internal_info: 'Hard to catch. Checks in more than he checks out. High energy but comes back down pretty easy', ownership_papers: '', document_urls: [] },
];

export default function EquineContent() {
  const { user, session } = useAuth();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadHorseRef = useRef<string | null>(null);
  const [dbAvailable, setDbAvailable] = useState(true);

  const userName = user?.user_metadata?.full_name || user?.email || 'Unknown';

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const data = await db({ action: 'select', table: 'equine', order: { column: 'name', ascending: true } });
      if (Array.isArray(data) && data.length > 0) {
        setHorses(data);
      } else if (Array.isArray(data) && data.length === 0) {
        // Seed default horses
        for (const h of defaultHorses) {
          const result = await db({ action: 'insert', table: 'equine', data: h });
          if (result && result.id) {
            setHorses(prev => [...prev, result]);
          }
        }
      } else {
        // Table might not exist yet — use defaults in memory
        setDbAvailable(false);
        setHorses(defaultHorses.map((h, i) => ({ ...h, id: `local-${i}`, created_at: new Date().toISOString() })));
      }
      setLoading(false);
    }
    load();
  }, [session]);

  const updateField = async (id: string, field: string, value: string) => {
    if (!dbAvailable || id.startsWith('local-')) {
      setHorses(prev => prev.map(h => h.id === id ? { ...h, [field]: field === 'age' ? parseInt(value) || null : field === 'body_score' ? parseFloat(value) || null : value } : h));
      return;
    }
    const parsed = field === 'age' ? (parseInt(value) || null) : field === 'body_score' ? (parseFloat(value) || null) : value;
    await db({ action: 'update', table: 'equine', data: { [field]: parsed }, match: { id } });
    setHorses(prev => prev.map(h => h.id === id ? { ...h, [field]: parsed } : h));
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const horseId = uploadHorseRef.current;
    if (!horseId || !e.target.files?.length) return;
    setUploading(horseId);
    const file = e.target.files[0];
    const url = await uploadFile(file);
    if (url) {
      const horse = horses.find(h => h.id === horseId);
      const newUrls = [...(horse?.document_urls || []), url];
      if (dbAvailable && !horseId.startsWith('local-')) {
        await db({ action: 'update', table: 'equine', data: { document_urls: newUrls }, match: { id: horseId } });
      }
      setHorses(prev => prev.map(h => h.id === horseId ? { ...h, document_urls: newUrls } : h));
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeDoc = async (horseId: string, docIndex: number) => {
    const horse = horses.find(h => h.id === horseId);
    if (!horse) return;
    const newUrls = horse.document_urls.filter((_, i) => i !== docIndex);
    if (dbAvailable && !horseId.startsWith('local-')) {
      await db({ action: 'update', table: 'equine', data: { document_urls: newUrls }, match: { id: horseId } });
    }
    setHorses(prev => prev.map(h => h.id === horseId ? { ...h, document_urls: newUrls } : h));
  };

  const startEdit = (id: string, field: string, currentValue: string) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(currentValue || '');
  };

  const saveEdit = () => {
    if (editingId && editField) {
      updateField(editingId, editField, editValue);
    }
    setEditingId(null);
    setEditField('');
    setEditValue('');
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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

  return (
    <div className="p-6 lg:p-10">
      <input ref={fileInputRef} type="file" accept="*/*" onChange={handleDocUpload} className="hidden" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Equine Program</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          {horses.length} horses &middot; Click a row to expand details
        </p>
        {!dbAvailable && (
          <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Database table not found — showing sample data. Run the setup migration to persist.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {horses.map(horse => {
          const expanded = expandedId === horse.id;
          return (
            <div key={horse.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
              {/* Main row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-warm-bg/30 transition-colors"
                onClick={() => setExpandedId(expanded ? null : horse.id)}
              >
                {/* Horse icon */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-2-1-4-1c-3 0-5 2-6 4H8L4 11l4 1-2 4 4-2 1 4 3-5c2.5-.5 5-3 7-5l1-4z" />
                    <path d="M2 20s2-2 4-2 4 2 4 2" />
                  </svg>
                </div>

                {/* Name + Works in */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{horse.name}</h3>
                  <p className="text-xs text-foreground/40 truncate" style={{ fontFamily: 'var(--font-body)' }}>{horse.works_in || 'Not assigned'}</p>
                </div>

                {/* Quick stats */}
                <div className="hidden sm:flex items-center gap-3">
                  <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Age {horse.age || '?'}</span>
                  <span className={`text-xs ${bodyScoreColor(horse.body_score)}`} style={{ fontFamily: 'var(--font-body)' }}>BS {horse.body_score || '?'}</span>
                  <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{horse.weight}</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${rideableColor(horse.rideable)}`}>{horse.rideable === 'Yes' ? 'Rideable' : horse.rideable === 'No' ? 'Not Rideable' : horse.rideable}</span>
                </div>

                {/* Expand chevron */}
                <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div className="px-5 pb-5 border-t border-gray-50">
                  {/* Mobile quick stats */}
                  <div className="flex flex-wrap gap-2 sm:hidden mt-3 mb-3">
                    <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>Age {horse.age || '?'}</span>
                    <span className={`text-xs ${bodyScoreColor(horse.body_score)}`}>BS {horse.body_score || '?'}</span>
                    <span className="text-xs text-foreground/50">{horse.weight}</span>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${rideableColor(horse.rideable)}`}>{horse.rideable === 'Yes' ? 'Rideable' : 'Not Rideable'}</span>
                  </div>

                  {/* Detail grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                    {[
                      ['shoe_schedule', 'Shoe Schedule', horse.shoe_schedule],
                      ['behavior', 'Behavior', horse.behavior],
                      ['needs_next_steps', 'Needs / Next Steps', horse.needs_next_steps],
                      ['works_in', 'Works In', horse.works_in],
                      ['rideable', 'Rideable', horse.rideable],
                      ['ownership_papers', 'Ownership Papers', horse.ownership_papers],
                    ].map(([field, label, value]) => (
                      <div key={field}>
                        <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
                        {editingId === horse.id && editField === field ? (
                          <input
                            autoFocus
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={saveEdit}
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') { setEditingId(null); } }}
                            className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full"
                            style={{ fontFamily: 'var(--font-body)' }}
                          />
                        ) : (
                          <p
                            className="text-sm text-foreground/70 cursor-text hover:text-foreground transition-colors"
                            style={{ fontFamily: 'var(--font-body)' }}
                            onClick={e => { e.stopPropagation(); startEdit(horse.id, field, value); }}
                          >
                            {value || <span className="text-foreground/20 italic">—</span>}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Internal Info */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Internal Info</p>
                    {editingId === horse.id && editField === 'internal_info' ? (
                      <textarea
                        autoFocus
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        rows={3}
                        className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full resize-none"
                        style={{ fontFamily: 'var(--font-body)' }}
                      />
                    ) : (
                      <p
                        className="text-sm text-foreground/70 cursor-text hover:text-foreground transition-colors"
                        style={{ fontFamily: 'var(--font-body)' }}
                        onClick={() => startEdit(horse.id, 'internal_info', horse.internal_info)}
                      >
                        {horse.internal_info || <span className="text-foreground/20 italic">No notes</span>}
                      </p>
                    )}
                  </div>

                  {/* Documents */}
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {(horse.document_urls || []).map((url, i) => {
                        const filename = decodeURIComponent(url.split('/').pop() || 'Document');
                        return (
                          <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-bg rounded-lg group">
                            <svg className="w-3.5 h-3.5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-foreground/60 hover:text-primary transition-colors truncate max-w-[150px]" style={{ fontFamily: 'var(--font-body)' }}>{filename}</a>
                            <button onClick={(e) => { e.stopPropagation(); removeDoc(horse.id, i); }} className="text-foreground/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        );
                      })}
                      <button
                        onClick={(e) => { e.stopPropagation(); uploadHorseRef.current = horse.id; fileInputRef.current?.click(); }}
                        disabled={uploading === horse.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-300 text-xs text-foreground/40 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        {uploading === horse.id ? (
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
