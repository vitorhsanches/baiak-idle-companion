import { contextInvalidatedError, isExtensionContextInvalidated, isExtensionRuntimeUsable } from './runtime';

describe('extension runtime guard', () => {
  it('recognizes only the invalidated-context failure', () => {
    expect(isExtensionContextInvalidated(contextInvalidatedError())).toBe(true);
    expect(isExtensionContextInvalidated(new Error('storage unavailable'))).toBe(false);
  });
  it('requires a runtime id before extension APIs are used', () => {
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime: { id: 'test-extension' } } });
    expect(isExtensionRuntimeUsable()).toBe(true);
    Object.defineProperty(globalThis, 'chrome', { configurable: true, value: { runtime: {} } });
    expect(isExtensionRuntimeUsable()).toBe(false);
  });
});
