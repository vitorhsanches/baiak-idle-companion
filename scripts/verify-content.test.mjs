import { contentScriptViolations } from './verify-content.mjs';
import { describe, expect, it } from 'vitest';

describe('content script artifact verification', () => {
  it('accepts a self-contained IIFE', () => {
    expect(contentScriptViolations('(()=>{"use strict";const value=1;void value;})();')).toEqual([]);
  });

  it.each([
    ['import{x}from"./assets/index-123.js";', 'static ESM import'],
    ['(()=>import("./lazy.js"))();', 'dynamic import'],
    ['export const value=1;', 'ESM export'],
    ['(()=>{const chunk="./assets/protocol-123.js"})()', 'local JavaScript dependency'],
    ['(()=>{const chunk="https://cdn.example/content.js"})()', 'remote JavaScript dependency']
  ])('rejects %s', (source, violation) => {
    expect(contentScriptViolations(source)).toContain(violation);
  });
});
