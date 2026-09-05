import type { Request } from 'express';
import { parseIdentity } from './parse-identity';

function buildRequest(headers: Record<string, unknown>): Request {
  return { headers } as unknown as Request;
}

describe('parseIdentity', () => {
  it('extracts sub and email from valid headers', () => {
    const req = buildRequest({
      'x-user-id': 'user-1',
      'x-user-email': 'user1@example.com',
    });

    expect(parseIdentity(req)).toEqual({
      sub: 'user-1',
      email: 'user1@example.com',
    });
  });

  it('returns null when x-user-id is missing', () => {
    const req = buildRequest({ 'x-user-email': 'user1@example.com' });

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when x-user-email is missing', () => {
    const req = buildRequest({ 'x-user-id': 'user-1' });

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when both headers are missing', () => {
    const req = buildRequest({});

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when x-user-id is an empty string', () => {
    const req = buildRequest({
      'x-user-id': '',
      'x-user-email': 'user1@example.com',
    });

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when x-user-email is an empty string', () => {
    const req = buildRequest({
      'x-user-id': 'user-1',
      'x-user-email': '',
    });

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when x-user-id is sent as multiple header values', () => {
    const req = buildRequest({
      'x-user-id': ['user-1', 'user-2'],
      'x-user-email': 'user1@example.com',
    });

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when x-user-email is sent as multiple header values', () => {
    const req = buildRequest({
      'x-user-id': 'user-1',
      'x-user-email': ['user1@example.com', 'user2@example.com'],
    });

    expect(parseIdentity(req)).toBeNull();
  });

  it('returns null when x-user-id is not a string', () => {
    const req = buildRequest({
      'x-user-id': 42,
      'x-user-email': 'user1@example.com',
    });

    expect(parseIdentity(req)).toBeNull();
  });

  it('preserves whitespace and casing in the header values as-is', () => {
    const req = buildRequest({
      'x-user-id': '  user-1  ',
      'x-user-email': 'User1@Example.com',
    });

    expect(parseIdentity(req)).toEqual({
      sub: '  user-1  ',
      email: 'User1@Example.com',
    });
  });

  it('returns null for non-lowercased header keys (relies on Express already lowercasing them)', () => {
    const req = buildRequest({
      'X-User-Id': 'user-1',
      'X-User-Email': 'user1@example.com',
    });

    expect(parseIdentity(req)).toBeNull();
  });
});
