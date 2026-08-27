interface CaloriesInfoProps {
  calories: number;
  weight: number;
  date: string;
}

export const CaloriesInfo = ({ calories, weight, date }: CaloriesInfoProps) => {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-4xl font-semibold">
        {Math.round(calories)}{' '}
        <span className="text-lg font-normal text-zinc-500">kcal / day</span>
      </p>
      <p className="text-sm text-zinc-500">
        Based on your {weight}kg weigh-in on {date}
      </p>
    </div>
  );
};
