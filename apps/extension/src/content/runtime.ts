const CONTEXT_INVALIDATED_MESSAGE = 'Extension context invalidated';

export const isExtensionContextInvalidated = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'message' in error &&
  typeof error.message === 'string' && error.message.includes(CONTEXT_INVALIDATED_MESSAGE);

export const isExtensionRuntimeUsable = (): boolean => {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
};

export const contextInvalidatedError = (): Error => new Error(CONTEXT_INVALIDATED_MESSAGE);
