import { describe, expect, it } from 'vitest';
import { summarizeAcpMemoryReceipts } from './chatAcpMemoryReceipt';

describe('ACP memory tool receipts', () => {
  it('reports a committed low-risk memory write as successful', () => {
    expect(summarizeAcpMemoryReceipts([
      { status: 'executed', summary: '已写入 1 条低风险记忆' }
    ])).toEqual({
      isError: false,
      text: '已写入 1 条低风险记忆'
    });
  });

  it('never reports a write preview as already committed', () => {
    expect(summarizeAcpMemoryReceipts([
      { status: 'preview', summary: '新增长期资料' }
    ])).toEqual({
      isError: true,
      text: '等待用户在 Conflux 中确认，尚未写入：新增长期资料'
    });
  });

  it('reports partial memory writes and pending approval separately', () => {
    const result = summarizeAcpMemoryReceipts([
      { status: 'executed', summary: '已写入 1 条低风险记忆' },
      { status: 'preview', summary: '敏感记忆需要确认' }
    ]);
    expect(result.isError).toBe(true);
    expect(result.text).toContain('已写入 1 条低风险记忆');
    expect(result.text).toContain('尚未写入：敏感记忆需要确认');
  });

  it('fails closed when a memory invocation cannot be read back', () => {
    expect(summarizeAcpMemoryReceipts([])).toMatchObject({ isError: true });
    expect(summarizeAcpMemoryReceipts([
      { status: 'failed', summary: '写入失败', error: '没有可写入的协作者' }
    ])).toEqual({
      isError: true,
      text: '没有可写入的协作者'
    });
  });
});
