'use client';

import React from 'react';

// Canonical card-style toggle with a label, description, and a
// pill switch on the left. Promoted out of the email-campaigns
// builder (where it lived since the toggle row was introduced)
// into a shared primitive so new toggle rows pick up the same
// styling without copy-paste drift.
//
// Visual: the whole row is a button; clicking anywhere on the
// card flips the value. When `on` is true the card border + bg
// switch to the primary tint so the active state reads at a
// glance. The switch handle slides 16px right with a transition.
//
// Defaults are tuned for the Phase-1 mobile tap-target rule
// (min-height 44px is enforced via globals.css on every <button>
// inside [data-platform-main]).

export interface ToggleProps {
  /** Title rendered above the description. */
  label: React.ReactNode;
  /** Secondary line explaining what the toggle does. */
  description?: React.ReactNode;
  /** Current value. */
  on: boolean;
  /** Called with the new value when the user taps the row. */
  onChange: (next: boolean) => void;
  /** Optional extra className appended after the built-in styles. */
  className?: string;
  /** Disable the toggle (still shows current state, no interaction). */
  disabled?: boolean;
}

export function Toggle({ label, description, on, onChange, className, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed ${
        on ? 'border-primary bg-primary/5' : 'border-black/10 bg-white hover:bg-warm-bg/40'
      } ${className ?? ''}`}
    >
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          on ? 'bg-primary' : 'bg-foreground/20'
        }`}
        aria-hidden
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="flex-1 min-w-0">
        <span
          className="block text-[12.5px] font-semibold text-foreground"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {label}
        </span>
        {description ? (
          <span
            className="block text-[11px] text-foreground/55 mt-0.5"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {description}
          </span>
        ) : null}
      </span>
    </button>
  );
}
