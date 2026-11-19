'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  userProfileSchema,
  type UserProfileInput,
} from '@shared/schemas/user-profile';
import { ProfileFields } from '@shared/ui/components/ProfileFields';
import { FieldError } from '@shared/ui/components/FieldError';
import { useZodForm } from '@shared/libs/use-zod-form';
import { applyFormActionError } from '@shared/libs/apply-form-action-error';
import { completeOnboarding } from '@features/onboarding/actions';

export function OnboardingForm() {
  const t = useTranslations('Onboarding');
  const tv = useTranslations('Validation');
  const schema = useMemo(() => userProfileSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useZodForm(schema);
  // Kept outside react-hook-form: ProfileFields is typed to the profile
  // shape, which settings shares and which has no consent field.
  const [consented, setConsented] = useState(false);
  const [consentError, setConsentError] = useState<string>();

  async function onSubmit(input: UserProfileInput) {
    if (!consented) return;
    const result = await completeOnboarding({
      ...input,
      healthDataConsent: true,
    });
    if (!result) return; // success - completeOnboarding already redirected
    applyFormActionError(setError, result);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    setConsentError(consented ? undefined : tv('userProfile.consentRequired'));
    return handleSubmit(onSubmit)(event);
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4">
      <ProfileFields register={register} errors={errors} showPlaceholder />

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-sm leading-snug">
          <input
            type="checkbox"
            checked={consented}
            onChange={(event) => {
              setConsented(event.target.checked);
              if (event.target.checked) setConsentError(undefined);
            }}
            aria-invalid={consentError ? true : undefined}
            className="mt-0.5 size-5 shrink-0 accent-accent"
          />
          <span>
            {t.rich('consent', {
              terms: (chunks) => (
                <Link href="/terms" target="_blank" className="underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" target="_blank" className="underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        <FieldError message={consentError} />
      </div>

      <FieldError message={errors.root?.message} />

      <button type="submit" disabled={isSubmitting} className="btn-primary">
        {isSubmitting ? t('saving') : t('submit')}
      </button>
    </form>
  );
}
