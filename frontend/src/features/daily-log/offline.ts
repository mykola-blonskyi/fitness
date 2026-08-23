'use client';

import { createSyncedWrite } from '@shared/offline/create-synced-write';
import { setWeight, type WeightFormState } from '@features/daily-log/actions';
import type { WeightInput } from '@shared/schemas/weight';

export interface SetWeightPayload {
  date: string;
  input: WeightInput;
}

// FITNESS-13's concrete usage example: wraps the existing setWeight
// Server Action (already used by the online path since FITNESS-15) so
// WeightForm.tsx gets offline queueing for free. The generic queue
// mechanism itself lives entirely under shared/offline/ and knows
// nothing about weight logging - any future write endpoint (e.g.
// workout sets, per docs/architecture.md) wraps its own Server Action
// the same way, with its own `type` string.
export const syncedSetWeight = createSyncedWrite<
  SetWeightPayload,
  WeightFormState
>('daily-log/set-weight', ({ date, input }) => setWeight(date, input), {
  // setWeight resolves with `{ error }` or `{ fieldErrors }` on a
  // genuine backend rejection rather than throwing (submitFormAction's
  // convention - see shared/libs/form-action.ts). Without this, a
  // queued write the server rejects on replay would look identical to
  // success and get silently dropped from the queue instead of
  // reported/retried - fieldErrors is a near-impossible case in
  // practice here (the same zod schema already validated the input
  // client-side before it was queued), but checking it too costs
  // nothing and closes the gap completely rather than partially.
  getResultError: (result) =>
    result.error ?? Object.values(result.fieldErrors ?? {})[0],
});
