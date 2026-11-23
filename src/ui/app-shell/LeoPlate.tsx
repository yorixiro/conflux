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
        <pattern id="leo-paper" width="37" height="31" patternUnits="userSpaceOnUse">
          <path d="M3 7h.7m14 16h.6m9-12h1m8 17h.5m-24-14h.4" stroke="#c8b08a" strokeWidth=".65" opacity=".46"/>
        </pattern>
        <linearGradient id="leo-foil" x2=".85" y2="1">
          <stop stopColor="#ac936d"/><stop offset=".42" stopColor="#ead2a0"/><stop offset="1" stopColor="#ab9472"/>
        </linearGradient>
        <linearGradient id="leo-light">
          <stop stopColor="#e6d098" stopOpacity="0"/><stop offset=".96" stopColor="#e6d098" stopOpacity=".15"/>
          <stop offset="1" stopColor="#f6e7ba" stopOpacity=".46"/>
        </linearGradient>
      </defs>
      <path fill="#211e1b" d="M0 0h300v170H0z"/>
      <path fill="url(#leo-paper)" d="M0 0h300v170H0z"/>
      <g fill="none" stroke="url(#leo-foil)">
        <path d="M9 11h114m48 0h120v150H9V11" strokeWidth="1"/>
        <path d="M14 34h4m-4 24h2m-2 24h4m-4 24h2m-2 24h4m25 27v-3m30 3v-2m30 2v-3m30 3v-2m30 2v-3m30 3v-2m30 2v-3m30 3v-2"
          strokeWidth=".7" opacity=".7"/>
      </g>
      <text x="146" y="17" textAnchor="middle" fill="#dfc598" fontSize="15">
        <tspan fontFamily="Georgia, serif" fontStyle="italic">Leo</tspan>
      </text>
      <path d="M263 51 248 38 205 53 197 73 222 90 220 117 93 98 26 102 93 69 197 73M93 69v29"
        fill="none" stroke="#c6ab70" strokeWidth="1.05" strokeLinejoin="round"/>
      <g fill="#e8d297">{stars.map(([x,y,r])=><circle key={x+'-'+y} cx={x} cy={y} r={r}/>)}</g>
      <circle className="leo-regulus" cx="220" cy="117" r="5.8" fill="none" stroke="#e9d296" strokeWidth=".8"/>
      {identified && <g>
        <path className="leo-sweep" d="M-64 0H0v170h-64z" fill="url(#leo-light)"/>
        <g className="leo-note">
          <path d="M220 124v7l-8 7h-46" fill="none" stroke="#c3aa75" strokeWidth=".7"/>
          <text x="166" y="151" fill="#e7d9b1" fontSize="13">轩辕十四</text>
        </g>
      </g>}
      <path d="m220 110 1.5 5.5 5.5 1.5-5.5 1.5-1.5 5.5-1.5-5.5-5.5-1.5 5.5-1.5Z" fill="#e8cf9e"/>
    </svg>
  </button>;
}
