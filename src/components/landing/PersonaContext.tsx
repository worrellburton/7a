'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Persona routing for the landing page.
 *
 * ~50% of visitors researching residential addiction treatment are
 * loved ones, not the person using. They bounce off a page pitched
 * entirely to "you" because it does not match what they're here for.
 *
 * This provider lets a single splitter component record whether the
 * visitor is here "for themselves" or "for a loved one" (or skipped
 * the question), persists that in localStorage so return visits
 * don't re-ask, and lets any other landing component branch its
 * copy / stats / CTAs off of that choice.
 *
 * Analytics hook: we fire a `persona_selected` CustomEvent so GTM /
 * GA can pick up the branch without a hard dependency on either.
 */

export type Persona = 'self' | 'loved_one' | null;

interface PersonaContextShape {
  persona: Persona;
  setPersona: (p: Persona) => void;
  clearPersona: () => void;
  /** true after the initial localStorage read so gated UI avoids flash. */
  ready: boolean;
}

const PersonaCtx = createContext<PersonaContextShape>({
  persona: null,
  setPersona: () => {},
  clearPersona: () => {},
  ready: false,
});

const STORAGE_KEY = 'seven-arrows-persona';

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === 'self' || raw === 'loved_one') setPersonaState(raw);
    } catch {
      // localStorage blocked (private mode, sandboxed iframe) — fall
      // back to in-memory only. The rest of the app still works.
    }
    setReady(true);
  }, []);

  const setPersona = useCallback((p: Persona) => {
    setPersonaState(p);
    try {
      if (p == null) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // see note above
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('persona_selected', { detail: { persona: p } }),
      );
    }
  }, []);

  const clearPersona = useCallback(() => setPersona(null), [setPersona]);

  return (
    <PersonaCtx.Provider value={{ persona, setPersona, clearPersona, ready }}>
      {children}
    </PersonaCtx.Provider>
  );
}

export function usePersona(): PersonaContextShape {
  return useContext(PersonaCtx);
}
