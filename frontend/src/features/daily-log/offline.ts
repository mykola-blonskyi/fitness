'use client';

import { createSyncedWrite } from '@shared/offline/create-synced-write';
import { setWeight, type WeightFormState } from '@features/daily-log/actions';
import type { WeightInput } from '@shared/schemas/weight';

export interface SetWeightPayload {
  date: string;
  input: WeightInput;
}

// Wraps the existing setWeight Server Action so WeightForm gets offline
// queueing for free; shared/offline/ itself stays feature-agnostic.
export const syncedSetWeight = createSyncedWrite<
  SetWeightPayload,
  WeightFormState
>('daily-log/set-weight', ({ date, input }) => setWeight(date, input), {
  // setWeight resolves with `{ error }`/`{ fieldErrors }` instead of
  // throwing (submitFormAction convention) - without this a replay
  // rejection would look like success and get silently dropped.
  getResultError: (result) =>
    result.error ?? Object.values(result.fieldErrors ?? {})[0],
});
