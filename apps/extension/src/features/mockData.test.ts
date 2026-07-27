import { mockSnapshot, validateMockSnapshot } from './mockData';
describe('mock data', () => {
  it('matches domain invariants', () => expect(validateMockSnapshot(mockSnapshot)).toBe(true));
});
