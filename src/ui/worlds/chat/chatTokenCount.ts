import type { ChatTokenUsage } from '../../../types/domain';

type FormatTokenCountCopy = {
  formatNumber: (value: number) => string;
  totalLabel: (count: string) => string;
};

export function formatTokenCount(
  tokenCount: number | undefined,
  tokenUsage: ChatTokenUsage | undefined,
  copy: FormatTokenCountCopy
) {
  const totalTokens = tokenUsage?.totalTokens ?? tokenCount;
  if (typeof totalTokens !== 'number' || !Number.isFinite(totalTokens) || totalTokens < 0) return '';

  return copy.totalLabel(copy.formatNumber(totalTokens));
}
