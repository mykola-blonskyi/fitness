// Cursor shape for keyset pagination on (createdAt, id) - avoids
// offset-based skip/duplicate bugs when rows leave the underlying query
// mid-scroll (e.g. an admin approving an item out of the moderation queue).
export interface ListCursor {
  createdAt: string;
  id: string;
}

export function encodeCursor(cursor: ListCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

// Returns null for anything malformed rather than throwing - callers
// treat an invalid cursor as a 400, not a 500.
export function decodeCursor(raw: string): ListCursor | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('createdAt' in parsed) ||
    !('id' in parsed) ||
    typeof (parsed as ListCursor).createdAt !== 'string' ||
    typeof (parsed as ListCursor).id !== 'string' ||
    Number.isNaN(Date.parse((parsed as ListCursor).createdAt))
  ) {
    return null;
  }

  return {
    createdAt: (parsed as ListCursor).createdAt,
    id: (parsed as ListCursor).id,
  };
}
