import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMessage, ToolInvocation } from '../../../../types/domain';
import type { I18nTranslator } from '../../../../i18n';
import { useI18n } from '../../../../i18n';
import { Icon } from '../../../Icon';
import { toolIconName } from '../chatToolIcons';
import { buildThinkingSessionSummary } from '../thinkingSummary';

type ThinkingSheetProps = {
  message: ChatMessage | null;
  messages: ChatMessage[];
  assistantName: string;
  onClose: () => void;
};

function localizeToolStatus(status: ToolInvocation['status'], t: I18nTranslator['t']) {
  switch (status) {
    case 'running':
      return t('chat.thinking.toolStatus.running');
    case 'preview':
      return t('chat.thinking.toolStatus.preview');
    case 'applied':
      return t('chat.thinking.toolStatus.applied');
    case 'rolled_back':
      return t('chat.thinking.toolStatus.rolled_back');
    case 'superseded':
      return t('chat.thinking.toolStatus.superseded');
    case 'executed':
      return t('chat.thinking.toolStatus.executed');
    case 'saved':
      return t('chat.thinking.toolStatus.saved');
    case 'failed':
      return t('chat.thinking.toolStatus.failed');
    default:
      return status;
  }
}

export function ThinkingSheet({
  message,
  messages,
  assistantName,
  onClose
}: ThinkingSheetProps) {
  const { t } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);
  const session = useMemo(
    () => (message ? buildThinkingSessionSummary(messages, message.id) : null),
    [message, messages]
  );

  const isAvailable = Boolean(message && session);
  useEffect(() => {
    if (!isAvailable) return undefined;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isAvailable, message?.id, onClose]);

  // Portal into the app shell rather than the timeline: the dialog must be
  // centered on the entire screen, not clipped by scrolling message rows.
  const portalHost = typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLElement>('.app-shell.chat');
  if (!message || !session || !portalHost) return null;

  return createPortal(
    <div className="thinking-summary-overlay" role="dialog" aria-modal="true" aria-label={t('chat.thinking.sheetAria')}>
      <button type="button" className="thinking-summary-backdrop" aria-label={t('chat.thinking.closeAria')} onClick={onClose} />
      <div className="thinking-summary-sheet">
        <div className="thinking-summary-topbar">
          <button type="button" className="thinking-summary-close" ref={closeRef} onClick={onClose} aria-label={t('chat.thinking.closeAria')}>
            <Icon name="x" size={18} />
          </button>
          <div className="thinking-summary-title">
            <strong>thinking</strong>
            <span>{message.assistantName || assistantName}</span>
          </div>
          <div className="thinking-summary-spacer" aria-hidden="true" />
        </div>
        <div className="thinking-summary-list">
          {session.steps.map((step) => (
            <article key={step.id} className={`thinking-summary-step ${step.kind}`}>
              {step.kind === 'thinking' ? (
                <pre className="thinking-summary-thought-body">{step.rawText}</pre>
              ) : (
                <div className={`thinking-summary-tool-card ${step.tool.status}`}>
                  <div className="thinking-summary-tool-head">
                    <span className="thinking-summary-tool-heading">
                      <Icon name={toolIconName(step.tool)} size={14} />
                      {t('chat.thinking.toolKicker')}
                    </span>
                    <span className={`thinking-summary-tool-status ${step.tool.status}`}>
                      {localizeToolStatus(step.tool.status, t)}
                    </span>
                  </div>
                  <strong className="thinking-summary-tool-title">{step.tool.title}</strong>
                  <p className="thinking-summary-tool-detail">{step.tool.summary}</p>
                  {step.tool.themeSurfaceLabels?.length ? (
                    <div className="thinking-summary-tool-chip-row">
                      {step.tool.themeSurfaceLabels.map((label) => <span key={label}>{label}</span>)}
                    </div>
                  ) : null}
                  {step.tool.memoryItems?.length ? (
                    <div className="thinking-summary-tool-chip-row">
                      {step.tool.memoryItems.map((item) => <span key={item}>{item}</span>)}
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>,
    portalHost
  );
}
