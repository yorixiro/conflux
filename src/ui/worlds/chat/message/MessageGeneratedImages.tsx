import { formatAttachmentSize } from '../../../../engines/attachmentFormat';
import type { ChatAttachment } from '../../../../types/domain';
import { useAssetObjectUrl } from '../../../useAssetObjectUrl';
import { useI18n } from '../../../../i18n';
import { canOpenImagePreviewLink, useNearViewportAssetLoading } from '../ChatAttachmentStrip';

type MessageGeneratedImagesProps = {
  attachments: ChatAttachment[];
  onSave?: (attachment: ChatAttachment) => void;
};

// 生成的图是成品，不是附件回执：大图占位，信息收进图下的小字
function GeneratedImageCard({
  attachment,
  onSave
}: {
  attachment: ChatAttachment;
  onSave?: (attachment: ChatAttachment) => void;
}) {
  const { t } = useI18n();
  const { ref, shouldLoad } = useNearViewportAssetLoading();
  const cleared = Boolean(attachment.clearedAt);
  const sticker = attachment.presentation === 'sticker';
  const assetUrl = useAssetObjectUrl(shouldLoad && !cleared ? attachment.assetId : undefined, !sticker);
  const sizeLabel = formatAttachmentSize(attachment.size);

  if (sticker && !cleared) {
    const image = assetUrl
      ? <img src={assetUrl} alt={attachment.name} title={attachment.name} loading="lazy" />
      : <span className="generated-image-canvas is-loading" aria-hidden="true" />;
    return (
      <figure ref={ref} className="generated-image-sticker">
        {assetUrl && canOpenImagePreviewLink() ? (
          <a href={assetUrl} target="_blank" rel="noreferrer"
            aria-label={t('chat.attachment.openAria', { name: attachment.name })}>{image}</a>
        ) : image}
      </figure>
    );
  }

  const canvas = assetUrl ? (
    <img src={assetUrl} alt={attachment.name} loading="lazy" />
  ) : (
    <span className={`generated-image-canvas ${cleared ? 'is-cleared' : 'is-loading'}`} aria-hidden="true" />
  );

  return (
    <figure ref={ref} className={`generated-image-card${cleared ? ' is-cleared' : ''}`}>
      {assetUrl && canOpenImagePreviewLink() ? (
        <a
          className="generated-image-frame"
          href={assetUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t('chat.attachment.openAria', { name: attachment.name })}
          title={attachment.name}
        >
          {canvas}
        </a>
      ) : (
        <span className="generated-image-frame">{canvas}</span>
      )}
      <figcaption className="generated-image-caption">
        <span className="generated-image-meta">
          <strong title={attachment.name}>{attachment.name}</strong>
          <span>{cleared ? t('chat.attachment.cleared', { size: sizeLabel }) : sizeLabel}</span>
        </span>
        {onSave && !cleared ? (
          <button
            type="button"
            className="attachment-save-btn"
            onClick={() => onSave(attachment)}
            aria-label={t('chat.attachment.saveAria', { name: attachment.name })}
          >
            {t('chat.attachment.save')}
          </button>
        ) : null}
      </figcaption>
    </figure>
  );
}

export function MessageGeneratedImages({ attachments, onSave }: MessageGeneratedImagesProps) {
  if (attachments.length === 0) return null;
  return (
    <div className={`generated-image-stack${attachments.every((attachment) =>
      attachment.presentation === 'sticker' && !attachment.clearedAt
    ) ? ' sticker-only' : ''}`}>
      {attachments.map((attachment) => (
        <GeneratedImageCard key={attachment.id} attachment={attachment} onSave={onSave} />
      ))}
    </div>
  );
}
