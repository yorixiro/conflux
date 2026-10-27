import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {skipReceiveOnlyShadowDraw} from './receiveOnlyShadow';
import {createBagSim} from './bag/sim';

it('skips only the receiver depth submission and restores full relief for the main pass', () => {
  const geometry=new THREE.PlaneGeometry(.071,.089,48,60);
  geometry.setDrawRange(3,geometry.index!.count-3);
  const mesh=new THREE.Mesh(geometry), before=vi.fn(),after=vi.fn();
  mesh.onBeforeShadow=before; mesh.onAfterShadow=after;
  skipReceiveOnlyShadowDraw(mesh); skipReceiveOnlyShadowDraw(mesh);
  const args=[null,mesh,null,null,geometry,null,null] as any;
  (mesh.onBeforeShadow as any)(...args);
  expect(geometry.drawRange.count).toBe(0);
  (mesh.onAfterShadow as any)(...args);
  expect(geometry.drawRange).toEqual({start:3,count:17277});
  expect(geometry.attributes.position.count).toBe(2989);
  expect(before).toHaveBeenCalledTimes(1); expect(after).toHaveBeenCalledTimes(1);
  geometry.dispose();
  for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
});
it('renames swapped ids atomically while preserving moving bodies and rejects duplicate ids', () => {
  const sim=createBagSim({width:.23,height:.32,bodies:['a','b'].map(id=>({id,w:.05,h:.06,layer:2 as const,shape:'rect' as const}))});
  sim.shake(.4); sim.step(1/60,{ax:0,ay:0,gn:9.81,omega:0,alpha:0});
  const before=sim.state().map(s=>({...s}));
  sim.relabel(['b','a']);
  expect(sim.state()).toEqual(before.map((s,i)=>({...s,id:i===0?'b':'a'})));
  const point=sim.state()[0]!; sim.grab('b',point.x,point.y);
  expect(sim.ghosts()).toContain('b');
  expect(()=>sim.relabel(['a','a'])).toThrow('invalid pouch body ids');
  expect(sim.state()[0]!.id).toBe('b');
});
