import type { ToolInvocation } from '../../types/domain';

type MemoryReceipt = Pick<ToolInvocation, 'status' | 'summary' | 'error'>;

/**
 * Memory writes can be immediate, rejected, or held for user confirmation.
 * Never tell the ACP agent that a preview has already been committed.
 */
export function summarizeAcpMemoryReceipts(receipts: MemoryReceipt[]): {
  isError: boolean;
  text: string;
} {
  if (!receipts.length) {
    return { isError: true, text: 'Conflux 没有生成可验证的记忆执行回执，不能声称已写入。' };
  }

  const committed = receipts.filter((item) => item.status === 'executed' || item.status === 'applied' || item.status === 'saved');
  const pending = receipts.filter((item) => item.status === 'preview');
  const failed = receipts.filter((item) => item.status === 'failed' || item.status === 'rolled_back');
  const unconfirmed = receipts.filter((item) =>
    !committed.includes(item) && !pending.includes(item) && !failed.includes(item)
  );
  const messages = [
    ...committed.map((item) => item.summary || '已提交记忆操作。'),
    ...pending.map((item) => `等待用户在 Conflux 中确认，尚未写入：${item.summary || '记忆变更'}`),
    ...failed.map((item) => item.error || item.summary || '记忆操作失败或已取消。'),
    ...unconfirmed.map((item) => `操作尚未完成：${item.summary || item.status}`)
  ];

  return {
    isError: pending.length > 0 || failed.length > 0 || unconfirmed.length > 0,
    text: messages.join('\n').slice(0, 90000)
  };
}
