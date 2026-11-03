import type { ToolAction, ToolContext, ToolExecutionResult } from './toolExecutorTypes';
import type { ToolExecutorPlugin } from './toolExecutorPlugins';
import { isToolActionKindHandledByPlugin } from './tool-protocol/toolManifest';

export type AttachmentToolAction = Extract<
  ToolAction,
  {
    kind:
      | 'inspectAttachments'
      | 'readAttachmentText'
      | 'bundleAttachments'
      | 'createQrCode'
      | 'generateImage'
      | 'sendImageAttachment'
      | 'inspectImageAsset'
      | 'extractImagePalette'
      | 'createImageVariant'
      | 'saveAttachmentToCollection'
      | 'saveAttachmentAsCodeCard'
      | 'inspectArchiveEntries'
      | 'readArchiveEntryText'
      | 'bundleArchiveEntries'
      | 'saveArchiveEntryAsCodeCard';
  }
>;

export function isAttachmentToolAction(action: ToolAction): action is AttachmentToolAction {
  return isToolActionKindHandledByPlugin(action.kind, 'attachment');
}

async function executeAttachmentToolAction(
  action: AttachmentToolAction,
  ctx: ToolContext
): Promise<ToolExecutionResult> {
  switch (action.kind) {
    case 'inspectAttachments': {
      const result = ctx.inspectAttachments(action.scope, action.query);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已找到 ${result.items.length} 个附件`,
        detailText: result.detailText,
        attachmentRefs: result.items
      };
    }
    case 'inspectArchiveEntries': {
      const result = await ctx.inspectArchiveEntries(action.target, action.query);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已读取 ${result.attachment.name} 的目录`,
        detailText: result.detailText,
        attachmentRefs: [result.attachment]
      };
    }
    case 'readAttachmentText': {
      const result = ctx.readAttachmentText(action.target, action.maxChars);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已读取 ${result.attachment.name}`,
        detailText: result.detailText,
        attachmentRefs: [result.attachment]
      };
    }
    case 'readArchiveEntryText': {
      const result = await ctx.readArchiveEntryText(action.target, action.entry, action.maxChars);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已读取 ${result.entry.path}`,
        detailText: result.detailText,
        attachmentRefs: [result.attachment]
      };
    }
    case 'bundleArchiveEntries': {
      const result = await ctx.bundleArchiveEntries(
        action.target,
        action.entries,
        action.prefixes,
        action.excludeEntries,
        action.excludePrefixes,
        action.archiveName
      );
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已重新打包 ${result.entries.length} 个包内文件`,
        detailText: result.detailText,
        attachments: [result.attachment],
        attachmentRefs: [result.sourceAttachment]
      };
    }
    case 'bundleAttachments': {
      const result = await ctx.bundleAttachments(action.targets, action.archiveName);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已打包 ${result.itemCount} 个附件`,
        detailText: result.detailText,
        attachments: [result.attachment]
      };
    }
    case 'createQrCode': {
      const result = await ctx.createQrCode(action.text, action.fileName);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: '已生成二维码',
        detailText: result.detailText,
        attachments: [result.attachment]
      };
    }
    case 'generateImage': {
      const result = await ctx.generateImage(action.prompt, action.title);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已生成图片 · ${result.model} · ${result.size}`,
        detailText: result.detailText,
        attachments: [result.attachment]
      };
    }
    case 'sendImageAttachment': {
      const result = await ctx.sendImageAttachment(action.target, action.title);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已发送图片 · ${result.attachment.name}`,
        detailText: result.detailText,
        attachments: [result.attachment]
      };
    }
    case 'inspectImageAsset': {
      const result = await ctx.inspectImageAsset(action.target);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已检查图片属性 · ${result.width}x${result.height}`,
        detailText: result.detailText
      };
    }
    case 'extractImagePalette': {
      const result = await ctx.extractImagePalette(action.target);
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已提取图片配色 · ${result.palette.map((color) => color.hex).slice(0, 4).join(' / ')}`,
        detailText: result.detailText
      };
    }
    case 'createImageVariant': {
      const result = await ctx.createImageVariant(action.target, {
        purpose: action.purpose,
        width: action.width,
        height: action.height,
        fit: action.fit,
        blur: action.blur,
        dim: action.dim,
        format: action.format,
        quality: action.quality,
        name: action.name
      });
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `已生成图片素材 · ${result.purpose} · ${result.width}x${result.height}`,
        detailText: result.detailText,
        attachments: [result.attachment]
      };
    }
    case 'saveAttachmentToCollection': {
      const result = ctx.saveAttachmentToCollection(
        action.target,
        action.title,
        action.tags,
        action.openInCollection,
        action.stickerPurpose !== undefined || (action.stickerMoods?.length ?? 0) > 0
          ? { purpose: action.stickerPurpose, moods: action.stickerMoods }
          : undefined
      );
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `${result.created ? '已存入' : '已定位到'}图片收藏 · ${result.title}`,
        imageCardId: result.cardId
      };
    }
    case 'saveAttachmentAsCodeCard': {
      const result = ctx.saveAttachmentAsCodeCard(
        action.target,
        action.title,
        action.language,
        action.tags,
        action.openInCollection
      );
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `${result.created ? '已存成' : '已定位到'}房间 · ${result.title}`,
        cardId: result.cardId
      };
    }
    case 'saveArchiveEntryAsCodeCard': {
      const result = await ctx.saveArchiveEntryAsCodeCard(
        action.target,
        action.entry,
        action.title,
        action.language,
        action.tags,
        action.openInCollection
      );
      if (!result.ok) return result;
      return {
        ok: true,
        summary: `${result.created ? '已存成' : '已定位到'}房间 · ${result.title}`,
        cardId: result.cardId
      };
    }
  }
}

export const attachmentToolExecutorPlugin: ToolExecutorPlugin = {
  name: 'attachment',
  canHandle: isAttachmentToolAction,
  execute: async (action, ctx) => {
    if (!isAttachmentToolAction(action)) {
      return { ok: false, error: `附件工具无法执行：${action.kind}` };
    }
    return executeAttachmentToolAction(action, ctx);
  }
};
