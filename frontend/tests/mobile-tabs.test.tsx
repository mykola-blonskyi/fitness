import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from './setup/render-with-intl';

vi.mock('next/navigation', () => ({ usePathname: () => '/en' }));

import { MobileTabs } from '@shared/ui/shell/MobileTabs';

function openSheet() {
  return screen.getByRole('button', { name: 'More' });
}

describe('MobileTabs "More" sheet', () => {
  it('points aria-controls at the panel and moves focus into it on open', async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileTabs locale="en" isAdmin={false} />);

    const trigger = openSheet();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const panel = document.getElementById(
      trigger.getAttribute('aria-controls')!,
    );
    expect(panel).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toContainElement(document.activeElement as HTMLElement);
    expect(document.activeElement).toHaveAccessibleName('Photos');
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileTabs locale="en" isAdmin={false} />);

    const trigger = openSheet();
    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeVisible();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('button', { name: 'Close menu' }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('hands focus back to the trigger when the close button is used', async () => {
    const user = userEvent.setup();
    renderWithIntl(<MobileTabs locale="en" isAdmin={false} />);

    const trigger = openSheet();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close menu' }));

    expect(trigger).toHaveFocus();
  });
});
