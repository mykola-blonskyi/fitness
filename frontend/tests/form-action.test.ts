import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError } from '@shared/libs/api-client';
import { submitFormAction } from '@shared/libs/form-action';

vi.mock('@sentry/nextjs', () => ({
  withServerActionInstrumentation: (
    _name: string,
    _options: unknown,
    callback: () => unknown,
  ) => callback(),
}));

const schema = z.object({ weight: z.number() });

function submit(mutate: () => Promise<unknown>) {
  return submitFormAction({
    name: 'test',
    schema,
    input: { weight: 80 },
    errorMessage: "Couldn't save",
    mutate,
  });
}

describe('submitFormAction', () => {
  it('rethrows a 5xx so the offline queue can retry the write', async () => {
    await expect(
      submit(async () => {
        throw new ApiError(502, 'Bad Gateway');
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('resolves with the error message when the backend refuses the write', async () => {
    await expect(
      submit(async () => {
        throw new ApiError(400, 'Weight must be greater than 0');
      }),
    ).resolves.toEqual({ error: "Couldn't save" });
  });

  it('resolves with the error message for a failure carrying no status', async () => {
    await expect(
      submit(async () => {
        throw new Error('boom');
      }),
    ).resolves.toEqual({ error: "Couldn't save" });
  });
});
