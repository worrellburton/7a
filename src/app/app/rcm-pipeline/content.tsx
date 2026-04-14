'use client';

import { useAuth } from '@/lib/AuthProvider';
import { db } from '@/lib/db';
import React, { useEffect, useState, useRef, useCallback } from 'react';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  payer_name: string;
  member_id: string;
}

interface Claim {
  id: string;
  patient_id: string;
  status: string;
  claim_type: string;
  admission_date: string;
  discharge_date: string;
  diagnosis_codes: string[];
  procedure_code: string;
  charge_amount: number;
  units: number;
  authorization_number: string;
  stedi_claim_id: string;
  submitted_at: string;
  created_at: string;
}

const stages = [
  { key: 'Draft', label: 'Draft', color: 'bg-gray-100 text-gray-600', accent: 'border-gray-300' },
  { key: 'Submitted', label: 'Submitted', color: 'bg-blue-50 text-blue-700', accent: 'border-blue-400' },
  { key: 'In Review', label: 'In Review', color: 'bg-amber-50 text-amber-700', accent: 'border-amber-400' },
  { key: 'Accepted', label: 'Accepted', color: 'bg-emerald-50 text-emerald-700', accent: 'border-emerald-400' },
  { key: 'Denied', label: 'Denied', color: 'bg-red-50 text-red-600', accent: 'border-red-400' },
  { key: 'Paid', label: 'Paid', color: 'bg-purple-50 text-purple-700', accent: 'border-purple-400' },
];

export default function RCMPipelineContent() {
  const { user, session } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragClaim, setDragClaim] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) return;
    async function load() {
      const [pData, cData] = await Promise.all([
        db({ action: 'select', table: 'billing_patients', select: 'id, first_name, last_name, payer_name, member_id' }),
        db({ action: 'select', table: 'billing_claims', order: { column: 'created_at', ascending: false } }),
      ]);
      if (Array.isArray(pData)) setPatients(pData);
      if (Array.isArray(cData)) setClaims(cData);
      setLoading(false);
    }
    load();
  }, [session]);

  const getPatient = (id: string) => patients.find(p => p.id === id);

  const moveClaimToStage = useCallback(async (claimId: string, newStatus: string) => {
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: newStatus } : c));
    await db({ action: 'update', table: 'billing_claims', data: { status: newStatus }, match: { id: claimId } });
  }, []);

  const handleDragStart = (e: React.DragEvent, claimId: string) => {
    e.dataTransfer.setData('text/plain', claimId);
    e.dataTransfer.effectAllowed = 'move';
    setDragClaim(claimId);
  };

  const handleDragEnd = () => {
    setDragClaim(null);
    setDragOver(null);
  };

  const handleDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(stageKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the column, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  };

  const handleDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const claimId = e.dataTransfer.getData('text/plain');
    if (claimId) moveClaimToStage(claimId, stageKey);
    setDragOver(null);
    setDragClaim(null);
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-10 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCharges = claims.reduce((sum, c) => sum + (c.charge_amount || 0), 0);
  const paidClaims = claims.filter(c => c.status === 'Paid');
  const paidAmount = paidClaims.reduce((sum, c) => sum + (c.charge_amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-10 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight mb-1">RCM Pipeline</h1>
          <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
            Revenue cycle management &middot; Drag claims between stages
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-foreground/30 uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Total Pipeline</p>
            <p className="text-lg font-bold text-foreground">${totalCharges.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/30 uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Collected</p>
            <p className="text-lg font-bold text-emerald-600">${paidAmount.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-foreground/30 uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-body)' }}>Claims</p>
            <p className="text-lg font-bold text-foreground">{claims.length}</p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-3 overflow-x-auto pb-4">
        {stages.map(stage => {
          const stageClaims = claims.filter(c => c.status === stage.key);
          const stageTotal = stageClaims.reduce((sum, c) => sum + (c.charge_amount || 0), 0);
          const isOver = dragOver === stage.key;

          return (
            <div
              key={stage.key}
              className={`flex-shrink-0 w-64 flex flex-col rounded-2xl border-t-[3px] ${stage.accent} bg-warm-bg/30 transition-colors ${isOver ? 'bg-primary/5 ring-2 ring-primary/20' : ''}`}
              onDragOver={e => handleDragOver(e, stage.key)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, stage.key)}
            >
              {/* Column Header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${stage.color}`}>{stage.label}</span>
                  <span className="text-xs text-foreground/30 font-medium">{stageClaims.length}</span>
                </div>
                <span className="text-xs font-bold text-foreground/40" style={{ fontFamily: 'var(--font-body)' }}>${stageTotal.toLocaleString()}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 min-h-[200px]">
                {stageClaims.length === 0 && (
                  <div className={`rounded-xl border-2 border-dashed ${isOver ? 'border-primary/30 bg-primary/5' : 'border-gray-200/50'} p-4 text-center transition-colors`}>
                    <p className="text-xs text-foreground/20" style={{ fontFamily: 'var(--font-body)' }}>Drop claim here</p>
                  </div>
                )}
                {stageClaims.map(c => {
                  const patient = getPatient(c.patient_id);
                  const isDragging = dragClaim === c.id;
                  return (
                    <div
                      key={c.id}
                      draggable
                      onDragStart={e => handleDragStart(e, c.id)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white rounded-xl px-3.5 py-3 border border-gray-100 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:-translate-y-0.5 ${isDragging ? 'opacity-40 scale-95' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-sm font-bold text-foreground leading-tight">
                          {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'}
                        </p>
                        <span className="text-sm font-bold text-foreground ml-2 whitespace-nowrap">${c.charge_amount?.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-foreground/40 mb-1.5" style={{ fontFamily: 'var(--font-body)' }}>
                        {patient?.payer_name || 'Unknown Payer'}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {(c.diagnosis_codes || []).slice(0, 2).map((code, i) => (
                          <span key={i} className="inline-block px-1.5 py-0.5 bg-primary/8 text-primary rounded text-[10px] font-mono font-medium">{code}</span>
                        ))}
                        {(c.diagnosis_codes || []).length > 2 && (
                          <span className="text-[10px] text-foreground/30">+{c.diagnosis_codes.length - 2}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-foreground/30" style={{ fontFamily: 'var(--font-body)' }}>
                        <span>{c.procedure_code} &middot; {c.units}d</span>
                        <span>{c.admission_date}</span>
                      </div>
                      {c.authorization_number && (
                        <p className="text-[10px] text-foreground/20 mt-1 font-mono" style={{ fontFamily: 'var(--font-body)' }}>Auth: {c.authorization_number}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
