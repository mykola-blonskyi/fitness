import { msUntilNextReset } from './demo-reset.service';

const HOUR = 60 * 60 * 1000;

describe('msUntilNextReset', () => {
  it('waits for 03:00 UTC later the same day', () => {
    expect(msUntilNextReset(new Date('2026-11-19T01:00:00Z'))).toBe(2 * HOUR);
  });

  it('rolls over to the next day once 03:00 UTC has passed', () => {
    expect(msUntilNextReset(new Date('2026-11-19T03:00:00Z'))).toBe(24 * HOUR);
    expect(msUntilNextReset(new Date('2026-11-19T23:00:00Z'))).toBe(4 * HOUR);
  });
});
