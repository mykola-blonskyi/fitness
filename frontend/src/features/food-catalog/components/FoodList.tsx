import Image from 'next/image';
import type { FoodItem } from '@features/food-catalog/actions';

interface FoodListProps {
  items: FoodItem[];
}

export const FoodList = ({ items }: FoodListProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <th className="py-2 pr-4">
              <span className="sr-only">Image</span>
            </th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">kcal/100g</th>
            <th className="py-2 pr-4">Protein</th>
            <th className="py-2 pr-4">Carbs</th>
            <th className="py-2 pr-4">Fat</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-zinc-100 dark:border-zinc-900"
            >
              <td className="py-2 pr-4">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 rounded-md object-cover"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="size-10 rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                  />
                )}
              </td>
              <td className="py-2 pr-4">{item.name}</td>
              <td className="py-2 pr-4">{Math.round(item.caloriesPer100g)}</td>
              <td className="py-2 pr-4">{item.proteinPer100g.toFixed(1)}g</td>
              <td className="py-2 pr-4">{item.carbsPer100g.toFixed(1)}g</td>
              <td className="py-2 pr-4">{item.fatPer100g.toFixed(1)}g</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 && (
        <p className="py-6 text-sm text-zinc-500">
          No food items match this filter.
        </p>
      )}
    </div>
  );
};
