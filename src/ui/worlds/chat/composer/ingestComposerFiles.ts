import type { ChatAttachment } from '../../../../types/domain';

type AttachmentProcessorModule = Pick<
  typeof import('../../../../engines/attachmentProcessor'),
  'readFilesAsAttachments'
>;

type AttachmentProcessorLoader = () => Promise<AttachmentProcessorModule>;

export function createComposerFileIngestor(loadAttachmentProcessor: AttachmentProcessorLoader) {
  let attachmentProcessorPromise: Promise<AttachmentProcessorModule> | null = null;

  return async function ingestComposerFiles(
    files: FileList | File[],
    onAddAttachments: (attachments: ChatAttachment[]) => void,
    onStatus: (text: string, isError?: boolean) => void,
    presentation?: ChatAttachment['presentation']
  ) {
    attachmentProcessorPromise ??= loadAttachmentProcessor();
    let attachmentProcessor: AttachmentProcessorModule;
    try {
      attachmentProcessor = await attachmentProcessorPromise;
    } catch (error) {
      attachmentProcessorPromise = null;
      throw error;
    }

    const { attachments, rejected, warnings } = await attachmentProcessor.readFilesAsAttachments(files);

    if (attachments.length > 0) {
      onAddAttachments(presentation ? attachments.map((attachment) =>
        attachment.kind === 'image' ? { ...attachment, presentation } : attachment
      ) : attachments);
    }

    const statusLines = [...(warnings ?? []), ...rejected];
    onStatus(statusLines.length > 0 ? statusLines.join('；') : '', rejected.length > 0);
  };
}

export const ingestComposerFiles = createComposerFileIngestor(() =>
  import('../../../../engines/attachmentProcessor')
);
