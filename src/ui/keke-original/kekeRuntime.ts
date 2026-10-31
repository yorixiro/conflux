// @ts-nocheck
/* eslint-disable */
/* Verbatim port of the prototype runtime (克克 ˚.ₒ (6).html, last script): side drawer decorations,
   calendar with chat heat map, falling-particle pile, sway/jelly motion and the todo note. */
import { KEKE_IMG as I } from './assets';
import { useChatStore } from '../../stores/chatStore';

const IC={heart:[1,'<path d="M10 17C3 12 2 7.5 5 5.5c2-1.3 4 0 5 2 1-2 3-3.3 5-2 3 2 2 6.5-5 11.5z"/>'],
cloud:[3,'<path d="M5 15c-3 0-3.5-4 0-4.5C5 7 9 6 11 8.5c1.5-1.5 5-.5 4.5 3 3 .3 3 3.5.5 3.5z"/>'],
cherry:[1,'<path d="M6 10.5C7 6 10 3 12 2.5M14 12C13 7 12.5 4 12 2.5" fill="none"/><path d="M12 2.5c2-1 4 0 5 1.5-2 .5-4 .3-5-1.5z" style="fill:var(--f3)"/><circle cx="6" cy="14" r="3.4"/><circle cx="14" cy="15" r="3.2"/>'],
cat:[2,'<path d="M3 8l1-5 4 2.5h4L16 3l1 5c1 4-1 9-7 9S2 12 3 8z"/><circle cx="7" cy="11" r=".9" style="fill:var(--st)"/><circle cx="13" cy="11" r=".9" style="fill:var(--st)"/><path d="M9.3 13.3h1.4" fill="none"/>'],
bunny:[1,'<path d="M6.5 9C4.5 3.5 5 1.8 7 2.6 8.5 3.6 8.6 7 8.2 9M13.5 9c2-5.500 1.5-7.200-.5-6.400-1.500 1-1.600 4.400-1.200 6.400"/><ellipse cx="10" cy="13.300" rx="6" ry="4.800"/><circle cx="7.800" cy="12.600" r=".8" style="fill:var(--st)"/><circle cx="12.200" cy="12.600" r=".8" style="fill:var(--st)"/>'],
note:[3,'<path d="M7 15V4.5l8-1.5V13" fill="none"/><circle cx="5.200" cy="15" r="2.200"/><circle cx="13.200" cy="13" r="2.200"/>']};

export function mountKekeSide(sd) {
  if (!sd || sd.dataset.kkMounted) return;
  sd.dataset.kkMounted = '1';
  let oh, mh;
  const $ = (q) => document.querySelector(q);
  const app = $('#chat .world-chat');
  const rain = sd.querySelector('.rain');
  const sv = sd.querySelector('.sav');
  const el = (t, c, h) => { const e = document.createElement(t); e.className = c; if (h != null) e.innerHTML = h; return e; };
  const im = (c, k) => { const e = document.createElement('img'); e.className = c; e.src = I[k]; e.alt = ''; e.setAttribute('aria-hidden', 'true'); return e; };
  const kk = (t, c) => { const e = document.createElement(t); e.className = 'kk ' + c; return e; };
  if (sv) sv.appendChild(im('kk kk-disc', 'disc'));
  sd.appendChild(im('kk kk-bar', 'bar'));
  const p0 = kk('div', 'kk-print'); p0.append(im('', 'stp'));
  [['♡','left:8px;top:22px;font-size:14px;rotate:-12deg'],['✦','right:0;top:12px;font-size:13px'],['⋆','left:0;bottom:46px;font-size:12px'],['˚ ₊ ·','right:-4px;bottom:64px;font-size:11px;letter-spacing:.2em'],['♡','right:8px;bottom:32px;font-size:10px;opacity:.7'],['sweet no.128','left:16px;bottom:-12px;font-size:9px;letter-spacing:.2em;rotate:-3deg;white-space:nowrap']].forEach(([t, c]) => { const i = document.createElement('i'); i.textContent = t; i.style.cssText = c; p0.append(i); });
  sd.appendChild(p0);
  if(sd){
 const sp=(cx,cy,r,tn,dir)=>{let d='';const N=Math.round(tn*14);for(let i=0;i<=N;i++){const t=i/N,a=dir*t*tn*2*Math.PI,q=r*t;d+=(i?'L':'M')+(cx+q*Math.cos(a)).toFixed(1)+' '+(cy+q*Math.sin(a)).toFixed(1)}return d};
 sd.insertAdjacentHTML('afterbegin',`<svg class="kk2 kk-spir" aria-hidden="true"><defs><pattern id="kkSp" width="72" height="72" patternUnits="userSpaceOnUse"><path d="${sp(18,18,10,2.3,1)}"/><path d="${sp(54,54,10,2.3,-1)}"/></pattern></defs><rect width="100%" height="100%" fill="url(#kkSp)"/></svg>`);
 sd.append(el('div','kk2 kk-holes','<i></i><i></i><i></i><i></i>'),el('div','kk2 kk-stamp','✧ profile no.01'));
 const sinfo=sd.querySelector('.sinfo'),smn=sd.querySelector('.smn');if(rain&&sinfo)sinfo.appendChild(rain);
 const T=new Date(),MN=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];let y=T.getFullYear(),m=T.getMonth(),sel='';
 let CN={};
const lv=n=>n<1?0:n<4?1:n<9?2:n<16?3:4;
 const cal=el('div','kk2 kk-cal','<div class="cb"></div>');const body=cal.firstChild;
 if(I&&I.cat){const c=el('img','kk2 kk-catst');c.src=I.cat;c.alt='';cal.append(c)}
 const draw=()=>{const f=(new Date(y,m,1).getDay()+6)%7,dm=new Date(y,m+1,0).getDate(),pd=new Date(y,m,0).getDate(),cur=y==T.getFullYear()&&m==T.getMonth();
  let h=`<div class="ch"><button data-d="-1" aria-label="上个月">‹</button><span class="ct"><b>${m+1}</b>月 <em>${MN[m]} ${y}</em></span><button data-d="1" aria-label="下个月">›</button></div><div class="cw">${[...'一二三四五六日'].map(c=>`<span>${c}</span>`).join('')}</div><div class="cg">`;
  for(let i=0;i<42;i++){const d=i-f+1,o=d<1||d>dm,n=d<1?pd+d:d>dm?d-dm:d,k=`${y}-${m}-${d}`;let c=o?'o':'';if(!o&&cur&&d==T.getDate())c+=' t';if(!o&&sel==k)c+=' s';if(i%7>4)c+=' w';h+=`<i class="${c}" data-k="${k}"${o?'':` data-h="${lv(CN[k]||0)}" title="${CN[k]||0} 条"`}>${n}</i>`}
  h+=`</div><div class="cf">${cur?`✦ today · ${m+1}.${T.getDate()}`:'<button class="cb2">↺ 回到今天</button>'}</div>`;body.innerHTML=h};
 cal.addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(b){m+=+b.dataset.d;if(m<0){m=11;y--}if(m>11){m=0;y++}draw();return}
  if(e.target.closest('.ct,.cb2')){y=T.getFullYear();m=T.getMonth();draw();return}
  const c=e.target.closest('.cg i:not(.o)');if(c){sel=sel==c.dataset.k?'':c.dataset.k;draw()}});
 draw();(smn||sd).after?.call(smn||sd,cal);
 /* 聊天粒子堆积 + 陀螺仪/划动晃动 */
 {const cv=el('canvas','kk2 kk-pile'),cx=cv.getContext('2d'),P=[],PAL=['#e7c3cc','#d9e3ec','#efe4c8','#d9d2d6','#cdb7c4'],KD={mist:[0,0,1],doodle:[2,1,0],pois:[3,1,3]};cal.append(cv);
  let SPR=[];const buildSpr=()=>{const out=[];document.querySelectorAll('#chat .kk-wall > svg, #petals svg').forEach(sv=>{try{const ix=[...sv.parentNode.querySelectorAll(':scope > svg')].indexOf(sv),wt=sv.closest('.kk-wall')&&(ix==4||ix==5)?.2:1,vb=sv.viewBox&&sv.viewBox.baseVal,w=(vb&&vb.width)||parseFloat(sv.getAttribute('width'))||16,h=(vb&&vb.height)||parseFloat(sv.getAttribute('height'))||16,c=sv.cloneNode(true);if(!c.getAttribute('viewBox'))c.setAttribute('viewBox','0 0 '+w+' '+h);c.setAttribute('xmlns','http://www.w3.org/2000/svg');c.setAttribute('width',w);c.setAttribute('height',h);const cs=getComputedStyle(sv);['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin'].forEach(k=>c.setAttribute(k,cs.getPropertyValue(k)));c.removeAttribute('style');c.removeAttribute('class');const im=new Image();im.onload=()=>run();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(c).replace(/currentColor/g,'#a58f98'));out.push({img:im,ar:w/h,r:6.5,wt})}catch(e){}});document.querySelectorAll('#petals i').forEach(e=>{const t=e.textContent;if(t&&!e.querySelector('svg'))out.push({g:t,c:getComputedStyle(e).color,r:4.4})});SPR=out};
  const pickSprite=()=>{if(!SPR.length||Math.random()>.3)return null;let t=0;for(const s of SPR)t+=s.wt||1;let r=Math.random()*t;for(const s of SPR){r-=s.wt||1;if(r<=0)return s}return SPR[0]};
  const drawSprite=p=>{const s=p.sp;if(!s)return 0;if(s.g){cx.font=(p.r*2.6)+'px system-ui,sans-serif';cx.fillStyle=s.c;cx.textAlign='center';cx.textBaseline='middle';cx.fillText(s.g,0,0);return 1}if(s.img&&s.img.complete&&s.img.naturalWidth){const h=p.r*2.4,w=h*s.ar;cx.drawImage(s.img,-w/2,-h/2,w,h);return 1}return 0};
  let fr=0,W=0,H=0,raf=0,idle=0,g={x:0,y:1},tg={x:0,y:1},lp=null,lm=0,ls=0;
  const mt=Object.keys(CN).filter(k=>k.startsWith(`${T.getFullYear()}-${T.getMonth()}-`)).reduce((a,k)=>a+CN[k],0);
  const spawn=top=>{const ks=KD[document.documentElement.dataset.ct]||[0,1,2],sp=pickSprite();P.push({sp,w:0,x:8+Math.random()*(Math.max(W-16,0)||200),y:top?-6:Math.random()*(H||200)*.6,vx:0,vy:0,r:sp?sp.r*(.8+Math.random()*.5):3+Math.random()*2.6,a:Math.random()*6.28,va:(Math.random()-.5)*.08,k:ks[Math.random()*ks.length|0],c:PAL[Math.random()*PAL.length|0]})};
  const size=()=>{W=cal.offsetWidth;H=cal.offsetHeight;const d=Math.min(2,devicePixelRatio||1);cv.width=W*d;cv.height=H*d;cx.setTransform(d,0,0,d,0,0)};
  for(let i=0;i<Math.min(64,18+Math.round(mt/3));i++)spawn();
  const shape=p=>{if(drawSprite(p))return;const r=p.r;cx.beginPath();if(p.k==0)cx.ellipse(0,0,r*1.25,r*.7,0,0,6.3);else if(p.k==3)cx.arc(0,0,r*.75,0,6.3);else if(p.k==1){const R=r*1.5;cx.moveTo(0,-R);cx.quadraticCurveTo(0,0,R,0);cx.quadraticCurveTo(0,0,0,R);cx.quadraticCurveTo(0,0,-R,0);cx.quadraticCurveTo(0,0,0,-R)}else{cx.moveTo(0,r*.9);cx.bezierCurveTo(-r*1.6,-r*.2,-r*.7,-r*1.4,0,-r*.5);cx.bezierCurveTo(r*.7,-r*1.4,r*1.6,-r*.2,0,r*.9)}cx.fill()};
  const tick=()=>{raf=0;if(!sd.classList.contains('o')||!sd.isConnected)return;if(++fr>420)for(const p of P){p.z=1;p.vx=p.vy=p.va=0}if(!W)size();g.x+=(tg.x-g.x)*.12;g.y+=(tg.y-g.y)*.12;let mv=0;
   for(const p of P){if(p.z)continue;if(p.w>0){p.w--;continue}p.ox=p.x;p.oy=p.y;p.vx+=g.x*.22;p.vy+=g.y*.22;p.vx*=.97;p.vy*=.97;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;if(p.x<p.r){p.x=p.r;p.vx*=-.3}if(p.x>W-p.r){p.x=W-p.r;p.vx*=-.3}if(p.y<p.r-30)p.y=p.r-30;if(p.y>H-p.r-5){p.y=H-p.r-5;p.vy=Math.abs(p.vy)<.6?0:p.vy*-.2;p.vx*=.85;p.va*=.8}}
   for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const a=P[i],b=P[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),mm=(a.r+b.r)*.9;if(d<mm&&d>.01){const sa=a.z?0:1,sb=b.z?0:1,tt=sa+sb;if(tt){const f=(mm-d)/d/tt;a.x-=dx*f*sa;a.y-=dy*f*sa;b.x+=dx*f*sb;b.y+=dy*f*sb;if(sa){a.vx*=.8;a.vy*=.8;a.va*=.8}if(sb){b.vx*=.8;b.vy*=.8;b.va*=.8}}}}
   cx.clearRect(0,0,W,H);for(const p of P){{const md=Math.abs(p.x-(p.ox??p.x))+Math.abs(p.y-(p.oy??p.y)),wt=p.w>0;mv+=md+(wt?5:0);p.q=md<.3&&!wt?(p.q||0)+1:0;if(p.q>10){p.z=1;p.vx=p.vy=p.va=0}}cx.save();cx.translate(p.x,p.y);cx.rotate(p.a);cx.fillStyle=p.c;cx.globalAlpha=.9;shape(p);cx.restore()}
   idle=mv/P.length<.04&&Math.abs(tg.x-g.x)<.01&&Math.abs(tg.y-g.y)<.01?idle+1:0;if(idle<40)raf=requestAnimationFrame(tick)};
  const run=()=>{idle=0;fr=0;if(!raf)raf=requestAnimationFrame(tick)};
  let ang=0,av=0,tgt=0,sraf=0;cal.style.transformOrigin='50% 0';
  const swStep=()=>{sraf=0;av+=-.05*(ang-tgt)-.06*av;ang+=av;cal.style.rotate=ang.toFixed(2)+'deg';if(Math.abs(ang-tgt)>.03||Math.abs(av)>.01)sraf=requestAnimationFrame(swStep);else{ang=tgt;cal.style.rotate=ang.toFixed(2)+'deg'}};
  const swing=()=>{if(!sraf)sraf=requestAnimationFrame(swStep)};
  const jelly=k=>{cal.querySelectorAll('.cg i').forEach((e,i)=>{if(e.animate)e.animate([{rotate:'0deg',scale:'1'},{rotate:(i%2?-1:1)*10*k+'deg',scale:'1.18 .86'},{rotate:(i%2?1:-1)*6*k+'deg',scale:'.94 1.1'},{rotate:(i%2?-1:1)*2*k+'deg',scale:'1.03'},{rotate:'0deg',scale:'1'}],{duration:720,delay:(i%7)*18+(i/7|0)*30,easing:'cubic-bezier(.3,.7,.4,1)'})})};
  const wobble=k=>{av+=(Math.random()<.5?-1:1)*2.4*k;swing();jelly(k);cal.classList.remove('kk-wob');void cal.offsetWidth;cal.classList.add('kk-wob');if(navigator.vibrate)navigator.vibrate(14)};
  cal.addEventListener('click',e=>{if(e.target.closest('.ct'))wobble(1.1)});
  cal.addEventListener('pointerdown',e=>{const c=e.target.closest('.cg i');if(c&&c.animate)c.animate([{scale:'1'},{scale:'1.35 .75'},{scale:'.9 1.12'},{scale:'1'}],{duration:420,easing:'ease-out'})});
  const shake=k=>{wobble(k);for(const p of P){p.z=0;p.vx+=(Math.random()-.5)*7*k;p.vy-=Math.random()*6*k}run()};
  cal.addEventListener('pointermove',e=>{const r=cal.getBoundingClientRect(),s=r.width/(W||r.width),px=(e.clientX-r.left)/s,py=(e.clientY-r.top)/s;if(lp){const vx=px-lp.x,vy=py-lp.y;av=Math.max(-3,Math.min(3,av+vx*.03));swing();for(const p of P)if(Math.hypot(p.x-px,p.y-py)<36){p.z=0;p.vx+=vx*.35;p.vy+=vy*.35}run()}lp={x:px,y:py}});
  cal.addEventListener('pointerleave',()=>lp=null);
  cal.addEventListener('pointerdown',()=>{[window.DeviceOrientationEvent,window.DeviceMotionEvent].forEach(o=>o&&o.requestPermission&&o.requestPermission().catch(()=>{}))},{once:true});
  addEventListener('deviceorientation',oh=e=>{if(!sd.isConnected){removeEventListener('deviceorientation',oh);return}if(e.gamma==null||e.beta==null)return;const gm=e.gamma*Math.PI/180,bt=e.beta*Math.PI/180,x=Math.sin(gm),yy=Math.max(-1,Math.min(1,Math.sin(bt))),a=((screen.orientation&&screen.orientation.angle)||0)*Math.PI/180;const nx=x*Math.cos(a)+yy*Math.sin(a),ny=-x*Math.sin(a)+yy*Math.cos(a);{const dz=.2,sx=Math.abs(nx)<dz?0:Math.sign(nx)*(Math.abs(nx)-dz)/(1-dz),sy=.4+.6*Math.max(0,ny);if(Math.hypot(sx-tg.x,sy-tg.y)>.1){tg.x=sx;tg.y=sy;tgt=-sx*4;swing();for(const p of P)p.z=0;run()}}});
  addEventListener('devicemotion',mh=e=>{if(!sd.isConnected){removeEventListener('devicemotion',mh);return}const a=e.accelerationIncludingGravity;if(!a)return;const mg=Math.hypot(a.x||0,a.y||0,a.z||0),nw=performance.now();if(Math.abs(mg-lm)>10&&nw-ls>400){ls=nw;shake(1.3)}lm=mg});
  let wasO=false,lastT='';const onOpen=()=>{av+=3.2;swing();const t=document.documentElement.dataset.ct;if(!SPR.length||t!=lastT){lastT=t;buildSpr();for(const q of P){q.sp=pickSprite();q.r=q.sp?q.sp.r*(.8+Math.random()*.5):3+Math.random()*2.6}}if(!W)size();for(const q of P){q.x=8+Math.random()*Math.max(W-16,40);q.y=-12-Math.random()*30;q.vx=q.vy=0;q.z=0;q.q=0;q.w=Math.random()*100|0}};
  new MutationObserver(()=>{const o=sd.classList.contains('o');if(o&&!wasO)onOpen();wasO=o;run()}).observe(sd,{attributes:true,attributeFilter:['class']});new ResizeObserver(size).observe(cal);
  onOpen();wasO=true;sd.kkSetCounts=(c)=>{CN=c||{};draw();run()};
 }
 const K='kk-todo';let st={};try{st=JSON.parse(localStorage.getItem(K)||'{}')}catch(e){}
 const n=el('div','kk2 kk-note','<b>今日小事 ♡</b>'+['好好吃饭','画一点点','早点睡 ☾'].map((t,i)=>`<p data-i="${i}" class="${st[i]?'on':''}"><u></u>${t}</p>`).join(''));
 n.addEventListener('click',e=>{const p=e.target.closest('p');if(!p)return;p.classList.toggle('on');st[p.dataset.i]=p.classList.contains('on')?1:0;try{localStorage.setItem(K,JSON.stringify(st))}catch(x){}});
 const low=el('div','kk2 kk-low');low.append(n);const pr=sd.querySelector('.kk-print');if(pr)low.append(pr);cal.after(low)}
  const d = el('img', 'kk pp kk-disc'); d.src = I.discg; d.alt = ''; if (sv) sv.appendChild(d);
  const b = el('img', 'kk pp kk-bar'); b.src = I.barg; b.alt = ''; sd.appendChild(b);
  const pr = sd.querySelector('.kk-print');
  if (pr) { const c = pr.cloneNode(true); c.classList.add('pp'); c.querySelector('img').src = I.stpg; pr.after(c); }
}

export function mountKekeWall(app) {
  if (!app || app.querySelector(':scope > .kk-wall')) return;
  const w = document.createElement('div'); w.className = 'kk kk-wall';
  [[8,26,20,-14,'heart'],[88,34,22,10,'cloud'],[14,52,18,12,'note'],[82,60,20,-8,'cherry'],[6,78,22,8,'bunny'],[90,82,18,-12,'cat'],[48,70,16,16,'heart'],[44,30,16,-6,'note']].forEach(([x, y, s, r, n]) => {
    w.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 20 20" width="${s}" height="${s}" style="left:${x}%;top:${y}%;translate:-50% -50%;rotate:${r}deg;fill:var(--f${IC[n][0]})">${IC[n][1]}</svg>`);
  });
  app.appendChild(w);
}

export function mountKekeHeader(hd, app, hav) {
  if (!hd || hd.dataset.kkMounted) return () => {};
  hd.dataset.kkMounted = '1';
  let sh;
  const el = (t, c, h) => { const e = document.createElement(t); e.className = c; if (h != null) e.innerHTML = h; return e; };
  const im = (c, k) => { const e = document.createElement('img'); e.className = c; e.src = I[k]; e.alt = ''; e.setAttribute('aria-hidden', 'true'); return e; };
  const kk = (t, c) => { const e = document.createElement(t); e.className = 'kk ' + c; return e; };
  const IT=[[5,'i','heart',12],[11,'i','cloud',28],[18,'k','(๑•ᴗ•๑)',4],[26,'i','cherry',24],[31,'k','(=^･ω･^=)',2],[40,'g','✦',0],[46,'g','♡',2],[52,'g','˚₊',0],[58,'g','⋆',2],[64,'g','✧',0],[69,'i','cat',4],[74,'c','',0],[83,'k','ʕ•ᴥ•ʔ',6],[89,'i','bunny',28],[94,'i','note',12],[98,'s','',6]];

  const G=cls=>{const g=kk('div','kk-gl '+cls),pp=cls=='pp';let ch=null;
 g.innerHTML='<svg class="ln" viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M0 0Q50 16 100 0" vector-effect="non-scaling-stroke"/></svg><u style="left:-8px"></u><u style="right:-8px"></u>';
 IT.forEach(([x,k,v,l],n)=>{const p=document.createElement('i'),t=x/100;
  p.style.cssText=`left:${x}%;top:${Math.round(32*t*(1-t))}px;--l:${l}px;--dl:${-n*.9}s;--du:${4.6+(n*37%29)/10}s;--am:${k=='c'?3:5}deg`;
  if(k=='c'){const m=im('',pp?'charmg':'charm');m.style.height='86px';p.append(m);ch=p}
  else if(k=='s'){const m=im('',pp?'thmg':'thm');m.style.width='18px';p.append(m)}
  else if(k=='i')p.insertAdjacentHTML('beforeend',`<svg viewBox="0 0 20 20" width="19" height="19" style="fill:var(--f${IC[v][0]})">${IC[v][1]}</svg>`);
  else{const b=document.createElement('b');b.className=k;b.textContent=v;p.append(b)}
  g.append(p)});hd.appendChild(g);return ch};
const chs=hd?[G('dd'),G('pp')]:[];

  if(app){const t=im('kk kk-trk','trk'),m=im('kk kk-thm','thm');app.append(t,m);let h;
 document.addEventListener('scroll',sh=ev=>{const L=ev.target;if(!(L instanceof HTMLElement)||!L.classList.contains('chat-flow'))return;const r=L.scrollHeight-L.clientHeight;if(r<60)return;const q=Math.min(1,Math.max(0,L.scrollTop/r));m.style.top=(118+q*(120-22))+'px';m.style.setProperty('--r',q*300+'deg');t.classList.add('on');m.classList.add('on');clearTimeout(h);h=setTimeout(()=>{t.classList.remove('on');m.classList.remove('on')},900)},{passive:true,capture:true})}

  const hv=hav;if(hv&&chs.length)hv.addEventListener('click',()=>{chs.forEach(c=>{if(!c)return;c.classList.remove('big');void c.offsetWidth;c.classList.add('big');setTimeout(()=>c.classList.remove('big'),1500)})})
  const pg = document.createElement('div'); pg.className = 'prog'; pg.innerHTML = '<i></i>'; hd.appendChild(pg);
  const ap = document.querySelector('#chat .app');
  const ph = (ev) => { const L = ev.target; if (!(L instanceof HTMLElement) || !L.classList.contains('chat-flow')) return; const m = L.scrollHeight - L.clientHeight; ap && ap.style.setProperty('--p', m > 0 ? (L.scrollTop / m).toFixed(3) : 1); };
  document.addEventListener('scroll', ph, { passive: true, capture: true });
  return () => {
    pg.remove(); document.removeEventListener('scroll', ph, true);
    delete hd.dataset.kkMounted;
    hd.querySelectorAll(':scope > .kk-gl').forEach((n) => n.remove());
    app?.querySelectorAll(':scope > .kk-trk, :scope > .kk-thm').forEach((n) => n.remove());
    if (sh) document.removeEventListener('scroll', sh, true);
  };
}

const PC = ['#c4979f', '#9dabb9', '#c3b38c', '#a5b6aa', '#b2a4bc'];
const GL = ['✲', '⊹', '˚', '♡', '∗', '๑', '₊', '☆'];
const POEM = [['‧₊˚ ☆ ♡ ☆ ˚₊‧', '18%', 'left:8%', '-5deg'], ['ʚ ♡ ɞ  きょうもいっしょ', '54%', 'right:6%', '4deg'], ['(っ´ω`c) ✲ ⊹', '80%', 'left:12%', '-3deg']];
const PXG = { big: ['....#....', '....#....', '...###...', '..#####..', '#########', '..#####..', '...###...', '....#....', '....#....'], plus: ['..#..', '..#..', '#####', '..#..', '..#..'], sm: ['.#.', '###', '.#.'], dia: ['.#.', '#.#', '.#.'], dot: ['#'] };
const px = (k, s) => { const g = PXG[k]; let d = ''; g.forEach((w, y) => [...w].forEach((c, x) => { if (c == '#') d += `M${x} ${y}h1v1h-1z`; })); return `<svg class=pxs width=${g[0].length * s} height=${g.length * s} viewBox="0 0 ${g[0].length} ${g.length}"><path fill=currentColor d="${d}"/></svg>`; };
const PXP = [['big', 3, '7%', '15%'], ['dia', 2, '88%', '11%'], ['plus', 2, '72%', '29%'], ['sm', 2, '13%', '43%'], ['big', 2, '91%', '50%'], ['dot', 3, '42%', '21%'], ['dia', 2, '5%', '69%'], ['plus', 2, '82%', '74%'], ['sm', 2, '55%', '58%'], ['dot', 3, '27%', '84%']];
const BURST = { doodle: PC, pois: ['#b9939a', '#8f8b8c', '#d4b9be', '#ffffff', '#a9a5a6'] };

/* atmos(): drifting glyph petals / pixel stars and the three poem lines, refilled whenever the skin changes. */
export function mountKekeAtmos() {
  const root = document.documentElement;
  const run = () => {
    const pe = document.querySelector('#chat .petals'), po = document.querySelector('#chat .poem');
    if (!pe || !po) return;
    const r = Math.random, f = (n) => n.toFixed(1), pick = (a) => a[r() * a.length | 0], dd = root.dataset.ct == 'doodle';
    pe.innerHTML = dd ? Array.from({ length: 16 }, () => `<i style="--x:${f(r() * 100)}%;--s:${f(9 + r() * 9)}px;--d:${f(16 + r() * 16)}s;--dl:${f(-r() * 32)}s;--sw:${f(r() * 90 - 45)}px;--o:${(.55 + r() * .4).toFixed(2)};color:${pick(PC)}">${pick(GL)}</i>`).join('')
      : root.dataset.ct == 'pois' ? PXP.map(([k, s, x, y], j) => `<b class=px style="left:${x};top:${y};--d:${(2.6 + j % 4 * .7).toFixed(1)}s;--dl:${(-j * .83).toFixed(2)}s">${px(k, s)}</b>`).join('') : '';
    po.innerHTML = dd ? POEM.map((p, j) => `<p style="top:${p[1]};${p[2]};--r:${p[3]};--dl:${j * 7}s">${p[0]}</p>`).join('') : '';
  };
  run();
  const mo = new MutationObserver(run);
  mo.observe(root, { attributes: true, attributeFilter: ['data-ct'] });
  return () => mo.disconnect();
}

/* stamp() + burst(): the wax-stamp press on the send button and the sticker-skin particle burst. */
export function mountKekeSendFx() {
  const root = document.documentElement;
  const burst = (sd) => {
    const row = sd.closest('.row') || sd.parentElement; if (!row) return;
    if (getComputedStyle(row).position == 'static') row.style.position = 'relative';
    const o = row.getBoundingClientRect(), b = sd.getBoundingClientRect(), tz = parseFloat(getComputedStyle(root).getPropertyValue('--tz')) || 1, x = (b.left - o.left + b.width / 2) / tz, y = (b.top - o.top + b.height / 2) / tz, pc = BURST[root.dataset.ct] || PC;
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i'), a = Math.PI * 2 * i / 9 + Math.random() * .5, d = 28 + Math.random() * 24;
      s.className = 'pop'; if (root.dataset.ct == 'pois') s.innerHTML = px(['big', 'sm', 'dia', 'plus'][i % 4], 2); else s.textContent = GL[i % GL.length];
      s.style.cssText = `left:${x}px;top:${y}px;--dx:${(Math.cos(a) * d).toFixed(1)}px;--dy:${(Math.sin(a) * d - 12).toFixed(1)}px;color:${pc[i % pc.length]}`;
      row.appendChild(s); setTimeout(() => s.remove(), 1000);
    }
  };
  const fire = () => {
    const sd = document.querySelector('#chat .sd'); if (!sd) return;
    sd.classList.remove('stamp'); void sd.offsetWidth; sd.classList.add('stamp');
    if (root.dataset.cf == 'sticker') burst(sd);
  };
  const onClick = (e) => { const t = e.target; if (t && t.closest && t.closest('#chat .sd.has-content')) fire(); };
  const onKey = (e) => { const t = e.target; if (e.key == 'Enter' && !e.isComposing && !e.shiftKey && t && t.closest && t.closest('#chat .fd textarea') && t.value.trim()) fire(); };
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKey, true);
  return () => { document.removeEventListener('click', onClick, true); document.removeEventListener('keydown', onKey, true); };
}

/* Bubble grouping from the prototype's render(): per-position corner radii, group spacing and the group-end sketch / sticker. */
const SK = ['<svg class=sk width=21 height=21 viewBox="0 0 22 22"><path d="M11 1.5l2.6 6.4 6.9.5-5.3 4.4 1.7 6.7L11 15.9 5.1 19.5l1.7-6.7L1.5 8.4l6.9-.5z"/></svg>', '<svg class=sk width=28 height=19 viewBox="0 0 28 18"><path d="M14 9C9 2 2 3 3 8c.6 4 8 3 11 1zM14 9c5-7 12-6 11-1-.6 4-8 3-11 1zM14 9l-3 7M14 9l3 7"/></svg>', '<svg class=sk width=17 height=21 viewBox="0 0 20 24"><path style="fill:#ead0d8" d="M8 2h4v6h6v4h-6v10H8V12H2V8h6z"/></svg>'];
const WDN = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], TY = { doodle: 'かきかき', pois: 'にゃにゃ' }, RD = '既読', z2 = (n) => String(n).padStart(2, '0');
const SYM = { doodle: '<svg class=sym viewBox="0 0 16 16" fill="#ead9dc" stroke="#6b6066" stroke-width="1.2" stroke-linejoin="round"><path d="M8 13.6C2.6 10.1 2 6.3 4 4.7s3.4-.3 4 1.1c.6-1.4 2-2.7 4-1.1s1.4 5.4-4 8.9Z"/></svg>', pois: '<i class="sym ic" style="--u:var(--pi-flower)"></i>' };
const STK = ['s1', 's2', 's3', 's4', 's5', 's6'], ROT = [-14, 10, -6, 16, -10, 8];
export function mountKekeBubbles() {
  const root = document.documentElement;
  let raf = 0, flow = null, mo = null;
  const role = (row) => (row.classList.contains('user') ? 's' : row.classList.contains('assistant') ? 'r' : '');
  const pass = () => {
    raf = 0;
    const rows = [...document.querySelectorAll('#chat .chat-flow .msg-row')];
    const cs = useChatStore.getState(), all = cs.conversations.find((c) => c.id === cs.activeConversationId)?.messages || [], at = new Map(all.map((m, j) => [m.id, j]));
    const dk = (m) => { const d = new Date(m.timestamp); return d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); };
    document.querySelectorAll('#chat .kk-ty').forEach((n) => { if (!n.previousElementSibling?.classList.contains('assistant-streaming-hint')) n.remove(); });
    document.querySelectorAll('#chat .assistant-streaming-hint').forEach((h) => {
      if (h.nextElementSibling?.classList.contains('kk-ty') || !TY[root.dataset.ct]) return;
      const t = document.createElement('span'); t.className = 'ty kk-ty'; t.setAttribute('aria-hidden', 'true'); t.innerHTML = TY[root.dataset.ct] + '<i></i><i></i><i></i>'; h.after(t);
    });
    const typing = !!document.querySelector('#chat .kk-ty');
    rows.forEach((row, i) => {
      const w = role(row);
      const msg = all[at.get(row.dataset.messageId)], pm = msg && all[at.get(row.dataset.messageId) - 1];
      const dcur = row.querySelector(':scope > .kk-day');
      if (msg && (!pm || dk(pm) !== dk(msg))) {
        const d = new Date(msg.timestamp), txt = `₊˚⊹ ${d.getMonth() + 1}.${d.getDate()} ${WDN[d.getDay()]} ⊹˚₊`;
        if (!dcur) { const e = document.createElement('div'); e.className = 'day kk-day'; e.innerHTML = '<span></span>'; e.firstChild.textContent = txt; row.prepend(e); } else if (dcur.textContent !== txt) dcur.firstChild.textContent = txt;
      } else if (dcur) dcur.remove();
      if (!w) return;
      const f = !rows[i - 1] || role(rows[i - 1]) != w, l = !rows[i + 1] || role(rows[i + 1]) != w;
      const p = f && l ? 's' : f ? 'f' : l ? 'l' : 'm';
      if (row.dataset.kkP !== p) row.dataset.kkP = p;
      if (!row.classList.contains('m')) row.classList.add('m');
      if (!row.classList.contains(w)) row.classList.add(w);
      row.classList.toggle('g', f);
      row.classList.toggle('new', row.dataset.rowState === 'entering');
      const um = row.querySelector('.message-usage-meta');
      const read = w == 's' && (i < rows.length - 1 || typing);
      if (um) {
        let rcur = um.querySelector(':scope > .kk-read');
        if (l && read) { if (!rcur) { rcur = document.createElement('span'); rcur.className = 'kk-read'; rcur.textContent = '· ' + RD; um.appendChild(rcur); } }
        else if (rcur) rcur.remove();
      }
      const mcur = row.querySelector(':scope > .kk-mt');
      if (!um && l && msg) {
        const d = new Date(msg.timestamp), txt = `${z2(d.getHours())}:${z2(d.getMinutes())}${read ? ' · ' + RD : ''}`;
        if (!mcur) { const e = document.createElement('div'); e.className = `mt ${w} kk-mt`; e.textContent = txt; row.append(e); } else { if (mcur.textContent !== txt) mcur.textContent = txt; if (mcur.className !== `mt ${w} kk-mt`) mcur.className = `mt ${w} kk-mt`; }
      } else if (mcur) mcur.remove();
      if (f && w == 'r' && SYM[root.dataset.ct] && !row.querySelector(':scope > .kk-sym')) {
        const sy = document.createElement('span'); sy.className = 'kk-sym'; sy.style.cssText = 'position:absolute;left:0;top:7px;display:contents'; sy.setAttribute('aria-hidden', 'true'); sy.innerHTML = SYM[root.dataset.ct]; row.prepend(sy);
      } else if ((!f || w != 'r') && row.querySelector(':scope > .kk-sym')) row.querySelector(':scope > .kk-sym').remove();
      const b = row.querySelector('.bubble'); if (!b) return;
      if (!b.classList.contains('b')) b.classList.add('b');
      if (b.dataset.p !== p) b.dataset.p = p;
      const rot = root.dataset.ct == 'doodle' ? (i % 2 ? .5 : -.4) : 0;
      if (b.style.getPropertyValue('--rot') !== rot + 'deg') b.style.setProperty('--rot', rot + 'deg');
      const cur = b.querySelector(':scope > .kk-deco');
      if (!l) { if (cur) cur.remove(); return; }
      const key = root.dataset.ct + i;
      if (cur && cur.dataset.k === key) return;
      if (cur) cur.remove();
      const d = document.createElement('span'); d.className = w + ' kk-deco'; d.dataset.k = key; d.style.display = 'contents'; d.setAttribute('aria-hidden', 'true');
      d.innerHTML = root.dataset.ct == 'pois' ? `<i class=stk style="--u:var(--pi-${STK[i % 6]});rotate:${ROT[i % 6]}deg"></i>` : SK[(i / 3 | 0) % 3];
      b.appendChild(d);
    });
  };
  const sched = () => { if (!raf) raf = requestAnimationFrame(pass); };
  const attach = () => {
    const el = document.querySelector('#chat .chat-flow');
    if (el === flow) return;
    mo && mo.disconnect(); flow = el;
    if (el) { mo = new MutationObserver(sched); mo.observe(el, { childList: true, subtree: true }); }
    sched();
  };
  const top = new MutationObserver(attach);
  top.observe(document.body, { childList: true, subtree: true });
  const tm = new MutationObserver(sched); tm.observe(root, { attributes: true, attributeFilter: ['data-ct'] });
  attach();
  return () => { top.disconnect(); tm.disconnect(); mo && mo.disconnect(); cancelAnimationFrame(raf); document.querySelectorAll('#chat .kk-deco, #chat .kk-day, #chat .kk-mt, #chat .kk-ty, #chat .kk-sym, #chat .kk-read').forEach((n) => n.remove());
    document.querySelectorAll('#chat .msg-row').forEach((r) => { r.classList.remove('m', 'r', 's', 'g', 'new'); });
    document.querySelectorAll('#chat .bubble.b').forEach((b) => { b.classList.remove('b'); delete b.dataset.p; b.style.removeProperty('--rot'); }); };
}
