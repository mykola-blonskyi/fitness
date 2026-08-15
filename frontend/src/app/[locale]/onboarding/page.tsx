import { OnboardingForm } from '@features/onboarding';

export default function OnboardingPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">Complete your profile</h1>
        <p className="text-sm text-zinc-500">
          A few details so we can calculate your targets.
        </p>
      </div>
      <OnboardingForm />
    </main>
  );
}
