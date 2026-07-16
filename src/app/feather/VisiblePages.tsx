'use client';

// Tiny bridge context: PlatformShell already computes the exact set of
// pages the current viewer can see (permission gates, alumni rules,
// admin overrides). Surfaces inside the shell (the Home-page search)
// consume that finished list here instead of re-deriving the rules.

import { createContext, useContext } from 'react';
import type { PageConfig } from '@/lib/PagePermissions';

export const VisiblePagesContext = createContext<PageConfig[]>([]);

export function useVisiblePages(): PageConfig[] {
  return useContext(VisiblePagesContext);
}
