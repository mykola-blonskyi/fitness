import { screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { renderWithIntl } from './setup/render-with-intl';
import { AdminExerciseQueue } from '@features/admin-exercises/components/AdminExerciseQueue';
import type { AdminExercise } from '@shared/types/admin';

const { listAdminExercises } = vi.hoisted(() => ({
  listAdminExercises: vi.fn(),
}));

vi.mock('@features/admin-exercises/actions', () => ({
  listAdminExercises,
  approveExercise: vi.fn(),
  deleteExercise: vi.fn(),
}));

const exercise: AdminExercise = {
  id: 'ex-1',
  name: 'Bench Press',
  category: 'chest',
  imageUrl: null,
  isVerified: false,
  source: null,
  sourceId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('AdminExerciseQueue infinite load', () => {
  // jsdom reports every element as zero-height, so the virtualizer renders
  // no rows and the scroll trigger this test drives never fires.
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      value: 600,
    });
  });

  afterAll(() => {
    delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
  });

  it('reports a failed page instead of loading forever', async () => {
    listAdminExercises.mockRejectedValue(new Error('offline'));

    renderWithIntl(
      <AdminExerciseQueue initialItems={[exercise]} initialCursor="cursor-1" />,
    );

    expect(
      await screen.findByText("Couldn't load more — try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading more…')).toBeNull();
    // A failed page must not re-arm the scroll trigger on the next render.
    expect(listAdminExercises).toHaveBeenCalledTimes(1);
  });
});
