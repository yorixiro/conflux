import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MEMORY_STAR_META, type MemoryStar } from './heartstringMemoryModel';

export function memoryGalaxyBudget(width: number, dpr: number, coarse: boolean) {
  return { dust: width < 580 || coarse ? 5200 : 10500,
    dpr: Math.min(dpr || 1, coarse || width < 580 ? 1.35 : 1.75),
    nodes: width < 580 || coarse ? 240 : 480, fps: coarse ? 30 : 45 };
}

const vertexShader = `
attribute vec3 tint; attribute float size; attribute float phase;
uniform float time; uniform float pixelRatio; uniform float viewportScale;
varying vec3 vTint;
void main() {
  vTint = tint;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float breath = .94 + .06 * sin(time * .65 + phase);
  gl_PointSize = clamp(size * pixelRatio * viewportScale * breath / max(1., -mv.z), 1., 120. * pixelRatio);
  gl_Position = projectionMatrix * mv;
}`;
const fragmentShader = `
varying vec3 vTint; uniform float entity;
void main() {
  float d = length(gl_PointCoord - .5) * 2.;
  if (d > 1.) discard;
  float core = exp(-d * d * 32.);
  float halo = pow(1. - d, 3.) * .42;
  float ring = (1. - smoothstep(0., .07, abs(d - .53))) * entity * .48;
  gl_FragColor = vec4(vTint, core + halo + ring);
}`;

/** Owns every GPU object and listener it creates; never reads or writes persisted memories. */
export function createMemoryGalaxyScene(host: HTMLElement, stars: MemoryStar[], onSelect: (star: MemoryStar) => void, onFailure: () => void) {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let budget = memoryGalaxyBudget(host.clientWidth, devicePixelRatio, coarse);
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '记忆银河，拖动旋转、双指缩放、点按光环星点查看记忆；也可使用下方文字目录');
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#07040f');
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 80);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .07;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 38;
  controls.minPolarAngle = .2;
  controls.maxPolarAngle = Math.PI * .75;
  controls.autoRotateSpeed = .22;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const shaders: THREE.ShaderMaterial[] = [];
  let raf = 0, disposed = false, failed = false, visible = true, paused = false, lastFrame = 0, time = 0;

  function points(positions: number[], colors: number[], sizes: number[], entity: boolean) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('tint', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.Float32BufferAttribute(sizes.map((_, i) => i * 2.4), 1));
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, pixelRatio: { value: budget.dpr }, viewportScale: { value: 1 }, entity: { value: entity ? 1 : 0 } } });
    geometries.push(geometry); materials.push(material); shaders.push(material);
    const cloud = new THREE.Points(geometry, material);
    cloud.frustumCulled = false;
    scene.add(cloud);
    return cloud;
  }

  // A volumetric three-arm disk, with a separate distant population for parallax.
  const positions: number[] = [], colors: number[] = [], sizes: number[] = [];
  const warm = new THREE.Color('#ffd4de'), violet = new THREE.Color('#b57cf5'), blue = new THREE.Color('#7398e8');
  for (let i = 0; i < budget.dust; i++) {
    const distant = i % 5 === 0;
    const radius = Math.pow(Math.random(), 1.5) * (distant ? 13 : 6.2);
    const angle = distant ? Math.random() * Math.PI * 2 : (i % 3) * Math.PI * 2 / 3 + radius * .95;
    const spread = distant ? 1.5 : .24 + radius * .13;
    positions.push(Math.cos(angle) * radius + (Math.random() - .5) * spread,
      (Math.random() - .5) * (distant ? 8 : .25 + radius * .18),
      Math.sin(angle) * radius + (Math.random() - .5) * spread);
    const color = warm.clone().lerp(violet, Math.min(1, radius / 3)).lerp(blue, Math.max(0, (radius - 3) / 5));
    color.multiplyScalar(distant ? .5 : .72);
    colors.push(color.r, color.g, color.b);
    sizes.push(distant ? 6 + Math.random() * 12 : 10 + Math.random() * 28);
  }
  const dust = points(positions, colors, sizes, false);
  // Broad, soft core glow is another point in the same single-pass pipeline.
  points([0, 0, 0], [.6, .23, .36], [1250], false);
  const entityColors: number[] = [];
  stars.forEach((star) => { const c = new THREE.Color(MEMORY_STAR_META[star.kind].color); entityColors.push(c.r, c.g, c.b); });
  const baseSizes = stars.map((star) => star.kind === 'persona' ? 300 : 210);
  const entities = points(stars.flatMap((star) => star.position), entityColors, baseSizes, true);
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const edgeMaterial = new THREE.LineBasicMaterial({ color: '#ecd4ff', transparent: true, opacity: .45, depthWrite: false });
  const edge = new THREE.Line(edgeGeometry, edgeMaterial);
  edge.visible = false;
  scene.add(edge); geometries.push(edgeGeometry); materials.push(edgeMaterial);

  function canRender() { return !disposed && !failed && visible && !document.hidden && host.clientWidth > 0 && host.clientHeight > 0; }
  function stop() { cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  function requestFrame() { if (canRender() && !raf) raf = requestAnimationFrame(frame); }
  function frame(now: number) {
    raf = 0;
    if (!canRender()) return;
    if (lastFrame && now - lastFrame < 1000 / budget.fps) { requestFrame(); return; }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0;
    lastFrame = now;
    const animated = !paused && !reducedMotion.matches;
    if (animated) time += dt;
    controls.autoRotate = animated;
    const moving = controls.update(dt);
    shaders.forEach((shader) => { shader.uniforms.time.value = time; });
    try { renderer.render(scene, camera); }
    catch { fail(); return; }
    if (animated || moving) requestFrame();
  }
  function reset() {
    const narrow = host.clientWidth < 580;
    camera.position.set(0, narrow ? 17 : 8.5, narrow ? 25 : 12.5);
    controls.target.set(0, 0, 0); controls.update(); requestFrame();
  }
  function resize() {
    stop();
    if (!canRender()) return;
    const next = memoryGalaxyBudget(host.clientWidth, devicePixelRatio, coarse);
    budget = next;
    dust.geometry.setDrawRange(0, Math.min(sizes.length, next.dust));
    renderer.setPixelRatio(next.dpr);
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
    shaders.forEach((shader) => {
      shader.uniforms.pixelRatio.value = next.dpr;
      shader.uniforms.viewportScale.value = Math.min(1.3, host.clientHeight / 540);
    });
    requestFrame();
  }
  const screenPoint = new THREE.Vector3();
  let down: { x: number; y: number; id: number } | null = null;
  let multiTouch = false;
  const pointers = new Set<number>();
  function pointerDown(event: PointerEvent) {
    pointers.add(event.pointerId);
    if (pointers.size > 1) multiTouch = true;
    down = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }
  function pointerUp(event: PointerEvent) {
    pointers.delete(event.pointerId);
    const start = down; down = null;
    if (!pointers.size && multiTouch) { multiTouch = false; return; }
    if (!start || multiTouch || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    let nearest: MemoryStar | null = null, distance = 24;
    stars.forEach((star) => {
      screenPoint.fromArray(star.position).project(camera);
      if (Math.abs(screenPoint.z) > 1) return;
      const d = Math.hypot((screenPoint.x + 1) * rect.width / 2 - x, (1 - screenPoint.y) * rect.height / 2 - y);
      if (d < distance) { nearest = star; distance = d; }
    });
    if (nearest) onSelect(nearest);
  }
  function pointerCancel(event: PointerEvent) { pointers.delete(event.pointerId); down = null; if (!pointers.size) multiTouch = false; }
  function visibilityChanged() { stop(); if (canRender()) resize(); }
  function contextLost(event: Event) { event.preventDefault(); fail(); }
  function fail() { if (failed || disposed) return; failed = true; dispose(); onFailure(); }
  const observer = new ResizeObserver(resize);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; visibilityChanged(); });
  observer.observe(host); intersection.observe(host);
  controls.addEventListener('change', requestFrame);
  document.addEventListener('visibilitychange', visibilityChanged);
  reducedMotion.addEventListener('change', visibilityChanged);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('webglcontextlost', contextLost);
  function dispose() {
    if (disposed) return;
    disposed = true; stop(); observer.disconnect(); intersection.disconnect();
    controls.removeEventListener('change', requestFrame); controls.dispose();
    document.removeEventListener('visibilitychange', visibilityChanged);
    reducedMotion.removeEventListener('change', visibilityChanged);
    canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel); canvas.removeEventListener('webglcontextlost', contextLost);
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    scene.clear(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  reset(); resize();
  return {
    dispose, reset,
    setPaused(value: boolean) { paused = value; stop(); requestFrame(); },
    select(id: string | null) {
      const index = stars.findIndex((star) => star.id === id);
      const attribute = entities.geometry.getAttribute('size');
      baseSizes.forEach((size, i) => attribute.setX(i, i === index ? size * 1.45 : size));
      attribute.needsUpdate = true;
      edge.visible = index > 0;
      if (index > 0) {
        const position = edgeGeometry.getAttribute('position'); position.setXYZ(1, ...stars[index].position);
        position.needsUpdate = true; edgeGeometry.computeBoundingSphere();
      }
      requestFrame();
    }
  };
}
