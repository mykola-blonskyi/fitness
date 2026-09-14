import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render-with-intl';
import ruMessages from '../messages/ru.json';
import { AdminFoodItemQueue } from '@features/admin-food-items/components/AdminFoodItemQueue';
import type { AdminFoodItem } from '@shared/types/admin';

vi.mock('@features/admin-food-items/actions', () => ({
  approveFoodItem: vi.fn(),
  deleteFoodItem: vi.fn(),
  listAdminFoodItems: vi.fn(),
}));

const item: AdminFoodItem = {
  id: 'f1',
  name: 'Beef mince',
  category: 'meat',
  subcategory: 'lean_meat',
  role: 'lean_protein',
  imageUrl: null,
  isVerified: false,
  source: 'usda',
  sourceId: '123',
  caloriesPer100g: 156,
  proteinPer100g: 12.4,
  carbsPer100g: 3.1,
  fatPer100g: 2,
};

describe('AdminFoodItemQueue nutrition summary', () => {
  // jsdom reports every element as zero-height, so the virtualizer needs a
  // non-zero scroll container to render any row at all.
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 600,
    });
  });

  afterAll(() => {
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  });

  it('renders kcal and English macro letters in English', () => {
    renderWithIntl(
      <AdminFoodItemQueue initialItems={[item]} initialCursor={null} />,
    );

    expect(
      screen.getByText('156 kcal · P 12.4g · C 3.1g · F 2g · usda #123'),
    ).toBeInTheDocument();
  });

  it('renders ккал, a comma decimal separator, and Cyrillic macro letters in Russian', () => {
    renderWithIntl(
      <AdminFoodItemQueue initialItems={[item]} initialCursor={null} />,
      { locale: 'ru', messages: ruMessages },
    );

    expect(
      screen.getByText('156 ккал · Б 12,4г · У 3,1г · Ж 2г · usda #123'),
    ).toBeInTheDocument();
  });
});
