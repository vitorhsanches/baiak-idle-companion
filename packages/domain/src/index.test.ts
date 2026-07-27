import { calculateDps, isValidLevel } from './index';

describe('domain functions', () => {
  it('validates positive integer levels', () => {
    expect(isValidLevel(425)).toBe(true);
    expect(isValidLevel(0)).toBe(false);
    expect(isValidLevel(4.2)).toBe(false);
  });
  it('calculates safe DPS', () => {
    expect(calculateDps(9000, 30)).toBe(300);
    expect(calculateDps(9000, 0)).toBe(0);
  });
});
