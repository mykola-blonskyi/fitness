import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { vi } from 'vitest';
import { renderWithIntl as render } from './setup/render-with-intl';

const createFoodPreference = vi.fn();
vi.mock('@features/preferences/actions', () => ({
  createFoodPreference: (...args: unknown[]) => createFoodPreference(...args),
  removeFoodPreference: vi.fn(),
}));

import { AddFavoriteFoodForm } from '@features/preferences/components/AddFavoriteFoodForm';
import { FavoriteFoodList } from '@features/preferences/components/FavoriteFoodList';

const foodItems = [
  { id: '11111111-1111-4111-8111-111111111111', name: 'Chicken breast' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Salmon fillet' },
];

describe('AddFavoriteFoodForm', () => {
  it('submits with type and targetType hardcoded to favorite/food_item', async () => {
    const user = userEvent.setup();
    createFoodPreference.mockResolvedValue({});
    render(<AddFavoriteFoodForm foodItems={foodItems} />);

    await user.selectOptions(
      screen.getByLabelText('Food item'),
      'Chicken breast',
    );
    await user.click(screen.getByRole('button', { name: /add favorite/i }));

    expect(createFoodPreference).toHaveBeenCalledWith({
      type: 'favorite',
      targetType: 'food_item',
      targetId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('renders the backend conflict message on a 409', async () => {
    const user = userEvent.setup();
    createFoodPreference.mockResolvedValue({
      error:
        'This Food Item is already excluded or an allergy - remove that first to favorite it',
    });
    render(<AddFavoriteFoodForm foodItems={foodItems} />);

    await user.selectOptions(
      screen.getByLabelText('Food item'),
      'Chicken breast',
    );
    await user.click(screen.getByRole('button', { name: /add favorite/i }));

    expect(
      await screen.findByText(
        'This Food Item is already excluded or an allergy - remove that first to favorite it',
      ),
    ).toBeInTheDocument();
  });
});

describe('FavoriteFoodList', () => {
  it('shows the empty state when there are no favorites', () => {
    render(<FavoriteFoodList preferences={[]} />);
    expect(screen.getByText('No favorite food items yet.')).toBeInTheDocument();
  });

  it('renders a row per favorite with a remove button', () => {
    render(
      <FavoriteFoodList
        preferences={[
          {
            id: 'pref-1',
            type: 'favorite',
            targetType: 'food_item',
            targetId: '11111111-1111-4111-8111-111111111111',
            targetName: 'Chicken breast',
          },
        ]}
      />,
    );

    expect(screen.getByText('Chicken breast')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });
});
