import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from './setup/render-with-intl';

vi.mock('@shared/theme', async () => {
  const { useState } = await import('react');
  return { useTheme: () => useState('lime') };
});

import { ThemeSwitcher } from '@features/settings/components/ThemeSwitcher';

describe('ThemeSwitcher', () => {
  it('renders the four themes as native radios sharing one group name', () => {
    renderWithIntl(<ThemeSwitcher />);

    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
    for (const radio of radios) {
      expect(radio.tagName).toBe('INPUT');
      expect(radio).toHaveAttribute('type', 'radio');
      expect(radio).toHaveAttribute('name', radios[0].getAttribute('name'));
    }
    expect(screen.getByRole('group', { name: 'Theme' })).toBeInTheDocument();
  });

  it('lets the arrow keys move the selection, as the radio role promises', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ThemeSwitcher />);

    const [lime, midnight] = screen.getAllByRole('radio');
    expect(lime).toBeChecked();

    lime.focus();
    await user.keyboard('{ArrowDown}');

    expect(midnight).toBeChecked();
    expect(midnight).toHaveFocus();
    expect(lime).not.toBeChecked();
  });

  it('checks the theme a pointer picks', async () => {
    const user = userEvent.setup();
    renderWithIntl(<ThemeSwitcher />);

    await user.click(screen.getByRole('radio', { name: /paper/i }));

    expect(screen.getByRole('radio', { name: /paper/i })).toBeChecked();
  });
});
