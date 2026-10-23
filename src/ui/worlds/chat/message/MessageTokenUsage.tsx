import { useLayoutEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../../types/domain';
import { useI18n } from '../../../../i18n';
import { Icon } from '../../../Icon';
import { formatTokenCount } from '../chatTokenCount';

export function MessageTokenUsage({ message }: { message: ChatMessage }) {
  const { language, formatNumber, t } = useI18n();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const usage = message.tokenUsage;
  const tokenLabel = formatTokenCount(message.tokenCount, usage, {
    formatNumber,
    totalLabel: count => t('chat.messageMeta.tokenCount', { count })
  });
  const metrics = [
    ['settings.usage.totalTokens', usage?.totalTokens ?? message.tokenCount],
    ['settings.usage.input', usage?.inputTokens],
    ['settings.usage.output', usage?.outputTokens],
    ['settings.usage.cacheRead', usage?.cachedInputTokens],
    ['settings.usage.cacheMiss', usage?.cacheMissInputTokens],
    ['settings.usage.cacheWrite', usage?.cacheCreationInputTokens],
    ['settings.usage.reasoning', usage?.reasoningTokens]
  ] as const;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!open || !dialog || !trigger) return;

    const position = () => {
      const anchor = trigger.getBoundingClientRect();
      const card = dialog.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const topEdge = (viewport?.offsetTop ?? 0) + 8;
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16;
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 16;
      const above = anchor.top - card.height - 6;
      const top = above >= topEdge ? above : anchor.bottom + 6;
      dialog.style.left = `${Math.max(leftEdge, Math.min(anchor.left, rightEdge - card.width))}px`;
      dialog.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - card.height))}px`;
    };

    dialog.showModal();
    position();
    const resizeObserver = new ResizeObserver(position);
    resizeObserver.observe(dialog);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [open]);

  const close = () => {
    dialogRef.current?.close();
    setOpen(false);
  };

  return (
    <div className="message-usage-meta">
      <time dateTime={new Date(message.timestamp).toISOString()}>
        {new Date(message.timestamp).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
      </time>
      <button
        ref={triggerRef}
        type="button"
        className="message-token-trigger"
        aria-label={t('chat.messageMeta.openTokenUsage')}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >{tokenLabel || 'Token'}</button>
      {open ? (
        <dialog
          ref={dialogRef}
          className="message-token-dialog"
          aria-label={t('chat.messageMeta.tokenUsage')}
          onCancel={event => { event.preventDefault(); close(); }}
          onClick={event => { if (event.target === event.currentTarget) close(); }}
        >
          <header>
            <h2>{t('chat.messageMeta.tokenUsage')}</h2>
            <button type="button" onClick={close} aria-label={t('chat.messageMeta.closeTokenUsage')}><Icon name="x" size={18} /></button>
          </header>
          {message.model ? <p className="message-token-model">{[message.providerName, message.model].filter(Boolean).join(' · ')}</p> : null}
          <dl>
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{typeof value === 'number' ? formatNumber(value) : t('settings.usage.notRecorded')}</dd>
              </div>
            ))}
          </dl>
          <details className="message-token-note">
            <summary>{t('chat.messageMeta.tokenUsageAbout')}</summary>
            <p>{t('chat.messageMeta.tokenUsageNote')}</p>
          </details>
        </dialog>
      ) : null}
    </div>
  );
}
