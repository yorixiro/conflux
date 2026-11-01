import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildMemoryStars } from './heartstringMemoryModel';
import { createMemoryGalaxyScene, memoryGalaxyBudget } from './memoryGalaxyScene';

const runtime = vi.hoisted(() => ({ render: vi.fn(), dispose: vi.fn(), lose: vi.fn(), controlsDispose: vi.fn(), canvas: null as any, passDispose: vi.fn(), composerDispose: vi.fn() }));
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return { ...actual, WebGLRenderer: class {
    domElement = runtime.canvas;
    renderLists = { dispose: vi.fn() };
    setPixelRatio = vi.fn(); getPixelRatio = () => 1; setSize = vi.fn();
    render(scene: any, camera: any) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); runtime.render(); }
    dispose = runtime.dispose; forceContextLoss = runtime.lose;
  } };
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({ OrbitControls: class extends EventTarget {
  constructor(private camera: any) { super(); }
  target = { set: vi.fn() }; update() { this.camera.lookAt(0, 0, 0); return false; } dispose = runtime.controlsDispose;
} }));

vi.mock('three/addons/postprocessing/EffectComposer.js', () => ({ EffectComposer: class {
  passes: any[] = []; constructor(private renderer: any) {}
  addPass(pass: any) { this.passes.push(pass); } setPixelRatio() {} setSize() {}
  render() { const first = this.passes[0]; this.renderer.render(first.scene, first.camera); }
  dispose = runtime.composerDispose;
} }));
vi.mock('three/addons/postprocessing/RenderPass.js', () => ({ RenderPass: class {
  constructor(public scene: any, public camera: any) {} dispose = runtime.passDispose;
} }));
vi.mock('three/addons/postprocessing/UnrealBloomPass.js', () => ({ UnrealBloomPass: class { dispose = runtime.passDispose; } }));
vi.mock('three/addons/postprocessing/OutputPass.js', () => ({ OutputPass: class { dispose = runtime.passDispose; } }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('memory galaxy lifecycle', () => {
  it('bounds decoration and pixel ratio while keeping memory pages accessible', () => {
    expect(memoryGalaxyBudget(320, 3, true)).toEqual({ galaxy:14000, dust:6400, dpr:1.5, nodes:240, fps:30 });
    expect(memoryGalaxyBudget(1440, 3, false)).toEqual({ galaxy:14000, dust:6400, dpr:2, nodes:480, fps:45 });
  });

  it('selects the role core, ignores drags, suspends hidden/offscreen work and frees GPU resources once', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let serial = 0, resize: () => void = () => {}, intersect: (entries: any[]) => void = () => {};
    const documentTarget = Object.assign(new EventTarget(), { hidden:false, createElement: () => ({
      width:128, height:128, getContext:() => ({ createRadialGradient:() => ({ addColorStop:vi.fn() }), fillRect:vi.fn() })
    }) });
    runtime.canvas = Object.assign(new EventTarget(), { setAttribute:vi.fn(), remove:vi.fn(), getBoundingClientRect:() => ({ left:0, top:0, width:720, height:560 }) });
    const host = { clientWidth:720, clientHeight:560, appendChild:vi.fn() };
    const resizeDisconnect = vi.fn(), intersectionDisconnect = vi.fn();
    vi.stubGlobal('document', documentTarget);
    vi.stubGlobal('devicePixelRatio', 3);
    vi.stubGlobal('matchMedia', () => Object.assign(new EventTarget(), { matches:false }));
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++serial, callback); return serial; });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect = resizeDisconnect; });
    vi.stubGlobal('IntersectionObserver', class { constructor(callback: (entries: any[]) => void) { intersect = callback; } observe() {} disconnect = intersectionDisconnect; });
    const geometries = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const materials = vi.spyOn(THREE.Material.prototype, 'dispose');
    const textures = vi.spyOn(THREE.Texture.prototype, 'dispose');
    const stars = buildMemoryStars({ id:'p', name:'测试角色', memory:{ inheritGlobal:true, crossConversationRecallEnabled:false, excludedGlobalIds:[], personalMemories:['真实条目'], referenceDocs:[], conversationSummaries:[] } });
    const onSelect = vi.fn(), onFailure = vi.fn();
    const scene = createMemoryGalaxyScene(host as unknown as HTMLElement, stars, onSelect, onFailure);
    const tick = (at: number) => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(at)); };
    const pointer = (name: string, x: number, y: number) => runtime.canvas.dispatchEvent(Object.assign(new Event(name), { clientX:x, clientY:y, pointerId:1 }));
    tick(100); expect(runtime.render).toHaveBeenCalledOnce();
    pointer('pointerdown',360,280); pointer('pointerup',360,280); expect(onSelect).toHaveBeenCalledWith(stars[0]);
    onSelect.mockClear(); pointer('pointerdown',360,280); pointer('pointerup',400,280); expect(onSelect).not.toHaveBeenCalled();
    scene.select(stars[1].id);
    const disposeBeforeFilter = geometries.mock.calls.length;
    scene.setStars([stars[0]]);
    expect(geometries.mock.calls.length).toBe(disposeBeforeFilter + 1);
    expect(runtime.dispose).not.toHaveBeenCalled(); // Filtering keeps the galaxy, camera and composer alive.
    scene.setPaused(true); tick(200); expect(frames.size).toBe(0);
    scene.setPaused(false); expect(frames.size).toBe(1);
    documentTarget.hidden = true; documentTarget.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(0);
    documentTarget.hidden = false; documentTarget.dispatchEvent(new Event('visibilitychange')); expect(frames.size).toBe(1);
    intersect([{ isIntersecting:false }]); expect(frames.size).toBe(0);
    intersect([{ isIntersecting:true }]); expect(frames.size).toBe(1);
    host.clientWidth = 0; resize(); expect(frames.size).toBe(0);
    host.clientWidth = 320; resize(); expect(frames.size).toBe(1);
    runtime.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable:true }));
    expect(onFailure).toHaveBeenCalledOnce(); expect(frames.size).toBe(0);
    scene.dispose(); scene.dispose();
    expect(runtime.dispose).toHaveBeenCalledOnce(); expect(runtime.lose).toHaveBeenCalledOnce(); expect(runtime.controlsDispose).toHaveBeenCalledOnce();
    expect(geometries).toHaveBeenCalledTimes(9); expect(materials).toHaveBeenCalledTimes(9);
    expect(textures).toHaveBeenCalledOnce(); expect(runtime.passDispose).toHaveBeenCalledTimes(3); expect(runtime.composerDispose).toHaveBeenCalledOnce();
    expect(resizeDisconnect).toHaveBeenCalledOnce(); expect(intersectionDisconnect).toHaveBeenCalledOnce();
    pointer('pointerdown',360,280); pointer('pointerup',360,280); expect(onSelect).not.toHaveBeenCalled();
  });
});
