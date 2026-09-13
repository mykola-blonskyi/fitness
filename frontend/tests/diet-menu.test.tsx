import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderWithIntl } from './setup/render-with-intl';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  useParams: () => ({ locale: 'en' }),
}));

const swapDietItem = vi.fn();
const generateDiet = vi.fn();
const listSwapCandidates = vi.fn();
const moveDietMeal = vi.fn();
const reorderDietMeals = vi.fn();
vi.mock('@features/diet/actions', () => ({
  swapDietItem: (...args: unknown[]) => swapDietItem(...args),
  generateDiet: (...args: unknown[]) => generateDiet(...args),
  listSwapCandidates: (...args: unknown[]) => listSwapCandidates(...args),
  moveDietMeal: (...args: unknown[]) => moveDietMeal(...args),
  reorderDietMeals: (...args: unknown[]) => reorderDietMeals(...args),
}));

// jsdom implements neither pointer capture nor real layout - drag tests give
// each <section> a distinct, stable getBoundingClientRect in the order its
// ref first gets measured (which is mount/document order), so hit-testing
// by clientY behaves the same as it would against real layout.
Element.prototype.setPointerCapture = vi.fn();
Element.prototype.releasePointerCapture = vi.fn();
const sectionRectTop = new WeakMap<Element, number>();
let nextSectionRectTop = 0;
Element.prototype.getBoundingClientRect = vi.fn(function (
  this: Element,
): DOMRect {
  if (!sectionRectTop.has(this)) {
    sectionRectTop.set(this, nextSectionRectTop);
    nextSectionRectTop += 100;
  }
  const top = sectionRectTop.get(this)!;
  return {
    top,
    bottom: top + 80,
    height: 80,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  };
});

import { DietMenu } from '@features/diet/components/DietMenu';
import type { DietResponse } from '@features/diet/actions';

function item(overrides: Partial<DietResponse['items'][number]>) {
  return {
    id: 'item-1',
    mealPosition: 1,
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
    isCounted: true,
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
  mealOrder: [1, 2],
  items: [
    item({
      id: 'b1',
      mealPosition: 1,
      foodItem: {
        id: 'f1',
        name: 'Oats',
        imageUrl: null,
        role: 'complex_carb',
      },
    }),
    item({
      id: 'd1',
      mealPosition: 2,
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
  nextSectionRectTop = 0;
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
  it('renders day totals and groups items by meal position, numbered in order', () => {
    renderWithIntl(<DietMenu diet={diet} />);

    expect(screen.getByText('1800')).toBeInTheDocument();
    expect(
      screen.getByText(/120g protein · 180g carbs · 60g fat/),
    ).toBeInTheDocument();

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Meal 1', 'Meal 2']);
    expect(screen.getByText('Oats')).toBeInTheDocument();
    expect(screen.getByText('Salmon')).toBeInTheDocument();
  });

  it('does not show the free-foods note when every item is counted', () => {
    renderWithIntl(<DietMenu diet={diet} />);

    expect(
      screen.queryByText(/included in the totals/i),
    ).not.toBeInTheDocument();
  });

  it('marks a free food as not counted and omits it from the visible macro line, while explaining the rule once near the day total', () => {
    const dietWithFreeFood: DietResponse = {
      ...diet,
      items: [
        ...diet.items,
        item({
          id: 'v1',
          mealPosition: 1,
          weightGrams: 80,
          calories: 30,
          proteinG: 2,
          carbsG: 6,
          fatG: 0,
          isCounted: false,
          foodItem: {
            id: 'f4',
            name: 'Broccoli',
            imageUrl: null,
            role: 'vegetable',
          },
        }),
      ],
    };
    renderWithIntl(<DietMenu diet={dietWithFreeFood} />);

    expect(
      screen.getByText(/included in the totals above/i),
    ).toBeInTheDocument();

    const broccoliRow = screen
      .getByText('Broccoli')
      .closest('li') as HTMLElement;
    expect(within(broccoliRow).getByText('Not counted')).toBeInTheDocument();
    expect(
      within(broccoliRow).getByText('80 g · not counted'),
    ).toBeInTheDocument();
    expect(within(broccoliRow).queryByText(/30 kcal/)).not.toBeInTheDocument();
  });

  it('renders a third meal position as its own numbered section', () => {
    const dietWithThirdMeal: DietResponse = {
      ...diet,
      mealOrder: [1, 2, 3],
      items: [
        ...diet.items,
        item({
          id: 'b2',
          mealPosition: 3,
          foodItem: { id: 'f3', name: 'Yogurt', imageUrl: null, role: 'dairy' },
        }),
      ],
    };
    renderWithIntl(<DietMenu diet={dietWithThirdMeal} />);

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Meal 1', 'Meal 2', 'Meal 3']);
    expect(screen.getByText('Yogurt')).toBeInTheDocument();
  });

  it('renders sections in mealOrder while each label still names its own mealPosition', () => {
    const reordered: DietResponse = { ...diet, mealOrder: [2, 1] };
    renderWithIntl(<DietMenu diet={reordered} />);

    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent);
    expect(headings).toEqual(['Meal 2', 'Meal 1']);

    const oatsIndex = screen
      .getByText('Oats')
      .compareDocumentPosition(screen.getByText('Salmon'));
    // Salmon (Meal 2) precedes Oats (Meal 1) in the reordered layout.
    expect(oatsIndex & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('moving a meal up or down calls moveDietMeal with that meal position and direction', async () => {
    const user = userEvent.setup();
    renderWithIntl(<DietMenu diet={diet} />);

    await user.click(screen.getByRole('button', { name: 'Move Meal 1 down' }));
    expect(moveDietMeal).toHaveBeenCalledWith('diet-1', 1, 'down');

    await user.click(screen.getByRole('button', { name: 'Move Meal 2 up' }));
    expect(moveDietMeal).toHaveBeenCalledWith('diet-1', 2, 'up');
  });

  it('disables moving the first meal up and the last meal down', () => {
    renderWithIntl(<DietMenu diet={diet} />);

    expect(
      screen.getByRole('button', { name: 'Move Meal 1 up' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Meal 2 down' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Meal 1 down' }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Move Meal 2 up' }),
    ).not.toBeDisabled();
  });

  it('dragging a meal handle over another section live-reflows the list and persists the new order on release', () => {
    renderWithIntl(<DietMenu diet={diet} />);
    const handle = screen.getByTitle('Drag to reorder Meal 1');

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientY: 40,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      pointerType: 'mouse',
      clientY: 150,
    });

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent),
    ).toEqual(['Meal 2', 'Meal 1']);

    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'mouse' });

    expect(reorderDietMeals).toHaveBeenCalledWith('diet-1', [2, 1]);
  });

  it('releasing a drag without crossing another section does not call reorderDietMeals', () => {
    renderWithIntl(<DietMenu diet={diet} />);
    const handle = screen.getByTitle('Drag to reorder Meal 1');

    fireEvent.pointerDown(handle, {
      pointerId: 1,
      button: 0,
      pointerType: 'mouse',
      clientY: 40,
    });
    fireEvent.pointerUp(handle, { pointerId: 1, pointerType: 'mouse' });

    expect(reorderDietMeals).not.toHaveBeenCalled();
  });

  it('renders a drag handle alongside the up/down buttons for every meal', () => {
    renderWithIntl(<DietMenu diet={diet} />);

    expect(screen.getByTitle('Drag to reorder Meal 1')).toBeInTheDocument();
    expect(screen.getByTitle('Drag to reorder Meal 2')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move Meal 1 down' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Move Meal 2 up' }),
    ).toBeInTheDocument();
  });

  it('hides the drag handle from assistive tech since it has no keyboard operation', () => {
    renderWithIntl(<DietMenu diet={diet} />);

    expect(
      screen.queryByRole('button', { name: /drag to reorder/i }),
    ).not.toBeInTheDocument();
  });

  it('reroll calls swapDietItem with only the diet and item id', async () => {
    const user = userEvent.setup();
    swapDietItem.mockResolvedValue({ ok: true, diet });
    renderWithIntl(<DietMenu diet={diet} />);

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
    renderWithIntl(<DietMenu diet={diet} />);

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
    renderWithIntl(<DietMenu diet={diet} />);

    await user.click(screen.getByRole('button', { name: /^regenerate$/i }));
    expect(generateDiet).not.toHaveBeenCalled();
    expect(screen.getByText(/discards any swaps/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /regenerate menu/i }));
    expect(generateDiet).toHaveBeenCalled();
  });
});
