import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '../../../../types/domain';
import { useI18n } from '../../../../i18n';
import { Icon } from '../../../Icon';
import { formatTokenCount } from '../chatTokenCount';

export function MessageTokenUsage({ message }: { message: ChatMessage }) {
  const { language, formatNumber, t } = useI18n();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
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
          <p className="message-token-note">{t('chat.messageMeta.tokenUsageNote')}</p>
        </dialog>
      ) : null}
    </div>
  );
}
