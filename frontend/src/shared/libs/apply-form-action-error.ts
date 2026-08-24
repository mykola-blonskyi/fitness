import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { FormActionError } from './form-action';

// Returns whether an error was applied, so callers can gate their own
// success path (reset, a "saved" flag, etc.) on it.
export function applyFormActionError<TInput extends FieldValues>(
  setError: UseFormSetError<TInput>,
  result: FormActionError<TInput>,
): boolean {
  let hadError = false;
  if (result.error) {
    setError('root' as Path<TInput>, { message: result.error });
    hadError = true;
  }
  for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
    if (message) {
      setError(field as Path<TInput>, { message: message as string });
      hadError = true;
    }
  }
  return hadError;
}
