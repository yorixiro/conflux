import type { ChatMessage, ToolInvocation } from '../../../types/domain';

export type ThinkingSummaryItem = {
  id: string;
  kind: 'action' | 'note';
  title: string;
  detail: string;
};

export type ThinkingSessionThoughtStep = {
  id: string;
  kind: 'thinking';
  rawText: string;
};

export type ThinkingSessionToolStep = {
  id: string;
  kind: 'tool';
  tool: ToolInvocation;
};

export type ThinkingSessionStep = ThinkingSessionThoughtStep | ThinkingSessionToolStep;

export type ThinkingSessionSummary = {
  steps: ThinkingSessionStep[];
};

const ACTION_PATTERN = /^(解压|审视|检查|读取|查看|分析|整理|追踪|确认|提取|生成|计划|修复|定位|判断|比较|对照|汇总|梳理)/;
const LIST_ITEM_PATTERN = /^([\-*+•●○▪◦]|\d+[.)]|[A-Za-z][.)])\s+/;
const HEADING_LINE_PATTERN = /^([A-Z][A-Z\s/-]{2,}|[A-Za-z][A-Za-z\s]{0,28}|[\u4e00-\u9fff]{1,14})([:：])$/;

function normalizeThinkingText(thinkingText: string) {
  return thinkingText
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitSentences(text: string) {
  const sentences: string[] = [];
  let startIndex = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (!character || !'。！？!?；;'.includes(character)) continue;

    const sentence = text.slice(startIndex, index + 1).trim();
    if (sentence) sentences.push(sentence);
    startIndex = index + 1;
  }

  const tail = text.slice(startIndex).trim();
  if (tail) sentences.push(tail);
  return sentences;
}

function splitLongSentenceGroup(paragraph: string) {
  const sentences = splitSentences(paragraph);

  if (sentences.length <= 2) return [paragraph];

  const groups: string[] = [];
  let current = '';

  sentences.forEach((sentence) => {
    const next = current ? `${current} ${sentence}` : sentence;
    if (current && next.length > 140) {
      groups.push(current);
      current = sentence;
      return;
    }
    current = next;
  });

  if (current) groups.push(current);
  return groups.length > 1 ? groups : [paragraph];
}

function splitThinkingBlock(block: string) {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];
  if (lines.length === 1) return splitLongSentenceGroup(lines[0]);

  const hasExplicitStructure = lines.some((line) =>
    LIST_ITEM_PATTERN.test(line) || HEADING_LINE_PATTERN.test(line)
  );

  if (!hasExplicitStructure) {
    return splitLongSentenceGroup(lines.join(' '));
  }

  const paragraphs: string[] = [];
  let current = '';

  lines.forEach((line) => {
    if (HEADING_LINE_PATTERN.test(line)) {
      if (current) paragraphs.push(current);
      paragraphs.push(line);
      current = '';
      return;
    }

    if (LIST_ITEM_PATTERN.test(line)) {
      if (current) paragraphs.push(current);
      paragraphs.push(line);
      current = '';
      return;
    }

    current = current ? `${current} ${line}` : line;
  });

  if (current) paragraphs.push(current);
  return paragraphs;
}

function splitThinkingParagraphs(thinkingText: string) {
  const normalized = normalizeThinkingText(thinkingText);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n{2,}/)
    .flatMap((block) => splitThinkingBlock(block))
    .map((part) => part.replace(/^[\-\d.)、\s]+/, '').trim())
    .filter(Boolean);

  if (paragraphs.length > 0) return paragraphs;

  return splitSentences(normalized);
}

function summarizeTitle(paragraph: string) {
  const compact = paragraph.replace(/\s+/g, ' ').trim();
  const firstClause = compact.split(/[，。！？!?；;:：]/)[0]?.trim() ?? compact;
  if (firstClause.length <= 26) return firstClause;
  return `${firstClause.slice(0, 24)}...`;
}

function detectKind(text: string): ThinkingSummaryItem['kind'] {
  return ACTION_PATTERN.test(text) ? 'action' : 'note';
}

export function buildThinkingSummary(thinkingText: string, limit?: number): ThinkingSummaryItem[] {
  const paragraphs = splitThinkingParagraphs(thinkingText);
  const visibleParagraphs =
    typeof limit === 'number' && Number.isFinite(limit)
      ? paragraphs.slice(0, Math.max(0, Math.floor(limit)))
      : paragraphs;

  return visibleParagraphs
    .map((paragraph, index) => ({
      id: `thinking-${index}`,
      kind: detectKind(paragraph),
      title: summarizeTitle(paragraph),
      detail: paragraph
    }));
}

function collectThinkingSessionMessages(messages: ChatMessage[], activeMessageId: string) {
  const activeIndex = messages.findIndex((message) => message.id === activeMessageId);
  if (activeIndex < 0) return [];

  let startIndex = activeIndex;
  for (let index = activeIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role === 'user' && !message.toolInvocation) {
      break;
    }

    if (message.role === 'system' && message.origin !== 'tool-runtime') {
      break;
    }

    startIndex = index;
  }

  return messages.slice(startIndex, activeIndex + 1);
}

export function buildThinkingSessionSummary(
  messages: ChatMessage[],
  activeMessageId: string
): ThinkingSessionSummary | null {
  const sessionMessages = collectThinkingSessionMessages(messages, activeMessageId);
  if (sessionMessages.length === 0) return null;

  // Display the provider's original thinking text; never re-summarize or reformat it.
  const steps = sessionMessages.flatMap<ThinkingSessionStep>((message) => {
    if (message.toolInvocation) {
      return [{ id: message.id, kind: 'tool', tool: message.toolInvocation }];
    }
    if (message.role !== 'assistant' || !message.thinkingText?.trim()) return [];
    return [{ id: message.id, kind: 'thinking', rawText: message.thinkingText }];
  });

  return steps.length > 0 ? { steps } : null;
}
