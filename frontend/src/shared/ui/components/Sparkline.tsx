// Minimal area sparkline; stroke/fill use currentColor.
export function Sparkline({
  values,
  className = '',
  height = 56,
}: {
  values: number[];
  className?: string;
  height?: number;
}) {
  if (values.length < 2) return null;
  const w = 400;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    height - 6 - ((v - min) / span) * (height - 12),
  ]);
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={`w-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      <path
        d={`${line} L${w} ${height} L0 ${height} Z`}
        fill="currentColor"
        opacity={0.12}
      />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
