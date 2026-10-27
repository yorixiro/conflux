import React from 'react';
import {createRoot} from 'react-dom/client';
import {Vector3} from 'three';
import {ArchiveFolio} from '../../src/ui/collection/album/ArchiveFolio';
import '../../src/ui/collection/album/archive-album.css';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let renderer: any, studio: any, frame: any, collecting = false, created = 0, disposed = 0;
let frames: any[] = [], errors: string[] = [], glCounts = {uploads: 0, shaders: 0};
const active = new Set();
const pouches = new Set<any>();
window.addEventListener('album-pouch', ((e: CustomEvent) => {
  const pouch=e.detail; pouches.add(pouch);
  const dispose=pouch.dispose; pouch.dispose=()=>{pouches.delete(pouch);dispose();};
}) as EventListener);
window.addEventListener('album-renderer', ((e: CustomEvent) => {
  renderer = e.detail; created++; active.add(renderer);
  const originalDispose = renderer.dispose;
  renderer.dispose = () => { disposed++; active.delete(renderer); originalDispose(); };
  const gl = renderer.getContext();
  for (const [method, counter] of [['texImage2D', 'uploads'], ['texSubImage2D', 'uploads'], ['compileShader', 'shaders']]) {
    const original = gl[method].bind(gl);
    gl[method] = (...args: any[]) => { if (collecting) glCounts[counter]++; return original(...args); };
  }
  // Aggregate every render pass; three otherwise resets info on each offscreen render.
  renderer.info.autoReset = false;
  const originalRender = renderer.render;
  renderer.render = (...args: any[]) => {
    if (frame) frame.passes++;
    return originalRender(...args);
  };
}) as EventListener);
window.addEventListener('album-studio', ((e: CustomEvent) => {studio = e.detail;}) as EventListener);
window.addEventListener('album-frame-start', ((e: CustomEvent) => {
  if (!collecting) return;
  renderer.info.reset();
  frame = {at: e.detail, start: performance.now(), passes: 0};
  const gl = renderer.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (ext) {
    frame.gl = gl; frame.ext = ext; frame.query = gl.createQuery();
    gl.beginQuery(ext.TIME_ELAPSED_EXT, frame.query);
  }
}) as EventListener);
window.addEventListener('album-frame-end', () => {
  if (!frame) return;
  frame.cpu = performance.now() - frame.start;
  frame.calls = renderer.info.render.calls;
  if (frame.query) frame.gl.endQuery(frame.ext.TIME_ELAPSED_EXT);
  frames.push(frame); frame = null;
});
window.addEventListener('error', e => errors.push(e.message));
const stats = (values: number[]) => {
  const v = values.slice().sort((a,b) => a-b);
  return {n:v.length, median:v.length ? v[Math.floor(v.length/2)] : null, p95:v.length ? v[Math.min(v.length-1,Math.ceil(v.length*.95)-1)] : null};
};
function info() {
  const gl = renderer?.getContext(), ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return {created, disposed, liveContexts:active.size, textures:renderer?.info.memory.textures,
    geometries:renderer?.info.memory.geometries, programs:renderer?.info.programs.length,
    canvas:renderer ? [renderer.domElement.width,renderer.domElement.height] : null,
    renderer:gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : null};
}
async function measure(name: string, action: () => Promise<void>) {
  frames = []; glCounts = {uploads:0,shaders:0};
  const before = info(); collecting = true;
  const start = performance.now(); await action(); const duration = performance.now()-start;
  collecting = false; const sample = frames.slice();
  await sleep(200);
  const gpu: number[] = [];
  for (const f of sample) if (f.query) {
    if (f.gl.getQueryParameter(f.query,f.gl.QUERY_RESULT_AVAILABLE) && !f.gl.getParameter(f.ext.GPU_DISJOINT_EXT)) gpu.push(f.gl.getQueryParameter(f.query,f.gl.QUERY_RESULT)/1e6);
    f.gl.deleteQuery(f.query);
  }
  return {name,duration,frames:sample.length,frameIntervalMs:stats(sample.slice(1).map((f,i)=>f.at-sample[i].at)),cpuMs:stats(sample.map(f=>f.cpu)),gpuMs:stats(gpu),calls:stats(sample.map(f=>f.calls)),passes:stats(sample.map(f=>f.passes)),...glCounts,before,after:info()};
}
const button = (text:string) => [...document.querySelectorAll('button')].find(b => b.textContent === text)!;
async function until(check:()=>boolean, timeout=30000) {
  const deadline = performance.now()+timeout;
  while (!check()) {if(performance.now()>deadline) throw new Error('fixture timeout'); await sleep(100);}
}
const cards = Array.from({length:8},(_,i)=>({id:`fixture-${i}`,assetId:`fixture-${i}`,title:`Fixture ${i}`,createdAt:1700000000000,updatedAt:1700000000000,tags:[]}));
function App() {
  const [mounted,setMounted]=React.useState(false), [report,setReport]=React.useState('Ready. Uses synthetic photos only.'), [running,setRunning]=React.useState(false);
  const run = async () => {
    setRunning(true); errors = []; const results:any[]=[];
    try {
      setReport('first load');
      results.push(await measure('first-load',async()=>{setMounted(true);await until(()=>!!document.querySelector('.folio-book[data-ready]'));}));
      await sleep(6500);
      setReport('idle'); results.push(await measure('idle',()=>sleep(10000)));
      button('POSTAGE02').click();
      await until(()=>[...pouches].some(p=>p.debug.objects.filter((o:any)=>o.body.id.startsWith('stamp:')).length===6));
      await sleep(2500);
      setReport('10 second stamp drag');
      let held = false;
      results.push(await measure('drag-10s',async()=>{
        const mesh = studio.scene.getObjectByName('stamp:kensho');
        if(!mesh) throw new Error('stamp mesh missing');
        const p = mesh.getWorldPosition(new Vector3()).project(studio.camera), canvas=renderer.domElement, r=canvas.getBoundingClientRect();
        const x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;
        // Synthetic pointer capture is intentionally a no-op in this isolated fixture.
        canvas.setPointerCapture=()=>{}; canvas.releasePointerCapture=()=>{};
        const dispatch=(type:string,dx=0,dy=0)=>canvas.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId:7,pointerType:'mouse',button:0,buttons:type==='pointerup'?0:1,clientX:x+dx,clientY:y+dy}));
        dispatch('pointerdown'); held = [...pouches].some(p=>p.debug.held()!==null);
        if(!held) throw new Error('synthetic drag was not claimed by a stamp');
        const end=performance.now()+10000;
        while(performance.now()<end){const t=performance.now()/400;dispatch('pointermove',Math.sin(t)*15,Math.cos(t)*12);await sleep(16);}
        dispatch('pointerup');
      }));
      results.at(-1).dragClaimed=held;
      await sleep(2500); setReport('shake');
      results.push(await measure('shake',async()=>{button('摇一摇').click();await sleep(10000);}));
      button('PHOTOS01').click(); await sleep(1500);
      setReport('photo groups');
      results.push(await measure('groups',async()=>{for(let i=0;i<6;i++){button('下一组').click();await sleep(1800);button('上一组').click();await sleep(1800);}}));
      await sleep(5000); setReport('sleeve switches');
      const switches:any[]=[];
      results.push(await measure('sleeves',async()=>{for(let i=0;i<8;i++){button('POSTAGE02').click();await sleep(300);button('PHOTOS01').click();await sleep(300);switches.push(info());}}));
      const materials:any[]=[];
      studio.scene.traverse((n:any)=>{if(n.name?.startsWith('stamp:') && n.isMesh){const m=n.material;materials.push({name:n.name,vertices:n.geometry.attributes.position.count,channels:['map','normalMap','displacementMap','roughnessMap','metalnessMap','sheenColorMap','anisotropyMap'].filter(k=>!!m[k]),maps:Object.fromEntries(['map','normalMap','displacementMap','roughnessMap','metalnessMap','sheenColorMap','anisotropyMap'].filter(k=>!!m[k]).map(k=>[k,[m[k].image?.naturalWidth??m[k].image?.width,m[k].image?.naturalHeight??m[k].image?.height]])),alphaToCoverage:m.alphaToCoverage,alphaTest:m.alphaTest});}});
      setReport(JSON.stringify({revision:__ALBUM_REVISION__,userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,results,switches,materials,errors},null,2));
    }catch(e){setReport(JSON.stringify({error:String(e),results,errors},null,2));}finally{collecting=false;setRunning(false);}
  };
  return <><button disabled={running||mounted} onClick={run}>Run isolated album benchmark</button><p>Real Android acceptance must be performed separately. This fixture permits software WebGL and reports its identity.</p><div style={{height:650,width:720,position:'relative'}} className="conflux-archive-album">{mounted&&<ArchiveFolio ownerId="self" ownerName="Fixture" cards={cards as any} onPickPhoto={()=>{}}/>}</div><pre id="report" style={{whiteSpace:'pre-wrap'}}>{report}</pre></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
