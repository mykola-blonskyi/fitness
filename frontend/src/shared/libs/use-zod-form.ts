'use client';

import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

// Every form in this repo pairs a Zod schema with the same real-time
// validation config (on-blur, then on-change once a field has an error -
// react-hook-form defaults to submit-only). Centralizing it here means
// that choice only needs to be made, and changed, once.
//
// The Resolver cast below is a zod4/@hookform-resolvers generic-inference
// limitation, not a real type gap: zodResolver(schema) typechecks fine at
// every call site when TInput is concrete (as it is for every caller of
// this hook); it only breaks when routed through an indirection with a
// bare generic TInput.
export function useZodForm<TInput extends FieldValues>(
  schema: ZodType<TInput>,
  options?: Omit<UseFormProps<TInput>, 'resolver' | 'mode' | 'reValidateMode'>,
) {
  return useForm<TInput>({
    ...options,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above: zodResolver's overloads can't resolve a bare generic TInput, only concrete schema types
    resolver: zodResolver(schema as any) as Resolver<TInput>,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
}
