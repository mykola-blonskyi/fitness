import Image from 'next/image';
import { CreateFoodItemForm } from '@features/food-catalog';
import type { FoodItem, FoodTaxonomy } from '@features/food-catalog/actions';
import { apiFetch } from '@libs/api-client';

// Filtering is a plain GET <form> below - no client JS needed. Native
// form submission re-navigates to ?category=&search=, which re-runs this
// Server Component with the new searchParams (see AGENTS.md: searchParams
// is a promise in this Next.js version, must be awaited).
export default async function FoodCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; search?: string }>;
}) {
  const { locale } = await params;
  const { category, search } = await searchParams;

  const query = new URLSearchParams({ locale });
  if (category) query.set('category', category);
  if (search) query.set('search', search);

  const [items, taxonomy] = await Promise.all([
    apiFetch<FoodItem[]>(`/food-items?${query.toString()}`),
    apiFetch<FoodTaxonomy>('/food-items/taxonomy'),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Food Catalog</h1>

      <form className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={category ?? ''}
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">All categories</option>
            {taxonomy.categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="search" className="text-sm font-medium">
            Search
          </label>
          <input
            id="search"
            name="search"
            type="search"
            defaultValue={search ?? ''}
            placeholder="Food name…"
            className="rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          className="bg-foreground text-background rounded px-4 py-2"
        >
          Filter
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-4">
                <span className="sr-only">Image</span>
              </th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Category</th>
              <th className="py-2 pr-4">Subcategory</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">kcal/100g</th>
              <th className="py-2 pr-4">Protein</th>
              <th className="py-2 pr-4">Carbs</th>
              <th className="py-2 pr-4">Fat</th>
              <th className="py-2 pr-4">Verified</th>
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
                <td className="py-2 pr-4">{item.category}</td>
                <td className="py-2 pr-4">{item.subcategory}</td>
                <td className="py-2 pr-4">{item.role}</td>
                <td className="py-2 pr-4">
                  {Math.round(item.caloriesPer100g)}
                </td>
                <td className="py-2 pr-4">{item.proteinPer100g.toFixed(1)}g</td>
                <td className="py-2 pr-4">{item.carbsPer100g.toFixed(1)}g</td>
                <td className="py-2 pr-4">{item.fatPer100g.toFixed(1)}g</td>
                <td className="py-2 pr-4">{item.isVerified ? 'Yes' : 'No'}</td>
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

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Add a custom food item</h2>
        <CreateFoodItemForm taxonomy={taxonomy} />
      </div>
    </main>
  );
}
