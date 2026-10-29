import { describe, expect, it } from 'vitest';
import { compareRequestCachePrefixes } from './requestCachePrefixDiagnostics';

describe('compareRequestCachePrefixes', () => {
  const initial = {
    tools: [{ function: { name: 'search' } }],
    messages: [
      { role: 'system', content: '固定人设' },
      { role: 'user', content: '你好' },
      { role: 'assistant', content: '你好！' }
    ]
  };

  it('recognizes an append-only conversation as a reusable prefix', () => {
    const next = {
      ...initial,
      messages: [...initial.messages, { role: 'user', content: '继续' }]
    };
    expect(compareRequestCachePrefixes(initial, next)).toEqual({
      status: 'stable', sharedMessageCount: 3, previousMessageCount: 3
    });
  });

  it('locates a changed opening system message without leaking its contents', () => {
    const next = {
      ...initial,
      messages: [{ role: 'system', content: '变化的人设' }, ...initial.messages.slice(1)]
    };
    expect(compareRequestCachePrefixes(initial, next)).toEqual({
      status: 'changed', sharedMessageCount: 0, previousMessageCount: 3,
      changedPart: 'messages', changedMessageIndex: 0
    });
  });

  it('locates a changed tool catalog before checking message history', () => {
    const next = { ...initial, tools: [{ function: { name: 'fetch' } }] };
    expect(compareRequestCachePrefixes(initial, next)).toEqual({
      status: 'changed', sharedMessageCount: 0, previousMessageCount: 3,
      changedPart: 'tools'
    });
  });

  it('detects moving history windows without retaining old message bodies', () => {
    const next = { ...initial, messages: initial.messages.slice(1) };
    expect(compareRequestCachePrefixes(initial, next)).toEqual({
      status: 'changed', sharedMessageCount: 0, previousMessageCount: 3,
      changedPart: 'messages', changedMessageIndex: 0
    });
  });
});
