import { BadRequestException } from '@nestjs/common';
import { resolveReviewAssignment } from './review-assignment';

describe('resolveReviewAssignment', () => {
  const photoIds = ['a', 'b', 'c'];

  it('returns a photoId -> pose map for a valid assignment', () => {
    const map = resolveReviewAssignment(photoIds, [
      { photoId: 'a', pose: 'front' },
      { photoId: 'b', pose: 'side' },
      { photoId: 'c', pose: 'back' },
    ]);

    expect([...map]).toEqual([
      ['a', 'front'],
      ['b', 'side'],
      ['c', 'back'],
    ]);
  });

  it('rejects a submission that omits a photo', () => {
    expect(() =>
      resolveReviewAssignment(photoIds, [
        { photoId: 'a', pose: 'front' },
        { photoId: 'b', pose: 'side' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects a submission naming a photo not in the session', () => {
    expect(() =>
      resolveReviewAssignment(photoIds, [
        { photoId: 'a', pose: 'front' },
        { photoId: 'b', pose: 'side' },
        { photoId: 'x', pose: 'back' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects a submission with a duplicate photoId', () => {
    expect(() =>
      resolveReviewAssignment(photoIds, [
        { photoId: 'a', pose: 'front' },
        { photoId: 'a', pose: 'side' },
        { photoId: 'c', pose: 'back' },
      ]),
    ).toThrow(BadRequestException);
  });

  it('rejects two photos assigned the same pose', () => {
    expect(() =>
      resolveReviewAssignment(photoIds, [
        { photoId: 'a', pose: 'front' },
        { photoId: 'b', pose: 'front' },
        { photoId: 'c', pose: 'back' },
      ]),
    ).toThrow('Each photo needs a distinct pose');
  });
});
