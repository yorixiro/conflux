import { KekeFieldDecor, KekeModeButton, KekeSendArt } from '../../../keke-original/KekeOriginalBar';
import { ImpactStyle } from '@capacitor/haptics';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { resolveChatCardReference } from '../../../../app/collection/codeCollectionSource';
import { Icon } from '../../../Icon';
import { runImpactAction } from '../../../haptics';
import {
  useChatActions,
  useChatAttachments,
  useChatComposer,
  useChatPresentation,
  useChatStablePayload,
  useChatUi
} from '../context/ChatContext';
import { ChatWorkspaceBanner } from './ChatWorkspaceBanner';
import { ComposerAttachments, ComposerQuickActions } from './ComposerAttachments';
import { ComposerCardReferenceStrip } from './ComposerCardReferenceStrip';
import { ComposerPreviewStrip } from './ComposerPreviewStrip';
import { SlashCommandSuggestions } from './SlashCommandSuggestions';
import { KaomojiDrawer, KaomojiFaceIcon } from './kaomoji/KaomojiDrawer';
import { useComposerFileIngest } from './useComposerFileIngest';
import { useComposerDictation } from './useComposerDictation';
import { useI18n } from '../../../../i18n';
import { useSpaceStore } from '../../../../stores/spaceStore';
import { PersonaModelSettings } from '../../../shell/PersonaModelSettings';

function resolveThemeReviveSpell(input: string): 'restore-default' | 'revive-last' | null {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '');
  if (!normalized) return null;
  if (
    normalized === '//revive'
    || normalized === '//safe'
    || normalized === '复活polaris'
    || normalized === '救活polaris'
  ) {
    return 'revive-last';
  }
  if (
    normalized === '//default'
    || normalized === '//reset'
    || normalized === '恢复默认polaris'
    || normalized === '默认polaris'
  ) {
    return 'restore-default';
  }
  return null;
}

export function ChatComposer() {
  const kekePreset = useSpaceStore((space) => space.theme.activePresetId);
  const showKekeChrome = kekePreset === 'keke-doodle' || kekePreset === 'keke-pois';
  const { t, language } = useI18n();
  const presentation = useChatPresentation();
  const { persona } = useChatStablePayload();
  const composer = useChatComposer();
  const ui = useChatUi();
  const attachments = useChatAttachments();
  const actions = useChatActions();
  const [attachmentPickerOpen, setAttachmentPickerOpen] = useState(false);
  const [kaomojiOpen, setKaomojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeConversationId = presentation.activeConversationId;
  const [localDraft, setLocalDraft] = useState(composer.inputDraft);
  const localDraftRef = useRef(composer.inputDraft);
  const draftConversationIdRef = useRef(activeConversationId);
  const syncedDraftRef = useRef(composer.inputDraft);
  const syncedDraftConversationIdRef = useRef(activeConversationId);
  const resizeFrameRef = useRef<number | null>(null);
  const actionsRef = useRef(actions);
  const handleAddAttachments = useComposerFileIngest();
  const resolvedPendingCardReference = useMemo(
    () => resolveChatCardReference(composer.pendingCardReference, composer.availableCards),
    [composer.availableCards, composer.pendingCardReference]
  );

  actionsRef.current = actions;

  const writeDraftToStore = (value: string, conversationId: string | null) => {
    if (
      syncedDraftConversationIdRef.current === conversationId
      && syncedDraftRef.current === value
    ) {
      return;
    }
    if (conversationId) {
      actionsRef.current.setConversationDraft(conversationId, value);
    } else {
      actionsRef.current.setInputDraft(value);
    }
    syncedDraftConversationIdRef.current = conversationId;
    syncedDraftRef.current = value;
  };

  const flushDraftToStore = () => {
    writeDraftToStore(localDraftRef.current, draftConversationIdRef.current);
  };

  const updateLocalDraft = (value: string) => {
    localDraftRef.current = value;
    // Live keystrokes stay local; draft persistence flushes at interaction boundaries.
    setLocalDraft(value);
  };

  const dictation = useComposerDictation({
    conversationId: activeConversationId,
    enabled: presentation.isActiveWorld && !presentation.interactionLocked,
    language,
    onText: (text) => {
      const previous = localDraftRef.current;
      const next = previous + (previous && !/\s$/.test(previous) ? ' ' : '') + text;
      updateLocalDraft(next);
      writeDraftToStore(next, draftConversationIdRef.current);
    }
  });

  useEffect(() => () => {
    flushDraftToStore();
  }, [activeConversationId]);

  useEffect(() => {
    const flushOnPageHide = () => flushDraftToStore();
    const flushOnVisibilityHidden = () => {
      if (document.visibilityState === 'hidden') flushDraftToStore();
    };
    window.addEventListener('pagehide', flushOnPageHide);
    document.addEventListener('visibilitychange', flushOnVisibilityHidden);
    return () => {
      window.removeEventListener('pagehide', flushOnPageHide);
      document.removeEventListener('visibilitychange', flushOnVisibilityHidden);
    };
  }, []);

  useEffect(() => {
    draftConversationIdRef.current = activeConversationId;
    syncedDraftConversationIdRef.current = activeConversationId;
    syncedDraftRef.current = composer.inputDraft;
    localDraftRef.current = composer.inputDraft;
    setLocalDraft((current) => (current === composer.inputDraft ? current : composer.inputDraft));
  }, [activeConversationId, composer.inputDraft]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    if (resizeFrameRef.current !== null) {
      cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = requestAnimationFrame(() => {
      resizeFrameRef.current = null;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    });
    return () => {
      if (resizeFrameRef.current === null) return;
      cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = null;
    };
  }, [localDraft]);

  const interactionLocked = presentation.interactionLocked;
  const hasUnsupportedPendingImages = presentation.hasUnsupportedPendingImages;
  const visibleStatus = ui.commandStatus;
  const slashCommandQuery = useMemo(() => {
    if (ui.sending) return null;
    const trimmedStart = localDraft.trimStart();
    if (!trimmedStart.startsWith('/') || trimmedStart.startsWith('//') || trimmedStart.includes('\n')) return null;
    return trimmedStart.slice(1).split(/\s+/)[0].toLowerCase();
  }, [localDraft, ui.sending]);
  const hasSlashCommandDraft = slashCommandQuery !== null && attachments.pending.length === 0 && !resolvedPendingCardReference;
  const tryCastThemeReviveSpell = () => {
    if (attachments.pending.length > 0) return false;
    if (composer.pendingCardReference) return false;
    const spell = resolveThemeReviveSpell(localDraft);
    if (!spell) return false;
    if (spell === 'revive-last') {
      actions.reviveTheme();
    } else {
      actions.restoreDefaultTheme();
    }
    updateLocalDraft('');
    writeDraftToStore('', draftConversationIdRef.current);
    return true;
  };
  const handleComposerPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const files = event.clipboardData?.files;
    if (!files?.length) return;
    event.preventDefault();
    await handleAddAttachments(files);
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || interactionLocked || hasUnsupportedPendingImages) return;
    const prefersTouchInput =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
    if (prefersTouchInput || event.nativeEvent.isComposing) return;
    if (tryCastThemeReviveSpell()) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    flushDraftToStore();
    void actions.submit();
  };
  const handleSubmitPress = () => {
    if (dictation.active) dictation.cancel();
    if (ui.sending) {
      actions.stopGeneration();
      return;
    }
    if (tryCastThemeReviveSpell()) return;
    flushDraftToStore();
    void actions.submit();
  };
  const handleComposerInputEngage = () => {
    if (dictation.active) dictation.cancel();
    if (attachmentPickerOpen) setAttachmentPickerOpen(false);
    if (kaomojiOpen) setKaomojiOpen(false);
  };
  const handleComposerBlankDismiss = (target: EventTarget | null) => {
    if ((!attachmentPickerOpen && !kaomojiOpen) || !(target instanceof HTMLElement)) return;
    const interactiveTarget = target.closest(
      'button, textarea, input, select, .attachment-picker-sheet, .chat-box-shell, .kaomoji-drawer, .active-preview-strip, .chat-workspace-banner, .composer-card-reference-strip, .attachment-warning'
    );
    if (interactiveTarget) return;
    setAttachmentPickerOpen(false);
    setKaomojiOpen(false);
  };
  const handlePickKaomoji = (face: string) => {
    const textarea = textareaRef.current;
    const draft = localDraftRef.current;
    const start = textarea?.selectionStart ?? draft.length;
    const end = textarea?.selectionEnd ?? start;
    const next = draft.slice(0, start) + face + draft.slice(end);
    updateLocalDraft(next);
    writeDraftToStore(next, draftConversationIdRef.current);
    setKaomojiOpen(false);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + face.length, start + face.length);
    });
  };
  const handlePickSlashCommand = (insertText: string) => {
    updateLocalDraft(insertText);
    writeDraftToStore(insertText, draftConversationIdRef.current);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(insertText.length, insertText.length);
    });
  };

  return (
    <>
      {attachmentPickerOpen || kaomojiOpen ? (
        <button
          type="button"
          tabIndex={-1}
          className="composer-picker-dismiss-layer"
          aria-label="关闭输入工具抽屉"
          onPointerDown={(event) => {
            event.preventDefault();
            setAttachmentPickerOpen(false);
            setKaomojiOpen(false);
          }}
          onClick={() => { setAttachmentPickerOpen(false); setKaomojiOpen(false); }}
        />
      ) : null}
      <div
        className={`chat-composer ${attachmentPickerOpen || kaomojiOpen ? 'picker-open' : ''} ${composer.dragActive ? 'drag-active' : ''}`}
        onPointerDownCapture={(event) => handleComposerBlankDismiss(event.target)}
        onClickCapture={(event) => handleComposerBlankDismiss(event.target)}
        onPaste={(event) => { void handleComposerPaste(event); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && (attachmentPickerOpen || kaomojiOpen)) {
            event.stopPropagation();
            setAttachmentPickerOpen(false);
            setKaomojiOpen(false);
          }
        }}
      >
        <ChatWorkspaceBanner />
        {ui.activePreviewMessage ? (
          <ComposerPreviewStrip
            message={ui.activePreviewMessage}
            onApply={actions.applyToolPreview}
            onSave={actions.saveToolPreview}
            onRollback={actions.rollbackToolPreview}
          />
        ) : null}
        {resolvedPendingCardReference ? (
          <ComposerCardReferenceStrip
            reference={resolvedPendingCardReference}
            onRemove={() => actions.setPendingCardReference(null)}
          />
        ) : null}
        {visibleStatus ? (
          <p className={`command-status ${visibleStatus.isError ? 'error' : ''}`}>
            {visibleStatus.text}
          </p>
        ) : null}
        {dictation.message ? <p className={`command-status ${dictation.isError ? 'error' : ''}`} role="status" aria-live="polite">{dictation.message}</p> : null}
        <SlashCommandSuggestions
          query={slashCommandQuery}
          onPick={handlePickSlashCommand}
        />
        {showKekeChrome ? <div className="modes" role="group" aria-label="快捷工具">
          <KekeModeButton k="s" word="pièce" label="附件" hit={attachmentPickerOpen} disabled={interactionLocked} onClick={() => { setAttachmentPickerOpen((open) => !open); setKaomojiOpen(false); }} />
          <span>✦</span>
          <KekeModeButton k="l" word="kaomoji" label="颜文字" hit={kaomojiOpen} disabled={interactionLocked} onClick={() => { setKaomojiOpen((open) => !open); setAttachmentPickerOpen(false); }} />
          <span>✦</span>
          <KekeModeButton k="b" word="outils" label="工具" disabled={interactionLocked} onClick={actions.openToolbox} />
        </div> : null}
        <div className="chat-submit-anchor">
          <ComposerAttachments
            pickerOpen={attachmentPickerOpen}
            interactionLocked={interactionLocked}
            pendingAttachmentsCount={attachments.pending.length}
            hasUnsupportedPendingImages={hasUnsupportedPendingImages}
            taskToolsEnabled={composer.toolPromptPreferences.task}
            taskModeEnabled={composer.taskModeEnabled}
            pendingAttachments={attachments.pending}
            pendingCardReference={resolvedPendingCardReference}
            availableCards={composer.availableCards}
            onAddAttachments={handleAddAttachments}
            onRemoveAttachment={attachments.remove}
            onToggleTaskModeEnabled={actions.setTaskModeEnabled}
            onOpenToolbox={actions.openToolbox}
            onSetPickerOpen={setAttachmentPickerOpen}
            onSetPendingCardReference={actions.setPendingCardReference}
          />
          {kaomojiOpen ? <KaomojiDrawer onSelect={handlePickKaomoji} onClose={() => setKaomojiOpen(false)} /> : null}
          {ui.submitFlight ? (
            <div key={ui.submitFlight.id} className="chat-submit-flight" aria-hidden="true">
              <span className="chat-submit-flight-orbit">
                <Icon name="send" size={13} />
              </span>
              <span className="chat-submit-flight-trail" />
            </div>
          ) : null}
          <div className={showKekeChrome ? 'keke-shell' : 'chat-box-shell chat-box'}>
            <div className={showKekeChrome ? 'row' : 'chat-box-main'}>
              <ComposerQuickActions
                paperStyle={showKekeChrome}
                pickerOpen={attachmentPickerOpen}
                interactionLocked={interactionLocked}
                onSetPickerOpen={open => { setAttachmentPickerOpen(open); if (open) setKaomojiOpen(false); }}
              />
              {!showKekeChrome ? <button
                type="button"
                className={`composer-slot-btn composer-kaomoji-toggle ${kaomojiOpen ? 'active' : ''}`}
                aria-label="颜文字"
                title="颜文字"
                aria-expanded={kaomojiOpen}
                aria-controls="composer-kaomoji-drawer"
                disabled={interactionLocked}
                onClick={() => { setAttachmentPickerOpen(false); setKaomojiOpen(open => !open); }}
              ><KaomojiFaceIcon /></button> : null}
              <div className={showKekeChrome ? 'fd' : 'composer-text-input'}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={localDraft}
                  onChange={(event) => updateLocalDraft(event.target.value)}
                  onPointerDown={handleComposerInputEngage}
                  onFocus={handleComposerInputEngage}
                  onBlur={flushDraftToStore}
                  onKeyDown={handleKeyDown}
                  disabled={interactionLocked}
                  placeholder={showKekeChrome ? '说点什么 ๑*˚' : `to ${presentation.assistantName}`}
                />
                {showKekeChrome ? <KekeFieldDecor /> : null}
                <button
                  type="button"
                  className={`voice-input-btn ${dictation.active ? 'is-listening' : ''}`}
                  aria-label={dictation.active ? '结束语音输入' : '语音转文字'}
                  aria-pressed={dictation.active}
                  disabled={interactionLocked || ui.sending}
                  onClick={(event) => runImpactAction(dictation.toggle, { element: event.currentTarget, style: ImpactStyle.Light })}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {dictation.active ? <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" /> : <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6" /></>}
                    </svg>
                </button>
              </div>
              <button
                type="button"
                className={`${showKekeChrome ? 'sd' : 'send-btn'} ${
                  ui.sending
                  || localDraft.trim()
                  || attachments.pending.length > 0
                  || resolvedPendingCardReference
                    ? 'has-content'
                    : ''
                }`}
                disabled={hasUnsupportedPendingImages || interactionLocked}
                aria-label={ui.sending ? t('chat.composer.stopGeneration') : hasSlashCommandDraft ? t('chat.composer.executeCommand') : t('chat.composer.sendMessage')}
                onClick={(event) => {
                  runImpactAction(handleSubmitPress, {
                    element: event.currentTarget,
                    style: ui.sending ? ImpactStyle.Medium : ImpactStyle.Light
                  });
                }}
              >
                {showKekeChrome && !ui.sending && !hasSlashCommandDraft ? <KekeSendArt /> : <Icon name={ui.sending ? 'x' : hasSlashCommandDraft ? 'check' : 'send'} size={16} />}
              </button>
            </div>
          </div>
        </div>
        {persona ? <PersonaModelSettings key={persona.id} persona={persona} /> : null}
        
      </div>
    </>
  );
}
