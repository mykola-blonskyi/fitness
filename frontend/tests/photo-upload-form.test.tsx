import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithIntl as render } from './setup/render-with-intl';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const requestUploadUrl = vi.fn();
const confirmPhotoSession = vi.fn();
vi.mock('@features/photo-sessions/actions', () => ({
  requestUploadUrl: (...args: unknown[]) => requestUploadUrl(...args),
  confirmPhotoSession: (...args: unknown[]) => confirmPhotoSession(...args),
}));

import { PhotoUploadForm } from '@features/photo-sessions/components/PhotoUploadForm';

function imageFile(name: string): File {
  return new File(['x'], name, { type: 'image/png' });
}

describe('PhotoUploadForm', () => {
  it('renders a single multi-select file input', () => {
    render(<PhotoUploadForm date="2026-08-29" />);
    const input = screen.getByLabelText(/photos/i) as HTMLInputElement;
    expect(input.multiple).toBe(true);
  });

  it('rejects a selection of more than three photos', async () => {
    const user = userEvent.setup();
    render(<PhotoUploadForm date="2026-08-29" />);

    await user.upload(screen.getByLabelText(/photos/i), [
      imageFile('a.png'),
      imageFile('b.png'),
      imageFile('c.png'),
      imageFile('d.png'),
    ]);

    expect(screen.getByText(/at most 3 photos/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /upload session/i }));
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  it('requires at least one photo before submitting', async () => {
    const user = userEvent.setup();
    render(<PhotoUploadForm date="2026-08-29" />);

    await user.click(screen.getByRole('button', { name: /upload session/i }));

    expect(screen.getByText(/select at least one photo/i)).toBeInTheDocument();
    expect(requestUploadUrl).not.toHaveBeenCalled();
  });

  it('uploads each file then confirms the session with the object keys', async () => {
    const user = userEvent.setup();
    requestUploadUrl
      .mockResolvedValueOnce({
        objectKey: 'key-1',
        uploadUrl: 'http://minio/1',
        fields: { key: 'key-1', policy: 'p', 'Content-Type': 'image/' },
      })
      .mockResolvedValueOnce({
        objectKey: 'key-2',
        uploadUrl: 'http://minio/2',
        fields: { key: 'key-2', policy: 'p' },
      });
    confirmPhotoSession.mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal('fetch', fetchMock);

    render(<PhotoUploadForm date="2026-08-29" />);
    await user.upload(screen.getByLabelText(/photos/i), [
      imageFile('a.png'),
      imageFile('b.png'),
    ]);
    await user.click(screen.getByRole('button', { name: /upload session/i }));

    expect(requestUploadUrl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as FormData;
    expect(url).toBe('http://minio/1');
    expect(init.method).toBe('POST');
    expect(body.get('key')).toBe('key-1');
    expect(body.getAll('Content-Type')).toEqual(['image/png']);
    expect([...body.keys()].at(-1)).toBe('file');
    expect(confirmPhotoSession).toHaveBeenCalledWith('2026-08-29', [
      'key-1',
      'key-2',
    ]);
    vi.unstubAllGlobals();
  });

  it('rejects a photo over 10 MB before uploading', async () => {
    const user = userEvent.setup();
    render(<PhotoUploadForm date="2026-08-29" />);
    const big = imageFile('big.png');
    Object.defineProperty(big, 'size', { value: 11 * 1024 * 1024 });

    await user.upload(screen.getByLabelText(/photos/i), [big]);

    expect(screen.getByText(/10 MB or smaller/i)).toBeInTheDocument();
  });

  it('explains the daily limit instead of a generic failure', async () => {
    const user = userEvent.setup();
    requestUploadUrl.mockReset().mockResolvedValue({ dailyLimitReached: true });
    confirmPhotoSession.mockReset();

    render(<PhotoUploadForm date="2026-08-29" />);
    await user.upload(screen.getByLabelText(/photos/i), [imageFile('a.png')]);
    await user.click(screen.getByRole('button', { name: /upload session/i }));

    expect(screen.getByText(/today's limit of 3/i)).toBeInTheDocument();
    expect(confirmPhotoSession).not.toHaveBeenCalled();
  });
});
