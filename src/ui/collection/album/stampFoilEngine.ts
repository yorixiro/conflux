import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type StampFinish = 'paper' | 'pearl' | 'gold' | 'silver';
type StampTexture = { image: string; finish: StampFinish };

export type StampFoilEngine = {
  prepare: (url: string) => Promise<void>;
  draw: (canvas: HTMLCanvasElement, stamp: StampTexture, lightX: number, lightY: number) => boolean;
  dispose: () => void;
};

/** Deterministic crumpled-leaf normal map, shared by the six foil finishes. */
function crinkleNormalMap() {
  const size = 256;
  const height = new Float32Array(size * size);
  const rgba = new Uint8Array(size * size * 4);
  const hash = (x: number, y: number) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy) * (1 - sx) + hash(ix + 1, iy) * sx;
    const b = hash(ix, iy + 1) * (1 - sx) + hash(ix + 1, iy + 1) * sx;
    return a * (1 - sy) + b * sy;
  };
  const frequencies = [8, 22, 55];
  const amplitudes = [1, 0.5, 0.22];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let sum = 0;
      for (let octave = 0; octave < frequencies.length; octave += 1) {
        const f = frequencies[octave];
        sum += amplitudes[octave] * Math.abs(noise(x / size * f / 1.4, y / size * f) * 2 - 1);
      }
      height[y * size + x] = sum / 1.72;
    }
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + Math.max(0, x - 1)];
      const right = height[y * size + Math.min(size - 1, x + 1)];
      const up = height[Math.max(0, y - 1) * size + x];
      const down = height[Math.min(size - 1, y + 1) * size + x];
      const nx = (left - right) * 6.5, ny = (up - down) * 6.5, nz = 1;
      const length = Math.hypot(nx, ny, nz);
      const offset = (y * size + x) * 4;
      rgba[offset] = Math.round((nx / length * 0.5 + 0.5) * 255);
      rgba[offset + 1] = Math.round((ny / length * 0.5 + 0.5) * 255);
      rgba[offset + 2] = Math.round((nz / length * 0.5 + 0.5) * 255);
      rgba[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(rgba, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** One offscreen WebGL context; visible stamp canvases are inexpensive 2D blits. */
export function createStampFoilEngine(): StampFoilEngine {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.18;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04);
  const scene = new THREE.Scene();
  scene.environment = environment.texture;
  const keyLight = new THREE.DirectionalLight(0xfff2dd, 2.2);
  const fillLight = new THREE.HemisphereLight(0xffffff, 0x9a8f7d, 0.46);
  scene.add(keyLight, fillLight);
  const geometry = new THREE.PlaneGeometry(1, 1, 2, 2);
  const normal = crinkleNormalMap();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.45,
    roughness: 0.34,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    anisotropy: 0.25,
    envMapIntensity: 1.4,
    normalMap: normal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    transparent: true,
    alphaTest: 0.05,
    side: THREE.DoubleSide,
  });
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.z = 3;
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const textures = new Map<string, THREE.Texture>();
  const pending = new Map<string, Promise<void>>();
  let currentSource = '';
  let currentFinish: StampFinish | null = null;
  let disposed = false;

  const prepare = (url: string) => {
    if (textures.has(url)) return Promise.resolve();
    const existing = pending.get(url);
    if (existing) return existing;
    const promise = new Promise<void>((resolve, reject) => {
      loader.load(url, (texture) => {
        if (disposed) {
          texture.dispose();
          reject(new Error('Stamp foil engine was disposed'));
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
        textures.set(url, texture);
        pending.delete(url);
        resolve();
      }, undefined, (error) => {
        pending.delete(url);
        reject(error);
      });
    });
    pending.set(url, promise);
    return promise;
  };

  const draw = (canvas: HTMLCanvasElement, stamp: StampTexture, lightX: number, lightY: number) => {
    const texture = textures.get(stamp.image);
    if (!texture) return false;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.min(640, Math.round(rect.width * scale)));
    const height = Math.max(1, Math.min(780, Math.round(rect.height * scale)));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    renderer.setSize(width, height, false);
    const aspect = width / height;
    camera.left = -aspect / 2;
    camera.right = aspect / 2;
    camera.top = 0.5;
    camera.bottom = -0.5;
    camera.updateProjectionMatrix();
    plane.scale.set(aspect, 1, 1);
    if (currentSource !== stamp.image) {
      material.map = texture;
      // Changing an existing map needs no shader recompile; the first map does.
      if (!currentSource) material.needsUpdate = true;
      currentSource = stamp.image;
    }
    if (currentFinish !== stamp.finish) {
      material.color.set(stamp.finish === 'gold' ? '#ffdfad' : stamp.finish === 'silver' ? '#e4ebf3' : '#ffffff');
      material.metalness = stamp.finish === 'gold' ? 0.85 : stamp.finish === 'silver' ? 0.76 : stamp.finish === 'pearl' ? 0.48 : 0.16;
      material.roughness = stamp.finish === 'paper' ? 0.68 : stamp.finish === 'pearl' ? 0.4 : 0.32;
      material.normalScale.setScalar(stamp.finish === 'paper' ? 0.2 : 0.6);
      currentFinish = stamp.finish;
    }
    keyLight.position.set(-0.3 + lightX, 0.45 - lightY, stamp.finish === 'paper' ? 0.8 : 0.5).normalize();
    renderer.render(scene, camera);
    const context = canvas.getContext('2d');
    if (!context) return false;
    context.clearRect(0, 0, width, height);
    context.drawImage(renderer.domElement, 0, 0, width, height);
    return true;
  };

  const dispose = () => {
    disposed = true;
    for (const texture of textures.values()) texture.dispose();
    textures.clear();
    normal.dispose();
    geometry.dispose();
    material.dispose();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  };
  return { prepare, draw, dispose };
}
