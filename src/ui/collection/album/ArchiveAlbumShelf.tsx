import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { imageMimeFromFileName, isImageFile, saveImageAssetCard } from '../../../app/collection/imageAssetImport';
import { resolveOwnerCollaboratorId } from '../../../engines/collectionOwnership';
import { canUseNativePhotoLibraryPicker, pickNativePhotoLibraryFiles } from '../../../native/imagePickerFiles';
import { useChatStore } from '../../../stores/chatStore';
import { useCollectionStore } from '../../../stores/collectionStore';
import { usePersonaStore } from '../../../stores/personaStore';
import { ImageAssetPreview } from '../images/ImageAssetPreview';
import { ArchiveFolio } from './ArchiveFolio';
import './sasshi/book.css';
import './archive-album.css';

type OwnerId = 'self' | string;

export function ArchiveAlbumShelf({ searchTerm }: { searchTerm: string }) {
  const personas = usePersonaStore((state) => state.personas);
  const conversations = useChatStore((state) => state.conversations);
  const imageCards = useCollectionStore((state) => state.imageCards);
  const createImageCardFromAsset = useCollectionStore((state) => state.createImageCardFromAsset);
  const updateImageCard = useCollectionStore((state) => state.updateImageCard);
  const [ownerId, setOwnerId] = useState<OwnerId>('self');
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ error: boolean; text: string } | null>(null);
  const bookBox = useRef<HTMLDivElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const counts = useMemo(() => {
    const byOwner = new Map<string, number>();
    for (const card of imageCards) {
      const id = resolveOwnerCollaboratorId(card, conversations) ?? 'self';
      byOwner.set(id, (byOwner.get(id) ?? 0) + 1);
    }
    return byOwner;
  }, [imageCards, conversations]);
  const cards = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    return imageCards
      .filter((card) => (resolveOwnerCollaboratorId(card, conversations) ?? 'self') === ownerId)
      .filter((card) => !query || [card.title, ...card.tags].some((part) => part.toLocaleLowerCase().includes(query)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [imageCards, conversations, ownerId, searchTerm]);
  const activePreviewIndex = previewCardId ? cards.findIndex((card) => card.id === previewCardId) : -1;
  const ownerName = ownerId === 'self' ? '我的收藏' : (personas.find((persona) => persona.id === ownerId)?.name ?? '角色收藏');

  useEffect(() => {
    if (ownerId !== 'self' && !personas.some((persona) => persona.id === ownerId)) {
      setOwnerId('self');
      setPreviewCardId(null);
    }
  }, [ownerId, personas]);

  const switchOwner = (id: OwnerId) => {
    if (busy || id === ownerId) return;
    setOwnerId(id);
    setPreviewCardId(null);
    setStatus(null);
  };
  const importFiles = async (files: File[]) => {
    if (busy || !files.length) return;
    const imageFiles = files.filter(isImageFile);
    if (!imageFiles.length) {
      setStatus({ error: true, text: '请选择图片文件。' });
      return;
    }
    const destination = ownerId === 'self' ? undefined : ownerId;
    setBusy(true);
    setStatus(null);
    let saved = 0;
    try {
      for (const file of imageFiles) {
        const mimeType = file.type.startsWith('image/') ? file.type : imageMimeFromFileName(file.name);
        if (!mimeType) continue;
        const result = await saveImageAssetCard({
          blob: file,
          fileName: file.name,
          mimeType,
          source: 'manual',
          ownerCollaboratorId: destination,
          createImageCardFromAsset
        });
        if (result) saved += 1;
      }
      setStatus({ error: false, text: `已收入 ${ownerId === 'self' ? '我的' : ownerName}收藏册：${saved} 张。` });
    } catch (error) {
      setStatus({ error: true, text: `保存失败，已成功收入 ${saved} 张：${error instanceof Error ? error.message : '未知错误'}` });
    } finally {
      setBusy(false);
    }
  };
  const chooseFiles = async () => {
    if (busy) return;
    if (canUseNativePhotoLibraryPicker()) {
      try {
        await importFiles(await pickNativePhotoLibraryFiles());
      } catch (error) {
        setStatus({ error: true, text: error instanceof Error ? error.message : '未能打开相册。' });
      }
      return;
    }
    fileInput.current?.click();
  };
  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    void importFiles(files);
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.files.length) return;
    event.preventDefault();
    void importFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="conflux-archive-album">
      <header className="conflux-archive-album__header">
        <div>
          <h2>收藏册</h2>
          <p>藍鉄色透明收藏册，拉链袋中的照片与纪念。</p>
        </div>
        <div className="conflux-archive-album__actions">
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleInput} />
          <button type="button" disabled={busy} onClick={() => void chooseFiles()}>{busy ? '正在收藏…' : '＋ 收入照片'}</button>
        </div>
      </header>
      <div className="conflux-archive-album__owners" role="tablist" aria-label="选择收藏册归属">
        <button type="button" role="tab" aria-selected={ownerId === 'self'} disabled={busy} className={ownerId === 'self' ? 'is-active' : ''} onClick={() => switchOwner('self')}>自己 <span>{counts.get('self') ?? 0}</span></button>
        {personas.map((persona) => <button key={persona.id} type="button" role="tab" aria-selected={ownerId === persona.id} disabled={busy} className={ownerId === persona.id ? 'is-active' : ''} onClick={() => switchOwner(persona.id)}>{persona.name} <span>{counts.get(persona.id) ?? 0}</span></button>)}
      </div>
      {status ? <p className={`conflux-archive-album__status ${status.error ? 'is-error' : ''}`} role="status">{status.text}</p> : null}
      <div
        className="conflux-archive-album__desk"
        ref={bookBox}
        onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); }}
        onDrop={handleDrop}
      >
        <ArchiveFolio
          key={ownerId}
          ownerId={ownerId}
          ownerName={ownerName}
          description={ownerId === 'self' ? undefined : personas.find((persona) => persona.id === ownerId)?.description}
          cards={cards}
          onPickPhoto={setPreviewCardId}
        />
        {cards.length === 0 ? <div className="conflux-archive-album__empty">这本收藏册还没有照片。<button type="button" onClick={() => void chooseFiles()} disabled={busy}>收进第一张照片</button></div> : null}
      </div>
      {activePreviewIndex >= 0 ? (
        <ImageAssetPreview
          cards={cards}
          activeIndex={activePreviewIndex}
          onChangeCard={(next) => setPreviewCardId(cards[next]?.id ?? null)}
          onClose={() => setPreviewCardId(null)}
          onSharePublished={(cardId, patch) => updateImageCard(cardId, patch)}
        />
      ) : null}
    </div>
  );
}
