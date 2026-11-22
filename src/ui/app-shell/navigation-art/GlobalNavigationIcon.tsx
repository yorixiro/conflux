// Tabler by Paweł Kuna and Pixelarticons by Gerrit Halfmann. MIT notices alongside this file.
const poet = {
  chat: <><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="m21 14l-3-3h-7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1zm-7 1v2a1 1 0 0 1-1 1H6l-3 3V11a1 1 0 0 1 1-1h2"/></>,
  group: <><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1M15 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m2 5h2a2 2 0 0 1 2 2v1M5 5a2 2 0 1 0 4 0a2 2 0 0 0-4 0m-2 8v-1a2 2 0 0 1 2-2h2"/></>,
  home: <><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M3 21h18M3 10h18M5 6l7-3l7 3M4 10v11m16-11v11M8 14v3m4-3v3m4-3v3"/></>,
  archive: <><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"><path d="M19 4v16H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M19 16H7a2 2 0 0 0-2 2M9 8h6"/></g></>,
  workshop: <><g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6"><path d="m4 20l10-10m0-5v5h5m-9-1v5h5m-9-1v5h5m-5-5l4-4l4-4"/><path d="M19 10c.638-.636 1-1.515 1-2.486A3.515 3.515 0 0 0 16.483 4c-.97 0-1.847.367-2.483 1m-3 13l4-4l4-4"/></g></>,
  settings: <><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M12 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 6h8m4 0h4M6 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0m-2 0h2m4 0h10m-5 6a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 18h11m4 0h1"/></>,
};

const cosmos = {
  chat: <><path fill="currentColor" d="M20 2H4v2h16zm0 14H6v2h14zm2-12h-2v12h2zM4 4H2v18h2zm2 14H4v2h2z"/></>,
  group: <><path fill="currentColor" d="M5 2h6v2H5zm10 0h4v2h-4zM5 10h6v2H5zm10 0h4v2h-4zm4-6h2v6h-2zm-8 0h2v6h-2zM3 4h2v6H3zM0 18h2v4H0zm14 0h2v4h-2zm8 0h2v4h-2zM4 14h8v2H4zm12 0h4v2h-4zM2 16h2v2H2zm10 0h2v2h-2zm8 0h2v2h-2z"/></>,
  home: <><path fill="currentColor" d="M4 20h16v2H4zm16-10h2v10h-2zM2 10h2v10H2zm2-2h2v2H4zm2-2h2v2H6zm2-2h2v2H8zm2-2h4v2h-4zm4 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zM8 14h2v6H8zm2-2h4v2h-4zm4 2h2v6h-2z"/></>,
  archive: <><path fill="currentColor" d="M19 2h2v2h-2zm2 14V4h2v12zm0 0v2h-2v-2zM1 4h2v12H1zm2 12h2v2H3zM3 4h2V2H3zm2 2h2v8H5zm2 8h2v2H7zm0-8h2V4H7zm10 0h2v8h-2zm0 0h-2V4h2zm0 8v2h-2v-2zm-6-7h4v6h-2v9h-2v-9H9V7zm0 4h2V9h-2z"/></>,
  workshop: <><path fill="currentColor" d="M4 2H2v8h2zm16 0h2v8h-2zm-6 6h-4V2H4v2h4v4H4v2h4v4H4v2h4v4H4v2h6v-6h4v6h2v-6h4v-2h-4v-4h4V8h-4V2h-2zm-4 6v-4h4v4zM20 2h-4v2h4zM2 14h2v8H2zm14 6h4v2h-4zm6-6h-2v8h2z"/></>,
  settings: <><path fill="currentColor" d="M8 14H7v6H5v-6H2v-2h6zm5 6h-2V10h2zm9-2h-3v2h-2v-2h-1v-2h6zm-3-4h-2V4h2zM7 10H5V4h2zm6-4h2v2H9V6h2V4h2z"/></>,
};

export function GlobalNavigationIcon({ section }: { section: keyof typeof poet }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <g className="global-poet-art">{poet[section]}</g>
      <g className="global-cosmos-art" shapeRendering="crispEdges">{cosmos[section]}</g>
    </svg>
  );
}
