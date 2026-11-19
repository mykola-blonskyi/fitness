import type { NextRequest } from 'next/server';

// Streams the backend's zip through rather than via apiFetch, which only
// speaks JSON. proxy.ts has already set the identity headers on this request.
export async function GET(req: NextRequest) {
  const res = await fetch(`${process.env.BACKEND_URL}/account/export`, {
    headers: {
      'x-user-id': req.headers.get('x-user-id') ?? '',
      'x-user-email': req.headers.get('x-user-email') ?? '',
    },
    cache: 'no-store',
  });
  if (!res.ok || !res.body) {
    return new Response(null, {
      status: res.status === 200 ? 502 : res.status,
    });
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
