'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { uploadFile } from '@/lib/upload';
import React, { useEffect, useRef, useState } from 'react';

interface Vehicle {
  id: string;
  vehicle_name: string;
  status: string;
  purpose: string | null;
  vehicle_type: string | null;
  tags: string | null;
  tags_expire_on: string | null;
  tags_renewed: boolean | null;
  vin_code: string | null;
  next_service: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

const DOC_TYPES = ['Insurance', 'Registration & Tag', 'Scheduled Maintenance', 'Title'] as const;

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  maintenance: 'bg-amber-50 text-amber-700',
  'out of service': 'bg-red-50 text-red-600',
};

const statusLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function FleetContent() {
  const { user, session } = useAuth();
  const { confirm } = useModal();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, VehicleDocument[]>>({});
  const [docsLoading, setDocsLoading] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{ vehicleId: string; docType: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      try {
        const data = await db({ action: 'select', table: 'fleet_vehicles', order: { column: 'vehicle_name', ascending: true } });
        if (Array.isArray(data)) setVehicles(data as Vehicle[]);
      } catch { /* DB unavailable */ }
      setLoading(false);
    }
    load();
  }, [session]);

  const addVehicle = async () => {
    if (!newName.trim()) return;
    const result = await db({
      action: 'insert',
      table: 'fleet_vehicles',
      data: {
        vehicle_name: newName.trim(),
        vehicle_type: newType.trim() || null,
        status: 'active',
      },
    });
    if (result && result.id) {
      setVehicles(prev => [...prev, result as Vehicle].sort((a, b) => a.vehicle_name.localeCompare(b.vehicle_name)));
      setNewName('');
      setNewType('');
      setShowAddForm(false);
      showToast('Vehicle added');
    }
  };

  const deleteVehicle = async (v: Vehicle) => {
    const ok = await confirm(`Delete "${v.vehicle_name}"?`, {
      message: 'This vehicle and all its documents will be permanently removed.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await db({ action: 'delete', table: 'fleet_vehicles', match: { id: v.id } });
    setVehicles(prev => prev.filter(x => x.id !== v.id));
    showToast('Vehicle deleted');
  };

  const loadDocs = async (vehicleId: string) => {
    if (docs[vehicleId]) return;
    setDocsLoading(vehicleId);
    try {
      const data = await db({ action: 'select', table: 'vehicle_documents', match: { vehicle_id: vehicleId }, order: { column: 'created_at', ascending: false } });
      if (Array.isArray(data)) setDocs(prev => ({ ...prev, [vehicleId]: data as VehicleDocument[] }));
    } catch { /* ignore */ }
    setDocsLoading(null);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadDocs(id);
    }
  };

  const triggerUpload = (vehicleId: string, docType: string) => {
    uploadTargetRef.current = { vehicleId, docType };
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = uploadTargetRef.current;
    if (!target || !e.target.files?.length) return;
    const file = e.target.files[0];
    setUploading(`${target.vehicleId}-${target.docType}`);
    const { url } = await uploadFile(file);
    if (url) {
      const result = await db({
        action: 'insert',
        table: 'vehicle_documents',
        data: {
          vehicle_id: target.vehicleId,
          doc_type: target.docType,
          file_name: file.name,
          file_url: url,
          file_size: file.size,
        },
      });
      if (result && result.id) {
        setDocs(prev => ({
          ...prev,
          [target.vehicleId]: [result as VehicleDocument, ...(prev[target.vehicleId] || [])],
        }));
        showToast('Document uploaded');
      }
    }
    setUploading(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const deleteDoc = async (doc: VehicleDocument) => {
    const ok = await confirm(`Delete "${doc.file_name}"?`, {
      message: 'This document will be permanently removed.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await db({ action: 'delete', table: 'vehicle_documents', match: { id: doc.id } });
    setDocs(prev => ({
      ...prev,
      [doc.vehicle_id]: (prev[doc.vehicle_id] || []).filter(d => d.id !== doc.id),
    }));
    showToast('Document deleted');
  };

  const startEdit = (id: string, field: string, value: string) => {
    setEditingId(id);
    setEditField(field);
    setEditValue(value || '');
  };

  const saveEdit = async () => {
    if (editingId && editField) {
      setVehicles(prev => prev.map(v => v.id === editingId ? { ...v, [editField]: editValue || null } : v));
      try {
        await db({ action: 'update', table: 'fleet_vehicles', data: { [editField]: editValue || null }, match: { id: editingId } });
      } catch { /* ignore */ }
    }
    setEditingId(null);
    setEditField('');
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditField('');
    setEditValue('');
  };

  const updateStatus = async (id: string, status: string) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    try {
      await db({ action: 'update', table: 'fleet_vehicles', data: { status }, match: { id } });
    } catch { /* ignore */ }
  };

  const renderEditableCell = (v: Vehicle, field: keyof Vehicle, className = '') => {
    const value = (v[field] as string) || '';
    if (editingId === v.id && editField === field) {
      return (
        <input
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
          className="text-sm px-1.5 py-0.5 rounded border border-gray-200 focus:border-primary focus:outline-none w-full bg-white"
          style={{ fontFamily: 'var(--font-body)' }}
        />
      );
    }
    return (
      <span
        className={`cursor-text hover:text-foreground transition-colors ${className}`}
        onClick={e => { e.stopPropagation(); startEdit(v.id, field, value); }}
      >
        {value || <span className="text-foreground/20">—</span>}
      </span>
    );
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      <input ref={fileInputRef} type="file" accept="*/*" onChange={handleFileUpload} className="hidden" />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">Fleet</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}{vehicles.length > 0 ? ' \u00b7 Click any cell to edit' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-foreground/40 hover:text-foreground/60'}`}
              title="Table view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-foreground/40 hover:text-foreground/60'}`}
              title="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-white hover:bg-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {showAddForm ? 'Cancel' : '+ Add Vehicle'}
          </button>
        </div>
      </div>

      {/* Add Vehicle Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              autoFocus
              placeholder="Vehicle name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addVehicle(); if (e.key === 'Escape') setShowAddForm(false); }}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <input
              placeholder="Type (e.g. Truck, Van, SUV)"
              value={newType}
              onChange={e => setNewType(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addVehicle(); if (e.key === 'Escape') setShowAddForm(false); }}
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 focus:border-primary focus:outline-none"
              style={{ fontFamily: 'var(--font-body)' }}
            />
            <button
              onClick={addVehicle}
              disabled={!newName.trim()}
              className="px-5 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      {vehicles.length === 0 && !showAddForm ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-warm-bg/50 flex items-center justify-center">
            <svg className="w-8 h-8 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="11" width="16" height="7" rx="2" />
              <path d="M17 11V7a2 2 0 0 1 2-2h1l3 5v7a1 1 0 0 1-1 1h-1" />
              <circle cx="6" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </div>
          <p className="text-foreground/40 text-sm mb-3" style={{ fontFamily: 'var(--font-body)' }}>No vehicles yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary text-white hover:bg-primary-dark transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            + Add Vehicle
          </button>
        </div>
      ) : vehicles.length > 0 && viewMode === 'table' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-warm-bg/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Vehicle</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider" style={{ fontFamily: 'var(--font-body)' }}>Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>VIN</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Tags</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Tags Expire</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden xl:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Next Service</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-foreground/40 uppercase tracking-wider hidden xl:table-cell" style={{ fontFamily: 'var(--font-body)' }}>Comments</th>
                  <th className="w-10" />
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => {
                  const expanded = expandedId === v.id;
                  return (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => toggleExpand(v.id)}
                        className={`border-b border-gray-50 hover:bg-warm-bg/20 transition-colors cursor-pointer ${expanded ? 'bg-warm-bg/10' : ''}`}
                      >
                        <td className="px-5 py-3 text-sm font-bold text-foreground whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                          {renderEditableCell(v, 'vehicle_name', 'font-bold text-foreground')}
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={v.status}
                            onClick={e => e.stopPropagation()}
                            onChange={e => updateStatus(v.id, e.target.value)}
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:outline-none ${statusStyles[v.status] || 'bg-gray-100 text-gray-600'}`}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="out of service">Out of Service</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-sm text-foreground/60 hidden sm:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{renderEditableCell(v, 'vehicle_type')}</td>
                        <td className="px-5 py-3 text-sm text-foreground/60 hidden md:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{renderEditableCell(v, 'vin_code')}</td>
                        <td className="px-5 py-3 text-sm text-foreground/60 hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{renderEditableCell(v, 'tags')}</td>
                        <td className="px-5 py-3 text-sm text-foreground/60 hidden lg:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{renderEditableCell(v, 'tags_expire_on')}</td>
                        <td className="px-5 py-3 text-sm text-foreground/60 hidden xl:table-cell" style={{ fontFamily: 'var(--font-body)' }}>{renderEditableCell(v, 'next_service')}</td>
                        <td className="px-5 py-3 text-sm text-foreground/60 hidden xl:table-cell max-w-[200px]" style={{ fontFamily: 'var(--font-body)' }}>{renderEditableCell(v, 'comments')}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); deleteVehicle(v); }}
                            className="p-1 rounded-lg text-foreground/20 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete vehicle"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <svg className={`w-4 h-4 text-foreground/30 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={10} className="bg-warm-bg/20 px-5 py-4 border-b border-gray-100">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                              {([
                                ['purpose', 'Purpose', v.purpose],
                                ['vehicle_type', 'Type', v.vehicle_type],
                                ['vin_code', 'VIN', v.vin_code],
                                ['tags', 'Tags', v.tags],
                              ] as [string, string, string | null][]).map(([field, label, value]) => (
                                <div key={field}>
                                  <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
                                  {renderEditableCell(v, field as keyof Vehicle, 'text-sm text-foreground/70')}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                              {([
                                ['tags_expire_on', 'Tags Expire', v.tags_expire_on],
                                ['next_service', 'Next Service', v.next_service],
                              ] as [string, string, string | null][]).map(([field, label]) => (
                                <div key={field}>
                                  <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>{label}</p>
                                  {renderEditableCell(v, field as keyof Vehicle, 'text-sm text-foreground/70')}
                                </div>
                              ))}
                              <div>
                                <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Tags Renewed</p>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${v.tags_renewed ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {v.tags_renewed ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>
                            {/* Comments */}
                            <div>
                              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-body)' }}>Comments</p>
                              {editingId === v.id && editField === 'comments' ? (
                                <textarea
                                  autoFocus
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onBlur={saveEdit}
                                  onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                                  rows={3}
                                  className="text-sm w-full px-2 py-1.5 rounded-lg border border-gray-200 focus:border-primary focus:outline-none bg-white"
                                  style={{ fontFamily: 'var(--font-body)' }}
                                />
                              ) : (
                                <p
                                  className="text-sm text-foreground/70 cursor-text hover:text-foreground transition-colors whitespace-pre-wrap"
                                  style={{ fontFamily: 'var(--font-body)' }}
                                  onClick={e => { e.stopPropagation(); startEdit(v.id, 'comments', v.comments || ''); }}
                                >
                                  {v.comments || <span className="text-foreground/20">Click to add comments...</span>}
                                </p>
                              )}
                            </div>

                            {/* Documents by type */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-body)' }}>Documents</p>
                              {docsLoading === v.id ? (
                                <div className="flex items-center gap-2 py-2">
                                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                  <span className="text-xs text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>Loading documents...</span>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                  {DOC_TYPES.map(docType => {
                                    const typeDocs = (docs[v.id] || []).filter(d => d.doc_type === docType);
                                    const isUploading = uploading === `${v.id}-${docType}`;
                                    return (
                                      <div key={docType} className="rounded-xl border border-gray-100 p-3 bg-white">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="text-xs font-semibold text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>{docType}</p>
                                          <button
                                            onClick={e => { e.stopPropagation(); triggerUpload(v.id, docType); }}
                                            disabled={isUploading}
                                            className="p-0.5 rounded text-foreground/30 hover:text-primary hover:bg-primary/5 transition-colors disabled:opacity-40"
                                            title={`Upload ${docType}`}
                                          >
                                            {isUploading ? (
                                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="17 8 12 3 7 8" />
                                                <line x1="12" y1="3" x2="12" y2="15" />
                                              </svg>
                                            )}
                                          </button>
                                        </div>
                                        {typeDocs.length === 0 ? (
                                          <button
                                            onClick={e => { e.stopPropagation(); triggerUpload(v.id, docType); }}
                                            disabled={isUploading}
                                            className="text-xs text-foreground/20 hover:text-primary transition-colors w-full text-left"
                                            style={{ fontFamily: 'var(--font-body)' }}
                                          >
                                            + Upload file
                                          </button>
                                        ) : (
                                          <div className="space-y-1.5">
                                            {typeDocs.map(doc => (
                                              <div key={doc.id} className="flex items-center gap-2 group">
                                                <svg className="w-3.5 h-3.5 text-foreground/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                                  <path d="M14 2v6h6" />
                                                </svg>
                                                <a
                                                  href={doc.file_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-primary hover:underline truncate flex-1"
                                                  style={{ fontFamily: 'var(--font-body)' }}
                                                  onClick={e => e.stopPropagation()}
                                                >
                                                  {doc.file_name}
                                                </a>
                                                {doc.file_size && (
                                                  <span className="text-[10px] text-foreground/20 shrink-0">{(doc.file_size / 1024).toFixed(0)}KB</span>
                                                )}
                                                <button
                                                  onClick={e => { e.stopPropagation(); deleteDoc(doc); }}
                                                  className="p-0.5 rounded text-foreground/0 group-hover:text-foreground/30 hover:!text-red-500 transition-colors shrink-0"
                                                  title="Delete document"
                                                >
                                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 6L6 18M6 6l12 12" />
                                                  </svg>
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
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
      ) : vehicles.length > 0 && (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vehicles.map(v => (
            <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{v.vehicle_name}</h3>
                  {v.vehicle_type && <p className="text-xs text-foreground/40 mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>{v.vehicle_type}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[v.status] || 'bg-gray-100 text-gray-600'}`}>
                    {statusLabel(v.status)}
                  </span>
                  <button
                    onClick={() => deleteVehicle(v)}
                    className="p-1 rounded-lg text-foreground/20 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete vehicle"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="space-y-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                {v.vin_code && (
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/40">VIN</span>
                    <span className="text-foreground/60 font-mono">{v.vin_code}</span>
                  </div>
                )}
                {v.tags && (
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/40">Tags</span>
                    <span className="text-foreground/60">{v.tags}</span>
                  </div>
                )}
                {v.tags_expire_on && (
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/40">Tags Expire</span>
                    <span className="text-foreground/60">{v.tags_expire_on}</span>
                  </div>
                )}
                {v.next_service && (
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground/40">Next Service</span>
                    <span className="text-foreground/60">{v.next_service}</span>
                  </div>
                )}
                {v.comments && (
                  <p className="text-xs text-foreground/50 mt-2 line-clamp-2">{v.comments}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-foreground text-white text-sm font-medium shadow-lg animate-[fadeIn_0.2s_ease-out]" style={{ fontFamily: 'var(--font-body)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
