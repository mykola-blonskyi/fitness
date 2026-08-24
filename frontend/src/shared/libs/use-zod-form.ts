'use client';

import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormProps,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodType } from 'zod';

export function useZodForm<TInput extends FieldValues>(
  schema: ZodType<TInput>,
  options?: Omit<UseFormProps<TInput>, 'resolver' | 'mode' | 'reValidateMode'>,
) {
  return useForm<TInput>({
    ...options,
    // zodResolver's overloads can't resolve a bare generic TInput, only a
    // concrete schema type - typechecks fine at every real call site.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any) as Resolver<TInput>,
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });
}
