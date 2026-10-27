import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DirectionalLight, Group } from 'three';
import { getAssetBlob, getAssetPreviewBlob } from '../../../infrastructure/assetStore';
import type { ImageAssetCard } from '../../../types/domain';
import type { PouchAddon, SceneAddon } from './bag';
import type { MotionStatus } from './bag/motion';
import { createPocketGrid } from './sasshi/content/grid';
import type { PocketItem, Profile } from './profile/schema';
import { BookView, type BookViewHandle } from './sasshi/BookView';
import type { CaseSpec } from './sasshi/binder';
import type { CoverSpec } from './sasshi/cover';
import { canRender3d } from './sasshi/support';
import { COLLECTED_STAMPS } from './stamps';

type BagModule = typeof import('./bag');
type MotionUi = MotionStatus | 'off' | 'asking';
type Pages = { photo: PouchAddon; stamps: PouchAddon; select: (stamps: boolean) => void };

const PHOTOS_PER_POUCH = 2;
const FOLIO_CASE: Omit<CaseSpec, 'liner'> = {
  rings: false,
  board: { w: 250, h: 340 },
  depth: 16,
};

/** One real transparent sheet: two 3D pockets can be revealed by turning it. */
const INNER_PAGE = createPocketGrid({
  items: Array.from({ length: 7 }, (_, i) => ({ id: `clear-pocket:${i}` })),
  paint: () => {},
  sources: () => [],
});

/** Object URLs exist only for the currently needed photographs, not in application state. */
function usePouchImages(cards: ImageAssetCard[]) {
  const cache = useRef(new Map<string, string | null>());
  const [version, setVersion] = useState(0);
  const ids = cards.map((card) => card.assetId);
  const signature = ids.join('|');

  useEffect(() => {
    let cancelled = false;
    for (const assetId of ids) {
      if (cache.current.has(assetId)) continue;
      void (async () => {
        let url: string | null = null;
        try {
          const blob = (await getAssetPreviewBlob(assetId)) ?? (await getAssetBlob(assetId));
          if (blob) url = URL.createObjectURL(blob);
        } catch {
          // A damaged photo can be skipped without losing the other objects.
        }
        if (cancelled) {
          if (url) URL.revokeObjectURL(url);
          return;
        }
        cache.current.set(assetId, url);
        // Keep only a few neighbouring photo groups in memory on Android.
        if (cache.current.size > 16) {
          for (const [oldId, oldUrl] of cache.current) {
            if (ids.includes(oldId)) continue;
            cache.current.delete(oldId);
            if (oldUrl) URL.revokeObjectURL(oldUrl);
            if (cache.current.size <= 12) break;
          }
        }
        setVersion((n) => n + 1);
      })();
    }
    return () => { cancelled = true; };
  }, [signature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    for (const url of cache.current.values()) if (url) URL.revokeObjectURL(url);
    cache.current.clear();
  }, []);

  return {
    ready: ids.every((id) => cache.current.has(id)),
    urls: Object.fromEntries(ids.flatMap((id) => {
      const url = cache.current.get(id);
      return url ? [[id, url]] : [];
    })) as Record<string, string>,
    version,
  };
}

/** An in-memory rendering of existing Conflux images, never a replacement data model. */
function folioProfile(name: string, cards: ImageAssetCard[], visible: ImageAssetCard[], urls: Record<string, string>, description?: string): Profile {
  const latest = cards[0];
  const date = latest ? new Date(latest.updatedAt).toISOString().slice(0, 10) : '—';
  const items: PocketItem[] = [
    {
      kind: 'resume', id: 'folio-index', label: '收藏目录',
      summary: `${name} · ${cards.length} 张收藏照片。`,
      experience: [], education: [],
      skills: [...new Set(cards.flatMap((card) => card.tags))].slice(0, 12),
    },
    {
      kind: 'note', id: 'folio-note', label: '随页便笺',
      text: description?.trim().slice(0, 100) || `${name}的私人收藏。`,
      from: name,
    },
    {
      kind: 'card', id: 'folio-name', label: '藏主名片',
      front: { name, role: '收藏册', tagline: `${cards.length} 张照片` },
      inside: [{ k: '收藏总数', v: `${cards.length}` }, { k: '最近整理', v: date }],
    },
    {
      kind: 'ticket', id: 'folio-ticket', label: '收藏票根',
      event: '私人收藏', date, color: '#648ba4',
      serial: `No. ${String(cards.length).padStart(4, '0')}`,
    },
    ...visible.filter((card) => urls[card.assetId]).map((card): PocketItem => ({
      kind: 'polaroid', id: `photo:${card.id}`, label: card.title,
      image: urls[card.assetId], caption: card.title,
      date: new Date(card.createdAt).toISOString().slice(0, 10),
      back: card.tags.join(' · '),
    })),
  ];
  return {
    lang: 'zh-CN', name, role: '收藏册', bio: description || '',
    links: [], coverTitle: name, items,
    albums: { cards: [], postcards: [] },
  };
}

/** A second physical pocket in the same binder; photographs remain on the first page. */
function stampProfile(name: string): Profile {
  return {
    lang: 'zh-CN', name, role: '邮票收藏', bio: '六枚纪念邮票', links: [], coverTitle: name,
    items: COLLECTED_STAMPS.map((stamp) => ({
      kind: 'stamp' as const,
      id: `stamp:${stamp.id}`,
      label: stamp.title,
      image: stamp.image,
      finish: stamp.finish,
      ...('metal' in stamp ? { metal: stamp.metal } : {}),
    })),
    albums: { cards: [], postcards: [] },
  };
}

export function ArchiveFolio({
  ownerId, ownerName, description, cards, onPickPhoto,
}: {
  ownerId: string;
  ownerName: string;
  description?: string;
  cards: ImageAssetCard[];
  onPickPhoto: (cardId: string) => void;
}) {
  const [bag, setBag] = useState<BagModule | null>(null);
  const [supported] = useState(() => typeof document !== 'undefined' && canRender3d());
  // Tablet GPUs can handle a sharp MSAA canvas, but the desktop-size VSM
  // shadows and frost targets make every drag needlessly expensive. Sasshi's
  // low preset reduces those auxiliary passes without lowering pixel ratio.
  const [folioQuality] = useState<'low' | undefined>(() =>
    typeof window !== 'undefined' && (
      window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
    ) ? 'low' : undefined,
  );
  const [group, setGroup] = useState(0);
  const [closed, setClosed] = useState(false);
  const [motion, setMotion] = useState<MotionUi>('off');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const [stampPageOpen, setStampPageOpen] = useState(false);
  const bookRef = useRef<BookViewHandle | null>(null);
  const pouchRef = useRef<PouchAddon | null>(null);
  const pagesRef = useRef<Pages | null>(null);
  const livePick = useRef<(id: string) => void>(() => {});
  const livePhotoProfile = useRef<Profile | null>(null);
  const liveStampProfile = useRef<Profile | null>(null);

  const count = Math.max(1, Math.ceil(cards.length / PHOTOS_PER_POUCH));
  const index = Math.min(group, count - 1);
  const visible = useMemo(() => cards.slice(index * PHOTOS_PER_POUCH, (index + 1) * PHOTOS_PER_POUCH), [cards, index]);
  const pictures = usePouchImages(visible);
  const photoProfile = useMemo(() => folioProfile(ownerName, cards, visible, pictures.urls, description),
    [ownerName, cards, visible, pictures.version, description]); // eslint-disable-line react-hooks/exhaustive-deps
  const postageProfile = useMemo(() => stampProfile(ownerName), [ownerName]);
  const profile = stampPageOpen && ownerId === 'self' ? postageProfile : photoProfile;
  livePhotoProfile.current = photoProfile;
  liveStampProfile.current = postageProfile;

  useEffect(() => {
    let cancelled = false;
    void import('./bag').then((module) => {
      if (!cancelled) {
        setBag(module);
        if (module.motionEnabled()) setMotion('granted');
      }
    }).catch((error: unknown) => console.warn('[Conflux] 透明收藏袋无法初始化', error));
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    setGroup(0);
    setDetailId(null);
    setStampPageOpen(false);
  }, [ownerId]);
  useEffect(() => () => { bag?.disableMotion(); }, [bag]);

  const pick = useCallback((id: string) => {
    if (id.startsWith('photo:')) {
      onPickPhoto(id.slice('photo:'.length));
    } else {
      setDetailId(id);
    }
  }, [onPickPhoto]);
  livePick.current = pick;

  const addons = useCallback(() => {
    if (!bag || !livePhotoProfile.current || !liveStampProfile.current) return [];
    const options = {
      fit: { width: 2.5, height: 3.4 },
      printScale: 1, // phone: limit upload and memory cost
      onPick: (id: string) => livePick.current(id),
    };
    const photo = bag.createPouchAddon({ ...options, profile: livePhotoProfile.current });
    if (ownerId !== 'self') {
      pouchRef.current = photo;
      pagesRef.current = null;
      return [photo];
    }
    const stamps = bag.createPouchAddon({ ...options, profile: liveStampProfile.current, labels: { pouch: 'POSTAGE · 06' } });
    // A narrow book cameras the LEFT board after the sheet turns. Keep the
    // photo pouch on the right/back board and mount the stamp pouch on the
    // left/front board. Putting both under 'back-inside' crops the stamps
    // outside the viewport on page two (as seen on the Android tablet).
    const postageGroup = new Group();
    postageGroup.name = 'folio-postage-front-page';
    postageGroup.add(stamps.object);
    // The foil's directional key follows the pointer in the same board frame.
    const key = new DirectionalLight(0xfff1d8, 0);
    key.position.set(-0.3, 0.45, 0.5);
    postageGroup.add(key, key.target);
    let wake: (() => void) | null = null;
    let lastLight = '';
    const aim = (ray: Parameters<NonNullable<PouchAddon['pointer']>['down']>[0]) => {
      if (!stamps.object.visible) return;
      const hit = stamps.debug.hit(ray);
      const position = hit ? stamps.debug.sim.state().find((state) => state.id === hit.id) : null;
      const lx = hit && position ? Math.max(-0.5, Math.min(0.5, (hit.x - position.x) / 0.071)) : 0;
      const ly = hit && position ? Math.max(-0.5, Math.min(0.5, (hit.y - position.y) / 0.089)) : 0;
      const signature = position ? `${lx.toFixed(2)}:${ly.toFixed(2)}` : 'off';
      if (signature === lastLight) return;
      lastLight = signature;
      key.intensity = position ? 0.75 : 0;
      key.position.set(-0.3 + lx, 0.45 - ly, 0.5).normalize();
      wake?.();
    };
    const select = (postage: boolean) => {
      photo.object.visible = !postage;
      stamps.object.visible = postage;
      postageGroup.visible = postage;
      key.intensity = 0;
      lastLight = '';
      pouchRef.current = postage ? stamps : photo;
      wake?.();
    };
    select(false);
    pagesRef.current = { photo, stamps, select };
    const photoPage: SceneAddon = {
      anchor: 'back-inside',
      object: photo.object,
      attach: (ctx) => photo.attach(ctx),
      update: (dt, t, frame) => photo.object.visible && photo.update(dt, t, frame),
      pointer: {
        down: (ray, event) => photo.object.visible && photo.pointer.down(ray, event),
        move: (ray, event) => { if (photo.object.visible) photo.pointer.move(ray, event); },
        up: (ray, event) => { if (photo.object.visible) photo.pointer.up(ray, event); },
        hover: (ray) => photo.object.visible && (photo.pointer.hover?.(ray) ?? false),
      },
      setOpen: (open) => photo.setOpen(open),
      setDark: (dark) => photo.setDark(dark),
      printed: () => photo.printed?.() ?? Promise.resolve(),
      restore: () => photo.restore(),
      dispose: () => photo.dispose(),
    };
    const postagePage: SceneAddon = {
      anchor: 'front-inside',
      object: postageGroup,
      attach: (ctx) => { wake = ctx.invalidate; stamps.attach(ctx); },
      update: (dt, t, frame) => stamps.object.visible && stamps.update(dt, t, frame),
      pointer: {
        down: (ray, event) => { if (!stamps.object.visible) return false; aim(ray); return stamps.pointer.down(ray, event); },
        move: (ray, event) => { if (stamps.object.visible) { aim(ray); stamps.pointer.move(ray, event); } },
        up: (ray, event) => { if (stamps.object.visible) stamps.pointer.up(ray, event); },
        hover: (ray) => { if (!stamps.object.visible) return false; aim(ray); return stamps.pointer.hover?.(ray) ?? false; },
      },
      setOpen: (open) => stamps.setOpen(open),
      setDark: (dark) => stamps.setDark(dark),
      // The six relief textures can finish streaming after the cover opens.
      printed: () => Promise.resolve(),
      restore: () => stamps.restore(),
      dispose: () => { stamps.dispose(); pagesRef.current = null; },
    };
    return [photoPage, postagePage];
  }, [bag, ownerId]);

  const caseSpec = useMemo<CaseSpec>(() => ({
    ...FOLIO_CASE,
    liner: { title: ownerName, role: '收藏册', lang: 'zh-CN', seal: null },
  }), [ownerName]);
  const cover = useMemo<CoverSpec>(() => ({
    material: 'frost', color: 'aitetsu', foil: 'silver',
    window: null, title: ownerName,
  }), [ownerName]);

  const shake = () => {
    bookRef.current?.shake(0.8);
    pouchRef.current?.shake(1);
  };
  const toggleMotion = () => {
    if (!bag || !pouchRef.current) return;
    if (motion === 'granted') {
      bag.disableMotion();
      setMotion('off');
      return;
    }
    // Browser permission must be requested from this actual tap.
    const request = pouchRef.current.enableMotion();
    setMotion('asking');
    void request.then(setMotion);
  };

  useEffect(() => {
    if (!detailId || !pouchRef.current) {
      setDetailImage(null);
      return;
    }
    let cancelled = false;
    setDetailImage(null);
    void pouchRef.current.snapshot(detailId, 740, { shadow: true }).then((image) => {
      if (!cancelled && image) setDetailImage(typeof image === 'string' ? image : image.url);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [detailId]);
  useEffect(() => {
    if (!detailId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailId(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [detailId]);
  const detail = profile.items.find((item) => item.id === detailId);
  const show3d = supported && !!bag && pictures.ready;

  return (
    <>
      {show3d ? (
        <BookView
          key={`${ownerId}:${index}:${visible.map((card) => card.id).join(':')}`}
          ref={bookRef}
          content={ownerId === 'self' ? INNER_PAGE : undefined}
          sheets={ownerId === 'self' ? 1 : 0}
          case={caseSpec}
          cover={cover}
          addons={addons}
          quality={folioQuality}
          tilt
          autoOpen
          onState={(state) => {
            setClosed(state.closed);
            const postage = ownerId === 'self' && state.index > 0;
            pagesRef.current?.select(postage);
            setStampPageOpen(postage);
          }}
          labels={{ region: `${ownerName}的蓝色收藏册`, openBook: '打开收藏册' }}
        />
      ) : (
        <div className="conflux-archive-album__loading" role="status">
          {supported ? '正在整理透明收藏袋…' : '这台设备暂不支持 3D 展示，可从下方查看收藏。'}
        </div>
      )}
      <div className="conflux-archive-album__pouch-index" aria-label="袋内物件">
        {profile.items.map((item) => <button key={item.id} type="button" onClick={() => pick(item.id)}>{item.label}</button>)}
      </div>
      {ownerId === 'self' ? (
        <button
          type="button"
          className="conflux-archive-album__page-tab"
          data-stamp-active={stampPageOpen ? 'true' : undefined}
          aria-pressed={stampPageOpen}
          aria-label={stampPageOpen ? '翻回照片收藏内页' : '翻到六枚邮票收藏内页'}
          onClick={() => {
            setDetailId(null);
            if (closed) bookRef.current?.toggleCover();
            else if (stampPageOpen) bookRef.current?.prev();
            else bookRef.current?.next();
          }}
        >
          <span>{stampPageOpen ? 'PHOTOS' : 'POSTAGE'}</span>
          <small>{stampPageOpen ? '01' : '02'}</small>
        </button>
      ) : null}
      {stampPageOpen ? (
        <a className="conflux-archive-album__stamp-credit" href="https://billguo.me/" target="_blank" rel="noopener noreferrer">
          邮票原作 · Bill Guo
        </a>
      ) : null}
      <div className="conflux-archive-album__pagination" aria-label="收藏册操作">
        <button type="button" disabled={!show3d} onClick={() => bookRef.current?.toggleCover()}>{closed ? '打开封套' : '合上封套'}</button>
        <button type="button" disabled={!show3d || closed} onClick={shake}>摇一摇</button>
        {show3d && motion !== 'unsupported' ? <button type="button" disabled={motion === 'asking' || closed} onClick={toggleMotion}>{motion === 'granted' ? '关闭体感' : motion === 'asking' ? '正在请求…' : '手机体感'}</button> : null}
        {!stampPageOpen && cards.length > PHOTOS_PER_POUCH ? (
          <>
            <button type="button" disabled={index === 0} onClick={() => { setGroup(index - 1); setDetailId(null); }}>上一组</button>
            <span>{index + 1} / {count}</span>
            <button type="button" disabled={index >= count - 1} onClick={() => { setGroup(index + 1); setDetailId(null); }}>下一组</button>
          </>
        ) : <span>{stampPageOpen ? '02 / 02 · 六枚邮票' : `${cards.length} 张收藏`}</span>}
      </div>
      {detail ? (
        <div className="conflux-archive-album__detail-backdrop" role="presentation" onClick={() => setDetailId(null)}>
          <div className="conflux-archive-album__detail" role="dialog" aria-modal="true" aria-label={detail.label} onClick={(event) => event.stopPropagation()}>
            <button className="conflux-archive-album__detail-close" type="button" onClick={() => setDetailId(null)}>关闭</button>
            <h3>{detail.label}</h3>
            {detailImage ? <img src={detailImage} alt={detail.label} /> : null}
            {detail.kind === 'note' ? <p>{detail.text}</p> : null}
            {detail.kind === 'resume' ? <p>{detail.summary}</p> : null}
            {detail.kind === 'card' ? <p>{detail.front.name} · {detail.front.role}</p> : null}
            {detail.kind === 'ticket' ? <p>{detail.event} · {detail.date}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
