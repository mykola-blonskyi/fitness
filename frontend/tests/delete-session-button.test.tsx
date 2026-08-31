import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
}));

const deletePhotoSession = vi.fn();
vi.mock('@features/photo-sessions/actions', () => ({
  deletePhotoSession: (...args: unknown[]) => deletePhotoSession(...args),
}));

import { DeleteSessionButton } from '@features/photo-sessions/components/DeleteSessionButton';

describe('DeleteSessionButton', () => {
  it('requires a confirm click before deleting', async () => {
    const user = userEvent.setup();
    render(<DeleteSessionButton sessionId="session-1" />);

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(deletePhotoSession).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /confirm/i }),
    ).toBeInTheDocument();
  });

  it('warns when the session being deleted is the baseline', async () => {
    const user = userEvent.setup();
    render(<DeleteSessionButton sessionId="session-1" isBaseline />);

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(
      screen.getByText(/delete your baseline session/i),
    ).toBeInTheDocument();
  });

  it('cancels back to the initial state without deleting', async () => {
    const user = userEvent.setup();
    render(<DeleteSessionButton sessionId="session-1" />);

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(deletePhotoSession).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /^delete$/i }),
    ).toBeInTheDocument();
  });

  it('deletes and refreshes when no redirect is given', async () => {
    const user = userEvent.setup();
    deletePhotoSession.mockResolvedValue(undefined);
    render(<DeleteSessionButton sessionId="session-1" />);

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(deletePhotoSession).toHaveBeenCalledWith('session-1');
    expect(refresh).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('redirects instead of refreshing when redirectTo is given', async () => {
    const user = userEvent.setup();
    deletePhotoSession.mockResolvedValue(undefined);
    render(
      <DeleteSessionButton
        sessionId="session-1"
        redirectTo="/en/photos/gallery"
      />,
    );

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(push).toHaveBeenCalledWith('/en/photos/gallery');
  });

  it('shows an error and lets the user retry when the delete call fails', async () => {
    const user = userEvent.setup();
    deletePhotoSession.mockRejectedValue(new Error('boom'));
    render(<DeleteSessionButton sessionId="session-1" />);

    await user.click(screen.getByRole('button', { name: /^delete$/i }));
    await user.click(screen.getByRole('button', { name: /confirm/i }));

    expect(await screen.findByText(/couldn't delete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirm/i })).toBeEnabled();
  });
});
