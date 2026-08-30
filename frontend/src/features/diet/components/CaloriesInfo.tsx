import type { WeightUnit } from '@shared/types/user';

interface CaloriesInfoProps {
  calories: number;
  weight: number;
  unit: WeightUnit;
  date: string;
}

export const CaloriesInfo = ({
  calories,
  weight,
  unit,
  date,
}: CaloriesInfoProps) => {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-4xl font-semibold">
        {Math.round(calories)}{' '}
        <span className="text-lg font-normal text-zinc-500">kcal / day</span>
      </p>
      <p className="text-sm text-zinc-500">
        Based on your {weight}
        {unit} weigh-in on {date}
      </p>
    </div>
  );
};
