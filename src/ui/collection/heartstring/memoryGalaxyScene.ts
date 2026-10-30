import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MEMORY_STAR_META, type MemoryStar } from './heartstringMemoryModel';
import { createTemplateGalaxyVisual, GALAXY_TEMPLATE, templateParticleMaterial } from './galaxyTemplateVisual';

export function memoryGalaxyBudget(width: number, dpr: number, coarse: boolean) {
  return { galaxy: GALAXY_TEMPLATE.galaxyCount, dust: GALAXY_TEMPLATE.dustCount,
    dpr: Math.min(dpr || 1, coarse ? 1.5 : 2),
    nodes: width < 580 || coarse ? 240 : 480, fps: coarse ? 30 : 45 };
}

/** Owns every GPU object and listener it creates; never reads or writes persisted memories. */
export function createMemoryGalaxyScene(host: HTMLElement, initialStars: MemoryStar[], onSelect: (star: MemoryStar) => void, onFailure: () => void) {
  let stars = initialStars;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let budget = memoryGalaxyBudget(host.clientWidth, devicePixelRatio, coarse);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '记忆银河，拖动旋转、双指缩放、点按较亮星点查看记忆；也可使用下方文字目录');
  canvas.setAttribute('role', 'img');
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(GALAXY_TEMPLATE.background);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = GALAXY_TEMPLATE.exposure;
  const camera = new THREE.PerspectiveCamera(GALAXY_TEMPLATE.fov, 1, .1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = .05;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 14;
  controls.minPolarAngle = .2;
  controls.maxPolarAngle = Math.PI * .86;
  controls.autoRotateSpeed = .32;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const shaders: THREE.ShaderMaterial[] = [];
  let raf = 0, disposed = false, failed = false, visible = true, paused = false, lastFrame = 0, time = 0;

  renderer.setPixelRatio(budget.dpr);
  let visual: ReturnType<typeof createTemplateGalaxyVisual>;
  try { visual = createTemplateGalaxyVisual(renderer, scene, camera); }
  catch (error) { controls.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); throw error; }
  let entityGeometry = new THREE.BufferGeometry();
  let entityColors: number[] = [];
  stars.forEach((star) => { const c = new THREE.Color(MEMORY_STAR_META[star.kind].color); entityColors.push(c.r, c.g, c.b); });
  let baseSizes = stars.map((star) => star.kind === 'persona' ? 13 : 9);
  entityGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars.flatMap((star) => star.position), 3));
  entityGeometry.setAttribute('aColor', new THREE.Float32BufferAttribute(entityColors, 3));
  entityGeometry.setAttribute('aSize', new THREE.Float32BufferAttribute(baseSizes, 1));
  entityGeometry.setAttribute('aPhase', new THREE.Float32BufferAttribute(stars.map((_, i) => i * 2.4), 1));
  const entityMaterial = templateParticleMaterial(budget.dpr, 1.4);
  const entities = new THREE.Points(entityGeometry, entityMaterial);
  entities.frustumCulled = false;
  scene.add(entities); geometries.push(entityGeometry); materials.push(entityMaterial); shaders.push(entityMaterial);
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
    shaders.forEach((shader) => { shader.uniforms.uTime.value = time; });
    try { visual.update(time, animated ? dt : 0); visual.render(); }
    catch { fail(); return; }
    if (animated || moving) requestFrame();
  }
  function reset() {
    camera.position.set(...GALAXY_TEMPLATE.camera);
    controls.target.set(0, 0, 0); controls.update(); requestFrame();
  }
  function resize() {
    stop();
    if (!canRender()) return;
    const next = memoryGalaxyBudget(host.clientWidth, devicePixelRatio, coarse);
    budget = next;
    renderer.setPixelRatio(next.dpr);
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight; camera.updateProjectionMatrix();
    visual.resize(host.clientWidth, host.clientHeight, next.dpr);
    shaders.forEach((shader) => { shader.uniforms.uPix.value = next.dpr * 1.4; });
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
    visual.dispose();
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    scene.clear(); renderer.renderLists.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove();
  }
  try { reset(); resize(); } catch (error) { dispose(); throw error; }
  return {
    dispose, reset,
    setStars(next: MemoryStar[]) {
      if (disposed || next === stars) return;
      stars = next;
      const replacement = new THREE.BufferGeometry();
      entityColors = [];
      stars.forEach((star) => { const color = new THREE.Color(MEMORY_STAR_META[star.kind].color); entityColors.push(color.r, color.g, color.b); });
      baseSizes = stars.map((star) => star.kind === 'persona' ? 13 : 9);
      replacement.setAttribute('position', new THREE.Float32BufferAttribute(stars.flatMap((star) => star.position), 3));
      replacement.setAttribute('aColor', new THREE.Float32BufferAttribute(entityColors, 3));
      replacement.setAttribute('aSize', new THREE.Float32BufferAttribute(baseSizes, 1));
      replacement.setAttribute('aPhase', new THREE.Float32BufferAttribute(stars.map((_, i) => i * 2.4), 1));
      geometries[geometries.indexOf(entityGeometry)] = replacement;
      entityGeometry.dispose(); entityGeometry = replacement; entities.geometry = replacement;
      edge.visible = false; visual.setSelected(false); requestFrame();
    },
    setPaused(value: boolean) { paused = value; stop(); requestFrame(); },
    select(id: string | null) {
      const index = stars.findIndex((star) => star.id === id);
      const attribute = entities.geometry.getAttribute('aSize');
      baseSizes.forEach((size, i) => attribute.setX(i, i === index ? size * 2.4 + 4 : size));
      attribute.needsUpdate = true;
      const color = entities.geometry.getAttribute('aColor');
      entityColors.forEach((value, i) => { const entity = Math.floor(i / 3); color.array[i] = entity === index ? Math.min(2.2, value * 2.6) : value; });
      color.needsUpdate = true;
      visual.setSelected(index > 0);
      edge.visible = index > 0;
      if (index > 0) {
        const position = edgeGeometry.getAttribute('position'); position.setXYZ(1, ...stars[index].position);
        position.needsUpdate = true; edgeGeometry.computeBoundingSphere();
      }
      requestFrame();
    }
  };
}
