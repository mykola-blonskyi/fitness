interface NutritionsInfoProps {
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export const NutritionsInfo = ({
  proteinG,
  carbsG,
  fatG,
}: NutritionsInfoProps) => {
  return (
    <div className="grid grid-cols-3 gap-4 sm:max-w-md">
      <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">Protein</span>
        <span className="text-lg font-medium">{proteinG}g</span>
      </div>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">Carbs</span>
        <span className="text-lg font-medium">{carbsG}g</span>
      </div>
      <div className="flex flex-col gap-1 rounded border border-zinc-200 p-3 dark:border-zinc-800">
        <span className="text-sm text-zinc-500">Fat</span>
        <span className="text-lg font-medium">{fatG}g</span>
      </div>
    </div>
  );
};
