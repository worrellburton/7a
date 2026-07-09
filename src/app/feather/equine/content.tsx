'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { uploadFile } from '@/lib/upload';
import { logActivity } from '@/lib/activity';
import { useRouter } from 'next/navigation';
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
  { key: 'photo', label: '' },
  { key: 'name', label: 'Name' },
  { key: 'age', label: 'Age' },
  { key: 'body_score', label: 'Rate my Body' },
  { key: 'weight', label: 'Weight' },
  { key: 'works_in', label: 'Works In' },
  { key: 'rideable', label: 'Rideable' },
  { key: 'shoe_schedule', label: 'Shoes' },
  // 'behavior' + 'owner' columns removed — Owner read "GOD" on every
  // row, and the short Behavior tags weren't actionable on the
  // roster (clinicians keep the nuance in notes / internal_info).
  { key: 'last_vet', label: 'Last Vet' },
  { key: 'docs', label: 'Docs', hidden: 'hidden xl:table-cell' },
];

const defaultHorses: Omit<Horse, 'id' | 'created_at' | 'image_url'>[] = [
  { name: 'Arrow', age: 10, body_score: 5, weight: '1015 lbs', works_in: 'EAP only / Not broken', rideable: 'No', shoe_schedule: '16 weeks', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Boots off, doing good, no noticeable pain', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Chika', age: 6, body_score: 5, weight: '865 lbs', works_in: 'EAP only / Not broken', rideable: 'No', shoe_schedule: '16 weeks', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Check scab, is dried and closed, starting to peel. Slight limp', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Wanda', age: 12, body_score: 5, weight: '835 lbs', works_in: 'EAP / TR', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: 'Lunge', internal_info: 'Healthier weight. Can go on rides', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Kate', age: 21, body_score: 5, weight: '927 lbs', works_in: 'EAP / TR', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: 'Vertebrae and hips - gain weight / muscle', internal_info: 'Looks good, better weight. Topline needs more muscle but overall healthy', ownership_papers: 'Kate_Ownership_Paper.pdf', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Jack', age: 9, body_score: 5.5, weight: '969 lbs', works_in: 'EAP', rideable: 'No', shoe_schedule: '16 weeks', needs_next_steps: 'Ground work / Picking feet', internal_info: 'Good boy, covered in fly bites but overall healthy', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Red Feather', age: 26, body_score: 5, weight: '969 lbs', works_in: 'EAP with 2 staff / TF', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: 'Lunging', internal_info: '1/21 Lunged, was checked out at first but after some changes of direction did amazing. Much less testing and attitude than there was.', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Dandy', age: 22, body_score: 5, weight: '938 lbs', works_in: 'TR', rideable: 'No', shoe_schedule: '8 weeks', needs_next_steps: 'Lunging', internal_info: 'Lairus rode on monday ride, said he did good. Can go on rides with smaller riders. Max weight 160lbs (estimate)', ownership_papers: 'Dandy_Ownership_Paper.pdf', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Wellbriety (Wally)', age: 21, body_score: 6, weight: '1132 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: 'Lunging', internal_info: '12/31 Lunged. Untrusting and seemed uncomfortable. Couldn\'t keep him at a walk', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Cowboy', age: 26, body_score: 5, weight: '965 lbs', works_in: 'EAP only', rideable: 'No', shoe_schedule: '16 weeks', needs_next_steps: 'Gain weight', internal_info: 'Farrier found an abscess in each front foot. Moved to drier pen. Still limping and has scabs on hocks', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'RW', age: 5, body_score: 5.5, weight: '923 lbs', works_in: 'Not broken', rideable: 'No', shoe_schedule: '16 weeks', needs_next_steps: 'Breaking', internal_info: 'Plan to break / been working on halter lead commands and touching', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Clyde', age: 21, body_score: 6, weight: '1001 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: '', internal_info: 'Overall healthy, no concerns', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Scout', age: 19, body_score: 6, weight: '1150 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: 'Pain meds as needed', internal_info: 'Mostly used for beginners and light riders, steady weight', ownership_papers: 'Scout', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Authentic Self', age: 11, body_score: 5.5, weight: '1065 lbs', works_in: 'TR', rideable: 'Yes', shoe_schedule: '8 weeks', needs_next_steps: 'Ground work / Lunging', internal_info: 'Ground work needed. Working on leading, standing beside him without him backing up, picking feet', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
  { name: 'Murphy', age: 11, body_score: 5, weight: '1035 lbs', works_in: 'In work TR', rideable: 'For staff', shoe_schedule: '8 weeks', needs_next_steps: 'Ground work / Lunging', internal_info: 'Hard to catch. Checks in more than he checks out. High energy but comes back down pretty easy', ownership_papers: '', owner: 'GOD', notes: '', vet_visits: [], document_urls: [] },
];

export default function EquineContent() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<{ horseId: string; file: File } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const uploadHorseRef = useRef<string | null>(null);
  const imageHorseRef = useRef<string | null>(null);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
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
  // List vs grid layout for the roster. Defaults to grid because the
  // tile view reads as the canonical Horses screen on first paint
  // (photo dominant, rideable + shoes as quick callouts) and the
  // table is reserved for power editing. Persisted in localStorage so
  // a teammate's preference sticks across sessions.
  const [view, setView] = useState<'list' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'grid';
    const saved = localStorage.getItem('equine_view');
    return saved === 'list' ? 'list' : 'grid';
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('equine_view', view);
  }, [view]);

  // Bling mode — runs each horse's photo through Gemini's nano-banana
  // image-editing model with the prompt "give all these horses bling
  // and sunglasses" and swaps the tile portrait for the result. Cached
  // server-side in equine_bling_images so subsequent toggles are
  // instant and don't re-bill the API. blingUrls is the per-horse
  // resolved cache; preheating reflects the single bulk pre-render
  // request that fires once on roster load.
  // Bling mode is ON by default — leadership wants the bling
  // portraits as the canonical roster look. localStorage 'off'
  // explicitly opts out; missing key (first visit) keeps it on.
  const [blingMode, setBlingMode] = useState(true);
  const [blingUrls, setBlingUrls] = useState<Record<string, string>>({});
  const [preheating, setPreheating] = useState(false);
  const [blingError, setBlingError] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Storage key bumped to v2 so anyone who toggled bling off
    // pre-launch gets reset to the new default-on state. Their
    // preference still persists going forward via this same key.
    const saved = localStorage.getItem('equine_bling_mode_v2');
    if (saved === 'off') setBlingMode(false);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('equine_bling_mode_v2', blingMode ? 'on' : 'off');
  }, [blingMode]);

  // The toggle itself is intentionally just a visual switch. The
  // bling images are pre-rendered server-side via the preheat
  // effect below (runs once on roster load) so flipping the toggle
  // never triggers a Gemini call — it just selects which URL the
  // tile renders from the existing cache.

  // Resolve the right photo URL for a horse based on bling state.
  // Falls back to the original image while the bling result is
  // generating so we never leave the tile blank.
  const photoFor = (horse: Horse): string | null => {
    if (blingMode && blingUrls[horse.id]) return blingUrls[horse.id];
    return horse.image_url;
  };

  // Auto-preheat the bling cache: once the roster has loaded, fire
  // a single bulk request to /api/equine/bling/preheat in the
  // background. The endpoint skips horses that already have a
  // cached row matching their current source URL, so this is a
  // no-op once everyone is rendered. Persists the resulting URLs
  // into our local blingUrls map so tiles flip from "Adding bling…"
  // to the bling portrait without a refresh.
  const preheatedRef = useRef(false);
  useEffect(() => {
    if (preheatedRef.current) return;
    if (!session?.access_token) return;
    if (loading) return;
    if (horses.length === 0) return;
    preheatedRef.current = true;
    setPreheating(true);
    fetch('/api/equine/bling/preheat', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        const json = (await res.json().catch(() => ({}))) as {
          results?: Array<{ horse_id: string; status: string; url?: string; error?: string }>;
          error?: string;
        };
        if (!res.ok) {
          if (json.error) setBlingError(json.error);
          return;
        }
        const next: Record<string, string> = {};
        let firstError: string | null = null;
        for (const r of json.results ?? []) {
          if (r.url) next[r.horse_id] = r.url;
          else if (r.status === 'error' && r.error && !firstError) firstError = r.error;
        }
        if (Object.keys(next).length > 0) {
          setBlingUrls((prev) => ({ ...next, ...prev }));
        }
        if (firstError) setBlingError(firstError);
      })
      .catch((err) => {
        setBlingError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setPreheating(false);
      });
  }, [session?.access_token, loading, horses.length]);

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
            image_url: (h.image_url as string) || null,
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
          setHorses(defaultHorses.map((h, i) => ({ ...h, id: `local-${i}`, created_at: new Date().toISOString(), image_url: null })));
        }
      } catch {
        setDbAvailable(false);
        setHorses(defaultHorses.map((h, i) => ({ ...h, id: `local-${i}`, created_at: new Date().toISOString(), image_url: null })));
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
    if (url && user) {
      const horse = horses.find(h => h.id === horseId);
      logActivity({ userId: user.id, type: 'equine.doc_uploaded', targetKind: 'equine', targetId: horseId, targetLabel: horse?.name || 'Horse', targetPath: `/feather/equine/${horseId}` });
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const horseId = imageHorseRef.current;
    if (!horseId || !e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file.type.startsWith('image/')) {
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    setCropTarget({ horseId, file });
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const saveCroppedImage = async (cropped: File) => {
    const target = cropTarget;
    if (!target) return;
    setCropTarget(null);
    setUploadingImage(target.horseId);
    const { url } = await uploadFile(cropped);
    if (url) {
      if (dbAvailable && !target.horseId.startsWith('local-')) {
        await db({ action: 'update', table: 'equine', data: { image_url: url }, match: { id: target.horseId } });
      }
      setHorses(prev => prev.map(h => h.id === target.horseId ? { ...h, image_url: url } : h));
      if (user) {
        const horse = horses.find(h => h.id === target.horseId);
        logActivity({ userId: user.id, type: 'equine.photo_updated', targetKind: 'equine', targetId: target.horseId, targetLabel: horse?.name || 'Horse', targetPath: `/feather/equine/${target.horseId}` });
      }
    }
    setUploadingImage(null);
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
      <div className="p-4 sm:p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
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

  // Click a column header to sort. Cycle: none → asc → desc → none.
  const toggleSort = (key: string) => {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null);
    setSortDir('asc');
  };

  // Extract a comparable value for a given column.
  const sortValue = (horse: Horse, key: string): string | number => {
    switch (key) {
      case 'name': return horse.name?.toLowerCase() || '';
      case 'age': return horse.age ?? -Infinity;
      case 'body_score': return horse.body_score ?? -Infinity;
      case 'weight': {
        const n = parseFloat((horse.weight || '').replace(/[^0-9.]/g, ''));
        return isNaN(n) ? -Infinity : n;
      }
      case 'works_in': return (horse.works_in || '').toLowerCase();
      case 'rideable': return (horse.rideable || '').toLowerCase();
      case 'shoe_schedule': {
        const n = parseFloat((horse.shoe_schedule || '').replace(/[^0-9.]/g, ''));
        return isNaN(n) ? -Infinity : n;
      }
      case 'owner': return (horse.owner || '').toLowerCase();
      case 'last_vet': {
        const last = (horse.vet_visits || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
        return last?.date || '';
      }
      case 'docs': return (horse.document_urls || []).length;
      default: return '';
    }
  };

  const sortedHorses = sortKey
    ? [...horses].sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      })
    : horses;

  const renderCell = (horse: Horse, col: ColDef) => {
    switch (col.key) {
      case 'photo': {
        const initial = (horse.name || '?').charAt(0).toUpperCase();
        const isUploading = uploadingImage === horse.id;
        return (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              imageHorseRef.current = horse.id;
              imageInputRef.current?.click();
            }}
            disabled={isUploading}
            className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-200 bg-warm-bg flex items-center justify-center group/photo shrink-0 hover:ring-2 hover:ring-primary/40 transition-all"
            aria-label={`${horse.name} photo`}
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : photoFor(horse) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoFor(horse) || ''} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-foreground/40">{initial}</span>
            )}
            <span className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25z" /></svg>
            </span>
          </button>
        );
      }
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
      case 'owner':
        return <EditableCell {...ecProps} horseId={horse.id} field="owner" value={horse.owner} />;
      case 'last_vet': {
        const lastVisit = (horse.vet_visits || []).sort((a, b) => b.date.localeCompare(a.date))[0];
        return lastVisit
          ? <button onClick={e => { e.stopPropagation(); router.push(`/feather/equine/${horse.id}`); }} className="text-xs text-primary hover:underline whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>{lastVisit.date}</button>
          : <button onClick={e => { e.stopPropagation(); router.push(`/feather/equine/${horse.id}`); }} className="text-xs text-foreground/20 hover:text-primary" style={{ fontFamily: 'var(--font-body)' }}>+ Add</button>;
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
    <div className="p-4 sm:p-6 lg:p-10">
      <input ref={fileInputRef} type="file" accept="*/*" onChange={handleDocUpload} className="hidden" />
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Horses</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {horses.length} horses &middot;{' '}
            {view === 'grid'
              ? 'Click a tile to open'
              : 'Click a row to open · Click any cell to edit'}
          </p>
          {!dbAvailable && (
            <p className="text-xs text-amber-600 mt-1" style={{ fontFamily: 'var(--font-body)' }}>
              Database table not found — showing sample data. Run the setup migration to persist.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
        {/* Bling mode — sends every horse photo through Gemini's
            nano-banana image-editing model with a "bling and
            sunglasses" prompt. Toggle persists in localStorage; the
            generated images are cached server-side. */}
        <button
          type="button"
          onClick={() => setBlingMode((v) => !v)}
          aria-pressed={blingMode}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            blingMode
              ? 'bg-amber-400 text-foreground border-amber-500 shadow-sm hover:bg-amber-300'
              : 'bg-white text-foreground/55 border-black/10 hover:text-foreground hover:border-black/20'
          }`}
          style={{ fontFamily: 'var(--font-body)' }}
          title={blingMode ? 'Bling mode is ON — click to revert to original photos' : 'Show every horse with bling + sunglasses (AI-generated)'}
        >
          <span aria-hidden="true">{blingMode ? '✨' : '😎'}</span>
          {blingMode ? 'Bling: On' : 'Bling mode'}
        </button>

        {/* View toggle — segmented control. Grid is default; list
            preserves the existing power-editing table. */}
        <div
          role="group"
          aria-label="View"
          className="inline-flex items-center rounded-full border border-black/10 bg-white p-0.5 shadow-sm"
        >
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-pressed={view === 'grid'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              view === 'grid'
                ? 'bg-foreground text-white'
                : 'text-foreground/55 hover:text-foreground'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Grid
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              view === 'list'
                ? 'bg-foreground text-white'
                : 'text-foreground/55 hover:text-foreground'
            }`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            List
          </button>
        </div>
        </div>
      </div>
      {/* Bling errors stay in the console — UI shows the original
          photo when a bling URL isn't available, no banner. */}

      {view === 'grid' ? (
        // Grid view — photo-dominant tiles, optimized for "skim the
        // herd" rather than power editing. Each tile shows the
        // headline triplet (Rideable, Shoes, Behavior), with the
        // body-condition score floating top-right when present.
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {sortedHorses.map((horse) => {
            const initial = (horse.name || '?').charAt(0).toUpperCase();
            const lastVisit = (horse.vet_visits || []).slice().sort((a, b) => b.date.localeCompare(a.date))[0];
            return (
              <button
                key={horse.id}
                type="button"
                onClick={() => router.push(`/feather/equine/${horse.id}`)}
                className="group relative text-left bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="relative aspect-[4/5] bg-warm-bg">
                  {photoFor(horse) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoFor(horse) || ''}
                      alt={horse.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-foreground/25 text-5xl font-bold">
                      {initial}
                    </div>
                  )}
                  {/* Body-condition score chip (top-right) — same color
                      mapping as the table cell so the visual language
                      stays consistent across views. */}
                  {horse.body_score != null && (
                    <span
                      className={`absolute top-2.5 right-2.5 inline-flex items-center justify-center min-w-[1.6rem] px-1.5 py-0.5 rounded-full bg-white/90 text-[11px] tabular-nums shadow-sm ${bodyScoreColor(horse.body_score)}`}
                      title={`Body condition ${horse.body_score}`}
                    >
                      {horse.body_score}
                    </span>
                  )}
                  {blingMode && blingUrls[horse.id] && (
                    <span
                      className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400/95 text-foreground text-[10px] font-bold px-2 py-0.5 shadow-sm tracking-[0.08em] uppercase"
                      title="Generated by Gemini nano-banana"
                    >
                      <span aria-hidden="true">✨</span>
                      Bling
                    </span>
                  )}
                  {/* No per-tile preheat indicator — generation runs
                      silently in the background. Original photo
                      shows until the bling URL lands; the toggle
                      just selects between original and cached. */}
                  {/* Bottom scrim → name + age. */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, rgba(20,10,6,0) 0%, rgba(20,10,6,0.85) 100%)' }}
                  />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-white text-[15px] font-bold leading-tight">{horse.name}</p>
                    <p className="text-white/70 text-[11px] mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
                      {horse.age != null ? `${horse.age} yrs` : 'Age unknown'}
                      {horse.weight && <> · {horse.weight}</>}
                    </p>
                  </div>
                </div>
                <div className="px-3 py-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    {horse.rideable && (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${rideableColor(horse.rideable)}`}>
                        {horse.rideable === 'Yes' ? 'Rideable' : horse.rideable === 'No' ? 'Not rideable' : horse.rideable}
                      </span>
                    )}
                    {horse.shoe_schedule && (
                      <span
                        className="text-[10px] font-medium text-foreground/55 tabular-nums"
                        style={{ fontFamily: 'var(--font-body)' }}
                      >
                        Shoes · {horse.shoe_schedule}
                      </span>
                    )}
                  </div>
                  {horse.works_in && (
                    <p
                      className="text-[11px] text-foreground/45 leading-snug line-clamp-1"
                      style={{ fontFamily: 'var(--font-body)' }}
                      title={horse.works_in}
                    >
                      {horse.works_in}
                    </p>
                  )}
                  {lastVisit?.date && (
                    <p
                      className="text-[10px] text-foreground/40 tabular-nums"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Last vet · {lastVisit.date}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
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
                    onClick={() => toggleSort(col.key)}
                    className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-foreground ${sortKey === col.key ? 'text-foreground' : 'text-foreground/40'} ${col.hidden || ''} ${dragOverColIdx === idx ? 'bg-primary/10' : ''} ${dragColIdx === idx ? 'opacity-40' : ''}`}
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortKey === col.key && (
                        <svg className={`w-3 h-3 transition-transform ${sortDir === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {sortedHorses.map(horse => {
                return (
                  <React.Fragment key={horse.id}>
                    <tr
                      onClick={() => router.push(`/feather/equine/${horse.id}`)}
                      className="border-b border-gray-50 hover:bg-warm-bg/20 transition-colors cursor-pointer"
                    >
                      {columns.map(col => (
                        <td key={col.key} className={`px-4 py-3 text-sm text-foreground/60 whitespace-nowrap ${col.hidden || ''} ${col.key === 'works_in' ? 'max-w-[160px] truncate' : ''}`} style={{ fontFamily: 'var(--font-body)' }}>
                          {renderCell(horse, col)}
                        </td>
                      ))}
                      <td className="px-3 py-3">
                        <svg className="w-4 h-4 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {cropTarget && (
        <ImageCropModal
          file={cropTarget.file}
          title="Crop horse photo"
          onSave={saveCroppedImage}
          onCancel={() => setCropTarget(null)}
        />
      )}
    </div>
  );
}
