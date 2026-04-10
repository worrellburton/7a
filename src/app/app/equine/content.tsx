'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import React, { useEffect, useRef, useState } from 'react';

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
  created_at: string;
}

interface EditableCellProps {
  horseId: string;
  field: string;
  value: string;
  className?: string;
  editingId: string | null;
  editField: string;
  editValue: string;
  setEditValue: (v: string) => void;
  setEditingId: (v: string | null) => void;
  saveEdit: () => void;
  startEdit: (id: string, field: string, value: string) => void;
}

function EditableCell({ horseId, field, value, className = '', editingId, editField, editValue, setEditValue, setEditingId, saveEdit, startEdit }: EditableCellProps) {
  if (editingId === horseId && editField === field) {
    return (
      <input
        autoFocus
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={saveEdit}
        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
        className="text-sm px-1.5 py-0.5 rounded border border-gray-200 focus:border-primary focus:outline-none w-full bg-white"
        style={{ fontFamily: 'var(--font-body)' }}
      />
    );
  }
  return (
    <span
      className={`cursor-text hover:text-foreground transition-colors ${className}`}
      onClick={e => { e.stopPropagation(); startEdit(horseId, field, value); }}
    >
      {value || <span className="text-foreground/20">—</span>}
    </span>
  );
}

type ColDef = { key: string; label: string; hidden?: string };

const defaultColumnOrder: ColDef[] = [
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
  { key: 'body_score', label: 'Rate my Body' },
  { key: 'weight', label: 'Weight' },
  { key: 'works_in', label: 'Works In' },
  { key: 'rideable', label: 'Rideable' },
  { key: 'shoe_schedule', label: 'Shoes' },
  { key: 'behavior', label: 'Behavior', hidden: 'hidden lg:table-cell' },
  { key: 'owner', label: 'Owner' },
  { key: 'last_vet', label: 'Last Vet' },
  { key: 'docs', label: 'Docs', hidden: 'hidden xl:table-cell' },
];

const defaultHorses: Omit<Horse, 'id' | 'created_at'>[] = [
  { name: 'Arrow', age: 10, body_score: 5, weight: '1015 lbs', works_in: 'EAP only / Not broken', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Less spooky / Good', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Boots off, doing good, no noticeable pain', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Chika', age: 6, body_score: 5, weight: '865 lbs', works_in: 'EAP only / Not broken', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Good', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Check scab, is dried and closed, starting to peel. Slight limp', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Wanda', age: 12, body_score: 5, weight: '835 lbs', works_in: 'EAP / TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Tight Lead for Cinch / Good', needs_next_steps: 'Lunge', internal_info: 'Healthier weight. Can go on rides', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Kate', age: 21, body_score: 5, weight: '927 lbs', works_in: 'EAP / TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Tight Lead for Cinch / Good', needs_next_steps: 'Vertebrae and hips - gain weight / muscle', internal_info: 'Looks good, better weight. Topline needs more muscle but overall healthy', ownership_papers: 'Kate_Ownership_Paper.pdf', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Jack', age: 9, body_score: 5.5, weight: '969 lbs', works_in: 'EAP', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Good', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Good boy, covered in fly bites but overall healthy', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Miklo', age: 15, body_score: 3, weight: '1075 lbs', works_in: 'FR / EAP with 2 staff', rideable: 'No', shoe_schedule: '8 weeks', behavior: 'Moody sensitive', needs_next_steps: 'For advanced riders', internal_info: 'Vet came out 1/21/26. Has sand and suspected ulcers. Feed schedule has been changed to try to get him eating more. No riding / NO EAP.', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Red Feather', age: 26, body_score: 5, weight: '969 lbs', works_in: 'EAP with 2 staff / TF', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Sensitive', needs_next_steps: 'Lunging', internal_info: '1/21 Lunged, was checked out at first but after some changes of direction did amazing. Much less testing and attitude than there was.', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Dandy', age: 22, body_score: 5, weight: '938 lbs', works_in: 'TR', rideable: 'No', shoe_schedule: '8 weeks', behavior: 'Good', needs_next_steps: 'Lunging', internal_info: 'Lairus rode on monday ride, said he did good. Can go on rides with smaller riders. Max weight 160lbs (estimate)', ownership_papers: 'Dandy_Ownership_Paper.pdf', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Wellbriety (Wally)', age: 21, body_score: 6, weight: '1132 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Hard to Catch / Good / Sensitive', needs_next_steps: 'Lunging', internal_info: '12/31 Lunged. Untrusting and seemed uncomfortable. Couldn\'t keep him at a walk', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Cowboy', age: 26, body_score: 5, weight: '965 lbs', works_in: 'EAP only', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Good / Spunky', needs_next_steps: 'Gain weight', internal_info: 'Farrier found an abscess in each front foot. Moved to drier pen. Still limping and has scabs on hocks', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'RW', age: 5, body_score: 5.5, weight: '923 lbs', works_in: 'Not broken', rideable: 'No', shoe_schedule: '16 weeks', behavior: 'Sensitive / Nips', needs_next_steps: 'Breaking', internal_info: 'Plan to break / been working on halter lead commands and touching', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Clyde', age: 21, body_score: 6, weight: '1001 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Good', needs_next_steps: '', internal_info: 'Overall healthy, no concerns', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Scout', age: 19, body_score: 6, weight: '1150 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Good', needs_next_steps: 'Pain meds as needed', internal_info: 'Mostly used for beginners and light riders, steady weight', ownership_papers: 'Scout', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Authentic Self', age: 11, body_score: 5.5, weight: '1065 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', behavior: 'Sensitive / Spooky / Good', needs_next_steps: 'Ground work / Lunging', internal_info: 'Ground work needed. Working on leading, standing beside him without him backing up, picking feet', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Murphy', age: 11, body_score: 5, weight: '1035 lbs', works_in: 'In work TR', rideable: 'For staff', shoe_schedule: '8 weeks', behavior: 'Sensitive', needs_next_steps: 'Ground work / Lunging', internal_info: 'Hard to catch. Checks in more than he checks out. High energy but comes back down pretty easy', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
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
  const vetFileInputRef = useRef<HTMLInputElement>(null);
  const uploadHorseRef = useRef<string | null>(null);
  const uploadVetVisitRef = useRef<{ horseId: string; visitIndex: number } | null>(null);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [showVetForm, setShowVetForm] = useState<string | null>(null);
  const [vetFormDate, setVetFormDate] = useState('');
  const [vetFormReason, setVetFormReason] = useState('');
  const [vetFormNotes, setVetFormNotes] = useState('');
  const [vetViewHorseId, setVetViewHorseId] = useState<string | null>(null);
  const [columns, setColumns] = useState<ColDef[]>(() => {
    if (typeof window === 'undefined') return defaultColumnOrder;
    try {
      const saved = localStorage.getItem('equine_col_order');
      if (saved) {
        const keys: string[] = JSON.parse(saved);
        // Rebuild from defaults using saved order, adding any new columns
        const ordered = keys.map(k => defaultColumnOrder.find(c => c.key === k)).filter(Boolean) as ColDef[];
        const missing = defaultColumnOrder.filter(c => !keys.includes(c.key));
        return [...ordered, ...missing];
      }
    } catch {}
    return defaultColumnOrder;
  });
  const [dragColIdx, setDragColIdx] = useState<number | null>(null);
  const [dragOverColIdx, setDragOverColIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      try {
        const data = await db({ action: 'select', table: 'equine', order: { column: 'name', ascending: true } });
        if (Array.isArray(data) && data.length > 0) {
          // Normalize: ensure optional columns have defaults even if missing from DB
          const updated = data.map((h: Record<string, unknown>) => ({
            ...h,
            owner: (h.owner as string) || 'GOD',
            notes: (h.notes as string) || '',
            vet_visits: Array.isArray(h.vet_visits) ? h.vet_visits : [],
            document_urls: Array.isArray(h.document_urls) ? h.document_urls : [],
          })) as Horse[];
          setHorses(updated);
        } else if (Array.isArray(data) && data.length === 0) {
          for (const h of defaultHorses) {
            const result = await db({ action: 'insert', table: 'equine', data: h });
            if (result && result.id) {
              setHorses(prev => [...prev, result]);
            }
          }
        } else {
          setDbAvailable(false);
          setHorses(defaultHorses.map((h, i) => ({ ...h, id: `local-${i}`, created_at: new Date().toISOString() })));
        }
      } catch {
        setDbAvailable(false);
        setHorses(defaultHorses.map((h, i) => ({ ...h, id: `local-${i}`, created_at: new Date().toISOString() })));
      }
      setLoading(false);
    }
    load();
  }, [session]);

  const updateField = async (id: string, field: string, value: string) => {
    const parsed = field === 'age' ? (parseInt(value) || null) : field === 'body_score' ? (parseFloat(value) || null) : value;
    setHorses(prev => prev.map(h => h.id === id ? { ...h, [field]: parsed } : h));
    if (!dbAvailable || id.startsWith('local-')) return;
    try {
      await db({ action: 'update', table: 'equine', data: { [field]: parsed }, match: { id } });
    } catch { /* column may not exist yet */ }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const horseId = uploadHorseRef.current;
    if (!horseId || !e.target.files?.length) return;
    setUploading(horseId);
    const file = e.target.files[0];
    const { url } = await uploadFile(file);
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

  const addVetVisit = async (horseId: string) => {
    if (!vetFormDate) return;
    const horse = horses.find(h => h.id === horseId);
    if (!horse) return;
    const visit: VetVisit = { date: vetFormDate, reason: vetFormReason, notes: vetFormNotes, doc_urls: [] };
    const newVisits = [...(horse.vet_visits || []), visit].sort((a, b) => b.date.localeCompare(a.date));
    if (dbAvailable && !horseId.startsWith('local-')) {
      await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horseId } });
    }
    setHorses(prev => prev.map(h => h.id === horseId ? { ...h, vet_visits: newVisits } : h));
    setShowVetForm(null);
    setVetFormDate('');
    setVetFormReason('');
    setVetFormNotes('');
  };

  const removeVetVisit = async (horseId: string, visitIndex: number) => {
    const horse = horses.find(h => h.id === horseId);
    if (!horse) return;
    const newVisits = horse.vet_visits.filter((_, i) => i !== visitIndex);
    if (dbAvailable && !horseId.startsWith('local-')) {
      await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horseId } });
    }
    setHorses(prev => prev.map(h => h.id === horseId ? { ...h, vet_visits: newVisits } : h));
  };

  const handleVetDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const ref = uploadVetVisitRef.current;
    if (!ref || !e.target.files?.length) return;
    setUploading(`vet-${ref.horseId}-${ref.visitIndex}`);
    const file = e.target.files[0];
    const { url } = await uploadFile(file);
    if (url) {
      const horse = horses.find(h => h.id === ref.horseId);
      if (horse) {
        const newVisits = [...horse.vet_visits];
        newVisits[ref.visitIndex] = { ...newVisits[ref.visitIndex], doc_urls: [...newVisits[ref.visitIndex].doc_urls, url] };
        if (dbAvailable && !ref.horseId.startsWith('local-')) {
          await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: ref.horseId } });
        }
        setHorses(prev => prev.map(h => h.id === ref.horseId ? { ...h, vet_visits: newVisits } : h));
      }
    }
    setUploading(null);
    if (vetFileInputRef.current) vetFileInputRef.current.value = '';
  };

  const removeVetDoc = async (horseId: string, visitIndex: number, docIndex: number) => {
    const horse = horses.find(h => h.id === horseId);
    if (!horse) return;
    const newVisits = [...horse.vet_visits];
    newVisits[visitIndex] = { ...newVisits[visitIndex], doc_urls: newVisits[visitIndex].doc_urls.filter((_, i) => i !== docIndex) };
    if (dbAvailable && !horseId.startsWith('local-')) {
      await db({ action: 'update', table: 'equine', data: { vet_visits: newVisits }, match: { id: horseId } });
    }
    setHorses(prev => prev.map(h => h.id === horseId ? { ...h, vet_visits: newVisits } : h));
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

  const handleColDragStart = (e: React.DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx));
    e.dataTransfer.effectAllowed = 'move';
    setDragColIdx(idx);
  };
  const handleColDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
    if (isNaN(fromIdx) || fromIdx === toIdx) { setDragColIdx(null); setDragOverColIdx(null); return; }
    const newCols = [...columns];
    const [moved] = newCols.splice(fromIdx, 1);
    newCols.splice(toIdx, 0, moved);
    setColumns(newCols);
    localStorage.setItem('equine_col_order', JSON.stringify(newCols.map(c => c.key)));
    setDragColIdx(null);
    setDragOverColIdx(null);
  };

  const renderCell = (horse: Horse, col: ColDef) => {
    switch (col.key) {
      case 'name':
        return <span className="text-sm font-bold text-foreground whitespace-nowrap">{horse.name}</span>;
      case 'age':
        return <EditableCell {...ecProps} horseId={horse.id} field="age" value={String(horse.age || '')} />;
      case 'body_score':
        return <span className={`text-sm ${bodyScoreColor(horse.body_score)}`}><EditableCell {...ecProps} horseId={horse.id} field="body_score" value={String(horse.body_score || '')} className={bodyScoreColor(horse.body_score)} /></span>;
      case 'weight':
        return <EditableCell {...ecProps} horseId={horse.id} field="weight" value={horse.weight} />;
      case 'works_in':
        return <EditableCell {...ecProps} horseId={horse.id} field="works_in" value={horse.works_in} />;
      case 'rideable':
        return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${rideableColor(horse.rideable)}`}>{horse.rideable === 'Yes' ? 'Yes' : horse.rideable === 'No' ? 'No' : horse.rideable}</span>;
      case 'shoe_schedule':
        return <EditableCell {...ecProps} horseId={horse.id} field="shoe_schedule" value={horse.shoe_schedule} />;
      case 'behavior':
        return <EditableCell {...ecProps} horseId={horse.id} field="behavior" value={horse.behavior} />;
      case 'owner':
        return <EditableCell {...ecProps} horseId={horse.id} field="owner" value={horse.owner} />;
      case 'last_vet': {
        const lastVisit = (horse.vet_visits || []).sort((a, b) => b.date.localeCompare(a.date))[0];
        return lastVisit
          ? <button onClick={e => { e.stopPropagation(); setVetViewHorseId(vetViewHorseId === horse.id ? null : horse.id); }} className="text-xs text-primary hover:underline whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{lastVisit.date}</button>
          : <button onClick={e => { e.stopPropagation(); setShowVetForm(horse.id); setVetViewHorseId(horse.id); }} className="text-xs text-foreground/20 hover:text-primary" style={{ fontFamily: 'var(--font-body)' }}>+ Add</button>;
      }
      case 'docs':
        return (horse.document_urls || []).length > 0
          ? <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">{horse.document_urls.length}</span>
          : <span className="text-xs text-foreground/20" style={{ fontFamily: 'var(--font-body)' }}>0</span>;
      default:
        return null;
    }
  };

  const ecProps = { editingId, editField, editValue, setEditValue, setEditingId, saveEdit, startEdit };

  return (
    <div className="p-6 lg:p-10">
      <input ref={fileInputRef} type="file" accept="*/*" onChange={handleDocUpload} className="hidden" />
      <input ref={vetFileInputRef} type="file" accept="*/*" onChange={handleVetDocUpload} className="hidden" />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Equine Program</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          {horses.length} horses &middot; Click to expand &middot; Click any cell to edit
        </p>
        {!dbAvailable && (
          <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
            Database table not found — showing sample data. Run the setup migration to persist.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-warm-bg/50">
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    draggable
                    onDragStart={e => handleColDragStart(e, idx)}
                    onDragOver={e => { e.preventDefault(); setDragOverColIdx(idx); }}
                    onDragLeave={() => setDragOverColIdx(null)}
                    onDrop={e => handleColDrop(e, idx)}
                    onDragEnd={() => { setDragColIdx(null); setDragOverColIdx(null); }}
                    className={`text-left px-4 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider cursor-grab active:cursor-grabbing select-none transition-colors ${col.hidden || ''} ${dragOverColIdx === idx ? 'bg-primary/10' : ''} ${dragColIdx === idx ? 'opacity-40' : ''}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    {col.label}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {horses.map(horse => {
                const expanded = expandedId === horse.id;
                return (
                  <React.Fragment key={horse.id}>
                    <tr
                      onClick={() => setExpandedId(expanded ? null : horse.id)}
                      className={`border-b border-gray-50 hover:bg-warm-bg/20 transition-colors cursor-pointer ${expanded ? 'bg-warm-bg/10' : ''}`}
                    >
                      {columns.map(col => (
                        <td key={col.key} className={`px-4 py-3 text-sm text-foreground/60 whitespace-nowrap ${col.hidden || ''} ${col.key === 'works_in' ? 'max-w-[160px] truncate' : ''} ${col.key === 'behavior' ? 'max-w-[180px] truncate' : ''}`} style={{ fontFamily: 'var(--font-body)' }}>
                          {renderCell(horse, col)}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={columns.length + 1} className="bg-warm-bg/20 px-5 py-4 border-b border-gray-100">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                            {[
                              ['needs_next_steps', 'Needs / Next Steps', horse.needs_next_steps],
                              ['behavior', 'Behavior', horse.behavior],
                              ['rideable', 'Rideable', horse.rideable],
                              ['ownership_papers', 'Ownership Papers', horse.ownership_papers],
                            ].map(([field, label, value]) => (
                              <div key={field}>
                                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
                                <EditableCell {...ecProps} horseId={horse.id} field={field} value={value} className="text-sm text-foreground/70" />
                              </div>
                            ))}
                          </div>

                          {/* Internal Info */}
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Internal Info</p>
                            {editingId === horse.id && editField === 'internal_info' ? (
                              <textarea
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                rows={3}
                                className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full resize-none bg-white"
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

                          {/* Notes */}
                          <div className="mb-4">
                            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Notes</p>
                            {editingId === horse.id && editField === 'notes' ? (
                              <textarea
                                autoFocus
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={saveEdit}
                                rows={3}
                                className="text-sm px-2 py-1 rounded-lg border border-gray-200 focus:border-primary focus:outline-none w-full resize-none bg-white"
                                style={{ fontFamily: 'var(--font-body)' }}
                              />
                            ) : (
                              <p
                                className="text-sm text-foreground/70 cursor-text hover:text-foreground transition-colors"
                                style={{ fontFamily: 'var(--font-body)' }}
                                onClick={() => startEdit(horse.id, 'notes', horse.notes)}
                              >
                                {horse.notes || <span className="text-foreground/20 italic">Click to add notes...</span>}
                              </p>
                            )}
                          </div>

                          {/* Vet Visits */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Vet Visits ({(horse.vet_visits || []).length})</p>
                              <button
                                onClick={e => { e.stopPropagation(); setShowVetForm(showVetForm === horse.id ? null : horse.id); }}
                                className="text-xs text-primary hover:underline font-medium"
                                style={{ fontFamily: 'var(--font-body)' }}
                              >+ Add Visit</button>
                            </div>
                            {showVetForm === horse.id && (
                              <div className="bg-white rounded-xl p-3 border border-gray-100 mb-2" onClick={e => e.stopPropagation()}>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label className="text-[10px] text-foreground/40 block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Date</label>
                                    <input type="date" value={vetFormDate} onChange={e => setVetFormDate(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-warm-bg/50" style={{ fontFamily: 'var(--font-body)' }} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-foreground/40 block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Reason</label>
                                    <input type="text" value={vetFormReason} onChange={e => setVetFormReason(e.target.value)} placeholder="Checkup, vaccines..." className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-warm-bg/50" style={{ fontFamily: 'var(--font-body)' }} />
                                  </div>
                                  <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] text-foreground/40 block mb-0.5" style={{ fontFamily: 'var(--font-body)' }}>Notes</label>
                                    <input type="text" value={vetFormNotes} onChange={e => setVetFormNotes(e.target.value)} placeholder="Details..." className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-primary bg-warm-bg/50" style={{ fontFamily: 'var(--font-body)' }} />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => addVetVisit(horse.id)} disabled={!vetFormDate} className="px-3 py-1.5 rounded-lg bg-foreground text-white text-xs font-medium hover:bg-foreground/80 disabled:opacity-40" style={{ fontFamily: 'var(--font-body)' }}>Save Visit</button>
                                  <button onClick={() => setShowVetForm(null)} className="px-3 py-1.5 rounded-lg text-xs text-foreground/50 hover:bg-warm-bg" style={{ fontFamily: 'var(--font-body)' }}>Cancel</button>
                                </div>
                              </div>
                            )}
                            {(horse.vet_visits || []).length > 0 && (
                              <div className="space-y-1.5">
                                {horse.vet_visits.map((visit, vi) => (
                                  <div key={vi} className="bg-white rounded-xl px-3 py-2.5 border border-gray-100 group" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-foreground">{visit.date}</span>
                                        {visit.reason && <span className="text-xs text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{visit.reason}</span>}
                                      </div>
                                      <button onClick={() => removeVetVisit(horse.id, vi)} className="text-foreground/20 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                      </button>
                                    </div>
                                    {visit.notes && <p className="text-xs text-foreground/50 mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>{visit.notes}</p>}
                                    <div className="flex flex-wrap gap-1.5">
                                      {visit.doc_urls.map((url, di) => {
                                        const fname = decodeURIComponent(url.split('/').pop() || 'Doc');
                                        return (
                                          <div key={di} className="flex items-center gap-1 px-2 py-1 bg-warm-bg rounded-lg text-xs group/doc">
                                            <svg className="w-3 h-3 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-primary truncate max-w-[120px]" style={{ fontFamily: 'var(--font-body)' }}>{fname}</a>
                                            <button onClick={() => removeVetDoc(horse.id, vi, di)} className="text-foreground/20 hover:text-red-500 opacity-0 group-hover/doc:opacity-100">
                                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </div>
                                        );
                                      })}
                                      <button
                                        onClick={() => { uploadVetVisitRef.current = { horseId: horse.id, visitIndex: vi }; vetFileInputRef.current?.click(); }}
                                        disabled={uploading === `vet-${horse.id}-${vi}`}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-gray-300 text-[10px] text-foreground/30 hover:border-primary hover:text-primary disabled:opacity-50"
                                        style={{ fontFamily: 'var(--font-body)' }}
                                      >
                                        {uploading === `vet-${horse.id}-${vi}` ? (
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
                            )}
                          </div>

                          {/* Documents */}
                          <div>
                            <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2" style={{ fontFamily: 'var(--font-body)' }}>Documents</p>
                            <div className="flex flex-wrap gap-2">
                              {(horse.document_urls || []).map((url, i) => {
                                const filename = decodeURIComponent(url.split('/').pop() || 'Document');
                                return (
                                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-100 group">
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
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
