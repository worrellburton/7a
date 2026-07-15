// Shared "glass + glow" search-field styling so every search bar in
// the admissions surfaces (the Contacts list search and the New-log
// name search) reads as the exact same control: a frosted translucent
// pill with a soft sienna glow that intensifies on focus.
//
// Kept as class-name constants rather than a component because the two
// call sites wrap different behaviour (filter-in-place vs. autocomplete
// combobox) around an identical-looking input.

// The glow is a brand-sienna (#a0522d = rgb(160,82,45)) box-shadow,
// always faintly on, blooming on focus. `primary` is the theme's
// sienna, so the focus ring/border stay on-brand too.
export const GLASS_SEARCH_INPUT =
  'w-full rounded-2xl text-[14px] text-foreground placeholder:text-foreground/40 ' +
  'bg-white/55 supports-[backdrop-filter]:bg-white/45 supports-[backdrop-filter]:backdrop-blur-xl ' +
  'border border-white/70 ' +
  'shadow-[0_2px_10px_-2px_rgba(160,82,45,0.16),0_0_18px_-6px_rgba(160,82,45,0.30)] ' +
  'focus:outline-none focus:border-primary/50 ' +
  'focus:shadow-[0_0_0_4px_rgba(160,82,45,0.12),0_0_28px_-2px_rgba(160,82,45,0.55)] ' +
  'transition-[box-shadow,border-color] duration-300';

// Wrapper that positions the leading icon + optional trailing control.
export const GLASS_SEARCH_WRAP = 'group relative';
