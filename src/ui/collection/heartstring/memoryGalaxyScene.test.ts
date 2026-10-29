import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildMemoryStars } from './heartstringMemoryModel';
import { createMemoryGalaxyScene, memoryGalaxyBudget } from './memoryGalaxyScene';

const runtime = vi.hoisted(() => ({ render: vi.fn(), dispose: vi.fn(), lose: vi.fn(), controlsDispose: vi.fn(), canvas: null as any }));
vi.mock('three', async () => {
  const actual = await vi.importActual<typeof import('three')>('three');
  return { ...actual, WebGLRenderer: class {
    domElement = runtime.canvas;
    renderLists = { dispose: vi.fn() };
    setPixelRatio = vi.fn(); setSize = vi.fn();
    render(scene: any, camera: any) { scene.updateMatrixWorld(); camera.updateMatrixWorld(); runtime.render(); }
    dispose = runtime.dispose; forceContextLoss = runtime.lose;
  } };
});
vi.mock('three/addons/controls/OrbitControls.js', () => ({ OrbitControls: class extends EventTarget {
  constructor(private camera: any) { super(); }
  target = { set: vi.fn() }; update() { this.camera.lookAt(0, 0, 0); return false; } dispose = runtime.controlsDispose;
} }));

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe('memory galaxy lifecycle', () => {
  it('bounds decoration and pixel ratio while keeping memory pages accessible', () => {
    expect(memoryGalaxyBudget(320, 3, true)).toEqual({ dust:5200, dpr:1.35, nodes:240, fps:30 });
    expect(memoryGalaxyBudget(1440, 3, false)).toEqual({ dust:10500, dpr:1.75, nodes:480, fps:45 });
  });

  it('selects the role core, ignores drags, suspends hidden/offscreen work and frees GPU resources once', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let serial = 0, resize: () => void = () => {}, intersect: (entries: any[]) => void = () => {};
    const documentTarget = Object.assign(new EventTarget(), { hidden:false });
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
    const stars = buildMemoryStars({ id:'p', name:'测试角色', memory:{ inheritGlobal:true, crossConversationRecallEnabled:false, excludedGlobalIds:[], personalMemories:['真实条目'], referenceDocs:[], conversationSummaries:[] } });
    const onSelect = vi.fn(), onFailure = vi.fn();
    const scene = createMemoryGalaxyScene(host as unknown as HTMLElement, stars, onSelect, onFailure);
    const tick = (at: number) => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback(at)); };
    const pointer = (name: string, x: number, y: number) => runtime.canvas.dispatchEvent(Object.assign(new Event(name), { clientX:x, clientY:y, pointerId:1 }));
    tick(100); expect(runtime.render).toHaveBeenCalledOnce();
    pointer('pointerdown',360,280); pointer('pointerup',360,280); expect(onSelect).toHaveBeenCalledWith(stars[0]);
    onSelect.mockClear(); pointer('pointerdown',360,280); pointer('pointerup',400,280); expect(onSelect).not.toHaveBeenCalled();
    scene.select(stars[1].id); scene.setPaused(true); tick(200); expect(frames.size).toBe(0);
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
    expect(geometries).toHaveBeenCalledTimes(4); expect(materials).toHaveBeenCalledTimes(4);
    expect(resizeDisconnect).toHaveBeenCalledOnce(); expect(intersectionDisconnect).toHaveBeenCalledOnce();
    pointer('pointerdown',360,280); pointer('pointerup',360,280); expect(onSelect).not.toHaveBeenCalled();
  });
});
