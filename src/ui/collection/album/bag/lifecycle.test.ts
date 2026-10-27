import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { Profile } from '../profile/schema';

const fixture = vi.hoisted(() => ({ builds: [] as any[], slow: null as Promise<void> | null }));
vi.mock('../fonts', () => ({ ensureFonts: () => Promise.resolve() }));
vi.mock('./objects/fonts', () => ({ printFontsPending: () => false }));
vi.mock('./motion', () => ({ subscribeMotion: () => () => {}, motionReading: () => null }));
vi.mock('./objects/shared', () => ({
  deferStocks: (fn: () => unknown) => ({value: fn(), jobs: [], recipes: []}),
  makeStocks: () => Promise.resolve(), remakeStocks: () => [], releaseStocks: () => {},
  printWebOn: () => true, usePrintWeb: () => {},
}));
vi.mock('./objects', async () => {
  const { Group } = await import('three');
  const bodySpec = (item: any) => ({id:item.id,w:.06,h:.08,layer:2,shape:'rect',mass:.002});
  return {
    POUCH_BOUNDS: {minX:-.12,maxX:.12,minY:-.17,maxY:.17}, bodySpec,
    createPouch: () => ({group:new Group(),fonts:[],update:()=>{},repaint:()=>{},relabel:()=>{},dispose:()=>{}}),
    buildObject: (item: any) => {
      const o = {object:new Group(),body:bodySpec(item),fonts:[],ready:Promise.resolve(),
        outline:[[-.03,-.04],[.03,-.04],[.03,.04],[-.03,.04]],update:vi.fn(),repaint:vi.fn(),dispose:vi.fn(),
        relabel:vi.fn((next:any) => { o.body.id=next.id; o.ready=next.image==='blob:slow' ? fixture.slow! : Promise.resolve(); return true; })};
      fixture.builds.push(o); return o;
    },
  };
});
const {createPouchAddon} = await import('./addon');
const profile = (id: string, image='blob:fast', noteText='unchanged'): Profile => ({name:'Fixture',role:'album',bio:'',links:[],albums:{cards:[],postcards:[]},items:[
  {kind:'note',id:'note',label:'Note',text:noteText,from:'Fixture'},
  {kind:'polaroid',id,label:'Photo',image,caption:id},
]});

beforeEach(() => {vi.useFakeTimers(); fixture.builds=[];});
afterEach(() => {vi.useRealTimers();});
describe('pouch photo lifecycle', () => {
  it('reuses objects and physics, including held joints, across repeated equal-size groups', async () => {
    const pouch=createPouchAddon({profile:profile('photo:0'),onPick:()=>{},prewarmStills:false});
    await vi.runAllTimersAsync(); await pouch.printed?.();
    const sim=pouch.debug.sim, objects=[...pouch.debug.objects], root=pouch.object;
    sim.shake(.5); sim.step(1/60,{ax:0,ay:0,gn:9.81,omega:0,alpha:0});
    const s=sim.state()[1]!; sim.grab(s.id,s.x,s.y); sim.step(1/60,{ax:0,ay:0,gn:9.81,omega:0,alpha:0});
    const before=sim.state().map(({id,...state})=>({...state}));
    const notePaints=vi.mocked(objects[0]!.repaint).mock.calls.length;
    for(let i=1;i<=12;i++) {
      const changed=pouch.setProfile(profile(`photo:${i}`));
      await vi.runAllTimersAsync(); expect(await changed).toBe(true);
    }
    expect(pouch.object).toBe(root); expect(pouch.debug.sim).toBe(sim);
    expect(pouch.debug.objects).toEqual(objects); expect(fixture.builds).toHaveLength(2);
    expect(sim.state().map(({id,...state})=>({...state}))).toEqual(before);
    expect(sim.state()[1]!.id).toBe('photo:12'); expect(sim.state()[1]!.held).toBe(true);
    expect(vi.mocked(objects[0]!.repaint).mock.calls.length).toBe(notePaints);
    const fewer=profile('photo:last'); fewer.items.pop();
    expect(await pouch.setProfile(fewer)).toBe(false);
    pouch.dispose(); expect(objects.every(o=>vi.mocked(o.dispose).mock.calls.length===1)).toBe(true);
  });
  it('supersedes an unfinished photo decode without waiting for the obsolete image', async () => {
    let resolveSlow!:()=>void; fixture.slow=new Promise(r=>{resolveSlow=r;});
    const pouch=createPouchAddon({profile:profile('photo:0'),onPick:()=>{},prewarmStills:false});
    await vi.runAllTimersAsync(); await pouch.printed?.();
    const notePaints=vi.mocked(pouch.debug.objects[0]!.repaint).mock.calls.length;
    const slow=pouch.setProfile(profile('photo:slow','blob:slow','changed note'));
    await vi.runAllTimersAsync();
    expect(pouch.debug.sim.state()[1]!.id).toBe('photo:slow');
    const fast=pouch.setProfile(profile('photo:latest','blob:fast','changed note'));
    await vi.runAllTimersAsync(); await fast; await slow;
    expect(vi.mocked(pouch.debug.objects[0]!.repaint).mock.calls.length).toBe(notePaints+1);
    expect(pouch.debug.sim.state()[1]!.id).toBe('photo:latest');
    resolveSlow(); await vi.runAllTimersAsync();
    expect(pouch.debug.sim.state()[1]!.id).toBe('photo:latest');
    pouch.dispose();
  });
});
