export const INVENTORY_SELECTOR = '#inv-count';
export const SELL_BUTTON_SELECTOR = '#sell-all';
const SALE_TITLE = 'Vender tudo';
export interface InventoryCount { current: number; capacity: number }
export interface ConfirmationDom { card: HTMLElement; confirm: HTMLButtonElement; cancel: HTMLButtonElement }
const normalizeText = (value: string | null): string => value?.replace(/\s+/g, ' ').trim() ?? '';
export const readInventory = (): InventoryCount | null => {
  const text = document.querySelector<HTMLElement>(INVENTORY_SELECTOR)?.textContent;
  const match = text?.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/); if (!match) return null;
  return { current: Number.parseInt(match[1], 10), capacity: Number.parseInt(match[2], 10) };
};
export const readSellButton = (): HTMLButtonElement | null => {
  const element = document.querySelector(SELL_BUTTON_SELECTOR); return element instanceof HTMLButtonElement ? element : null;
};
export const isSellButtonReady = (button: HTMLButtonElement): boolean => button.isConnected && !button.disabled && !button.hasAttribute('disabled') && !button.classList.contains('cd');
export const isElementVisible = (element: HTMLElement): boolean => {
  if (!element.isConnected || element.hidden || element.closest('[hidden]')) return false;
  const style = getComputedStyle(element); return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.getClientRects().length > 0;
};
export const findSaleConfirmation = (): ConfirmationDom | null => {
  for (const card of document.querySelectorAll<HTMLElement>('.im-card')) {
    if (!isElementVisible(card)) continue;
    const title = card.querySelector<HTMLElement>('#confirm-modal-body .sell-sum-head');
    const confirm = card.querySelector<HTMLButtonElement>('.confirm-actions > #confirm-yes');
    const cancel = card.querySelector<HTMLButtonElement>('.confirm-actions > #confirm-no');
    if (normalizeText(title?.textContent ?? null) === SALE_TITLE && confirm && cancel) return { card, confirm, cancel };
  } return null;
};
export const canConfirmSale = (dom: ConfirmationDom): boolean => isElementVisible(dom.card) && isElementVisible(dom.confirm) && dom.confirm.isConnected && !dom.confirm.disabled && !dom.confirm.hasAttribute('disabled') && normalizeText(dom.confirm.textContent) === SALE_TITLE;
