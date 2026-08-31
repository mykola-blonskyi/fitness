import { apiFetch } from '@libs/api-client';

export async function fetchPhotoViewUrl(
  photoId: string,
): Promise<string | null> {
  try {
    const { url } = await apiFetch<{ url: string }>(
      `/photo-sessions/photos/${photoId}/view`,
    );
    return url;
  } catch {
    return null;
  }
}
