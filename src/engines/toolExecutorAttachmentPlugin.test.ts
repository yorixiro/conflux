import { describe, expect, it, vi } from 'vitest';
import { attachmentToolExecutorPlugin } from './toolExecutorAttachmentPlugin';
import type { ToolContext } from './toolExecutorTypes';

function createAttachmentRef(overrides: Partial<{
  id: string;
  name: string;
  kind: 'image' | 'file';
  mimeType: string;
  size: number;
  hasText: boolean;
}> = {}) {
  return {
    id: overrides.id ?? 'attachment-1',
    name: overrides.name ?? 'notes.txt',
    kind: overrides.kind ?? 'file',
    mimeType: overrides.mimeType ?? 'text/plain',
    size: overrides.size ?? 12,
    hasText: overrides.hasText ?? true
  };
}

function createAttachment(overrides: Partial<{
  id: string;
  assetId: string;
  name: string;
  kind: 'image' | 'file';
  mimeType: string;
  size: number;
}> = {}) {
  return {
    id: overrides.id ?? 'generated-attachment',
    assetId: overrides.assetId ?? 'asset-generated',
    name: overrides.name ?? 'bundle.zip',
    kind: overrides.kind ?? 'file',
    mimeType: overrides.mimeType ?? 'application/zip',
    size: overrides.size ?? 128
  };
}

function createContext(overrides: Partial<ToolContext> = {}) {
  const ref = createAttachmentRef();
  const attachment = createAttachment();
  return {
    inspectAttachments: vi.fn(() => ({
      ok: true as const,
      items: [ref],
      detailText: 'attachment list'
    })),
    readAttachmentText: vi.fn(() => ({
      ok: true as const,
      attachment: ref,
      detailText: 'attachment text'
    })),
    inspectArchiveEntries: vi.fn(async () => ({
      ok: true as const,
      attachment: createAttachmentRef({ id: 'archive-1', name: 'archive.zip', hasText: false }),
      entries: [{ path: 'src/index.ts', size: 24, hasText: true }],
      detailText: 'archive entries'
    })),
    readArchiveEntryText: vi.fn(async () => ({
      ok: true as const,
      attachment: createAttachmentRef({ id: 'archive-1', name: 'archive.zip', hasText: false }),
      entry: { path: 'src/index.ts', size: 24, hasText: true },
      text: 'console.log(1)',
      inferredLanguage: 'typescript',
      detailText: 'archive text'
    })),
    bundleArchiveEntries: vi.fn(async () => ({
      ok: true as const,
      sourceAttachment: createAttachmentRef({ id: 'archive-1', name: 'archive.zip', hasText: false }),
      attachment,
      entries: [{ path: 'src/index.ts', size: 24, hasText: true }],
      detailText: 'bundle detail'
    })),
    bundleAttachments: vi.fn(async () => ({
      ok: true as const,
      attachment,
      itemCount: 2,
      detailText: 'attachments bundle detail'
    })),
    createQrCode: vi.fn(async () => ({
      ok: true as const,
      attachment: createAttachment({ id: 'qr-1', name: 'qr.png', kind: 'image', mimeType: 'image/png' }),
      detailText: 'qr detail'
    })),
    generateImage: vi.fn(async () => ({
      ok: true as const,
      attachment: createAttachment({ id: 'generated-image-1', name: 'generated.png', kind: 'image', mimeType: 'image/png' }),
      model: 'gpt-image-1',
      size: '1024x1024',
      detailText: 'generated image detail'
    })),
    sendImageAttachment: vi.fn(async () => ({
      ok: true as const,
      attachment: createAttachment({ id: 'sent-image-1', name: 'poster.png', kind: 'image', mimeType: 'image/png' }),
      detailText: 'sent image detail'
    })),
    inspectImageAsset: vi.fn(async () => ({
      ok: true as const,
      assetId: 'asset-image',
      name: 'poster.png',
      mimeType: 'image/png',
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
      hasTransparency: false,
      averageColor: '#334455',
      averageLuminance: 0.12,
      suggestedTextColor: '#f8fafc',
      palette: [{ hex: '#334455', count: 10, ratio: 1, luminance: 0.12 }],
      cssUrl: 'url("polaris-asset://asset-image")',
      detailText: 'image inspection detail'
    })),
    extractImagePalette: vi.fn(async () => ({
      ok: true as const,
      assetId: 'asset-image',
      name: 'poster.png',
      cssUrl: 'url("polaris-asset://asset-image")',
      averageColor: '#334455',
      suggestedTextColor: '#f8fafc',
      palette: [
        { hex: '#334455', count: 10, ratio: 0.6, luminance: 0.12 },
        { hex: '#f8fafc', count: 4, ratio: 0.24, luminance: 0.92 }
      ],
      themeVariables: {
        background: '#334455',
        surface: '#f8fafc',
        accent: '#334455',
        text: '#f8fafc'
      },
      detailText: 'palette detail'
    })),
    createImageVariant: vi.fn(async () => ({
      ok: true as const,
      attachment: createAttachment({
        id: 'variant-1',
        assetId: 'asset-variant',
        name: 'poster-background.jpg',
        kind: 'image',
        mimeType: 'image/jpeg'
      }),
      sourceAttachment: createAttachment({
        id: 'source-1',
        assetId: 'asset-image',
        name: 'poster.png',
        kind: 'image',
        mimeType: 'image/png'
      }),
      cssUrl: 'url("polaris-asset://asset-variant")',
      width: 1080,
      height: 1920,
      purpose: 'background',
      detailText: 'variant detail'
    })),
    saveAttachmentToCollection: vi.fn(() => ({ ok: true as const, cardId: 'image-1', created: true, title: 'Poster' })),
    saveAttachmentAsCodeCard: vi.fn(() => ({ ok: true as const, cardId: 'card-1', created: true, title: 'Notes' })),
    saveArchiveEntryAsCodeCard: vi.fn(async () => ({ ok: true as const, cardId: 'card-2', created: false, title: 'Entry' })),
    ...overrides
  } as ToolContext;
}

describe('attachmentToolExecutorPlugin', () => {
  it('handles attachment inspection', async () => {
    const ctx = createContext();

    const result = await attachmentToolExecutorPlugin.execute({
      kind: 'inspectAttachments',
      scope: 'all',
      query: 'notes'
    }, ctx);

    expect(result).toEqual({
      ok: true,
      summary: '已找到 1 个附件',
      detailText: 'attachment list',
      attachmentRefs: [createAttachmentRef()]
    });
    expect(ctx.inspectAttachments).toHaveBeenCalledWith('all', 'notes');
  });

  it('handles archive entry bundling', async () => {
    const ctx = createContext();

    const result = await attachmentToolExecutorPlugin.execute({
      kind: 'bundleArchiveEntries',
      target: 'archive.zip',
      entries: ['src/index.ts'],
      archiveName: 'code.zip'
    }, ctx);

    expect(result).toMatchObject({
      ok: true,
      summary: '已重新打包 1 个包内文件',
      detailText: 'bundle detail',
      attachments: [createAttachment()]
    });
    expect(ctx.bundleArchiveEntries).toHaveBeenCalledWith(
      'archive.zip',
      ['src/index.ts'],
      undefined,
      undefined,
      undefined,
      'code.zip'
    );
  });

  it('passes through attachment helper failures', async () => {
    const ctx = createContext({
      readAttachmentText: vi.fn(() => ({ ok: false as const, error: '没有可读附件' }))
    });

    const result = await attachmentToolExecutorPlugin.execute({
      kind: 'readAttachmentText',
      target: 'missing'
    }, ctx);

    expect(result).toEqual({ ok: false, error: '没有可读附件' });
  });

  it('handles image inspection, palette extraction, and variant creation', async () => {
    const ctx = createContext();

    await expect(attachmentToolExecutorPlugin.execute({
      kind: 'inspectImageAsset',
      target: 'poster.png'
    }, ctx)).resolves.toEqual({
      ok: true,
      summary: '已检查图片属性 · 1200x800',
      detailText: 'image inspection detail'
    });
    expect(ctx.inspectImageAsset).toHaveBeenCalledWith('poster.png');

    await expect(attachmentToolExecutorPlugin.execute({
      kind: 'extractImagePalette',
      target: 'poster.png'
    }, ctx)).resolves.toEqual({
      ok: true,
      summary: '已提取图片配色 · #334455 / #f8fafc',
      detailText: 'palette detail'
    });
    expect(ctx.extractImagePalette).toHaveBeenCalledWith('poster.png');

    await expect(attachmentToolExecutorPlugin.execute({
      kind: 'createImageVariant',
      target: 'poster.png',
      purpose: 'background',
      width: 1080,
      height: 1920,
      fit: 'cover',
      blur: 8,
      dim: 0.24,
      format: 'jpeg',
      quality: 0.82,
      name: 'poster-background.jpg'
    }, ctx)).resolves.toEqual({
      ok: true,
      summary: '已生成图片素材 · background · 1080x1920',
      detailText: 'variant detail',
      attachments: [createAttachment({
        id: 'variant-1',
        assetId: 'asset-variant',
        name: 'poster-background.jpg',
        kind: 'image',
        mimeType: 'image/jpeg'
      })]
    });
    expect(ctx.createImageVariant).toHaveBeenCalledWith('poster.png', {
      purpose: 'background',
      width: 1080,
      height: 1920,
      fit: 'cover',
      blur: 8,
      dim: 0.24,
      format: 'jpeg',
      quality: 0.82,
      name: 'poster-background.jpg'
    });
  });

  it('sends an existing image as a chat attachment without generating a new one', async () => {
    const ctx = createContext();

    const result = await attachmentToolExecutorPlugin.execute({
      kind: 'sendImageAttachment',
      target: 'poster',
      title: 'poster.png'
    }, ctx);

    expect(result).toEqual({
      ok: true,
      summary: '已发送图片 · poster.png',
      detailText: 'sent image detail',
      attachments: [createAttachment({ id: 'sent-image-1', name: 'poster.png', kind: 'image', mimeType: 'image/png' })]
    });
    expect(ctx.sendImageAttachment).toHaveBeenCalledWith('poster', 'poster.png');
    expect(ctx.generateImage).not.toHaveBeenCalled();
  });

  it('saves image attachments into image collection', async () => {
    const ctx = createContext();

    const result = await attachmentToolExecutorPlugin.execute({
      kind: 'saveAttachmentToCollection',
      target: 'poster.png',
      title: 'Poster',
      tags: ['海报'],
      openInCollection: true
    }, ctx);

    expect(result).toEqual({
      ok: true,
      summary: '已存入图片收藏 · Poster',
      imageCardId: 'image-1'
    });
    expect(ctx.saveAttachmentToCollection).toHaveBeenCalledWith('poster.png', 'Poster', ['海报'], true, undefined);
  });

  it('saves text attachments and archive entries as code cards', async () => {
    const ctx = createContext();

    await expect(attachmentToolExecutorPlugin.execute({
      kind: 'saveAttachmentAsCodeCard',
      target: 'notes.txt',
      title: 'Notes',
      language: 'markdown',
      tags: ['笔记'],
      openInCollection: true
    }, ctx)).resolves.toEqual({
      ok: true,
      summary: '已存成房间 · Notes',
      cardId: 'card-1'
    });
    expect(ctx.saveAttachmentAsCodeCard).toHaveBeenCalledWith('notes.txt', 'Notes', 'markdown', ['笔记'], true);

    await expect(attachmentToolExecutorPlugin.execute({
      kind: 'saveArchiveEntryAsCodeCard',
      target: 'bundle.zip',
      entry: 'src/index.ts',
      title: 'Entry',
      language: 'typescript',
      tags: ['源码'],
      openInCollection: false
    }, ctx)).resolves.toEqual({
      ok: true,
      summary: '已定位到房间 · Entry',
      cardId: 'card-2'
    });
    expect(ctx.saveArchiveEntryAsCodeCard).toHaveBeenCalledWith('bundle.zip', 'src/index.ts', 'Entry', 'typescript', ['源码'], false);
  });
});
