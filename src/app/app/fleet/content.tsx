'use client';

import { useAuth } from '@/lib/AuthProvider';
import { useState } from 'react';

export default function FleetContent() {
  const { user, session } = useAuth();
  const [loading] = useState(true);

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Fleet</h1>
        <p className="text-sm text-foreground/50" style={{ fontFamily: 'var(--font-body)' }}>
          0 vehicles
        </p>
      </div>
    </div>
  );
}
