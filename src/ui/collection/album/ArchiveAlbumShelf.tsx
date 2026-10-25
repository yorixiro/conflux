import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { imageMimeFromFileName, isImageFile, saveImageAssetCard } from '../../../app/collection/imageAssetImport';
import { resolveOwnerCollaboratorId } from '../../../engines/collectionOwnership';
import { getAssetBlob, getAssetPreviewBlob } from '../../../infrastructure/assetStore';
import { canUseNativePhotoLibraryPicker, pickNativePhotoLibraryFiles } from '../../../native/imagePickerFiles';
import { useChatStore } from '../../../stores/chatStore';
import { useCollectionStore } from '../../../stores/collectionStore';
import { usePersonaStore } from '../../../stores/personaStore';
import type { ImageAssetCard } from '../../../types/domain';
import { ImageAssetPreview } from '../images/ImageAssetPreview';
import { FlatBook } from './sasshi/FlatBook';
import { BOOKLET_COVERS } from './sasshi/cover';
import { createAlbumImageContent } from './sasshi/content';
import { resolveLayout } from './sasshi/layout';
import './sasshi/book.css';
import './archive-album.css';

type OwnerId = 'self' | string;
const BOOK_LAYOUT = resolveLayout('idCard2x4');

/** Reads only nearby sleeve previews; full images remain in Conflux's canonical asset store. */
function useNearbyAlbumImages(cards: ImageAssetCard[], index: number, narrow: boolean) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const visibleIds = useMemo(() => {
    const start = narrow ? Math.max(0, index - 1) * BOOK_LAYOUT.perSide : Math.max(0, index * 2 - 2) * BOOK_LAYOUT.perSide;
    const end = narrow ? (index + 2) * BOOK_LAYOUT.perSide : (index * 2 + 2) * BOOK_LAYOUT.perSide;
    return cards.slice(start, end).map((card) => card.assetId);
  }, [cards, index, narrow]);
  const assetKey = visibleIds.join('|');

  useEffect(() => {
    let active = true;
    const created: string[] = [];
    setUrls({});
    for (const assetId of visibleIds) {
      void (async () => {
        try {
          const blob = (await getAssetPreviewBlob(assetId)) ?? (await getAssetBlob(assetId));
          if (!blob) return;
          const objectUrl = URL.createObjectURL(blob);
          if (!active) {
            URL.revokeObjectURL(objectUrl);
            return;
          }
          created.push(objectUrl);
          setUrls((existing) => ({ ...existing, [assetId]: objectUrl }));
        } catch {
          // A missing/corrupt asset must not keep the rest of the book from opening.
        }
      })();
    }
    return () => {
      active = false;
      for (const url of created) URL.revokeObjectURL(url);
    };
  }, [assetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return urls;
}

export function ArchiveAlbumShelf({ searchTerm }: { searchTerm: string }) {
  const personas = usePersonaStore((state) => state.personas);
  const conversations = useChatStore((state) => state.conversations);
  const imageCards = useCollectionStore((state) => state.imageCards);
  const createImageCardFromAsset = useCollectionStore((state) => state.createImageCardFromAsset);
  const updateImageCard = useCollectionStore((state) => state.updateImageCard);
  const [ownerId, setOwnerId] = useState<OwnerId>('self');
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [narrow, setNarrow] = useState(false);
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
  const total = narrow ? BOOK_LAYOUT.pageCount(cards.length) : BOOK_LAYOUT.sheetCount(cards.length) + 1;
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const urls = useNearbyAlbumImages(cards, safeIndex, narrow);
  const content = useMemo(() => createAlbumImageContent(cards.map((card) => ({
    id: card.id,
    label: card.title,
    src: urls[card.assetId]
  }))), [cards, urls]);
  const activePreviewIndex = previewCardId ? cards.findIndex((card) => card.id === previewCardId) : -1;
  const ownerName = ownerId === 'self' ? '我的收藏' : (personas.find((persona) => persona.id === ownerId)?.name ?? '角色收藏');

  useEffect(() => {
    const element = bookBox.current;
    if (!element) return;
    const measure = () => setNarrow(element.clientWidth < 700);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (ownerId !== 'self' && !personas.some((persona) => persona.id === ownerId)) {
      setOwnerId('self');
      setIndex(0);
      setPreviewCardId(null);
    }
  }, [ownerId, personas]);

  const switchOwner = (id: OwnerId) => {
    if (busy || id === ownerId) return;
    setOwnerId(id);
    setIndex(0);
    setClosed(false);
    setPreviewCardId(null);
    setStatus(null);
  };
  const turn = (direction: 1 | -1) => {
    if (closed) {
      if (direction > 0) setClosed(false);
      return;
    }
    if (direction < 0 && safeIndex === 0) {
      setClosed(true);
    } else {
      setIndex(Math.min(total - 1, Math.max(0, safeIndex + direction)));
    }
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
      setClosed(false);
      setIndex(0);
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
          <p>透明卡套里的照片与纪念，每个人都有自己的那一本。</p>
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
        <FlatBook
          content={content}
          layout={BOOK_LAYOUT}
          cover={{ ...BOOKLET_COVERS.cards, title: ownerName }}
          index={safeIndex}
          narrow={narrow}
          closed={closed}
          onTurn={turn}
          onPick={(itemIndex) => setPreviewCardId(cards[itemIndex]?.id ?? null)}
          labels={{ openBook: '打开收藏册', openCard: (title) => `查看 ${title}` }}
        />
        {cards.length === 0 && !closed ? <div className="conflux-archive-album__empty">这本收藏册还是空的。<button type="button" onClick={() => void chooseFiles()} disabled={busy}>收进第一张照片</button></div> : null}
      </div>
      <div className="conflux-archive-album__pagination" aria-label="收藏册翻页">
        <button type="button" onClick={() => turn(-1)} disabled={closed}>上一页</button>
        <span>{closed ? '封面' : `${safeIndex + 1} / ${total}`} · {cards.length} 张收藏</span>
        <button type="button" onClick={() => turn(1)} disabled={!closed && safeIndex === total - 1}>{closed ? '打开' : '下一页'}</button>
        {!closed ? <button type="button" onClick={() => setClosed(true)}>合上</button> : null}
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
