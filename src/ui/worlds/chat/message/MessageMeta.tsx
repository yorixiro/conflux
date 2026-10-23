import type { ChatMessage } from '../../../../types/domain';
import { Icon } from '../../../Icon';
import { useI18n } from '../../../../i18n';

type MessageMetaProps = {
  message: ChatMessage;
  fallbackAssistantName: string;
  isThinkingActive: boolean;
  onOpenThinkingSummary: (message: ChatMessage) => void;
  showIdentity?: boolean;
  showName?: boolean;
  showDetails?: boolean;
  showThinking?: boolean;
  splitIdentityLines?: boolean;
};

export function MessageMeta({
  message,
  fallbackAssistantName,
  isThinkingActive,
  onOpenThinkingSummary,
  showIdentity = true,
  showName = true,
  showDetails = true,
  showThinking = true,
  splitIdentityLines = false
}: MessageMetaProps) {
  const { t } = useI18n();
  const identityName = message.assistantName || fallbackAssistantName;
  const showIdentityDetail = showDetails && Boolean(message.model);
  const identityDetail = (
    <>
      {message.model && <span className="message-identity-pill">{message.model}</span>}
    </>
  );

  return (
    <>
      <div className={`message-identity-row ${showIdentity ? '' : 'thinking-only'}`.trim()}>
        {showIdentity ? (
          <div className={splitIdentityLines ? 'message-identity-stack' : 'message-identity-meta'}>
            {splitIdentityLines && showName ? (
              <>
                <span className="message-identity-name message-identity-name-primary">{identityName}</span>
                {showIdentityDetail ? (
                  <div className="message-identity-meta message-identity-secondary">
                    {identityDetail}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                {showName ? <span className="message-identity-name">{identityName}</span> : null}
                {showIdentityDetail ? identityDetail : null}
              </>
            )}
          </div>
        ) : null}
        {showThinking && message.thinkingText ? (
          <button
            type="button"
            className={`thinking-inline-trigger ${isThinkingActive ? 'active' : ''}`}
            aria-label={isThinkingActive ? t('chat.messageActions.openThinkingActive') : t('chat.messageActions.openThinking')}
            title={isThinkingActive ? t('chat.messageActions.thinkingTitleActive') : t('chat.messageActions.thinkingTitle')}
            onClick={() => onOpenThinkingSummary(message)}
          >
            <span className={`thinking-inline-icon ${isThinkingActive ? 'spinning' : ''}`} aria-hidden="true">
              <Icon name="polarisStar" size={14} color="polarisDeepSpace" />
            </span>
          </button>
        ) : null}
      </div>
    </>
  );
}
