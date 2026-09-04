import type { ReactNode } from 'react';

// Standard page frame inside AppShell. `narrow` centres a reading column
// (Diary, Training); the default spans the content area (Home, Diet, Food).
export function Page({
  children,
  narrow,
  className = '',
}: {
  children: ReactNode;
  narrow?: boolean;
  className?: string;
}) {
  return (
    <main
      className={`flex w-full flex-1 flex-col gap-5 px-4 py-5 pb-10 md:px-7 md:py-6 ${
        narrow ? 'mx-auto max-w-3xl' : ''
      } ${className}`}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold md:text-[26px]">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  aside,
  children,
  className = '',
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card flex flex-col gap-3 p-4 md:p-5 ${className}`}>
      {(title || aside) && (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {aside && <div className="text-xs text-muted">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  unit,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <span className="kicker">{label}</span>
      <span className="font-display text-[22px] font-extrabold tabular-nums tracking-tight">
        {value}
        {unit && (
          <small className="ml-1 text-[11px] font-medium text-muted">
            {unit}
          </small>
        )}
      </span>
    </div>
  );
}
