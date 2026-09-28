/* =====================================================================
   Shared state and helpers: the run in progress, the save, animation helpers,
   floating numbers, screens and overlay cards, and card sizing.
   ===================================================================== */
"use strict";
const $ = id => document.getElementById(id);
const RM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let st = null, sel = new Set(), busy = false, sortMode = 'rank', speed = 1;

// ---------- save ----------
// Saved progress. Never rename this key or remove a field, or players lose their trophies.
const SAVE_KEY = 'inkofarms-save';
function loadSave() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { return {}; } }
function writeSave(s) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {} }
let save = loadSave(); save.trophies = save.trophies || [false, false, false, false];
// 0.4.0 added the Queen as Campaign III and moved the King to IV. Older saves had three trophies,
// the third being the King's: keep it as the King's, and leave the Queen's unwon (it unlocks from the Duke's).
if (!save.lay) { const t = save.trophies; save.trophies = [!!t[0], !!t[1], false, !!t[2]]; save.lay = 2; writeSave(save); }
while (save.trophies.length < 4) save.trophies.push(false);

const sleep = ms => new Promise(r => setTimeout(r, RM ? Math.min(ms, 40) : ms * speed));
const fmt = n => Math.floor(n).toLocaleString('en-US');
const fmtM = n => (Math.round(n * 100) / 100).toLocaleString('en-US');
function anim(el, frames, dur, ease = 'cubic-bezier(.3,1.5,.5,1)') {
  if (!el || !el.animate) return Promise.resolve();
  const a = el.animate(frames, { duration: RM ? 1 : dur * speed, easing: ease });
  return a.finished.catch(() => {});
}
// Same bump as Ink Nine's score counter: squash, stretch, settle.
const squash = el => anim(el, [
  { transform: 'scale(1)' }, { transform: 'scale(1.3,.78)', offset: .3 }, { transform: 'scale(.9,1.14)', offset: .55 }, { transform: 'scale(1.04,.97)', offset: .78 }, { transform: 'scale(1)' }], 400, 'ease-out');
function floatText(host, text, isMult) {
  const f = document.createElement('div');
  f.className = 'float' + (isMult ? ' m' : '');
  f.textContent = text;
  host.appendChild(f);
  anim(f, [
    { transform: 'translate(-50%,6px) scale(.6)', opacity: 0 },
    { transform: 'translate(-50%,-14px) scale(1.15)', opacity: 1, offset: .35 },
    { transform: 'translate(-50%,-22px) scale(1)', opacity: 1, offset: .75 },
    { transform: 'translate(-50%,-30px) scale(1)', opacity: 0 }], 820, 'ease-out').then(() => f.remove());
}
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === id));
}
function sheet(html, dismissable = true) {
  const p = $('sheet');
  p.innerHTML = html;
  $('veil').classList.add('on');
  p.style.animation = 'none'; void p.offsetHeight; p.style.animation = '';
  $('veil').onclick = e => { if (dismissable && e.target === $('veil')) closeSheet(); };
}
const closeSheet = () => $('veil').classList.remove('on');

function sizeCards() {
  const avail = Math.min(innerWidth, 480) - 28;
  const n = Math.max(8, st && st.table ? st.table.handSize : 8);
  const cw = Math.min(78, Math.floor(avail / 5.3));
  const overlap = Math.max(0, (n * cw - avail) / (2 * n) + 1);
  document.documentElement.style.setProperty('--cw', cw + 'px');
  document.documentElement.style.setProperty('--overlap', overlap + 'px');
}
addEventListener('resize', sizeCards);

