import type { ReactNode } from 'react';

// Progress ring; `value` is 0..1 (clamped). Colors come from the theme via
// currentColor, so wrap it in a text-* class.
export function Ring({
  value,
  size = 140,
  stroke = 12,
  children,
  trackClassName = 'text-track',
  className = '',
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  trackClassName?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className={`relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * clamped} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-tight">
        {children}
      </div>
    </div>
  );
}
