// Static geometry keeps the star field stable as the clock updates.
const tau = Math.PI * 2;
const cx = 326;
const cy = 142;
function noise(index: number, band: number) {
  const wave = Math.sin(index * 127.1 + band * 311.7) * 43758.5453;
  return wave - Math.floor(wave);
}
function point(x: number, y: number) {
  return x.toFixed(1) + ' ' + y.toFixed(1);
}
const clouds = Array.from({ length: 5 }, (_, band) => {
  const specks: string[] = [];
  const rays: string[] = [];
  for (let i = 0; i < 260; i++) {
    const depth = noise(i, band + 1);
    const radius = 10 + depth ** 1.6 * 294;
    const angle = i % 3 * tau / 3 + depth * 3.8 + (noise(i, band + 7) - .5) * (1 + depth);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius * .61 - (x - cx) * .22;
    specks.push('M' + point(x, y) + 'h' + (0.7 + band * .34));
    if (i % 11 === 0) rays.push('M' + point(x, y) + 'l' + point((x - cx) * .18, (y - cy) * .18));
  }
  return { specks: specks.join(''), rays: rays.join('') };
});
const spiralArms = Array.from({length: 46}, (_, strand) => {
  const fragments: string[] = [];
  const phase = (strand % 3) * tau / 3 + noise(strand, 14) * .43;
  for (let j = 0; j < 104; j++) {
    const t = j / 104;
    const a = phase + t * 4.4;
    const r = 3 + t * t * (142 + noise(strand, 12) * 88);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r * .41 - x * .32;
    fragments.push((j === 0 || noise(j, strand) > .87 ? 'M' : 'L') + point(cx + x, cy + y));
  }
  return fragments.join('');
});
const ticks = Array.from({ length: 144 }, (_, i) => {
  const a = i * tau / 144;
  const r = i % 12 === 0 ? 143 : i % 3 === 0 ? 147 : 150;
  return 'M' + point(Math.cos(a) * r, Math.sin(a) * r) + 'L' + point(Math.cos(a) * 153, Math.sin(a) * 153);
}).join('');
const nodes = Array.from({ length: 42 }, (_, i) => {
  const a = noise(i, 15) * tau;
  const r = 14 + noise(i, 16) ** 1.5 * 205;
  return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .69, r: 1 + noise(i, 17) * 3.4 };
});
// ASCII traces follow the same tilted disc as the radial node field.
const asciiDisc = Array.from({ length: 17 }, (_, row) =>
  Array.from({ length: 76 }, (_, col) => {
    const x = (col - 38) / 33;
    const y = (row - 8) / 5 + .62 * x;
    const radius = Math.hypot(x, y);
    const arm = .5 + .5 * Math.cos(Math.atan2(y, x) * 3 - radius * 8);
    const density = Math.max(0, 1 - radius) * arm * (.45 + .55 * noise(col, row));
    return '  .:+*#'[Math.min(6, Math.floor(density * 10))];
  }).join('')
);

export function CosmosChart() {
  return (
    <svg className="home-cosmos-chart global-cosmos-art" viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="home-nebula"><stop stopColor="#8577af" stopOpacity=".32"/><stop offset=".52" stopColor="#423650" stopOpacity=".26"/><stop offset="1" stopColor="#0a0a10" stopOpacity="0"/></radialGradient>
        <radialGradient id="home-flare"><stop stopColor="white"/><stop offset=".21" stopColor="#efe9ff"/><stop offset=".43" stopColor="#bca9ff" stopOpacity=".78"/><stop offset="1" stopColor="#8b6fee" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx="265" ry="160" fill="url(#home-nebula)"/>
      <g stroke="#b6a8d8" fill="none" opacity=".42" strokeWidth=".65">
        <path d="M0 142H600M326 0V300" strokeDasharray="2 6"/>
        <circle cx={cx} cy={cy} r="151"/><circle cx={cx} cy={cy} r="115"/>
        <ellipse cx={cx} cy={cy} rx="211" ry="61" transform="rotate(-18 326 142)"/>
        <path d={ticks} transform="translate(326 142)"/>
      </g>
      <g fill="#d3c4ff" opacity=".56" fontFamily="monospace" fontSize="6" xmlSpace="preserve" aria-hidden="true">
        {asciiDisc.map((row, i) => <text key={i} x="190" y={102 + i * 5}>{row}</text>)}
      </g>
      <g className="cosmos-sidereal-drift">
        <g fill="none" stroke="#e2dafa" strokeWidth=".56" opacity=".25">
          {spiralArms.map((d, index) => <path key={index} d={d}/>)}
        </g>
        {clouds.map(({specks, rays}, band) => <g key={band} stroke={band % 2 ? '#e3daff' : '#ac9ad7'} opacity={.37 + band * .11}>
          <path d={rays} strokeWidth=".45"/><path d={specks} strokeWidth={.66 + band * .23}/>
        </g>)}
        {nodes.map((n, i) => <g key={i}>
          <path d={'M326 142L' + point(n.x,n.y)} stroke="#dfd7fb" strokeWidth=".45" opacity=".32"/>
          <circle cx={n.x} cy={n.y} r={n.r * 2} fill="url(#home-flare)"/>
        </g>)}
      </g>
      <circle cx={cx} cy={cy} r="19" fill="url(#home-flare)"/><circle cx={cx} cy={cy} r="4.5" fill="#fff"/>
      <path d="M295 142H357M326 120V164" stroke="#fff" opacity=".8" strokeWidth=".7"/>
      <g transform="translate(326 142)" className="cosmos-orbit-marker"><circle cx="115" cy="0" r="3" fill="#eae2ff"/></g>
    </svg>
  );
}
export function PoetDial({ now }: { now: Date }) {
  const minutes = now.getMinutes();
  return <svg className="home-poet-dial global-poet-art" viewBox="-80 -80 160 160" aria-hidden="true">
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
