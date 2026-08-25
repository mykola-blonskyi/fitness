import { decodeCursor, encodeCursor } from './cursor-pagination';

describe('cursor-pagination', () => {
  it('round-trips a cursor through encode/decode', () => {
    const cursor = { createdAt: '2026-08-20T12:00:00.000Z', id: 'abc-123' };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it('rejects a cursor that is not valid base64url JSON', () => {
    expect(decodeCursor('not-base64-json')).toBeNull();
  });

  it('rejects a cursor missing required fields', () => {
    const raw = Buffer.from(JSON.stringify({ id: 'abc' }), 'utf8').toString(
      'base64url',
    );
    expect(decodeCursor(raw)).toBeNull();
  });

  it('rejects a cursor with an unparseable createdAt', () => {
    const raw = Buffer.from(
      JSON.stringify({ createdAt: 'not-a-date', id: 'abc' }),
      'utf8',
    ).toString('base64url');
    expect(decodeCursor(raw)).toBeNull();
  });

  it('rejects a cursor whose fields have the wrong type', () => {
    const raw = Buffer.from(
      JSON.stringify({ createdAt: '2026-08-20T12:00:00.000Z', id: 42 }),
      'utf8',
    ).toString('base64url');
    expect(decodeCursor(raw)).toBeNull();
  });
});
