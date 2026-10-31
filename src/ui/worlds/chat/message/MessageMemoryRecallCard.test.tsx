import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChatMemoryEvidence } from '../../../../types/domain';
import { createTranslator } from '../../../../i18n';
import { getRecallSourceLabels, MessageMemoryRecallCard } from './MessageMemoryRecallCard';

const evidence: ChatMemoryEvidence = {
  requestId: 'req-1',
  strategy: 'semantic_index',
  status: 'within_budget',
  items: [{
    id: 'hit-1',
    kind: 'vector_match',
    label: '过去的讨论',
    sourceConversationId: 'old-chat',
    sourceMessageIds: ['u1', 'a1'],
    textExcerpt: '这是原始对话真实命中的一段文字。',
    estimatedTokens: 28,
    charCount: 24,
    score: .82,
    memoryChunkKind: 'dialogue_turn'
  }]
};

describe('MessageMemoryRecallCard', () => {
  it('renders an accessible collapsed receipt containing only evidence-backed category labels', () => {
    const html = renderToStaticMarkup(
      <MessageMemoryRecallCard evidence={evidence} copy={createTranslator('zh-CN')} />
    );
    expect(html).toContain('记忆浮现');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('聊天记录');
    expect(html).toContain('语义片段');
    expect(html).not.toContain('关系底座');
    expect(html).toContain('这是原始对话真实命中的一段文字。');
  });

  it('does not claim diary, profile, summary or calendar sources without provenance', () => {
    expect(getRecallSourceLabels(evidence).map(item => item.zh)).toEqual(['聊天记录', '语义片段']);
    expect(getRecallSourceLabels({ ...evidence, items: [] })).toEqual([]);
    expect(getRecallSourceLabels({
      ...evidence,
      items: [{ ...evidence.items[0], kind: 'matched_context', sourceConversationId: null, sourceMessageIds: [] }]
    }).map(item => item.zh)).toEqual(['上下文命中']);
  });

  it('uses English chrome when the app language is English, without altering the source excerpt', () => {
    const html = renderToStaticMarkup(
      <MessageMemoryRecallCard evidence={evidence} copy={createTranslator('en-US')} />
    );
    expect(html).toContain('Memory surfaced');
    expect(html).toContain('Chat history');
    expect(html).toContain('Semantic match');
    expect(html).toContain('这是原始对话真实命中的一段文字。');
  });
});
