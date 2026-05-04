'use client';

interface Props {
  values: number[];
  width?: number;
  height?: number;
  strokeClassName?: string;
  fillClassName?: string;
}

// Inline SVG sparkline — no dependencies. Renders a smooth polyline with a
// soft filled area underneath, auto-scaled to min/max of the series.
export function Sparkline({
  values,
  width = 120,
  height = 32,
  strokeClassName = 'stroke-primary',
  fillClassName = 'fill-primary/10',
}: Props) {
  if (!values.length) {
    return <div style={{ width, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const linePath = pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      className="block"
    >
      <path d={areaPath} className={fillClassName} />
      <path d={linePath} fill="none" strokeWidth={1.5} className={strokeClassName} />
    </svg>
  );
}
