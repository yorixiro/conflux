import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('./shared', async (original) => ({...await original<typeof import('./shared')>(),
  makeCanvas:()=>({c:{width:128,height:160},g:{fillRect:()=>{},fillText:()=>{}}}),
}));
import {buildStamp} from './stamp';
class FakeImage {
  static instances:FakeImage[]=[];
  crossOrigin='';referrerPolicy='';decoding='';src='';naturalWidth=1024;naturalHeight=1280;
  onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(){FakeImage.instances.push(this);}
  decode(){return Promise.resolve();}
  removeAttribute(){this.src='';}
}
beforeEach(()=>{vi.useFakeTimers();FakeImage.instances=[];vi.stubGlobal('Image',FakeImage);});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('keeps all original kogei channels and full geometry, applying map defines once after decoding',async()=>{
  const def=buildStamp({kind:'stamp',id:'stamp:kensho',label:'Kensho',image:'art.avif',finish:'kogei'},{anisotropy:8});
  const mesh=def.parts[0] as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshPhysicalMaterial>, m=mesh.material;
  const version=m.version;
  expect(FakeImage.instances).toHaveLength(6);
  FakeImage.instances.forEach(img=>img.onload?.()); await def.ready;
  expect(m.version).toBe(version+1);
  expect(mesh.geometry.parameters.widthSegments).toBe(48);expect(mesh.geometry.parameters.heightSegments).toBe(60);
  for(const key of ['map','normalMap','displacementMap','roughnessMap','metalnessMap','sheenColorMap','anisotropyMap'] as const){
    expect((m[key]?.image as {naturalWidth:number}).naturalWidth).toBe(1024);
    expect(m[key]?.minFilter).toBe(THREE.LinearMipmapLinearFilter);
  }
  expect(m.roughnessMap).toBe(m.metalnessMap);expect(m.alphaToCoverage).toBe(true);expect(m.transparent).toBe(true);
  def.tracker.dispose();
});
it('cancels pending stamp requests and settles readiness without touching disposed material',async()=>{
  const changed=vi.fn();
  const def=buildStamp({kind:'stamp',id:'stamp:ncs',label:'NCS',image:'art.avif',finish:'impasto-gloss'},{anisotropy:8,onChange:changed});
  const m=(def.parts[0] as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
  def.tracker.dispose(); await def.ready;
  expect(FakeImage.instances.every(img=>img.src===''&&img.onload===null)).toBe(true);
  expect(m.normalMap).toBeNull();expect(changed).not.toHaveBeenCalled();
});
it('retains the original fallback when every source image fails to load',async()=>{
  const def=buildStamp({kind:'stamp',id:'stamp:ncs',label:'NCS',image:'art.avif',finish:'impasto-gloss'},{anisotropy:8});
  FakeImage.instances.forEach(img=>img.onerror?.()); await def.ready;
  expect((def.parts[0] as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshPhysicalMaterial>).material.map).not.toBeNull();
  def.tracker.dispose();
});
