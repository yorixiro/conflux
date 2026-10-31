import { useId, useState } from 'react';
import type { ChatMemoryEvidence } from '../../../../types/domain';
import type { I18nTranslator } from '../../../../i18n';
import { useI18n } from '../../../../i18n';
import { Icon } from '../../../Icon';
import { MessageMemoryEvidence } from './MessageMemoryEvidence';

type RecallLabel = { key: string; zh: string; en: string };

/** Only classify facts present in the recall receipt; never infer product memory categories from excerpt text. */
export function getRecallSourceLabels(evidence: ChatMemoryEvidence): RecallLabel[] {
  if (!evidence.items.length) return [];
  const labels: RecallLabel[] = [];
  if (evidence.items.some(item => Boolean(item.sourceConversationId && item.sourceMessageIds.length))) {
    labels.push({ key: 'conversation', zh: '聊天记录', en: 'Chat history' });
  }
  if (evidence.items.some(item => item.kind === 'vector_match')) {
    labels.push({ key: 'vector', zh: '语义片段', en: 'Semantic match' });
  }
  if (evidence.items.some(item => item.kind === 'matched_context')) {
    labels.push({ key: 'context', zh: '上下文命中', en: 'Context match' });
  }
  if (evidence.items.some(item => item.kind === 'voice_anchor')) {
    labels.push({ key: 'anchor', zh: '对话锚点', en: 'Conversation anchor' });
  }
  if (evidence.items.some(item => item.kind === 'recent_tail')) {
    labels.push({ key: 'recent', zh: '最近对话', en: 'Recent chat' });
  }
  return labels.length ? labels : [{ key: 'unknown', zh: '记忆片段', en: 'Memory excerpt' }];
}

type Props = {
  evidence: ChatMemoryEvidence;
  copy?: I18nTranslator;
};

export function MessageMemoryRecallCard({ evidence, copy }: Props) {
  const fallback = useI18n();
  const { language, formatNumber } = copy ?? fallback;
  const [expanded, setExpanded] = useState(false);
  const regionId = useId();
  if (!evidence.items.length) return null;

  const chinese = language.startsWith('zh');
  const title = chinese ? '记忆浮现' : 'Memory surfaced';
  const detail = chinese ? '点击查看本轮命中片段' : 'Open recalled excerpts from this turn';
  const labels = getRecallSourceLabels(evidence);
  const countLabel = chinese
    ? `${formatNumber(evidence.items.length)} 段`
    : `${formatNumber(evidence.items.length)} excerpts`;

  return (
    <section className={`message-memory-recall-card ${expanded ? 'is-open' : ''}`} aria-label={title}>
      <button
        type="button"
        className="message-memory-recall-handle"
        aria-expanded={expanded}
        aria-controls={regionId}
        aria-label={`${title}，${countLabel}，${expanded ? (chinese ? '收起' : 'Collapse') : (chinese ? '展开' : 'Expand')}`}
        onClick={() => setExpanded(value => !value)}
      >
        <span className="message-memory-recall-symbol" aria-hidden="true"><Icon name="sparkle" size={17} /></span>
        <span className="message-memory-recall-title">{title}</span>
        <span className="message-memory-recall-tags" aria-hidden="true">
          {labels.slice(0, 2).map(label => (
            <span className="message-memory-recall-tag" key={label.key}>{chinese ? label.zh : label.en}</span>
          ))}
        </span>
        <span className="message-memory-recall-count">{countLabel}</span>
        <span className="message-memory-recall-chevron" aria-hidden="true"><Icon name="chevronDown" size={16} /></span>
      </button>
      <div className="message-memory-recall-drawer" id={regionId} aria-hidden={!expanded}>
        <div className="message-memory-recall-drawer-inner">
          <p className="message-memory-recall-description">{detail}</p>
          <MessageMemoryEvidence evidence={evidence} expanded={true} onToggle={() => {}} showTrigger={false} copy={copy} />
        </div>
      </div>
    </section>
  );
}
