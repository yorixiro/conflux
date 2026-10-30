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
  const isDevinAcp = message.model === 'Devin ACP' || message.providerName === 'Devin ACP';
  const context = message.acpContextUsage;
  const acpReport = message.acpTokenReport;
  const tokenLabel = formatTokenCount(message.tokenCount, usage, {
    formatNumber,
    totalLabel: count => t('chat.messageMeta.tokenCount', { count })
  });
  const acpReportedTotal = acpReport?.totalTokens;
  const acpLabel = typeof acpReportedTotal === 'number'
    ? `ACP 报告 ${formatNumber(acpReportedTotal)} Token`
    : context ? `上下文 ${formatNumber(context.used)} Token`
      : 'Token 未提供';
  const metrics = [
    ['settings.usage.totalTokens', usage?.totalTokens ?? message.tokenCount],
    ['settings.usage.input', usage?.inputTokens],
    ['settings.usage.output', usage?.outputTokens],
    ['settings.usage.cacheRead', usage?.cachedInputTokens],
    ['settings.usage.cacheMiss', usage?.cacheMissInputTokens],
    ['settings.usage.cacheWrite', usage?.cacheCreationInputTokens],
    ['settings.usage.reasoning', usage?.reasoningTokens]
  ] as const;
  const hasUsage = metrics.some(([, value]) => typeof value === 'number');

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!open || !dialog || !trigger) return;

    const position = () => {
      const anchor = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const flow = trigger.closest('.chat-flow')?.getBoundingClientRect();
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const topEdge = Math.max((viewport?.offsetTop ?? 0) + 8, (flow?.top ?? 0) + 8);
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16;
      const bottomEdge = Math.min(
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - 8,
        (flow?.bottom ?? window.innerHeight) - 8
      );
      dialog.style.maxHeight = `${bottomEdge - topEdge}px`;
      const card = dialog.getBoundingClientRect();
      const below = Math.max(0, bottomEdge - anchor.bottom - 8);
      const above = Math.max(0, anchor.top - topEdge - 8);
      const placeBelow = card.height <= below || (card.height > above && below >= above);
      dialog.style.maxHeight = `${placeBelow ? below : above}px`;
      const height = dialog.getBoundingClientRect().height;
      const left = message.role === 'user' ? anchor.right - card.width : anchor.left;
      const top = placeBelow ? anchor.bottom + 8 : anchor.top - height - 8;
      dialog.style.left = `${Math.max(leftEdge, Math.min(left, rightEdge - card.width))}px`;
      dialog.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - height))}px`;
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
  }, [open, message.role]);

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
      >{tokenLabel || (isDevinAcp ? acpLabel : 'Token')}</button>
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
          {isDevinAcp && context ? (
            <p className="message-token-model">
              ACP 上下文：{formatNumber(context.used)} / {formatNumber(context.size)} Token（非本轮消耗）
            </p>
          ) : null}
          {isDevinAcp && acpReport ? (
            <div className="message-token-note">
              <p>Devin ACP 报告用量（可能是当前会话累计，不作为单轮计费统计）</p>
              <dl>
                {([
                  ['报告总量', acpReport.totalTokens],
                  ['输入', acpReport.inputTokens],
                  ['输出', acpReport.outputTokens],
                  ['缓存读取', acpReport.cachedInputTokens],
                  ['缓存写入', acpReport.cacheCreationInputTokens],
                  ['推理', acpReport.reasoningTokens]
                ] as const).filter(([, value]) => typeof value === 'number').map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{formatNumber(value!)}</dd></div>
                ))}
              </dl>
            </div>
          ) : null}
          {hasUsage ? <dl>
            {metrics.map(([label, value]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd>{typeof value === 'number' ? formatNumber(value) : t('settings.usage.notRecorded')}</dd>
              </div>
            ))}
          </dl> : isDevinAcp ? (
            <p className="message-token-empty">Devin 未提供可确认的单轮 Token 用量。</p>
          ) : <p className="message-token-empty">{t('chat.messageMeta.noTokenUsage')}</p>}
          {hasUsage ? <details className="message-token-note">
            <summary>{t('chat.messageMeta.tokenUsageAbout')}</summary>
            <p>{t('chat.messageMeta.tokenUsageNote')}</p>
          </details> : null}
        </dialog>
      ) : null}
    </div>
  );
}
