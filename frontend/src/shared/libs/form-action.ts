import * as Sentry from '@sentry/nextjs';
import type { ZodType } from 'zod';
import { firstFieldErrors } from '@shared/schemas/zod-errors';

export interface FormActionError<TInput> {
  error?: string;
  fieldErrors?: Partial<Record<keyof TInput, string>>;
}

// Shared by every mutating Server Action (setWeight, createFoodItem,
// completeOnboarding, updateProfile) - each repeated the identical
// validate -> apiFetch -> catch shape wrapped in Sentry instrumentation.
// `mutate` receives the schema-validated input, does the actual apiFetch
// call plus whatever success-path work is caller-specific (revalidatePath,
// setting a `success` flag, or nothing at all for onboarding, which
// redirects outside this helper - see completeOnboarding for why), and
// its return value is passed straight through. A thrown error is
// swallowed into `errorMessage`, never re-thrown - callers that need to
// distinguish a specific status (clearWeight's already-cleared 404 case)
// don't use this helper.
//
// No `formData` option ever gets passed to withServerActionInstrumentation
// here - see completeOnboarding's comment for why (ADR-006, PII).
export async function submitFormAction<TInput, TResult>({
  name,
  schema,
  input,
  errorMessage,
  mutate,
}: {
  name: string;
  schema: ZodType<TInput>;
  input: TInput;
  errorMessage: string;
  mutate: (parsed: TInput) => Promise<TResult>;
}): Promise<FormActionError<TInput> | TResult> {
  return Sentry.withServerActionInstrumentation(name, {}, async () => {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      return {
        fieldErrors: firstFieldErrors(parsed.error) as Partial<
          Record<keyof TInput, string>
        >,
      };
    }

    try {
      return await mutate(parsed.data);
    } catch {
      return { error: errorMessage };
    }
  });
}
