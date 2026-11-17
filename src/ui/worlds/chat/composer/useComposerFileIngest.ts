import { useCallback } from 'react';
import { useChatActions, useChatAttachments } from '../context/ChatContext';
import { ingestComposerFiles } from './ingestComposerFiles';
import { useI18n } from '../../../../i18n';
import type { ChatAttachment } from '../../../../types/domain';

export function useComposerFileIngest() {
  const attachments = useChatAttachments();
  const actions = useChatActions();
  const { t } = useI18n();

  return useCallback(async (files: FileList | File[], presentation?: ChatAttachment['presentation']) => {
    try {
      await ingestComposerFiles(files, attachments.add, actions.setCommandStatus, presentation);
    } catch (error) {
      actions.setCommandStatus(error instanceof Error ? error.message : t('chat.composer.readAttachmentFailed'), true);
    }
  }, [actions, attachments, t]);
}
