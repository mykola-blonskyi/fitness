import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithIntl } from './setup/render-with-intl';
import ruMessages from '../messages/ru.json';
import { FoodList } from '@features/food-catalog/components/FoodList';
import type { FoodItem } from '@features/food-catalog/actions';
import type { UserProfile } from '@shared/types/user';

vi.mock('@features/food-catalog/actions', () => ({
  listFoodItems: vi.fn(),
}));
vi.mock('@features/admin-food-items/actions', () => ({
  unapproveFoodItem: vi.fn(),
}));

const foodItem: FoodItem = {
  id: 'f1',
  name: 'Chicken breast',
  category: 'meat',
  subcategory: 'poultry',
  role: 'lean_protein',
  isVerified: true,
  imageUrl: null,
  caloriesPer100g: 156,
  proteinPer100g: 12.4,
  carbsPer100g: 3.1,
  fatPer100g: 2,
};

const profile: UserProfile = {
  id: 'u1',
  name: 'Jane',
  email: 'jane@example.com',
  dateOfBirth: '1990-01-01',
  age: 36,
  height: 170,
  gender: 'female',
  goal: 'maintenance',
  activityLevel: 'moderate',
  mealCount: 3,
  avatarUrl: null,
  isAdmin: false,
  locale: 'en',
  defaultWeightUnit: 'kg',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('FoodList macro/calorie units', () => {
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
      <FoodList items={[foodItem]} nextCursor={null} profile={profile} />,
    );

    expect(screen.getByText('156 kcal')).toBeInTheDocument();
    expect(screen.getByText('12.4g P')).toBeInTheDocument();
    expect(screen.getByText('3.1g C')).toBeInTheDocument();
    expect(screen.getByText('2g F')).toBeInTheDocument();
  });

  it('renders ккал, a comma decimal separator, and Cyrillic macro letters in Russian', () => {
    renderWithIntl(
      <FoodList items={[foodItem]} nextCursor={null} profile={profile} />,
      { locale: 'ru', messages: ruMessages },
    );

    expect(screen.getByText('156 ккал')).toBeInTheDocument();
    expect(screen.getByText('12,4г Б')).toBeInTheDocument();
    expect(screen.getByText('3,1г У')).toBeInTheDocument();
    expect(screen.getByText('2г Ж')).toBeInTheDocument();
  });
});
