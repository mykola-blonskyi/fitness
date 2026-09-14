export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded bg-track motion-safe:animate-pulse ${className}`}
    />
  );
}
