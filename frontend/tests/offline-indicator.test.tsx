import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithIntl } from './setup/render-with-intl';
import { OfflineIndicator } from '@shared/ui/components/OfflineIndicator';
import { useOfflineQueueStore } from '@shared/offline/offline-queue-store';
import type { QueuedWrite } from '@shared/offline/types';

function write(id: string): QueuedWrite {
  return { id, type: 'test/write', payload: {}, createdAt: 0 };
}

describe('OfflineIndicator', () => {
  afterEach(() => {
    useOfflineQueueStore.setState({ queue: [], dropped: [] });
  });

  it('reports the writes that never landed instead of claiming synced', async () => {
    useOfflineQueueStore.setState({
      queue: [],
      dropped: [write('a'), write('b')],
    });

    renderWithIntl(<OfflineIndicator userId="user-1" />);

    // Mounting starts a drain, so the label settles a tick after render.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '2 writes not saved',
      ),
    );
  });

  it('says synced once an empty queue drained cleanly', async () => {
    renderWithIntl(<OfflineIndicator userId="user-1" />);

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('Synced'),
    );
  });
});
