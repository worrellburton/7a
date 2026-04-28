'use client';

export function MobileRangePresets({
  rangeStart,
  rangeEnd,
  min,
  max,
  onChange,
}: {
  rangeStart: Date;
  rangeEnd: Date;
  min: Date | null;
  max: Date | null;
  onChange: (start: Date, end: Date) => void;
}) {
  const dayMs = 24 * 60 * 60 * 1000;
  const phoenixDay = (offsetDays: number) => {
    const nowAz = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
    const [yy, mo, dd] = nowAz.split('-').map(Number);
    const startMs = Date.UTC(yy, mo - 1, dd + offsetDays, 7, 0, 0, 0);
    return [new Date(startMs), new Date(startMs + dayMs - 1)] as const;
  };

  const azDate = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/Phoenix' });
  const todayStr = azDate(new Date());
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return azDate(d); })();
  const startStr = azDate(rangeStart);
  const endStr = azDate(rangeEnd);
  const isToday = startStr === todayStr && endStr === todayStr;
  const isYesterday = startStr === yesterdayStr && endStr === yesterdayStr;
  const spanDays = Math.max(1, Math.round((rangeEnd.getTime() - rangeStart.getTime()) / dayMs));
  const isAllTime = !!min && !!max && Math.abs(rangeStart.getTime() - min.getTime()) < dayMs && Math.abs(rangeEnd.getTime() - max.getTime()) < dayMs;
  const presetActive = !isAllTime && !isToday && !isYesterday;

  const setPreset = (days: number) => {
    if (!max) {
      const [, todayEnd] = phoenixDay(0);
      const newEnd = todayEnd;
      const newStart = new Date(newEnd.getTime() - (days - 1) * dayMs - (dayMs - 1));
      onChange(newStart, newEnd);
      return;
    }
    const [, todayEnd] = phoenixDay(0);
    const newEnd = new Date(Math.min(max.getTime(), todayEnd.getTime()));
    const clampedStart = new Date(Math.max((min ?? newEnd).getTime(), newEnd.getTime() - (days - 1) * dayMs - (dayMs - 1)));
    onChange(clampedStart, newEnd);
  };
  const setToday = () => {
    const [s, e] = phoenixDay(0);
    onChange(
      min ? new Date(Math.max(min.getTime(), s.getTime())) : s,
      max ? new Date(Math.min(max.getTime(), e.getTime())) : e,
    );
  };
  const setYesterday = () => {
    const [s, e] = phoenixDay(-1);
    onChange(
      min ? new Date(Math.max(min.getTime(), s.getTime())) : s,
      max ? new Date(Math.min(max.getTime(), e.getTime())) : e,
    );
  };
  const setAll = () => {
    if (!min || !max) return;
    const s = new Date(min); s.setHours(0, 0, 0, 0);
    const e = new Date(max); e.setHours(23, 59, 59, 999);
    onChange(s, e);
  };

  const items: { key: string; label: string; active: boolean; onClick: () => void; disabled?: boolean }[] = [
    { key: 'today', label: 'Today', active: isToday, onClick: setToday },
    { key: 'yesterday', label: 'Yest.', active: isYesterday, onClick: setYesterday },
    { key: '7D', label: '7D', active: presetActive && spanDays === 7, onClick: () => setPreset(7) },
    { key: '14D', label: '14D', active: presetActive && spanDays === 14, onClick: () => setPreset(14) },
    { key: '30D', label: '30D', active: presetActive && spanDays === 30, onClick: () => setPreset(30) },
    { key: '90D', label: '90D', active: presetActive && spanDays === 90, onClick: () => setPreset(90) },
    { key: 'all', label: 'All', active: isAllTime, onClick: setAll, disabled: !min || !max },
  ];

  return (
    <div className="flex items-center gap-1 bg-warm-bg rounded-xl p-1 overflow-x-auto no-scrollbar">
      {items.map(it => (
        <button
          key={it.key}
          onClick={it.onClick}
          disabled={it.disabled}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${it.active ? 'bg-white shadow-sm text-foreground' : 'text-foreground/40 hover:text-foreground/60'} ${it.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
