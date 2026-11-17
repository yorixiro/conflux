import { describe, expect, it, vi } from 'vitest';
import type { ChatAttachment } from '../../../../types/domain';
import { createComposerFileIngestor } from './ingestComposerFiles';

function createAttachment(): ChatAttachment {
  return {
    id: 'attachment-1',
    assetId: 'asset-1',
    kind: 'file',
    name: 'note.txt',
    mimeType: 'text/plain',
    size: 4,
    textContent: 'note'
  };
}

describe('ingestComposerFiles', () => {
  it('keeps selected stickers distinct from ordinary images and file attachments', async () => {
    const image: ChatAttachment = { ...createAttachment(), id: 'image-1', kind: 'image', mimeType: 'image/png' };
    const file = createAttachment();
    const onAddAttachments = vi.fn();
    const ingest = createComposerFileIngestor(async () => ({
      readFilesAsAttachments: async () => ({ attachments: [image, file], rejected: [], warnings: [] })
    }));
    await ingest([], onAddAttachments, vi.fn(), 'sticker');
    expect(onAddAttachments).toHaveBeenLastCalledWith([{ ...image, presentation: 'sticker' }, file]);
    await ingest([], onAddAttachments, vi.fn());
    expect(onAddAttachments).toHaveBeenLastCalledWith([image, file]);
    expect(image.presentation).toBeUndefined();
  });

  it('retries the attachment processor import after a previous chunk load failure', async () => {
    const attachment = createAttachment();
    const onAddAttachments = vi.fn();
    const onStatus = vi.fn();
    let loadAttempts = 0;
    const ingestComposerFiles = createComposerFileIngestor(async () => {
      loadAttempts += 1;
      if (loadAttempts === 1) {
        throw new Error('Failed to fetch dynamically imported module');
      }
      return {
        readFilesAsAttachments: async () => ({
          attachments: [attachment],
          rejected: [],
          warnings: []
        })
      };
    });

    await expect(ingestComposerFiles([], onAddAttachments, onStatus))
      .rejects.toThrow('Failed to fetch dynamically imported module');
    await ingestComposerFiles([], onAddAttachments, onStatus);

    expect(loadAttempts).toBe(2);
    expect(onAddAttachments).toHaveBeenCalledWith([attachment]);
    expect(onStatus).toHaveBeenCalledWith('', false);
  });

  it('shows attachment warnings without marking the ingest as failed', async () => {
    const attachment = createAttachment();
    const onAddAttachments = vi.fn();
    const onStatus = vi.fn();
    const ingestComposerFiles = createComposerFileIngestor(async () => ({
      readFilesAsAttachments: async () => ({
        attachments: [attachment],
        rejected: [],
        warnings: ['paper.pdf 已附上原始 PDF，但本机 PDF 解析器没有提取成功；模型这轮只能看到文件名。']
      })
    }));

    await ingestComposerFiles([], onAddAttachments, onStatus);

    expect(onAddAttachments).toHaveBeenCalledWith([attachment]);
    expect(onStatus).toHaveBeenCalledWith(
      'paper.pdf 已附上原始 PDF，但本机 PDF 解析器没有提取成功；模型这轮只能看到文件名。',
      false
    );
  });
});
