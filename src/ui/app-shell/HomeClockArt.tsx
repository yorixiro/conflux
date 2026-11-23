const tau = Math.PI * 2;
function point(x: number, y: number) {
  return x.toFixed(1) + ' ' + y.toFixed(1);
}
const ticks = Array.from({ length: 144 }, (_, i) => {
  const a = i * tau / 144;
  const r = i % 12 === 0 ? 143 : i % 3 === 0 ? 147 : 150;
  return 'M' + point(Math.cos(a) * r, Math.sin(a) * r) + 'L' + point(Math.cos(a) * 153, Math.sin(a) * 153);
}).join('');
// The instrument moves around the photographic plate on a separate focal plane.
const divisions = Array.from({ length: 96 }, (_, i) => {
  const angle = i * tau / 96;
  const length = i % 8 === 0 ? 12 : i % 4 === 0 ? 7 : 3;
  return 'M' + point(Math.cos(angle) * 202, Math.sin(angle) * 202)
    + 'l' + point(Math.cos(angle) * length, Math.sin(angle) * length);
}).join('');

export function LunarFrieze() {
  const crescent = 'M0-5a5 5 0 0 1 0 10a3.7 5 0 0 0 0-10Z';
  const half = 'M0-5a5 5 0 0 1 0 10Z';
  const gibbous = 'M0-5a5 5 0 0 1 0 10a2.6 5 0 0 1 0-10Z';
  return <div className="lunar-frieze" aria-hidden="true">
    <svg viewBox="-126 -12 252 24" fill="currentColor">
      {[-118, -77, -47, -16, 16, 47, 77, 118].map((x, i) =>
        <path key={x} transform={`translate(${x} 0) scale(${i === 0 || i === 7 ? 1 : .53})`}
          d="M0-5 1-1 4 0 1 1 0 5-1 1-4 0-1-1Z" />)}
      {[crescent, half, gibbous, null, gibbous, half, crescent].map((phase, i) =>
        <g key={i} transform={`translate(${(i - 3) * 31} 0) scale(${i > 3 ? -1 : 1} 1)`}>
          <circle r="5" fill={phase ? 'none' : 'currentColor'} stroke="currentColor" opacity={phase ? .52 : 1} strokeWidth=".65"/>
          {phase ? <path d={phase} /> : <circle r="7.7" fill="none" stroke="currentColor" strokeWidth=".55"/>}
        </g>)}
    </svg>
  </div>;
}

export function CosmosChart() {
  return <div className="home-cosmos-chart global-cosmos-art" aria-hidden="true">
    <div className="lunar-plate" />
    <div className="lunar-camera">
      <div className="lunar-disc" />
      <svg className="lunar-instrument" viewBox="-240 -240 480 480" fill="none">
        <g className="lunar-scale">
          <circle r="145" strokeDasharray="1 5"/><circle r="151" strokeDasharray="260 6 72 9"/>
          <circle r="201"/><path d={divisions}/><circle r="214" strokeDasharray="44 7 2 50"/>
          <circle r="230" strokeDasharray="1 7"/>
        </g>
        <g className="lunar-reticle">
          <path d="M-165 -36v-20l11 -11h29m-34 8 5 -5m-1 5 5 -5"/>
          <path d="M-21 166h42m-38 -3v6m7 -5v3m7 -3v3m7 -5v7m7 -5v3m7 -3v3"/>

          <path d="M-235 0h89m292 0h89M0 -234v82m0 304v82"/>
          <path d="M-4 -195l4 7 4-7zM-4 195l4-7 4 7z" fill="currentColor" stroke="none"/>
        </g>
      </svg>
    </div>
    <div className="lunar-profile" />
  </div>;
}
export function PoetDial({ now }: { now: Date }) {
  const minutes = now.getMinutes();
  return <svg className="home-poet-dial global-poet-art" viewBox="-80 -80 160 160" aria-hidden="true">
    <g fill="none" stroke="#a58b58" strokeWidth=".45">
      <circle r="77"/><circle r="75.5"/>
      <circle r="64.5" strokeWidth="3" strokeDasharray=".33 1.7"/>
      <circle r="8.5"/><circle r="10"/>
    </g>
    <g fill="none" stroke="currentColor"><circle r="73"/><circle r="69" strokeWidth=".45"/><circle r="60" strokeWidth=".65"/>
      <path d={ticks} transform="scale(.447)" strokeWidth="2"/>
    </g>
    <g fill="currentColor" fontFamily="Georgia,serif" fontSize="13" textAnchor="middle">
      <text y="-44">XII</text><text x="49" y="5">III</text><text y="54">VI</text><text x="-48" y="5">IX</text>
    </g>
    <g fill="currentColor">
      <path d="M0 -38L2.7 -9L1 7H-1L-2.7 -9Z" transform={`rotate(${(now.getHours() % 12 + minutes / 60) * 30})`}/>
      <path d="M0 -54L1.5 -9L1 9H-1L-1.5 -9Z" transform={`rotate(${minutes * 6})`}/><circle r="3"/>
    </g>
  </svg>;
}
