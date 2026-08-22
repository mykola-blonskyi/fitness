import type { WeightTrendPoint } from '@features/daily-log/actions';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 200;
const PADDING = { top: 16, right: 12, bottom: 8, left: 40 };

// Days since epoch, parsed as UTC midnight - matches todayIso() elsewhere
// in this feature and the backend's own UTC-based window math, so a
// day's width on the x-axis lines up with what the backend considers
// "one day" when deciding whether two weigh-ins are consecutive.
export function dayIndex(date: string): number {
  return (
    Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
    ) / 86_400_000
  );
}

// Inverse of dayIndex() - the Diary page uses this (rather than its own
// date arithmetic) to compute the trend window's start date, so there's
// exactly one place in the frontend that defines what "one day" means.
export function dateFromDayIndex(index: number): string {
  return new Date(index * 86_400_000).toISOString().slice(0, 10);
}

// The core "honest gap" rule (FITNESS-15 acceptance criteria): two
// weigh-ins are only ever connected by a line when they're on
// consecutive calendar days. Any missing day(s) between them - one row
// with weight null, or no row at all - breaks the line instead of being
// interpolated across. Exported separately from the component so this
// rule is unit-testable without rendering SVG.
export function connectedPairs(
  points: WeightTrendPoint[],
): [WeightTrendPoint, WeightTrendPoint][] {
  const pairs: [WeightTrendPoint, WeightTrendPoint][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (dayIndex(to.date) - dayIndex(from.date) === 1) {
      pairs.push([from, to]);
    }
  }
  return pairs;
}

interface WeightTrendChartProps {
  points: WeightTrendPoint[];
  windowStart: string;
  windowEnd: string;
  windowDays: number;
}

// Honest line chart: only draws a segment between two weigh-ins that are
// on consecutive calendar days. Any gap (one or more missing days)
// between two points breaks the line rather than interpolating across
// it, per FITNESS-15's acceptance criteria and the FITNESS-3 spec's
// "Weight-trend queries" decision.
export function WeightTrendChart({
  points,
  windowStart,
  windowEnd,
  windowDays,
}: WeightTrendChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No weigh-ins in the last {windowDays} days.
      </p>
    );
  }

  const startDay = dayIndex(windowStart);
  const totalDays = dayIndex(windowEnd) - startDay + 1;
  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const x = (date: string) =>
    PADDING.left +
    (totalDays <= 1
      ? innerWidth / 2
      : ((dayIndex(date) - startDay) / (totalDays - 1)) * innerWidth);

  const weights = points.map((p) => p.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  // Headroom so points never sit flush on the top/bottom edge, and a
  // minimum span so a flat trend line isn't a divide-by-zero.
  const span = Math.max(maxWeight - minWeight, 1);
  const domainMin = minWeight - span * 0.2;
  const domainMax = maxWeight + span * 0.2;

  const y = (weight: number) =>
    PADDING.top +
    innerHeight -
    ((weight - domainMin) / (domainMax - domainMin)) * innerHeight;

  const segments = connectedPairs(points).map(([from, to]) => ({
    key: `${from.date}-${to.date}`,
    x1: x(from.date),
    y1: y(from.weight),
    x2: x(to.date),
    y2: y(to.weight),
  }));

  const latest = points[points.length - 1];
  const gridlineWeights =
    minWeight === maxWeight ? [minWeight] : [minWeight, maxWeight];

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="h-auto w-full text-blue-600 dark:text-blue-400"
      role="img"
      aria-label={`Weight trend over the last ${windowDays} days: ${points.length} weigh-in${
        points.length === 1 ? '' : 's'
      }, ranging from ${minWeight}kg to ${maxWeight}kg, most recent ${latest.weight}kg on ${latest.date}.`}
    >
      {gridlineWeights.map((weight) => (
        <g key={weight}>
          <line
            x1={PADDING.left}
            x2={CHART_WIDTH - PADDING.right}
            y1={y(weight)}
            y2={y(weight)}
            className="stroke-zinc-200 dark:stroke-zinc-800"
            strokeWidth={1}
          />
          <text
            x={PADDING.left - 6}
            y={y(weight)}
            textAnchor="end"
            dominantBaseline="middle"
            className="fill-zinc-500 text-[10px]"
          >
            {weight}
          </text>
        </g>
      ))}

      {segments.map((segment) => (
        <line
          key={segment.key}
          x1={segment.x1}
          y1={segment.y1}
          x2={segment.x2}
          y2={segment.y2}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        />
      ))}

      {points.map((point) => (
        <circle
          key={point.date}
          cx={x(point.date)}
          cy={y(point.weight)}
          r={4}
          fill="currentColor"
          stroke="var(--background)"
          strokeWidth={2}
        >
          <title>{`${point.date}: ${point.weight}kg`}</title>
        </circle>
      ))}

      <text
        x={x(latest.date)}
        y={Math.max(y(latest.weight) - 10, 10)}
        textAnchor="end"
        className="fill-zinc-900 text-xs font-medium dark:fill-zinc-100"
      >
        {latest.weight}kg
      </text>
    </svg>
  );
}
