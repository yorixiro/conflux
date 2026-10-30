import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DirectionalLight, Group } from 'three';
import { getAssetBlob, getAssetPreviewBlob } from '../../../infrastructure/assetStore';
import type { ImageAssetCard } from '../../../types/domain';
import type { AddonContext, PouchAddon, SceneAddon } from './bag/addon';
import type { MotionStatus } from './bag/motion';
import type { PocketItem, Profile } from './profile/schema';
import { BookView, type BookViewHandle } from './sasshi/BookView';
import type { CaseSpec } from './sasshi/binder';
import type { CoverSpec } from './sasshi/cover';
import { canRender3d } from './sasshi/support';
import { COLLECTED_STAMPS } from './stamps';

type BagModule = typeof import('./bag');
type MotionUi = MotionStatus | 'off' | 'asking';
type Pages = { setPhoto: (profile: Profile) => void; select: (stamps: boolean) => void };

const PHOTOS_PER_POUCH = 2;
const FOLIO_CASE: Omit<CaseSpec, 'liner'> = {
  rings: false,
  board: { w: 250, h: 340 },
  depth: 16,
};

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

/** An alternate 3D sleeve within the same binder; not a fake paper sheet. */
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
  const [group, setGroup] = useState(0);
  const [closed, setClosed] = useState(false);
  const [motion, setMotion] = useState<MotionUi>('off');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailImage, setDetailImage] = useState<string | null>(null);
  const [stampPageOpen, setStampPageOpen] = useState(false);
  const [loadedOwner, setLoadedOwner] = useState<string | null>(null);
  const bookRef = useRef<BookViewHandle | null>(null);
  const pouchRef = useRef<PouchAddon | null>(null);
  const pagesRef = useRef<Pages | null>(null);
  const livePick = useRef<(id: string) => void>(() => {});
  const livePhotoProfile = useRef<Profile | null>(null);
  const liveStampProfile = useRef<Profile | null>(null);
  const liveStampPageOpen = useRef(false);
  const livePicturesReady = useRef(false);

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
  liveStampPageOpen.current = stampPageOpen;
  livePicturesReady.current = pictures.ready;
  useEffect(() => {
    if (pictures.ready) setLoadedOwner(ownerId);
  }, [ownerId, pictures.ready]);
  useEffect(() => {
    if (pictures.ready) pagesRef.current?.setPhoto(photoProfile);
  }, [photoProfile, pictures.ready]);

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
    let photo = bag.createPouchAddon({ ...options, profile: livePhotoProfile.current, prewarmStills: false });
    // Hidden stamps do not build meshes, decode maps or compile programs until their first selection.
    let stamps: PouchAddon | null = null;
    // This folio has no paper sheets: an earlier attempt inserted seven dummy
    // card cells just to get a second page index. The resulting empty sheet
    // covered the stamps and cost a full deforming mesh/shadow pass. Switch
    // which 3D sleeve is visible inside the SAME blue back cover instead.
    const sleeveGroup = new Group();
    sleeveGroup.name = 'folio-sleeves';
    sleeveGroup.add(photo.object);
    // The foil's directional key follows the pointer in the pouch frame.
    const key = new DirectionalLight(0xfff1d8, 0);
    key.position.set(-0.3, 0.45, 0.5);
    sleeveGroup.add(key, key.target);
    let wake: (() => void) | null = null;
    let context: AddonContext | null = null;
    let disposed = false;
    let photoGen = 0;
    let pendingPhoto: PouchAddon | null = null;
    let requestedPhoto = JSON.stringify(livePhotoProfile.current);
    let open = 0;
    let postage = false;
    const attachPouch = (pouch: PouchAddon) => {
      if (!context) return;
      pouch.attach({ ...context, invalidate: () => {
        if (!disposed && pouch.object.visible && (pouch === photo || pouch === stamps)) wake?.();
      } });
    };
    let lastLight = '';
    const aim = (ray: Parameters<NonNullable<PouchAddon['pointer']>['down']>[0]) => {
      if (!stamps || !postage) return;
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
    const select = (next: boolean) => {
      postage = next && ownerId === 'self';
      if (postage && !stamps) {
        stamps = bag.createPouchAddon({ ...options, profile: liveStampProfile.current!, labels: { pouch: 'POSTAGE · 06' }, prewarmStills: false });
        sleeveGroup.add(stamps.object);
        attachPouch(stamps);
        stamps.setOpen(open);
      }
      photo.object.visible = !postage;
      if (stamps) stamps.object.visible = postage;
      key.intensity = 0;
      lastLight = '';
      pouchRef.current = postage ? stamps : photo;
      wake?.();
    };
    select(false);
    const pages: Pages = {
      select,
      setPhoto(next) {
        const signature = JSON.stringify(next);
        if (disposed || signature === requestedPhoto) return;
        requestedPhoto = signature;
        const gen = ++photoGen;
        pendingPhoto?.dispose();
        pendingPhoto = null;
        void photo.setProfile(next).then(async (updated) => {
          if (disposed || gen !== photoGen || updated) return;
          // A different object count (e.g. the final group has one photo) replaces only this sleeve.
          const replacement = bag.createPouchAddon({ ...options, profile: next, prewarmStills: false });
          pendingPhoto = replacement;
          attachPouch(replacement);
          await replacement.printed?.();
          if (disposed || gen !== photoGen) { replacement.dispose(); return; }
          pendingPhoto = null;
          photo.dispose();
          photo = replacement;
          sleeveGroup.add(photo.object);
          photo.setOpen(open);
          select(postage);
        }).catch((error: unknown) => {
          if (!disposed && gen === photoGen) console.warn('[Conflux] 照片收纳袋更新失败', error);
        });
      },
    };
    pagesRef.current = pages;
    const active = () => postage && stamps ? stamps : photo;
    const sleeves: SceneAddon = {
      anchor: 'back-inside',
      object: sleeveGroup,
      attach: (ctx) => { context = ctx; wake = ctx.invalidate; attachPouch(photo); if (stamps) attachPouch(stamps); },
      update: (dt, t, frame) => active().update(dt, t, frame),
      pointer: {
        down: (ray, event) => { aim(ray); return active().pointer.down(ray, event); },
        move: (ray, event) => { aim(ray); active().pointer.move(ray, event); },
        up: (ray, event) => active().pointer.up(ray, event),
        hover: (ray) => { aim(ray); return active().pointer.hover?.(ray) ?? false; },
      },
      setOpen: (value) => { open = value; photo.setOpen(value); stamps?.setOpen(value); },
      setDark: (dark) => { photo.setDark(dark); stamps?.setDark(dark); },
      printed: () => photo.printed?.() ?? Promise.resolve(),
      restore: () => { photo.restore(); stamps?.restore(); pendingPhoto?.restore(); },
      dispose: () => {
        disposed = true;
        photoGen++;
        wake = null;
        context = null;
        photo.dispose(); stamps?.dispose(); pendingPhoto?.dispose();
        if (pagesRef.current === pages) { pagesRef.current = null; pouchRef.current = null; }
      },
    };
    return [sleeves];
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
    const abort = new AbortController();
    setDetailImage(null);
    void pouchRef.current.snapshot(detailId, 740, { shadow: true, signal: abort.signal }).then((image) => {
      if (!cancelled && image) setDetailImage(typeof image === 'string' ? image : image.url);
    }).catch(() => {});
    return () => { cancelled = true; abort.abort(); };
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
  // Once mounted, keep the scene while the next group's object URLs are being read.
  const show3d = supported && !!bag && (pictures.ready || loadedOwner === ownerId);

  return (
    <>
      {show3d ? (
        <BookView
          key={ownerId}
          ref={bookRef}
          sheets={0}
          case={caseSpec}
          cover={cover}
          addons={addons}
          tilt
          autoOpen
          prewarmCovers={false}
          ambient={!detailId}
          onBook={(book) => {
            if (!book) return;
            if (livePicturesReady.current) pagesRef.current?.setPhoto(livePhotoProfile.current!);
            pagesRef.current?.select(liveStampPageOpen.current);
          }}
          onState={(state) => setClosed(state.closed)}
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
          aria-label={stampPageOpen ? '切回照片收纳袋' : '切换到六枚邮票收纳袋'}
          disabled={!show3d}
          onClick={() => {
            setDetailId(null);
            if (closed) bookRef.current?.toggleCover();
            else if (pagesRef.current) {
              const next = !stampPageOpen;
              pagesRef.current.select(next);
              setStampPageOpen(next);
            }
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
