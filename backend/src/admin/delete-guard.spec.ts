import { checkDeleteGuard } from './delete-guard';

describe('checkDeleteGuard', () => {
  it('allows deletion when nothing references the entity', () => {
    expect(checkDeleteGuard('exercise', 'program exercise', 0)).toEqual({
      allowed: true,
    });
  });

  it('blocks deletion with a singular reason for one reference', () => {
    const result = checkDeleteGuard('exercise', 'program exercise', 1);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(
      "Can't delete this exercise - it's used by 1 program exercise",
    );
  });

  it('blocks deletion with a plural reason for multiple references', () => {
    const result = checkDeleteGuard('exercise', 'program exercise', 3);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe(
      "Can't delete this exercise - it's used by 3 program exercises",
    );
  });
});
