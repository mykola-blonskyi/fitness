import { PhotoSessionList, PhotoUploadForm } from '@features/photo-sessions';
import type { PhotoSession } from '@features/photo-sessions/actions';
import { apiFetch } from '@libs/api-client';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function PhotosPage() {
  const date = todayIso();
  const sessions = await apiFetch<PhotoSession[]>('/photo-sessions');

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Progress Photos</h1>
      <PhotoUploadForm date={date} />

      <section className="flex w-full flex-col gap-4">
        <h2 className="text-lg font-medium">History</h2>
        <PhotoSessionList sessions={sessions} />
      </section>
    </main>
  );
}
