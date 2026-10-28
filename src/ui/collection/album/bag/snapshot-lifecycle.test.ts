import { expect, it, vi } from 'vitest';
import { Group } from 'three';
import {renderSnapshot} from './snapshot';
it('cancels before allocating any offscreen GPU work', async()=>{
  const abort=new AbortController(); abort.abort();
  const renderer={getContext:vi.fn()}, live={still:vi.fn()};
  expect(await renderSnapshot({renderer} as any,live as any,740,{signal:abort.signal})).toBeNull();
  expect(live.still).not.toHaveBeenCalled();expect(renderer.getContext).not.toHaveBeenCalled();
});
it('releases the cloned model even if its obsolete photo never finishes decoding', async()=>{
  const abort=new AbortController(), model=new Group();
  const remove=vi.spyOn(model,'removeFromParent');
  const renderer={getContext:()=>({isContextLost:()=>false}),render:vi.fn()};
  const live={ready:new Promise<void>(()=>{}),still:()=>({model,flat:()=>{}})};
  const shot=renderSnapshot({renderer} as any,live as any,740,{signal:abort.signal});
  abort.abort(); expect(await shot).toBeNull();
  expect(remove).toHaveBeenCalledTimes(1);expect(renderer.render).not.toHaveBeenCalled();
});
