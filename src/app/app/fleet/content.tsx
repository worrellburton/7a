'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import { useModal } from '@/lib/ModalProvider';
import { useEffect, useState } from 'react';

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Fleet</h1>
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
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id} className="border-b border-gray-50 last:border-b-0 hover:bg-warm-bg/20 transition-colors">
                    <td className="px-5 py-3 text-sm font-bold text-foreground whitespace-nowrap" style={{ fontFamily: 'var(--font-body)' }}>
                      {renderEditableCell(v, 'vehicle_name', 'font-bold text-foreground')}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={v.status}
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
                        onClick={() => deleteVehicle(v)}
                        className="p-1 rounded-lg text-foreground/20 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete vehicle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
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
