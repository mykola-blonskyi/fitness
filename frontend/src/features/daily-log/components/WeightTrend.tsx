import { WEIGHT_TREND_WINDOWS } from '@shared/constants/daily-log';
import Link from 'next/link';

interface WeightTrendProps {
  locale: string;
  windowDays: number;
}

export const WeightTrend = ({ locale, windowDays }: WeightTrendProps) => {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-medium">Weight trend</h2>
      <div className="flex gap-1">
        {WEIGHT_TREND_WINDOWS.map((window) => (
          <Link
            key={window}
            href={`/${locale}/diary?days=${window}`}
            className={
              window === windowDays
                ? 'bg-foreground text-background rounded px-3 py-1 text-sm'
                : 'rounded border border-zinc-300 px-3 py-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:border-zinc-700 dark:hover:text-zinc-100'
            }
          >
            {window}d
          </Link>
        ))}
      </div>
    </div>
  );
};
