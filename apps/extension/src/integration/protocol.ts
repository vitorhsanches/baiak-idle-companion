import type { CharacterSnapshot, DataConfidence } from '@companion/domain';

export const LIVE_PROTOCOL_VERSION = 1;
export const GAME_ORIGIN = 'https://baiakidle.com';
export const GAME_PATH_PREFIX = '/jogar/';
export const MAX_MESSAGE_BYTES = 64_000;
export const MAX_STRING_LENGTH = 500;

export type IntegrationStatus =
  | 'disabled'
  | 'waiting-for-game-tab'
  | 'game-page-detected'
  | 'reading-visible-dom'
  | 'snapshot-available'
  | 'partial-snapshot'
  | 'dom-structure-unsupported'
  | 'permission-unavailable'
  | 'error';

export interface SelectorDiagnostic {
  logicalName: string;
  selectorVersion: number;
  matchedCount: number;
  reason?: string;
  tag?: string;
  semanticAttributes: string[];
}

export interface LiveSnapshot {
  id: string;
  schemaVersion: 1;
  selectorVersion: number;
  timestamp: string;
  origin: 'real-dom';
  pagePath: string;
  confidence: DataConfidence;
  missingFields: string[];
  warnings: string[];
  character: CharacterSnapshot;
  diagnostics: SelectorDiagnostic[];
  catalogReference?: string;
}

type ContentPayloads = {
  'content-status': { status: IntegrationStatus };
  'snapshot-update': { snapshot: LiveSnapshot };
  'adapter-error': { code: string; message: string };
  'selector-diagnostics': { diagnostics: SelectorDiagnostic[] };
};
type PanelPayloads = {
  'integration-set': { enabled: boolean };
  'data-clear-request': Record<string, never>;
  'snapshot-refresh-request': Record<string, never>;
  'state-request': Record<string, never>;
};
type BackgroundPayloads = {
  'integration-state': LiveIntegrationState;
};
type Payloads = ContentPayloads & PanelPayloads & BackgroundPayloads;
export type MessageType = keyof Payloads;
export type MessageOrigin = 'content-script' | 'side-panel' | 'background';

export type LiveMessage<T extends MessageType = MessageType> = {
  [K in T]: {
    protocolVersion: typeof LIVE_PROTOCOL_VERSION;
    type: K;
    timestamp: string;
    origin: MessageOrigin;
    payload: Payloads[K];
  };
}[T];

export interface LiveIntegrationState {
  enabled: boolean;
  status: IntegrationStatus;
  updatedAt: string;
  lastSnapshot?: LiveSnapshot;
  diagnostics: SelectorDiagnostic[];
  error?: string;
}

export const defaultLiveState = (): LiveIntegrationState => ({
  enabled: false,
  status: 'disabled',
  updatedAt: new Date().toISOString(),
  diagnostics: []
});

const allowedKeys = new Set(['protocolVersion', 'type', 'timestamp', 'origin', 'payload']);
const types = new Set<MessageType>([
  'content-status', 'snapshot-update', 'adapter-error', 'selector-diagnostics',
  'integration-set', 'data-clear-request', 'snapshot-refresh-request', 'state-request',
  'integration-state'
]);
const origins = new Set<MessageOrigin>(['content-script', 'side-panel', 'background']);

const safeStructure = (value: unknown, depth = 0): boolean => {
  if (depth > 8) return false;
  if (typeof value === 'string') return value.length <= MAX_STRING_LENGTH;
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length <= 200 && value.every((item) => safeStructure(item, depth + 1));
  if (typeof value !== 'object') return false;
  const object = value as Record<string, unknown>;
  if (Object.getPrototypeOf(object) !== Object.prototype) return false;
  return Object.keys(object).length <= 100 && Object.entries(object).every(([key, item]) =>
    key !== '__proto__' && key !== 'constructor' && key !== 'prototype' &&
    key.length <= 80 && safeStructure(item, depth + 1));
};

export const messageSize = (message: unknown): number => new TextEncoder().encode(JSON.stringify(message)).byteLength;

export const isLiveMessage = (value: unknown): value is LiveMessage => {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some((key) => !allowedKeys.has(key))) return false;
  if (raw.protocolVersion !== LIVE_PROTOCOL_VERSION || !types.has(raw.type as MessageType) || !origins.has(raw.origin as MessageOrigin)) return false;
  if (typeof raw.timestamp !== 'string' || Number.isNaN(Date.parse(raw.timestamp))) return false;
  try {
    if (messageSize(value) > MAX_MESSAGE_BYTES) return false;
  } catch {
    return false;
  }
  return safeStructure(raw.payload);
};

export const createMessage = <T extends MessageType>(
  type: T,
  origin: MessageOrigin,
  payload: Payloads[T]
): LiveMessage<T> => ({ protocolVersion: LIVE_PROTOCOL_VERSION, type, timestamp: new Date().toISOString(), origin, payload } as LiveMessage<T>);
