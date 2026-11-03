import { normalizeStringArray } from './assistantToolProtocolShared';
import type { ParseActionResult } from './assistantToolProtocolActionShared';
import {
  normalizeOptionalString,
  normalizePositiveInt,
  normalizeSaveAttachmentMode
} from './assistantToolProtocolActionShared';

function normalizeImageVariantPurpose(value: unknown) {
  return value === 'background' || value === 'bubble-sticker' || value === 'avatar' || value === 'thumbnail'
    ? value
    : undefined;
}

function normalizeImageVariantFit(value: unknown) {
  return value === 'cover' || value === 'contain' ? value : undefined;
}

function normalizeImageVariantFormat(value: unknown) {
  return value === 'png' || value === 'jpeg' || value === 'webp' ? value : undefined;
}

function normalizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function parseAttachmentToolAction(action: Record<string, unknown>): ParseActionResult | null {
  switch (action.kind) {
    case 'inspectAttachment':
      if (normalizeOptionalString(action.target)) {
        return { action: {
          kind: 'inspectArchiveEntries',
          target: normalizeOptionalString(action.target),
          query: normalizeOptionalString(action.query),
          targetLabel: normalizeOptionalString(action.targetLabel)
        } };
      }
      return { action: {
        kind: 'inspectAttachments',
        scope: action.scope === 'all' ? 'all' : 'latest',
        query: normalizeOptionalString(action.query)
      } };
    case 'readAttachment':
      if (normalizeOptionalString(action.entry)) {
        return { action: {
          kind: 'readArchiveEntryText',
          target: normalizeOptionalString(action.target),
          entry: normalizeOptionalString(action.entry),
          maxChars: normalizePositiveInt(action.maxChars),
          targetLabel: normalizeOptionalString(action.targetLabel)
        } };
      }
      return { action: {
        kind: 'readAttachmentText',
        target: normalizeOptionalString(action.target),
        maxChars: normalizePositiveInt(action.maxChars),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'bundleAttachment': {
      const targets = normalizeStringArray(action.targets);
      const entries = normalizeStringArray(action.entries);
      const prefixes = normalizeStringArray(action.prefixes);
      const excludeEntries = normalizeStringArray(action.excludeEntries);
      const excludePrefixes = normalizeStringArray(action.excludePrefixes);
      const target = normalizeOptionalString(action.target);
      if (target || entries.length || prefixes.length || excludeEntries.length || excludePrefixes.length) {
        return { action: {
          kind: 'bundleArchiveEntries',
          target,
          entries: entries.length ? entries : undefined,
          prefixes: prefixes.length ? prefixes : undefined,
          excludeEntries: excludeEntries.length ? excludeEntries : undefined,
          excludePrefixes: excludePrefixes.length ? excludePrefixes : undefined,
          archiveName: normalizeOptionalString(action.archiveName),
          targetLabel: normalizeOptionalString(action.targetLabel)
        } };
      }
      return { action: {
        kind: 'bundleAttachments',
        targets: targets.length ? targets : undefined,
        archiveName: normalizeOptionalString(action.archiveName),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    }
    case 'saveAttachment': {
      const saveAs = normalizeSaveAttachmentMode(action.saveAs);
      if (!saveAs) {
        return { action: null, issue: 'saveAttachment 缺少合法的 saveAs，只能是 imageCard 或 codeCard。' };
      }
      const entry = normalizeOptionalString(action.entry);
      if (saveAs === 'imageCard') {
        if (entry) {
          return { action: null, issue: '包内文件不能保存成图片收藏。请改用 saveAs=codeCard，或直接保存压缩包外层图片附件。' };
        }
        return { action: {
          kind: 'saveAttachmentToCollection',
          target: normalizeOptionalString(action.target),
          title: normalizeOptionalString(action.title),
          tags: normalizeStringArray(action.tags),
          openInCollection: action.openInCollection !== false,
          targetLabel: normalizeOptionalString(action.targetLabel)
        } };
      }
      if (entry) {
        return { action: {
          kind: 'saveArchiveEntryAsCodeCard',
          target: normalizeOptionalString(action.target),
          entry,
          title: normalizeOptionalString(action.title),
          language: normalizeOptionalString(action.language),
          tags: normalizeStringArray(action.tags),
          openInCollection: action.openInCollection !== false,
          targetLabel: normalizeOptionalString(action.targetLabel)
        } };
      }
      return { action: {
        kind: 'saveAttachmentAsCodeCard',
        target: normalizeOptionalString(action.target),
        title: normalizeOptionalString(action.title),
        language: normalizeOptionalString(action.language),
        tags: normalizeStringArray(action.tags),
        openInCollection: action.openInCollection !== false,
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    }
    case 'inspectAttachments':
      return { action: {
        kind: 'inspectAttachments',
        scope: action.scope === 'all' ? 'all' : 'latest',
        query: normalizeOptionalString(action.query)
      } };
    case 'readAttachmentText':
      return { action: {
        kind: 'readAttachmentText',
        target: normalizeOptionalString(action.target),
        maxChars: normalizePositiveInt(action.maxChars),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'bundleAttachments': {
      const targets = normalizeStringArray(action.targets);
      return { action: {
        kind: 'bundleAttachments',
        targets: targets.length ? targets : undefined,
        archiveName: normalizeOptionalString(action.archiveName),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    }
    case 'generateImage':
      return { action: {
        kind: 'generateImage',
        prompt: normalizeOptionalString(action.prompt) ?? '',
        title: normalizeOptionalString(action.title),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'sendImageAttachment':
      return { action: {
        kind: 'sendImageAttachment',
        target: normalizeOptionalString(action.target),
        title: normalizeOptionalString(action.title),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'inspectImageAsset':
      return { action: {
        kind: 'inspectImageAsset',
        target: normalizeOptionalString(action.target),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'extractImagePalette':
      return { action: {
        kind: 'extractImagePalette',
        target: normalizeOptionalString(action.target),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'createImageVariant':
      return { action: {
        kind: 'createImageVariant',
        target: normalizeOptionalString(action.target),
        purpose: normalizeImageVariantPurpose(action.purpose),
        width: normalizePositiveInt(action.width),
        height: normalizePositiveInt(action.height),
        fit: normalizeImageVariantFit(action.fit),
        blur: normalizeNumber(action.blur),
        dim: normalizeNumber(action.dim),
        format: normalizeImageVariantFormat(action.format),
        quality: normalizeNumber(action.quality),
        name: normalizeOptionalString(action.name),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'saveAttachmentToCollection':
      return { action: {
        kind: 'saveAttachmentToCollection',
        target: normalizeOptionalString(action.target),
        title: normalizeOptionalString(action.title),
        tags: normalizeStringArray(action.tags),
        ...(typeof action.stickerPurpose === 'string' ? { stickerPurpose: action.stickerPurpose.trim() } : {}),
        ...(Array.isArray(action.stickerMoods) ? { stickerMoods: normalizeStringArray(action.stickerMoods) } : {}),
        openInCollection: action.openInCollection !== false,
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'saveAttachmentAsCodeCard':
      return { action: {
        kind: 'saveAttachmentAsCodeCard',
        target: normalizeOptionalString(action.target),
        title: normalizeOptionalString(action.title),
        language: normalizeOptionalString(action.language),
        tags: normalizeStringArray(action.tags),
        openInCollection: action.openInCollection !== false,
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'inspectArchiveEntries':
      return { action: {
        kind: 'inspectArchiveEntries',
        target: normalizeOptionalString(action.target),
        query: normalizeOptionalString(action.query),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'readArchiveEntryText':
      return { action: {
        kind: 'readArchiveEntryText',
        target: normalizeOptionalString(action.target),
        entry: normalizeOptionalString(action.entry),
        maxChars: normalizePositiveInt(action.maxChars),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    case 'bundleArchiveEntries': {
      const entries = normalizeStringArray(action.entries);
      const prefixes = normalizeStringArray(action.prefixes);
      const excludeEntries = normalizeStringArray(action.excludeEntries);
      const excludePrefixes = normalizeStringArray(action.excludePrefixes);
      return { action: {
        kind: 'bundleArchiveEntries',
        target: normalizeOptionalString(action.target),
        entries: entries.length ? entries : undefined,
        prefixes: prefixes.length ? prefixes : undefined,
        excludeEntries: excludeEntries.length ? excludeEntries : undefined,
        excludePrefixes: excludePrefixes.length ? excludePrefixes : undefined,
        archiveName: normalizeOptionalString(action.archiveName),
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    }
    case 'saveArchiveEntryAsCodeCard':
      return { action: {
        kind: 'saveArchiveEntryAsCodeCard',
        target: normalizeOptionalString(action.target),
        entry: normalizeOptionalString(action.entry),
        title: normalizeOptionalString(action.title),
        language: normalizeOptionalString(action.language),
        tags: normalizeStringArray(action.tags),
        openInCollection: action.openInCollection !== false,
        targetLabel: normalizeOptionalString(action.targetLabel)
      } };
    default:
      return null;
  }
}
