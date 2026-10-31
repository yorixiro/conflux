import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CodeCardActionMode } from '../../../../app/chat/chatDerivedState';
import { CHAT_REACTION_CHOICES, type ChatReactionEmoji } from '../../../../app/chat/messageDecorations';
import { readMessageSpeechCacheBlob, saveMessageSpeechCache } from '../../../../app/chat/messageSpeechCache';
import { requestGeneratedSpeech } from '../../../../engines/voiceGenerationClient';
import { writeTextToClipboard } from '../../../../infrastructure/clipboard';
import { canUseNativeSystemBackupFiles, exportFileViaSystemFiles } from '../../../../native/systemBackupFiles';
import { useRuntimeStore } from '../../../../stores/runtimeStore';
import type { ChatMemoryEvidence, ChatMessageVoiceCache, ConversationTaskStatus } from '../../../../types/domain';
import { Icon } from '../../../Icon';
import { runSelectionAction, runSuccessAction } from '../../../haptics';
import { useI18n } from '../../../../i18n';
import { MessageMemoryEvidence } from './MessageMemoryEvidence';

async function exportSpeechBlob(blob: Blob, fileName: string) {
  if (canUseNativeSystemBackupFiles()) {
    return await exportFileViaSystemFiles(blob, fileName);
  }

  if (typeof File !== 'undefined' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
    const shareData: ShareData = { files: [file], title: fileName };
    if (typeof navigator.canShare !== 'function' || navigator.canShare(shareData)) {
      await navigator.share(shareData);
      return true;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export type MessageTaskReceiptAction = {
  status: ConversationTaskStatus;
  expanded: boolean;
  onToggle: () => void;
};

type MessageActionsProps = {
  canCopyMessage: boolean;
  canDecorate: boolean;
  isFavorite: boolean;
  reactionEmojis: readonly string[];
  onToggleFavorite: () => void;
  onToggleReaction: (emoji: ChatReactionEmoji) => void;
  canEditUser: boolean;
  canDelete: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onEditUser: () => void;
  onDelete: () => void;
  canEditAssistant: boolean;
  canForkAssistant: boolean;
  canRetryAssistant: boolean;
  retryAssistantLabel?: string;
  canOpenThinkingSummary: boolean;
  memoryEvidence?: ChatMemoryEvidence | null;
  taskReceiptAction?: MessageTaskReceiptAction | null;
  codeCardActionLabel: string;
  codeCardActionMode: CodeCardActionMode;
  codeCardProgressLabel: string | null;
  isThinkingActive: boolean;
  messageContent: string;
  speechContent: string;
  speechCache?: ChatMessageVoiceCache | null;
  role: 'assistant' | 'user';
  onSetCommandStatus: (text: string, isError?: boolean) => void;
  onCodeCardAction: () => void;
  onEditAssistant: (content: string) => void;
  onSpeechCacheReady: (voiceCache: ChatMessageVoiceCache) => void;
  onForkAssistant: () => void;
  onOpenThinkingSummary: () => void;
  onRetryLatestAssistant: () => void;
};

export function MessageActions({
  canCopyMessage,
  canDecorate,
  isFavorite,
  reactionEmojis,
  onToggleFavorite,
  onToggleReaction,
  canEditUser,
  canDelete,
  menuOpen,
  onMenuOpenChange,
  onEditUser,
  onDelete,
  canEditAssistant,
  canForkAssistant,
  canRetryAssistant,
  retryAssistantLabel,
  canOpenThinkingSummary,
  memoryEvidence = null,
  taskReceiptAction = null,
  codeCardActionLabel,
  codeCardActionMode,
  codeCardProgressLabel,
  isThinkingActive,
  messageContent,
  speechContent,
  speechCache = null,
  role,
  onSetCommandStatus,
  onCodeCardAction,
  onEditAssistant,
  onSpeechCacheReady,
  onForkAssistant,
  onOpenThinkingSummary,
  onRetryLatestAssistant
}: MessageActionsProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [nativeSpeechAvailable, setNativeSpeechAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speechLoading, setSpeechLoading] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelMode, setPanelMode] = useState<'menu' | 'edit' | 'memory' | 'reactions'>('menu');
  const [assistantDraft, setAssistantDraft] = useState(messageContent);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const voiceGeneration = useRuntimeStore((state) => state.voiceGeneration);
  const showCodeCardAction = codeCardActionMode !== 'hidden';
  const hasMemoryEvidence = role === 'assistant' && Boolean(memoryEvidence?.items.length);
  const hasSpeechCache = role === 'assistant' && Boolean(speechCache?.assetId);
  const hasMore = canDecorate || canCopyMessage || canEditUser || canEditAssistant || canDelete || canForkAssistant || canRetryAssistant || hasMemoryEvidence || hasSpeechCache;
  const speakableContent = speechContent.trim();
  const canUseConfiguredSpeech = voiceGeneration.enabled && Boolean(voiceGeneration.baseUrl?.trim() && voiceGeneration.apiKey?.trim());
  const canSpeakAssistant = role === 'assistant' && Boolean(speakableContent) && (hasSpeechCache || canUseConfiguredSpeech || nativeSpeechAvailable);
  const resolvedRetryAssistantLabel = retryAssistantLabel ?? t('chat.messageActions.retry');

  useEffect(() => {
    if (!menuOpen) {
      setAssistantDraft(messageContent);
      setPanelMode('menu');
    }
  }, [menuOpen, messageContent]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!menuOpen || !dialog || !trigger) return;
    if (!dialog.open) dialog.showModal();
    if (panelMode !== 'menu') {
      dialog.style.removeProperty('left');
      dialog.style.removeProperty('top');
      dialog.style.removeProperty('max-height');
      return;
    }
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
      dialog.style.maxHeight = `${Math.max(0, bottomEdge - topEdge)}px`;
      const card = dialog.getBoundingClientRect();
      const left = role === 'user' ? anchor.right - card.width : anchor.left;
      const top = anchor.bottom + 6 + card.height <= bottomEdge
        ? anchor.bottom + 6 : anchor.top - card.height - 6;
      dialog.style.left = `${Math.max(leftEdge, Math.min(left, rightEdge - card.width))}px`;
      dialog.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - card.height))}px`;
    };
    position();
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [menuOpen, panelMode, role]);

  useEffect(() => {
    setNativeSpeechAvailable(typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  }, []);

  useEffect(() => () => {
    stopSpeechPlayback();
  }, []);

  if (!canCopyMessage && !canSpeakAssistant && !hasMore && !showCodeCardAction && !canOpenThinkingSummary && !taskReceiptAction) {
    return null;
  }

  const copyMessage = async () => {
    if (!messageContent.trim()) return;
    await runSuccessAction(() => writeTextToClipboard(messageContent));
    onSetCommandStatus(t('chat.messageActions.copied'));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  function stopSpeechPlayback() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = '';
      audioRef.current = null;
    }
    const currentUrl = audioUrlRef.current;
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      audioUrlRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    setSpeaking(false);
    setSpeechLoading(false);
  }

  const playNativeSpeech = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const playConfiguredSpeech = async (text: string) => {
    if (!voiceGeneration.baseUrl?.trim() || !voiceGeneration.apiKey?.trim()) {
      onSetCommandStatus(t('chat.messageActions.chooseVoiceProvider'), true);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setSpeechLoading(true);
    try {
      const result = await requestGeneratedSpeech({
        settings: voiceGeneration,
        text,
        signal: controller.signal
      });
      if (controller.signal.aborted) return;
      try {
        const voiceCache = await saveMessageSpeechCache({
          text,
          settings: voiceGeneration,
          result
        });
        if (!controller.signal.aborted) {
          onSpeechCacheReady(voiceCache);
        }
      } catch {
        onSetCommandStatus(t('chat.messageActions.speechCacheSaveFailed'), true);
      }
      if (!controller.signal.aborted) {
        await playAudioBlob(result.blob);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : t('chat.messageActions.speechGenerationFailed');
      onSetCommandStatus(message, true);
      stopSpeechPlayback();
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setSpeechLoading(false);
    }
  };

  const playAudioBlob = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audioUrlRef.current = url;
    audio.onended = () => {
      if (audioRef.current !== audio) return;
      stopSpeechPlayback();
    };
    audio.onerror = () => {
      if (audioRef.current !== audio) return;
      onSetCommandStatus(t('chat.messageActions.audioPlaybackFailed'), true);
      stopSpeechPlayback();
    };
    setSpeaking(true);
    await audio.play();
  };

  const playCachedSpeech = async (cache: ChatMessageVoiceCache) => {
    setSpeechLoading(true);
    try {
      const blob = await readMessageSpeechCacheBlob(cache);
      await playAudioBlob(blob);
    } catch (error) {
      const message = error instanceof Error ? error.message : t('chat.messageActions.speechCacheMissing');
      onSetCommandStatus(message, true);
      stopSpeechPlayback();
    } finally {
      setSpeechLoading(false);
    }
  };

  const downloadCachedSpeech = async (cache: ChatMessageVoiceCache) => {
    try {
      const blob = await readMessageSpeechCacheBlob(cache);
      const exported = await exportSpeechBlob(blob, cache.name || 'Polaris-voice.mp3');
      if (exported) onSetCommandStatus(t('chat.messageActions.speechCacheExported'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('chat.messageActions.speechCacheMissing');
      onSetCommandStatus(message, true);
    }
  };

  const toggleSpeech = () => {
    if (!canSpeakAssistant || speechLoading) return;
    const text = speakableContent;
    if (!text) return;
    if (speaking) {
      stopSpeechPlayback();
      return;
    }
    stopSpeechPlayback();
    if (speechCache?.assetId) {
      void playCachedSpeech(speechCache);
      return;
    }
    if (voiceGeneration.enabled) {
      void playConfiguredSpeech(text);
      return;
    }
    playNativeSpeech(text);
  };

  const closeActions = () => {
    dialogRef.current?.close();
    onMenuOpenChange(false);
  };

  const saveAssistantDraft = () => {
    if (!assistantDraft.trim()) return;
    onEditAssistant(assistantDraft);
    closeActions();
  };
  const actionDialog = menuOpen ? (
    <dialog
      ref={dialogRef}
      className={`message-action-dialog ${panelMode}`}
      aria-label={t('chat.messageActions.userMenuAria')}
      onCancel={event => { event.preventDefault(); closeActions(); }}
      onClose={() => onMenuOpenChange(false)}
      onClick={event => { if (event.target === event.currentTarget) closeActions(); }}
    >
      <header className="message-action-header">
        <span>{t('chat.messageActions.userMenuAria')}</span>
        <button type="button" onClick={closeActions} aria-label={t('chat.messageActions.closeAssistantActions')}><Icon name="x" size={17} /></button>
      </header>
        {panelMode === 'menu' ? (
          <div className="message-action-menu">
            {canCopyMessage ? (
              <button type="button" className="message-action-btn" onClick={() => { void copyMessage(); closeActions(); }}>
                <Icon name="copy" size={18} /><span>{t('chat.messageActions.copy')}</span>
              </button>
            ) : null}
            {canDecorate ? (
              <>
                <button type="button" className="message-action-btn" aria-pressed={isFavorite}
                  onClick={() => { onToggleFavorite(); closeActions(); }}>
                  <span aria-hidden="true">{isFavorite ? '★' : '☆'}</span>
                  <span>{isFavorite ? '取消收藏' : '收藏消息'}</span>
                </button>
                <button type="button" className="message-action-btn" onClick={() => setPanelMode('reactions')}>
                  <span aria-hidden="true">♡</span><span>表情回应</span>
                </button>
              </>
            ) : null}
            {canEditUser ? (
              <button type="button" className="message-action-btn" onClick={() => { closeActions(); onEditUser(); }}>
                <Icon name="edit" size={18} /><span>{t('chat.messageActions.editAndRetry')}</span>
              </button>
            ) : null}
            {canEditAssistant ? (
              <button
                type="button"
                className="message-action-btn"
                onClick={(event) => {
                  runSelectionAction(() => {
                    setAssistantDraft(messageContent);
                    setPanelMode('edit');
                  }, { element: event.currentTarget });
                }}
              >
                <Icon name="edit" size={18} />
                <span>{t('chat.messageActions.edit')}</span>
              </button>
            ) : null}
            {canForkAssistant ? (
              <button
                type="button"
                className="message-action-btn"
                onClick={(event) => {
                  runSelectionAction(() => {
                    onForkAssistant();
                    closeActions();
                  }, { element: event.currentTarget });
                }}
              >
                <Icon name="branch" size={18} />
                <span>{t('chat.messageActions.forkFromHere')}</span>
              </button>
            ) : null}
            {canRetryAssistant ? (
              <button
                type="button"
                className="message-action-btn"
                onClick={(event) => {
                  runSelectionAction(() => {
                    onRetryLatestAssistant();
                    closeActions();
                  }, { element: event.currentTarget });
                }}
              >
                <Icon name="refresh" size={18} />
                <span>{resolvedRetryAssistantLabel}</span>
              </button>
            ) : null}
            {hasMemoryEvidence && memoryEvidence ? (
              <button
                type="button"
                className="message-action-btn"
                onClick={(event) => {
                  runSelectionAction(() => {
                    setPanelMode('memory');
                  }, { element: event.currentTarget });
                }}
              >
                <Icon name="memoryMap" size={18} />
                <span>{t('chat.messageActions.memorySources')}</span>
              </button>
            ) : null}
            {speechCache?.assetId ? (
              <button
                type="button"
                className="message-action-btn"
                onClick={(event) => {
                  runSelectionAction(() => {
                    void downloadCachedSpeech(speechCache);
                    closeActions();
                  }, { element: event.currentTarget });
                }}
              >
                <Icon name="download" size={18} />
                <span>{t('chat.messageActions.exportSpeechCache')}</span>
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" className="message-action-btn destructive" onClick={() => { closeActions(); onDelete(); }}>
                <Icon name="trash" size={18} /><span>{t('chat.messageActions.delete')}</span>
              </button>
            ) : null}
          </div>
        ) : panelMode === 'reactions' ? (
          <div className="assistant-message-memory">
            <div className="assistant-message-memory-title">
              <button type="button" className="assistant-message-memory-back" onClick={() => setPanelMode('menu')}
                aria-label="返回消息操作"><Icon name="chevron" size={16} /></button>
              <span>表情回应</span>
            </div>
            <div className="message-action-menu" role="group" aria-label="选择表情回应">
              {CHAT_REACTION_CHOICES.map((emoji) => (
                <button type="button" className="message-action-btn" key={emoji}
                  aria-pressed={reactionEmojis.includes(emoji)}
                  aria-label={`${reactionEmojis.includes(emoji) ? '取消' : '添加'} ${emoji} 回应`}
                  onClick={() => { onToggleReaction(emoji); closeActions(); }}>
                  <span aria-hidden="true">{emoji}</span>
                  <span>{reactionEmojis.includes(emoji) ? '取消回应' : '添加回应'}</span>
                </button>
              ))}
            </div>
          </div>
        ) : panelMode === 'memory' && memoryEvidence ? (
          <div className="assistant-message-memory">
            <div className="assistant-message-memory-title">
              <button
                type="button"
                className="assistant-message-memory-back"
                onClick={() => setPanelMode('menu')}
                aria-label={t('chat.messageActions.backToActions')}
              >
                <Icon name="chevron" size={16} />
              </button>
              <span>{t('chat.messageActions.memorySources')}</span>
            </div>
            <MessageMemoryEvidence
              evidence={memoryEvidence}
              expanded
              onToggle={() => {}}
              showTrigger={false}
            />
          </div>
        ) : (
          <div className="assistant-message-edit">
            <div className="assistant-message-edit-title">{t('chat.messageActions.editAssistant')}</div>
            <textarea
              className="assistant-message-edit-input"
              value={assistantDraft}
              onChange={(event) => setAssistantDraft(event.target.value)}
              rows={8}
              aria-label={t('chat.messageActions.editAssistant')}
              autoFocus
            />
            <div className="assistant-message-edit-actions">
              <button type="button" className="assistant-message-edit-btn secondary" onClick={() => setPanelMode('menu')}>{t('chat.messageActions.cancel')}</button>
              <button type="button" className="assistant-message-edit-btn primary" onClick={saveAssistantDraft} disabled={!assistantDraft.trim()}>{t('chat.messageActions.confirmEdit')}</button>
            </div>
          </div>
        )}
    </dialog>
  ) : null;

  return (
    <div className={`message-inline-actions ${role}`}>
      {role === 'assistant' && canCopyMessage && (
        <button type="button" className={`micro-action-btn ${copied ? 'active' : ''}`} onClick={() => { void copyMessage(); }} aria-label={copied ? t('chat.messageActions.copied') : t('chat.messageActions.copyAssistant')} title={copied ? t('chat.messageActions.copied') : t('chat.messageActions.copyAssistant')}>
          <Icon name="copy" size={14} />
        </button>
      )}
      {canSpeakAssistant ? (
        <button
          type="button"
          className={`micro-action-btn ${speaking ? 'active' : ''}`}
          onClick={(event) => {
            runSelectionAction(toggleSpeech, { element: event.currentTarget });
          }}
          aria-label={speechLoading ? t('chat.messageActions.generatingSpeech') : speaking ? t('chat.messageActions.stopReading') : t('chat.messageActions.readAssistant')}
          title={speechLoading ? t('chat.messageActions.generatingSpeech') : speaking ? t('chat.messageActions.stopReading') : t('chat.messageActions.read')}
          aria-pressed={speaking || speechLoading}
        >
          <Icon name={speaking || speechLoading ? 'pause' : 'voice'} size={14} />
        </button>
      ) : null}
      {taskReceiptAction ? (
        <button
          type="button"
          className={`micro-action-btn task-receipt ${taskReceiptAction.status} ${taskReceiptAction.expanded ? 'active' : ''}`}
          onClick={(event) => {
            runSelectionAction(taskReceiptAction.onToggle, { element: event.currentTarget });
          }}
          aria-label={taskReceiptAction.expanded ? t('chat.messageActions.collapseTask') : t('chat.messageActions.viewTask')}
          title={taskReceiptAction.expanded ? t('chat.messageActions.collapseTaskTitle') : t('chat.messageActions.viewTaskTitle')}
          aria-expanded={taskReceiptAction.expanded}
        >
          <Icon name={taskReceiptAction.status === 'completed' ? 'check' : 'task'} size={14} />
        </button>
      ) : null}
      {canOpenThinkingSummary && (
        <button
          type="button"
          className={`micro-action-btn thinking-action-trigger ${isThinkingActive ? 'active' : ''}`}
          aria-haspopup="dialog"
          onClick={(event) => {
            runSelectionAction(onOpenThinkingSummary, { element: event.currentTarget });
          }}
          aria-label={isThinkingActive ? t('chat.messageActions.openThinkingActive') : t('chat.messageActions.openThinking')}
          title={isThinkingActive ? t('chat.messageActions.thinkingTitleActive') : t('chat.messageActions.thinkingTitle')}
        >
          <span className="thinking-inline-label">thinking</span>
        </button>
      )}
      {showCodeCardAction && (
        <>
          <button
            type="button"
            className={`micro-action-btn ${codeCardActionMode === 'open' ? 'active' : ''}`}
            onClick={(event) => {
              runSelectionAction(onCodeCardAction, { element: event.currentTarget });
            }}
            aria-label={codeCardActionLabel}
            title={codeCardActionLabel}
          >
            <Icon name="code" size={14} />
          </button>
          {codeCardProgressLabel && <span className="message-inline-progress">{codeCardProgressLabel}</span>}
        </>
      )}
      {hasMore ? (
        <>
          <button
            type="button"
            ref={triggerRef}
            className={`micro-action-btn ${menuOpen ? 'active' : ''}`}
            onClick={(event) => {
              runSelectionAction(() => {
                onMenuOpenChange(true);
                setPanelMode('menu');
              }, { element: event.currentTarget });
            }}
            aria-label={t('chat.messageActions.moreMessageActions')}
            aria-haspopup="dialog"
            title={t('chat.messageActions.more')}
            aria-expanded={menuOpen}
          >
            <Icon name="more" size={15} />
          </button>
          {actionDialog}
        </>
      ) : null}
    </div>
  );
}
