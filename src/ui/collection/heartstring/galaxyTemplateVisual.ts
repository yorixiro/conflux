/**
 * Visual layer adapted from the publicly shared Memory Galaxy tutorial.
 * Source: https://chat.xiaoke.love/galaxy-tutorial/galaxy-template.html
 * The companion guide explicitly offers the template for AI-assisted customization.
 * Preserve its distribution, shaders, palette, camera and Bloom settings here;
 * Conflux's data, editing and lifecycle adapter lives in memoryGalaxyScene.ts.
 * Reuse/attribution limits are recorded in docs/PROVENANCE.md.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const GALAXY_TEMPLATE = {
  radius: 5, branches: 2, spin: 1.15, galaxyCount: 14000, dustCount: 6400,
  background: '#050209', camera: [0, 3.1, 6.3] as const, fov: 55,
  bloom: { strength: .6, radius: .62, threshold: .12 }, exposure: 1.05
};

const vertexShader = `
attribute float aSize; attribute float aPhase; attribute vec3 aColor;
uniform float uTime; uniform float uPix; varying vec3 vColor; varying float vTw;
void main(){
  vColor=aColor;
  float br=0.9+0.1*sin(uTime*0.28+aPhase);
  vTw=br;
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  gl_PointSize=aSize*uPix*br*(1.0/-mv.z);
  gl_Position=projectionMatrix*mv;
}`;
const fragmentShader = `
varying vec3 vColor; varying float vTw; uniform float uOpacity;
void main(){
  float d=length(gl_PointCoord-0.5);
  float a=1.0-smoothstep(0.0,0.5,d);
  a=pow(a,1.6)*vTw*uOpacity;
  if(a<0.01) discard;
  gl_FragColor=vec4(vColor,a);
}`;
// Equivalent smoothstep with ascending edges avoids undefined GLSL edge ordering.
export function templateParticleMaterial(pixelRatio: number, sizeScale: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPix: { value: pixelRatio * sizeScale }, uOpacity: { value: 1 } },
    vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
}

export function createTemplateGalaxyVisual(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const shaders: Array<{ material: THREE.ShaderMaterial; scale: number }> = [];
  const textures: THREE.Texture[] = [];
  const objects: THREE.Object3D[] = [];
  const passes: Array<{ dispose: () => void }> = [];
  let composer: EffectComposer | undefined;
  function releaseStatic() {
    objects.forEach((object) => scene.remove(object));
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose()); textures.forEach((item) => item.dispose());
    passes.forEach((pass) => pass.dispose()); composer?.dispose();
  }
  try {
  const random = (a: number, b: number) => a + Math.random() * (b - a);
  const power = (p: number) => Math.pow(Math.random(), p);
  function add(object: THREE.Object3D) { scene.add(object); objects.push(object); }
  function cloud(positions: Float32Array, colors: Float32Array, sizes: Float32Array, phases: Float32Array, scale: number) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    const material = templateParticleMaterial(renderer.getPixelRatio(), scale);
    geometries.push(geometry); materials.push(material); shaders.push({ material, scale });
    add(new THREE.Points(geometry, material));
  }
  const { radius: R, branches, spin } = GALAXY_TEMPLATE;
  const inside = new THREE.Color('#ffdcf2'), middle = new THREE.Color('#c891ff');
  const outside = new THREE.Color('#8fb0ff'), gold = new THREE.Color('#ffcf9a');
  const count = GALAXY_TEMPLATE.galaxyCount;
  const positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count), phases = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = power(1.7) * R;
    const angle = (i % branches) / branches * Math.PI * 2 + r * spin;
    const scatter = .55;
    const sx = power(2.6) * (Math.random() < .5 ? 1 : -1) * scatter * (r + .4);
    const sz = power(2.6) * (Math.random() < .5 ? 1 : -1) * scatter * (r + .4);
    const sy = power(3) * (Math.random() < .5 ? 1 : -1) * scatter * .34 * (r + .3);
    positions.set([Math.cos(angle) * r + sx, sy, Math.sin(angle) * r + sz], i * 3);
    const t = r / R;
    const color = t < .5 ? inside.clone().lerp(middle, t / .5) : middle.clone().lerp(outside, (t - .5) / .5);
    if (Math.random() < .06) color.copy(gold);
    colors.set([color.r, color.g, color.b], i * 3);
    sizes[i] = random(1.4, 5) * (t < .3 ? 1.15 : 1);
    phases[i] = Math.random() * Math.PI * 2;
  }
  cloud(positions, colors, sizes, phases, 1.05);

  const n = GALAXY_TEMPLATE.dustCount;
  const farPositions = new Float32Array(n * 3), farColors = new Float32Array(n * 3);
  const farSizes = new Float32Array(n), farPhases = new Float32Array(n);
  const palette = ['#e8b8ff', '#9fb8ff', '#ffd0ec', '#c8a0f0', '#ffe0b0'].map((value) => new THREE.Color(value));
  for (let i = 0; i < n; i++) {
    const r = power(1.1) * R * 1.7 + .5;
    const theta = Math.random() * Math.PI * 2;
    farPositions.set([Math.cos(theta) * r, (Math.random() - .5) * R * 1.1, Math.sin(theta) * r], i * 3);
    const color = palette[Math.floor(Math.random() * palette.length)];
    farColors.set([color.r, color.g, color.b], i * 3);
    farSizes[i] = random(.5, 1.8); farPhases[i] = Math.random() * Math.PI * 2;
  }
  cloud(farPositions, farColors, farSizes, farPhases, .9);

  for (const r of [1.3, 2.4, 3.6, 4.7]) {
    const geometry = new THREE.RingGeometry(r - .006, r + .006, 128);
    const material = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: .05,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const ring = new THREE.Mesh(geometry, material); ring.rotation.x = -Math.PI / 2;
    geometries.push(geometry); materials.push(material); add(ring);
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The galaxy core requires a 2D texture context.');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,226,246,.5)'); gradient.addColorStop(.28, 'rgba(234,178,242,.2)');
  gradient.addColorStop(.62, 'rgba(186,142,236,.06)'); gradient.addColorStop(1, 'rgba(162,126,226,0)');
  context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  const coreMaterial = new THREE.SpriteMaterial({ map: texture, blending: THREE.AdditiveBlending,
    depthWrite: false, transparent: true, opacity: .4 });
  const core = new THREE.Sprite(coreMaterial); core.scale.set(1.8, 1.8, 1);
  textures.push(texture); materials.push(coreMaterial); add(core);

  composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  passes.push(renderPass);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .6, .62, .12);
  passes.push(bloom);
  const outputPass = new OutputPass();
  passes.push(outputPass);
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(outputPass);
  type Meteor = { line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>; velocity: THREE.Vector3; life: number; ttl: number; trail: THREE.Vector3[] };
  const meteors: Meteor[] = [];
  let timer = 2.5, disposed = false;
  function spawnMeteor() {
    const start = new THREE.Vector3((Math.random() - .5) * R * 3, random(1.5, 4.5), (Math.random() - .5) * R * 3);
    const velocity = new THREE.Vector3(random(-1, 1), -random(.3, .7), random(-1, 1)).normalize().multiplyScalar(random(5, 8));
    const geometry = new THREE.BufferGeometry(), tint = [[1, .92, 1], [1, .85, .95], [.9, .92, 1]][Math.floor(Math.random() * 3)];
    const c = new Float32Array(14 * 3);
    for (let i = 0; i < 14; i++) c.set(tint.map((value) => value * Math.pow(1 - i / 14, 1.5)), i * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(14 * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(c, 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(line); meteors.push({ line, velocity, life: 0, ttl: random(1.1, 1.8), trail: Array.from({ length: 14 }, () => start.clone()) });
  }
  function removeMeteor(meteor: Meteor) { scene.remove(meteor.line); meteor.line.geometry.dispose(); meteor.line.material.dispose(); }
  return {
    render: () => composer!.render(),
    resize(width: number, height: number, dpr: number) {
      composer!.setPixelRatio(dpr); composer!.setSize(width, height);
      shaders.forEach(({ material, scale }) => { material.uniforms.uPix.value = dpr * scale; });
    },
    update(time: number, dt: number) {
      shaders.forEach(({ material }) => { material.uniforms.uTime.value = time; });
      core.scale.setScalar(1.8 * (1 + .1 * Math.sin(time * .85)));
      coreMaterial.opacity = .36 + .08 * Math.sin(time * .85);
      timer -= dt;
      if (timer <= 0) { spawnMeteor(); timer = random(2.4, 6.5); }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i]; meteor.life += dt;
        meteor.trail.unshift(meteor.trail[0].clone().addScaledVector(meteor.velocity, dt)); meteor.trail.pop();
        const position = meteor.line.geometry.getAttribute('position');
        meteor.trail.forEach((point, j) => position.setXYZ(j, point.x, point.y, point.z)); position.needsUpdate = true;
        meteor.line.material.opacity = Math.min(1, meteor.life * 3) * Math.max(0, 1 - meteor.life / meteor.ttl);
        if (meteor.life >= meteor.ttl) { removeMeteor(meteor); meteors.splice(i, 1); }
      }
    },
    setSelected(value: boolean) { shaders.forEach(({ material }) => { material.uniforms.uOpacity.value = value ? .86 : 1; }); },
    dispose() {
      if (disposed) return; disposed = true;
      meteors.forEach(removeMeteor); meteors.length = 0;
      releaseStatic();
    }
  };
  } catch (error) { releaseStatic(); throw error; }
}
