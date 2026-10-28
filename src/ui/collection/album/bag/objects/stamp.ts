/*
 * Loose postage stamps in the album's actual 3D zipper pouch.
 * These finishes and per-stamp map suffixes come from the material recipes
 * used on billguo.me (trinket-shaders). The original, baked relief maps are
 * loaded as textures; there is no synthetic crinkle layer obscuring the art.
 */
import * as THREE from 'three';
import type { StampItem } from '../../profile/schema';
import type { ObjectDef } from './rig';
import { colorTexture, makeCanvas, Tracker, type V2 } from './shared';
import type { BodySpec, ObjectCtx } from './types';

const W = 0.071;
const H = 0.089;
export const STAMP_BODY: Omit<BodySpec, 'id'> = { w: W, h: H, layer: 2, shape: 'rect', mass: 0.002 };
const OUTLINE: V2[] = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]];

const sourceMap = (id: string, suffix: string) => `https://billguo.me/relief/${id}${suffix}-sm.webp`;
type BakeRole = 'normal' | 'height' | 'orm' | 'sheen' | 'anisotropy';

function recipe(item: StampItem) {
  if (item.finish === 'gildfoil') {
    const silver = item.metal === 'silver';
    return {
      art: item.image,
      maps: { normal: '-gold', height: '-height' },
      params: {
        color: silver ? '#E6E8EA' : '#FFD27F', metalness: 0.85, roughness: 0.32,
        clearcoat: 0.35, clearcoatRoughness: 0.12, anisotropy: 0.25,
        specularColor: silver ? '#F4F6F8' : '#FFE9C0', specularIntensity: 1,
        envMapIntensity: 1.4,
      },
      displacement: 0.022,
      normalScale: 1,
    } as const;
  }
  if (item.finish === 'kogei') {
    return {
      art: sourceMap(item.id.slice('stamp:'.length), '-kogei-alb'),
      maps: { normal: '-kogei', height: '-kogei-height', orm: '-kogei-orm', sheen: '-kogei-sheen', anisotropy: '-kogei-aniso' },
      params: {
        color: '#ffffff', metalness: 1, roughness: 1, sheen: 1.2,
        sheenColor: '#c9c9d2', sheenRoughness: 0.55, anisotropy: 1,
        specularIntensity: 1, envMapIntensity: 0.45,
      },
      displacement: 0.075,
      normalScale: -1, // the original kogei normals invert their green channel
    } as const;
  }
  return {
    art: sourceMap(item.id.slice('stamp:'.length), '-paint'),
    maps: { normal: '', height: '-height' },
    params: {
      color: '#ffffff', metalness: 0, roughness: 0.62,
      clearcoat: 0.28, clearcoatRoughness: 0.2,
      specularIntensity: 0.6, specularColor: '#fff6ea', envMapIntensity: 1,
    },
    displacement: 0.09,
    normalScale: 1.6,
  } as const;
}

/** The original map coordinates are baked for a 1-unit stamp; scale relief with the physical stamp. */
export function buildStamp(item: StampItem, ctx: ObjectCtx): ObjectDef {
  const tracker = new Tracker();
  const id = item.id.replace(/^stamp:/, '');
  const finish = recipe(item);
  const depth = W * finish.displacement;
  const thickness = depth + 0.00035;
  // Only the offline fallback is painted to canvas. Do not downsample the
  // author's artwork into a 456x570 canvas and upload it a second time.
  const { c, g } = makeCanvas(128, 160);
  const albedo = tracker.add(colorTexture(c, ctx));
  const material = tracker.add(new THREE.MeshPhysicalMaterial({
    ...finish.params,
    map: albedo,
    transparent: true,
    alphaTest: 0.2,
    alphaToCoverage: true,
    side: THREE.DoubleSide,
    displacementScale: depth,
    displacementBias: -depth * 0.5,
  }));
  // Preserve the relief's full geometry; performance is recovered by
  // removing the redundant book sheet and background shader prewarming.
  const geometry = tracker.add(new THREE.PlaneGeometry(W, H, 48, 60));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = depth * 0.5 + 0.0002;
  mesh.frustumCulled = false;
  mesh.name = `stamp:${id}`;

  // A paper label is shown only until an original texture arrives (or offline).
  g.fillStyle = '#f3f0e6';
  g.fillRect(0, 0, c.width, c.height);
  g.textAlign = 'center';
  g.font = '11px Georgia, serif';
  g.fillStyle = '#6d7377';
  g.fillText(item.label.slice(0, 22), c.width / 2, c.height / 2);
  albedo.needsUpdate = true;

  let disposed = false;
  tracker.onFree(() => { disposed = true; });
  // Every request settles on disposal; late network responses cannot mutate a dead pouch.
  const loadTexture = (src: string): Promise<THREE.Texture | null> => new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.referrerPolicy = 'no-referrer';
    image.decoding = 'async';
    let done = false;
    const finishLoad = (texture: THREE.Texture | null) => {
      if (done) { texture?.dispose(); return; }
      done = true;
      image.onload = image.onerror = null;
      if (!texture) image.removeAttribute('src');
      resolve(texture);
    };
    tracker.onFree(() => { if (!done) finishLoad(null); });
    image.onload = () => {
      void image.decode().catch(() => {}).then(() => finishLoad(disposed ? null : new THREE.Texture(image)));
    };
    image.onerror = () => finishLoad(null);
    image.src = src;
  });
  const configure = (texture: THREE.Texture, colorSpace: THREE.ColorSpace) => {
    texture.colorSpace = colorSpace;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(8, ctx.anisotropy);
    texture.needsUpdate = true;
    return tracker.add(texture);
  };
  const art = loadTexture(finish.art).then((texture) => {
    if (!texture) return;
    if (disposed) return texture.dispose();
    material.map = configure(texture, THREE.SRGBColorSpace);
    albedo.dispose();
    ctx.onChange?.();
  });
  const dataMaps = Promise.all(Object.entries(finish.maps).map(async ([role, suffix]) => {
    const texture = await loadTexture(sourceMap(id, suffix));
    return texture ? { role: role as BakeRole, texture } : null;
  })).then((results) => {
    // Each finish needs several maps. Updating shader defines per network
    // completion used to compile the same physical material up to five times.
    // Install all available maps in one transaction / one shader update.
    if (disposed) {
      results.forEach((result) => result?.texture.dispose());
      return;
    }
    let changed = false;
    for (const result of results) {
      if (!result) continue;
      const { role, texture } = result;
      configure(texture, THREE.NoColorSpace);
      changed = true;
      switch (role) {
        case 'normal':
          material.normalMap = texture;
          material.normalScale.set(Math.abs(finish.normalScale), finish.normalScale);
          if (item.finish === 'impasto-gloss') {
            material.clearcoatNormalMap = texture;
            material.clearcoatNormalScale.set(0.6, 0.6);
          }
          break;
        case 'height': material.displacementMap = texture; break;
        case 'orm':
          material.roughnessMap = texture;
          material.metalnessMap = texture;
          break;
        case 'sheen': material.sheenColorMap = texture; break;
        case 'anisotropy': material.anisotropyMap = texture; break;
      }
    }
    if (changed) {
      material.needsUpdate = true;
      ctx.onChange?.();
    }
  });

  return {
    spec: { id: item.id, ...STAMP_BODY },
    thickness,
    outline: OUTLINE,
    parts: [mesh],
    tracker,
    ready: Promise.all([art, dataMaps]).then(() => {}),
    repaint: () => {},
    runs: [],
    relabel(next) { return next.kind === 'stamp' && next.image === item.image ? [] : null; },
  };
}
