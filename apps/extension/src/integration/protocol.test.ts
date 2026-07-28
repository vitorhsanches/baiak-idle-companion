import { describe, expect, it } from 'vitest';
import { createMessage, isLiveMessage, MAX_MESSAGE_BYTES } from './protocol';

describe('live DOM message protocol', () => {
  it('accepts a valid versioned message', () => {
    expect(isLiveMessage(createMessage('content-status', 'content-script', { status: 'game-page-detected' }))).toBe(true);
  });
  it.each([
    ['invalid version', { ...createMessage('state-request', 'side-panel', {}), protocolVersion: 2 }],
    ['unknown type', { ...createMessage('state-request', 'side-panel', {}), type: 'unknown' }],
    ['unexpected field', { ...createMessage('state-request', 'side-panel', {}), extra: true }],
    ['invalid timestamp', { ...createMessage('state-request', 'side-panel', {}), timestamp: 'not-a-date' }],
    ['oversized string', createMessage('adapter-error', 'content-script', { code: 'x', message: 'x'.repeat(MAX_MESSAGE_BYTES) })]
  ])('rejects %s', (_label, message) => expect(isLiveMessage(message)).toBe(false));
  it('rejects deep and polluted-looking structures', () => {
    let payload: Record<string, unknown> = {};
    for (let index = 0; index < 12; index += 1) payload = { child: payload };
    expect(isLiveMessage({ ...createMessage('state-request', 'side-panel', {}), payload })).toBe(false);
    expect(isLiveMessage(JSON.parse('{"protocolVersion":1,"type":"state-request","timestamp":"2026-01-01T00:00:00.000Z","origin":"side-panel","payload":{"__proto__":{"polluted":true}}}'))).toBe(false);
  });
});
