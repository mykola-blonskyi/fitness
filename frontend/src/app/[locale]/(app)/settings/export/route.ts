import { ApiError, backendFetch } from '@libs/api-client';

export async function GET() {
  let res: Response;
  try {
    res = await backendFetch('/account/export');
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    return new Response(null, { status: err.status });
  }

  const date = new Date().toISOString().slice(0, 10);
  return new Response(res.body, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="fitness-export-${date}.zip"`,
      'cache-control': 'no-store',
    },
  });
}
