import { useSyncExternalStore } from 'react';
import {
  getAcpToolCardsSnapshot,
  resolveAcpPermission,
  subscribeAcpToolCards
} from '../../../../app/chat/acpLiveToolCards';

/** Inline, non-modal ACP activity. Existing Conflux tool cards remain unchanged. */
export function AcpLiveToolCards({ conversationId }: { conversationId: string | null }) {
  const allCards = useSyncExternalStore(subscribeAcpToolCards, getAcpToolCardsSnapshot, getAcpToolCardsSnapshot);
  const visible = conversationId
    ? allCards.filter((card) =>
        card.conversationId === conversationId ||
        card.conversationId.startsWith(conversationId + '::')
      ).slice(-5)
    : [];
  if (!visible.length) return null;

  return (
    <div className="acp-live-tool-cards" aria-live="polite">
      {visible.map((card) => {
        const pending = card.state === 'approval';
        const status = pending ? 'running' : card.state;
        const allow = card.options?.find((option) => option.kind === 'allow_once');
        const reject = card.options?.find((option) => option.kind === 'reject_once');
        return (
          <div key={card.conversationId + ':' + card.id}
            className={`tool-event ${status} ${pending ? 'expanded' : 'collapsed'}`}>
            <div className="tool-event-compact">
              <span className={`tool-event-icon ${status}`} aria-hidden="true">⌘</span>
              <div className="tool-event-compact-copy">
                <div className="tool-event-summary tool-event-summary-inline">
                  {card.title}
                  <span className={`tool-event-status ${status}`}>
                    {pending ? ' · 等待授权' : status === 'running' ? ' · 执行中' :
                      status === 'executed' ? ' · 已完成' : ' · 失败'}
                  </span>
                </div>
              </div>
            </div>
            {pending ? (
              <div className="tool-event-expanded">
                {card.description ? <p className="tool-event-summary">{card.description}</p> : null}
                <div className="tool-event-chip-row">
                  {allow ? <button type="button" onClick={() =>
                    resolveAcpPermission(card.id, allow.optionId)
                  }>允许本次</button> : null}
                  <button type="button" onClick={() =>
                    resolveAcpPermission(card.id, reject?.optionId ?? null)
                  }>拒绝</button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
