/* =====================================================================
   Ink drawings: the four house marks, the crown, relic icons, the trophy and ink blots.
   Everything is black ink on white paper. Knights and Archers are solid; Mages and Clerics are outlines.
   ===================================================================== */
"use strict";
const E = Engine;

const SUIT = {
  S: '<path d="M12 2.2 20.2 5.2v6.2c0 5.3-3.5 9-8.2 10.6-4.7-1.6-8.2-5.3-8.2-10.6V5.2z"/>',
  C: '<path d="M12 1.8 17.2 8.6h-3.4v8.2l3.4 3.6v1.8L12 19.6l-5.2 2.6v-1.8l3.4-3.6V8.6H6.8z"/>',
  D: '<path d="M12 1.8 14.3 9.7 22.2 12l-7.9 2.3L12 22.2l-2.3-7.9L1.8 12l7.9-2.3z"/>',
  H: '<path d="M5.5 2.5h13c0 5.4-2.7 8.8-5 9.7v4.6l3.8 3v1.7H6.7v-1.7l3.8-3v-4.6c-2.3-.9-5-4.3-5-9.7z"/>',
};
const CROWN = '<svg class="crown" viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 12 2 3l5 4 5-6 5 6 5-4-1 9z"/></svg>';
// Knights and Archers are drawn solid; Mages and Clerics are drawn in outline. No color, just ink.
const suitSvg = (s, cls) => E.RED[s]
  ? `<svg class="${cls}" viewBox="-1 -1 26 26" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round">${SUIT[s]}</svg>`
  : `<svg class="${cls}" viewBox="-1 -1 26 26" fill="#000">${SUIT[s]}</svg>`;

function blobPath(seed, cx, cy, r) {
  const rnd = E.mulberry(seed * 9973 + 17);
  const n = 11, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r * (0.72 + rnd() * 0.5);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  let d = `M${((pts[0][0] + pts[n - 1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[n - 1][1]) / 2).toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  let drops = '';
  for (let i = 0; i < 4; i++) {
    const a = rnd() * Math.PI * 2, dist = r * (1.25 + rnd() * 0.5);
    drops += `<circle cx="${(cx + Math.cos(a) * dist).toFixed(1)}" cy="${(cy + Math.sin(a) * dist).toFixed(1)}" r="${(1 + rnd() * r * 0.13).toFixed(1)}"/>`;
  }
  return `<path d="${d}Z"/>${drops}`;
}
const blotSvg = seed => `<svg class="blot" viewBox="0 0 40 40" fill="#000" opacity=".88">${blobPath(seed, 20, 20, 12)}</svg>`;

const S = 'fill="none" stroke="#000" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const JICON = {
  whetstone: '<path d="M8 34l22-22 6 6-22 22z"/><path d="M30 12l6-6M14 40l-6-6"/><path d="M26 34h14v6H26z" fill="#000"/>',
  holyseal: '<circle cx="24" cy="24" r="14" fill="#000"/><path d="M24 14v20M17 21h14" stroke="#fff" stroke-width="3"/>',
  ironco: '<path d="M11 24c0-9 6-15 13-15s13 6 13 15v14H11z" fill="#000"/><path d="M15 25h18" stroke="#fff" stroke-width="3"/><path d="M24 25v10" stroke="#fff" stroke-width="2.4"/>',
  glove: '<path d="M10 38 34 10M14 10l24 28"/><path d="M8 32l6 6M34 32l6 6"/>',
  horn: '<path d="M8 20c10 2 20-2 28-10l2 26c-8-6-18-8-28-6z"/><path d="M8 20v10"/>',
  arms: '<path d="M24 6 38 11v10c0 9-6 15-14 18-8-3-14-9-14-18V11z"/><path d="M24 6v33M10 20h28"/>',
  drum: '<ellipse cx="24" cy="16" rx="14" ry="5"/><path d="M10 16v16c0 3 6 6 14 6s14-3 14-6V16"/><path d="M10 20l28 12M38 20 10 32"/>',
  fife: '<path d="M8 36 38 10"/><circle cx="18" cy="27" r="1.6" fill="#000"/><circle cx="24" cy="22" r="1.6" fill="#000"/><circle cx="30" cy="17" r="1.6" fill="#000"/>',
  reserves: '<path d="M6 38 18 14l12 24zM24 38l10-18 8 18z"/><path d="M18 38v-8"/>',
  jewel: '<path d="M14 10h20l6 10-16 20L8 20z"/><path d="M8 20h32M20 10l-4 10 8 20 8-20-4-10"/>',
  skirmisher: '<path d="M12 36 34 14l4-6-6 4-22 22z"/><path d="M14 30l4 4M10 38l4-4"/>',
  tithe: '<rect x="9" y="18" width="30" height="20" rx="2"/><path d="M9 24h30M20 12h8v6h-8z"/><circle cx="24" cy="31" r="2.5" fill="#000"/>',
  bearer: '<path d="M14 42V6"/><path d="M14 8h22l-6 7 6 7H14z" fill="#000"/>',
  longbow: '<path d="M14 6c14 6 14 30 0 36"/><path d="M14 6v36"/><path d="M8 24h32M34 20l6 4-6 4"/>',
  roundtable: '<circle cx="24" cy="24" r="9"/><circle cx="24" cy="8" r="3"/><circle cx="38" cy="30" r="3"/><circle cx="10" cy="30" r="3"/>',
  heraldry: '<path d="M12 6h24v26l-12 10-12-10z"/><path d="M12 18h24" /><path d="M12 6h24v12H12z" fill="#000"/>',
  laststand: '<path d="M22 6h4v18l-2 4-2-4z"/><path d="M16 26h16M24 28v6"/><path d="M24 36l-3 6M26 38l4 4"/>',
  treasury: '<path d="M8 20h32v18H8z"/><path d="M8 20c0-8 32-8 32 0"/><path d="M22 26h4v6h-4z" fill="#000"/>',
  veteran: '<path d="M13 10v28M19 10v28M25 10v28M31 10v28M8 31l32-13"/>',
  throne: '<path d="M14 42V14l4-8 4 6 2-6 2 6 4-6 4 8v28"/><path d="M14 28h20M18 28v14M30 28v14"/>',
  blotter: `<g fill="#000" stroke="none">${blobPath(7, 24, 24, 11)}</g>`,
  grimoire: '<rect x="10" y="7" width="26" height="34" rx="2"/><path d="M14 7v34"/><path d="M26 16l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#000"/>',
  reliquary: '<path d="M14 8h20c0 9-4 14-8 15v8l6 5v4H16v-4l6-5v-8c-4-1-8-6-8-15z"/><path d="M24 11v8M20 15h8"/>',
  emptyhall: '<path d="M8 40V18L24 8l16 10v22" stroke-dasharray="5 4.5"/><path d="M19 40V28h10v12"/>',
  royalseal: '<path d="M6 32c6-14 10-18 12-12s-2 12 2 10 6-14 10-12-2 12 4 10 8-6 8-6"/><path d="M8 39h32"/>',
};
const STUDY_ICON = '<rect x="7" y="9" width="34" height="30" rx="2"/><path d="M13 30l7-8 6 5 9-11"/><path d="M31 16h4v4"/><circle cx="14" cy="16" r="2" fill="#000"/>';
const jIcon = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 48 48" ${S}>${JICON[id]}</svg>`;
// The trophy from Ink Nine and Ink Rally: solid once won, drawn in outline until then.
const TROPHY = (won) => `<svg viewBox="0 0 40 44" aria-hidden="true"><g stroke="#000" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M10 7H5c0 6 3 9 6.5 9.5M30 7h5c0 6-3 9-6.5 9.5" fill="none"/><path d="M10 4h20v9c0 7-4.5 11-10 11S10 20 10 13z" fill="${won ? '#000' : '#fff'}"/><path d="M17 24h6v6h-6z" fill="#fff"/><path d="M11 31h18v6H11z" fill="${won ? '#000' : '#fff'}"/></g></svg>`;
const LOCK = `<svg viewBox="0 0 48 48" style="width:34px;height:34px" ${S}><rect x="12" y="21" width="24" height="19" rx="3"/><path d="M17 21v-5a7 7 0 0 1 14 0v5"/></svg>`;

