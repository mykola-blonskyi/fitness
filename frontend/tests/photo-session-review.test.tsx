import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl as render } from './setup/render-with-intl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const confirmReview = vi.fn();
vi.mock('@features/photo-sessions/actions', () => ({
  confirmReview: (...args: unknown[]) => confirmReview(...args),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

import { PhotoSessionReview } from '@features/photo-sessions/components/PhotoSessionReview';

const photos = [
  { id: 'p1', pose: 'front' as const, url: null },
  { id: 'p2', pose: 'side' as const, url: null },
  { id: 'p3', pose: 'front' as const, url: null }, // detection collided
];

function selects() {
  return screen.getAllByRole('combobox') as HTMLSelectElement[];
}

describe('PhotoSessionReview', () => {
  it('pre-fills each dropdown with the detected pose', () => {
    render(<PhotoSessionReview sessionId="s1" photos={photos} />);
    expect(selects().map((s) => s.value)).toEqual(['front', 'side', 'front']);
  });

  it('keeps confirm disabled while two photos share a pose', () => {
    render(<PhotoSessionReview sessionId="s1" photos={photos} />);
    expect(
      screen.getByRole('button', { name: /confirm poses/i }),
    ).toBeDisabled();
    expect(screen.getByText(/needs a different pose/i)).toBeInTheDocument();
  });

  it('submits the corrected assignment once every pose is distinct', async () => {
    const user = userEvent.setup();
    confirmReview.mockResolvedValue({});
    render(<PhotoSessionReview sessionId="s1" photos={photos} />);

    await user.selectOptions(selects()[2], 'back');

    const confirm = screen.getByRole('button', { name: /confirm poses/i });
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(confirmReview).toHaveBeenCalledWith('s1', [
      { photoId: 'p1', pose: 'front' },
      { photoId: 'p2', pose: 'side' },
      { photoId: 'p3', pose: 'back' },
    ]);
  });

  it('disables confirm until an unset pose is chosen', async () => {
    const user = userEvent.setup();
    render(
      <PhotoSessionReview
        sessionId="s1"
        photos={[
          { id: 'p1', pose: 'front', url: null },
          { id: 'p2', pose: 'side', url: null },
          { id: 'p3', pose: null, url: null },
        ]}
      />,
    );

    expect(
      screen.getByRole('button', { name: /confirm poses/i }),
    ).toBeDisabled();
    await user.selectOptions(selects()[2], 'back');
    expect(
      screen.getByRole('button', { name: /confirm poses/i }),
    ).toBeEnabled();
  });

  it('shows an error when the confirm call fails', async () => {
    const user = userEvent.setup();
    confirmReview.mockRejectedValue(new Error('boom'));
    render(
      <PhotoSessionReview
        sessionId="s1"
        photos={[
          { id: 'p1', pose: 'front', url: null },
          { id: 'p2', pose: 'side', url: null },
          { id: 'p3', pose: 'back', url: null },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: /confirm poses/i }));
    expect(
      await screen.findByText(/couldn't save the poses/i),
    ).toBeInTheDocument();
  });
});
