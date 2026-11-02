import { useRef, useState } from 'react';
import { getAssetBlob, getAssetMeta } from '../../../../../infrastructure/assetStore';
import { saveImageAssetCard, isImageFile } from '../../../../../app/collection/imageAssetImport';
import { useCollectionStore } from '../../../../../stores/collectionStore';
import type { ImageAssetCard } from '../../../../../types/domain';
import { useAssetObjectUrl } from '../../../../useAssetObjectUrl';
import { Icon } from '../../../../Icon';

function StickerTile({ card, editing, onPick, onEdit }: {
  card: ImageAssetCard;
  editing: boolean;
  onPick: (card: ImageAssetCard) => void;
  onEdit: (card: ImageAssetCard) => void;
}) {
  const url = useAssetObjectUrl(card.assetId, true);
  return (
    <div className="sticker-picker-tile">
      <button type="button" className="sticker-picker-tile-main"
        onClick={() => editing ? onEdit(card) : onPick(card)}
        aria-label={editing ? `编辑${card.title}用途` : `选择表情包${card.title}`}
        title={card.sticker?.purpose || card.title}>
        {url ? <img src={url} alt="" loading="lazy" /> : <span className="sticker-picker-no-preview">图片加载中</span>}
        <small>{card.sticker?.purpose || card.title}</small>
      </button>
    </div>
  );
}

export function StickerPickerPanel({ onPick, ownerCollaboratorId }: {
  onPick: (assetId: string, fallbackName: string) => Promise<void>;
  ownerCollaboratorId?: string;
}) {
  const allCards = useCollectionStore((state) => state.imageCards);
  const cards = allCards.filter((card) => !card.ownerCollaboratorId || card.ownerCollaboratorId === ownerCollaboratorId);
  const createImageCardFromAsset = useCollectionStore((state) => state.createImageCardFromAsset);
  const updateImageCard = useCollectionStore((state) => state.updateImageCard);
  const [editing, setEditing] = useState(false);
  const [editorId, setEditorId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [moods, setMoods] = useState('');
  const [search, setSearch] = useState('');
  const [showLibrary, setShowLibrary] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const stickers = cards.filter((card) => Boolean(card.sticker));
  const filtered = stickers.filter((card) =>
    [card.title, card.id, card.sticker?.purpose ?? '', ...(card.sticker?.moods ?? [])]
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const otherCards = cards.filter((card) => !card.sticker);

  const openEditor = (card: ImageAssetCard) => {
    setEditing(true);
    setEditorId(card.id);
    setPurpose(card.sticker?.purpose ?? '');
    setMoods((card.sticker?.moods ?? []).join('、'));
  };
  const saveEditor = () => {
    if (!editorId) return;
    updateImageCard(editorId, {
      sticker: { purpose: purpose.trim(), moods: moods.split(/[、，,\n]+/).map((v) => v.trim()).filter(Boolean) }
    });
    setEditorId(null);
  };
  const importFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files).filter(isImageFile);
    if (!incoming.length) { setStatus('请选择图片文件。'); return; }
    setBusy(true);
    setStatus('');
    let added = 0;
    try {
      for (const file of incoming) {
        const result = await saveImageAssetCard({
          blob: file,
          fileName: file.name || 'sticker.png',
          mimeType: file.type || 'image/png',
          source: 'manual',
          ownerCollaboratorId,
          createImageCardFromAsset
        });
        if (result) {
          updateImageCard(result.cardId, { sticker: { purpose: '', moods: [] } });
          added += 1;
        }
      }
      setStatus(`已导入 ${added} 张表情包，点击整理即可填写用途。`);
      setEditing(true);
    } catch (error) {
      setStatus(`已导入 ${added} 张；${error instanceof Error ? error.message : '部分图片保存失败'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sticker-picker-panel">
      <div className="sticker-picker-actions">
        <input className="sticker-picker-search" aria-label="搜索表情包" value={search}
          onChange={(event) => setSearch(event.target.value)} placeholder="搜索用途、情绪、名称…" />
        <button type="button" className={editing ? 'active' : ''} aria-pressed={editing}
          onClick={() => { setEditing((v) => !v); setEditorId(null); }}>{editing ? '完成' : '整理'}</button>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}>＋ 导入</button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(event) => {
            const files = event.target.files;
            if (files) void importFiles(files);
            event.target.value = '';
          }} />
      </div>
      {status ? <p className="sticker-picker-status" role="status">{status}</p> : null}
      {editorId ? (
        <div className="sticker-picker-editor">
          <small title={editorId}>表情包 ID：{editorId}</small>
          <input aria-label="适用场景" value={purpose} onChange={(e) => setPurpose(e.target.value)}
            placeholder="用途，例如：安慰、抱抱" maxLength={120} />
          <input aria-label="情绪标签" value={moods} onChange={(e) => setMoods(e.target.value)}
            placeholder="情绪标签，用逗号分隔" />
          <div>
            <button type="button" onClick={saveEditor}>保存用途</button>
            <button type="button" onClick={() => { updateImageCard(editorId, { sticker: null }); setEditorId(null); }}>移出表情包（保留图片）</button>
          </div>
        </div>
      ) : null}
      <div className="sticker-picker-grid">
        {filtered.map((card) => <StickerTile key={card.id} card={card} editing={editing}
          onPick={(chosen) => { if (!busy) void onPick(chosen.assetId, chosen.title); }} onEdit={openEditor} />)}
      </div>
      {filtered.length === 0 ? (
        <p className="sticker-picker-empty">{stickers.length === 0 ? '还没有表情包。可以批量导入，或者从已有图片收藏中选择。' : '没有匹配的表情包。'}</p>
      ) : null}
      <button type="button" className="sticker-picker-library-toggle"
        aria-expanded={showLibrary} onClick={() => setShowLibrary((v) => !v)}>
        {showLibrary ? '收起已有图片' : `从图片收藏添加（${otherCards.length}）`}
        <Icon name="chevron" size={13} />
      </button>
      {showLibrary ? (
        <div className="sticker-picker-library">
          {otherCards.map((card) => (
            <button type="button" key={card.id} onClick={() => {
              updateImageCard(card.id, { sticker: { purpose: '', moods: [] } });
              openEditor(card);
              setShowLibrary(false);
            }}>{card.title}</button>
          ))}
          {otherCards.length === 0 ? <small>没有未标记的图片。</small> : null}
        </div>
      ) : null}
    </div>
  );
}

export async function prepareStoredStickerFile(assetId: string, fallbackName: string): Promise<File> {
  const [blob, meta] = await Promise.all([getAssetBlob(assetId), getAssetMeta(assetId)]);
  if (!blob) throw new Error('表情包图片暂时无法读取。');
  return new File([blob], meta?.name || fallbackName || 'sticker.png', {
    type: meta?.mimeType && meta.mimeType.startsWith('image/') ? meta.mimeType : blob.type || 'image/png'
  });
}
