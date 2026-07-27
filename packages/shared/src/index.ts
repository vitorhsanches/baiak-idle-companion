export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const formatDuration = (seconds: number): string =>
  `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
