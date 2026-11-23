import { useState } from 'react';

const stars = [
  [220,117,2.7], [222,90,1.4], [197,73,2], [205,53,1.6], [248,38,1.6],
  [263,51,1.4], [93,69,1.9], [93,98,1.4], [26,102,2.2]
];

/** Schematic of Leo, north up and east to the left. */
export function LeoPlate() {
  const [identified, setIdentified] = useState(false);
  return <button type="button" className="leo-plate" aria-label="狮子座星图，标注轩辕十四"
    aria-pressed={identified} onClick={() => setIdentified(value => !value)}>
    <svg viewBox="0 0 300 170" aria-hidden="true">
      <defs>
        <pattern id="leo-graticule" width="28" height="25" patternUnits="userSpaceOnUse" patternTransform="rotate(-10)">
          <path d="M28 0H0V25" fill="none" stroke="#d2bc83" opacity=".18" strokeWidth=".65"/>
        </pattern>
        <linearGradient id="leo-foil" x2=".85" y2="1">
          <stop stopColor="#816942"/><stop offset=".34" stopColor="#e0cb92"/><stop offset=".6" stopColor="#95805a"/><stop offset="1" stopColor="#c5af78"/>
        </linearGradient>
        <linearGradient id="leo-light">
          <stop stopColor="#e6d098" stopOpacity="0"/><stop offset=".96" stopColor="#e6d098" stopOpacity=".15"/>
          <stop offset="1" stopColor="#f6e7ba" stopOpacity=".46"/>
        </linearGradient>
      </defs>
      <path fill="#101622" d="M0 0h300v170H0z"/>
      <path fill="url(#leo-graticule)" d="M8 8h284v154H8z"/>
      <g fill="none" stroke="url(#leo-foil)">
        <path d="M33 5h252q0 10 10 10v140q-10 0-10 10H15q0-10-10-10V21" strokeWidth=".9"/>
        <path d="M38 9h244l9 9v134l-9 9H18l-9-9V26" strokeWidth=".43"/>
        <path d="M15 133Q90 65 182 33M71 147Q147 77 281 49" strokeWidth=".46" strokeDasharray="2 3" opacity=".54"/>
      </g>
      <path d="M263 51 248 38 205 53 197 73 222 90 220 117 93 98 26 102 93 69 197 73M93 69v29"
        fill="none" stroke="#c6ab70" strokeWidth="1.05" strokeLinejoin="round"/>
      <g fill="#e8d297">{stars.map(([x,y,r])=><circle key={x+'-'+y} cx={x} cy={y} r={r}/>)}</g>
      <g fill="#b8aa8d" fontFamily="Georgia, serif" fontSize="10" fontStyle="italic">
        <text x="25" y="93">β</text><text x="87" y="60">δ</text><text x="184" y="71">γ</text><text x="229" y="117">α</text>
      </g>
      <circle className="leo-regulus" cx="220" cy="117" r="5.8" fill="none" stroke="#e9d296" strokeWidth=".8"/>
      {identified && <g>
        <path className="leo-sweep" d="M-64 0H0v170h-64z" fill="url(#leo-light)"/>
        <g className="leo-note">
          <path d="M220 124v7l-8 7h-46" fill="none" stroke="#c3aa75" strokeWidth=".7"/>
          <text x="149" y="151" fill="#e7d9b1" fontSize="13">轩辕十四 · Regulus</text>
        </g>
      </g>}
      <text x="19" y="151" fill="#e7d9b1" fontSize="16">狮子座</text>
      <text x="74" y="151" fill="#cfb884" fontFamily="Georgia, serif" fontStyle="italic" fontSize="15">Leo</text>
    </svg>
  </button>;
}
