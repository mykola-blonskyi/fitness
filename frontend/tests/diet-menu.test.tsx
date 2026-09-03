import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  useParams: () => ({ locale: 'en' }),
}));

const swapDietItem = vi.fn();
const generateDiet = vi.fn();
const listSwapCandidates = vi.fn();
vi.mock('@features/diet/actions', () => ({
  swapDietItem: (...args: unknown[]) => swapDietItem(...args),
  generateDiet: (...args: unknown[]) => generateDiet(...args),
  listSwapCandidates: (...args: unknown[]) => listSwapCandidates(...args),
}));

import { DietMenu } from '@features/diet/components/DietMenu';
import type { DietResponse } from '@features/diet/actions';

function item(overrides: Partial<DietResponse['items'][number]>) {
  return {
    id: 'item-1',
    mealType: 'breakfast',
    mealOccurrence: 1,
    orderIndex: 0,
    weightGrams: 150,
    foodItem: {
      id: 'food-1',
      name: 'Oats',
      imageUrl: null,
      role: 'complex_carb',
    },
    calories: 200,
    proteinG: 8,
    carbsG: 30,
    fatG: 4,
    ...overrides,
  };
}

const diet: DietResponse = {
  id: 'diet-1',
  createdAt: '2026-08-30T00:00:00.000Z',
  totalCalories: 1800,
  totalProtein: 120,
  totalCarbs: 180,
  totalFat: 60,
  algorithm: { code: 'mifflin_v1', name: 'Mifflin' },
  items: [
    item({
      id: 'b1',
      mealType: 'breakfast',
      foodItem: {
        id: 'f1',
        name: 'Oats',
        imageUrl: null,
        role: 'complex_carb',
      },
    }),
    item({
      id: 'd1',
      mealType: 'dinner',
      foodItem: {
        id: 'f2',
        name: 'Salmon',
        imageUrl: null,
        role: 'fatty_protein',
      },
    }),
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  listSwapCandidates.mockResolvedValue([
    {
      id: 'f9',
      name: 'Cod',
      caloriesPer100g: 105,
      proteinPer100g: 23,
      carbsPer100g: 0,
      fatPer100g: 1,
      category: 'fish',
      subcategory: 'white',
      role: 'fatty_protein',
      isVerified: true,
      imageUrl: null,
    },
  ]);
});

describe('DietMenu', () => {
  it('renders day totals and groups items by meal in enum order', () => {
    render(<DietMenu diet={diet} />);

    expect(screen.getByText('1800')).toBeInTheDocument();
    expect(
      screen.getByText(/120g protein · 180g carbs · 60g fat/),
    ).toBeInTheDocument();

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Breakfast', 'Dinner']);
    expect(screen.getByText('Oats')).toBeInTheDocument();
    expect(screen.getByText('Salmon')).toBeInTheDocument();
  });

  it('renders a repeated meal type as a separate, numbered section', () => {
    const dietWithRepeat: DietResponse = {
      ...diet,
      items: [
        ...diet.items,
        item({
          id: 'b2',
          mealType: 'breakfast',
          mealOccurrence: 2,
          foodItem: { id: 'f3', name: 'Yogurt', imageUrl: null, role: 'dairy' },
        }),
      ],
    };
    render(<DietMenu diet={dietWithRepeat} />);

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Breakfast', 'Breakfast 2', 'Dinner']);
    expect(screen.getByText('Yogurt')).toBeInTheDocument();
  });

  it('reroll calls swapDietItem with only the diet and item id', async () => {
    const user = userEvent.setup();
    swapDietItem.mockResolvedValue({ ok: true, diet });
    render(<DietMenu diet={diet} />);

    const breakfastRow = screen.getByText('Oats').closest('li') as HTMLElement;
    await user.click(
      within(breakfastRow).getByRole('button', { name: /reroll/i }),
    );

    expect(swapDietItem).toHaveBeenCalledWith('diet-1', 'b1');
    expect(refresh).toHaveBeenCalled();
  });

  it('picking a candidate in the swap picker calls swapDietItem with the food id', async () => {
    const user = userEvent.setup();
    swapDietItem.mockResolvedValue({ ok: true, diet });
    render(<DietMenu diet={diet} />);

    const dinnerRow = screen.getByText('Salmon').closest('li') as HTMLElement;
    await user.click(
      within(dinnerRow).getByRole('button', { name: /^swap$/i }),
    );

    const candidate = await screen.findByRole('button', { name: /cod/i });
    await user.click(candidate);

    expect(swapDietItem).toHaveBeenCalledWith('diet-1', 'd1', 'f9');
  });

  it('regenerate confirms before calling generateDiet', async () => {
    const user = userEvent.setup();
    generateDiet.mockResolvedValue({ ok: true, diet });
    render(<DietMenu diet={diet} />);

    await user.click(screen.getByRole('button', { name: /^regenerate$/i }));
    expect(generateDiet).not.toHaveBeenCalled();
    expect(screen.getByText(/discards any swaps/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /regenerate menu/i }));
    expect(generateDiet).toHaveBeenCalled();
  });
});
