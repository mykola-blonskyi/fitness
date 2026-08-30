import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const retryPhotoAnalysis = vi.fn();
vi.mock('@features/photo-sessions/actions', () => ({
  retryPhotoAnalysis: (...args: unknown[]) => retryPhotoAnalysis(...args),
}));

import { RetryAnalysisButton } from '@features/photo-sessions/components/RetryAnalysisButton';

describe('RetryAnalysisButton', () => {
  it('re-enqueues analysis for its photo and refreshes', async () => {
    const user = userEvent.setup();
    retryPhotoAnalysis.mockResolvedValue(undefined);
    render(<RetryAnalysisButton photoId="photo-1" />);

    await user.click(screen.getByRole('button', { name: /retry/i }));

    expect(retryPhotoAnalysis).toHaveBeenCalledWith('photo-1');
    expect(refresh).toHaveBeenCalled();
  });

  it('re-enables itself when the retry call fails', async () => {
    const user = userEvent.setup();
    retryPhotoAnalysis.mockRejectedValue(new Error('boom'));
    render(<RetryAnalysisButton photoId="photo-1" />);

    const button = screen.getByRole('button', { name: /retry/i });
    await user.click(button);

    expect(button).toBeEnabled();
  });
});
