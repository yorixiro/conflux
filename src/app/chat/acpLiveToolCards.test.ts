import { describe, expect, it } from 'vitest';
import {
  beginAcpToolStream,
  getAcpToolCardsSnapshot,
  publishAcpToolUpdate,
  requestAcpPermissionChoice,
  resolveAcpPermission
} from './acpLiveToolCards';

describe('ACP inline tool activity', () => {
  it('shows an agent tool as a compact running/completed card', () => {
    const conversationId = 'test-tool-card';
    beginAcpToolStream(conversationId);
    publishAcpToolUpdate(conversationId, {
      sessionUpdate: 'tool_call',
      toolCallId: 'tool-1',
      title: '读取工作区文件',
      status: 'in_progress'
    });
    expect(getAcpToolCardsSnapshot().find((card) => card.conversationId === conversationId)?.state)
      .toBe('running');
    publishAcpToolUpdate(conversationId, {
      sessionUpdate: 'tool_call_update',
      toolCallId: 'tool-1',
      status: 'completed'
    });
    expect(getAcpToolCardsSnapshot().find((card) => card.conversationId === conversationId)?.state)
      .toBe('executed');
    beginAcpToolStream(conversationId);
  });

  it('handles a permission request inline with no native browser confirm', async () => {
    const conversationId = 'test-inline-permission';
    beginAcpToolStream(conversationId);
    const promise = requestAcpPermissionChoice({
      conversationId,
      permissionId: 'request-1',
      title: '允许操作',
      description: '操作详情',
      options: [
        { optionId: 'yes', name: '允许本次', kind: 'allow_once' },
        { optionId: 'no', name: '拒绝', kind: 'reject_once' }
      ]
    });
    const pending = getAcpToolCardsSnapshot().find((card) => card.conversationId === conversationId);
    expect(pending?.state).toBe('approval');
    expect(pending?.options).toHaveLength(2);
    resolveAcpPermission('permission:request-1', 'yes');
    await expect(promise).resolves.toBe('yes');
    beginAcpToolStream(conversationId);
  });

  it('clears pending permission if its request is aborted', async () => {
    const conversationId = 'test-permission-abort';
    beginAcpToolStream(conversationId);
    const controller = new AbortController();
    const promise = requestAcpPermissionChoice({
      conversationId,
      permissionId: 'request-aborted',
      title: '临时授权',
      description: '',
      signal: controller.signal,
      options: [{ optionId: 'yes', name: '允许本次', kind: 'allow_once' }]
    });
    controller.abort();
    await expect(promise).resolves.toBe(null);
    beginAcpToolStream(conversationId);
  });
});
