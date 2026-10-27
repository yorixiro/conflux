import { expect, it, vi } from 'vitest';
import {decodedImage} from './shared';
it('shares pending decoding but releases the strong cache reference after the canvas can own the pixels',async()=>{
  let finish!:()=>void; const decoded=new Promise<void>(r=>{finish=r;});
  const instances:any[]=[];
  class Image {crossOrigin='';decoding='';src='';constructor(){instances.push(this);}decode(){return decoded;}}
  vi.stubGlobal('Image',Image);
  try {
    const first=decodedImage('blob:fixture-cache'),second=decodedImage('blob:fixture-cache');
    expect(first).toBe(second); expect(instances).toHaveLength(1);
    finish(); await first;
    await decodedImage('blob:fixture-cache'); expect(instances).toHaveLength(2);
  }finally{vi.unstubAllGlobals();}
});
