/* =====================================================================
   The siege screen: the hand of cards, picking cards, discarding, and the attack,
   which plays out the scoring one step at a time.
   ===================================================================== */
"use strict";
function sortedHand() {
  const h = st.table.hand.slice();
  if (sortMode === 'rank') h.sort((a, b) => b.r - a.r || E.SUIT_ORDER[a.s] - E.SUIT_ORDER[b.s]);
  else h.sort((a, b) => E.SUIT_ORDER[a.s] - E.SUIT_ORDER[b.s] || b.r - a.r);
  return h;
}
function cardEl(c) {
  const d = document.createElement('div');
  d.className = 'card';
  d.dataset.id = c.id;
  const royal = E.isFace(c);
  d.innerHTML = `<div class="rk">${E.rankLabel(c.r)}</div>` + suitSvg(c.s, 'mini') +
    (royal ? CROWN : '') + suitSvg(c.s, 'big' + (royal ? ' royal' : '')) +
    `<div class="ttl">${E.titleOf(c.r)}</div>` +
    (E.isBlotted(st, c) ? blotSvg(c.id + 3) : '');
  d.setAttribute('aria-label', `${E.titleOf(c.r)} of the ${E.HOUSE[c.s].name}, title ${E.rankLabel(c.r)}`);
  return d;
}
function jokerEl(j, onTap) {
  const d = E.JOKER[j.id];
  const b = document.createElement('button');
  b.className = 'joker';
  b.dataset.uid = j.uid;
  b.innerHTML = jIcon(j.id) + `<span class="jn">${d.name}</span>` + (d.rarity > 1 ? `<span class="rar">${'<i></i>'.repeat(d.rarity - 1)}</span>` : '');
  b.onclick = () => onTap(j);
  return b;
}
function renderJokers(host, onTap) {
  host.innerHTML = '';
  st.jokers.forEach(j => host.appendChild(jokerEl(j, onTap)));
  for (let i = st.jokers.length; i < st.maxJokers; i++) { const s = document.createElement('div'); s.className = 'jslot'; host.appendChild(s); }
}
function renderHud() {
  const t = st.table;
  $('where').textContent = `${E.INVITATIONALS[st.inv].name}, siege ${t.number} of 9`;
  $('kind').textContent = t.boss ? t.boss.name : t.kind;
  $('kind').classList.toggle('boss', !!t.boss);
  $('scoreNeed').classList.add('sub');
  $('bossNote').textContent = t.boss ? t.boss.desc : '';
  $('bossNote').classList.toggle('hidden', !t.boss);
  $('scoreNow').textContent = fmt(t.score);
  $('scoreNeed').textContent = `of ${fmt(t.target)} to breach`;
  $('barFill').style.width = Math.min(100, (t.score / t.target) * 100) + '%';
  $('money').textContent = '$' + st.money;
  $('deckCount').textContent = `${t.draw.length} in deck`;
  $('handsLeft').textContent = `${t.hands} left`;
  $('discardsLeft').textContent = `${t.discards} left`;
  $('sortMode').textContent = sortMode;
}
function renderButtons() {
  const t = st.table, ids = [...sel];
  $('playBtn').disabled = busy || !E.canPlay(st, ids);
  $('discardBtn').disabled = busy || t.discards <= 0 || !ids.length;
  $('sortBtn').disabled = busy;
}
function renderPreview() {
  const cards = st.table.hand.filter(c => sel.has(c.id));
  if (!cards.length) {
    $('hname').innerHTML = st.table.boss && st.table.boss.mustFive ? '<span class="note">The Drillmaster wants exactly five cards</span>' : '<span class="note">Pick up to five cards</span>';
    $('chips').textContent = '0'; $('mult').textContent = '0';
    return;
  }
  const ev = E.evaluate(cards), lv = st.levels[ev.key], b = E.handBase(ev.key, lv);
  $('hname').innerHTML = `${E.HAND[ev.key].name}<span class="tw">lvl ${lv}</span>`;
  $('chips').textContent = fmt(b.chips); $('mult').textContent = fmtM(b.mult);
}
function layoutFan() {
  const host = $('hand');
  const cards = [...host.children];
  const n = cards.length;
  // reserve room under the fan for the arc drop and the tilt of the outer cards, so cards never touch the buttons
  const cw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cw')) || 60;
  const kMax = Math.max(0, (Math.max(n, 1) - 1) / 2);
  const tilt = (kMax * 2.6) * Math.PI / 180;
  const drop = kMax * kMax * 1.3 + (cw / 2) * Math.sin(tilt) + (cw * 1.4 / 2) * (1 - Math.cos(tilt)) + 6;
  host.style.paddingBottom = Math.ceil(drop) + 'px';
  host.style.height = Math.ceil(cw * 1.4 + 30 + drop) + 'px';
  cards.forEach((el, i) => {
    const k = i - (n - 1) / 2;
    el.style.transform = sel.has(+el.dataset.id) ? 'translateY(-22px)' : `translateY(${Math.abs(k) * Math.abs(k) * 1.3}px) rotate(${k * 2.6}deg)`;
    el.style.zIndex = i;
    el.classList.toggle('picked', sel.has(+el.dataset.id));
  });
}
function renderHand(dealIds) {
  const host = $('hand');
  host.innerHTML = '';
  sortedHand().forEach(c => {
    const el = cardEl(c);
    el.onclick = () => toggle(c.id, el);
    host.appendChild(el);
  });
  layoutFan();
  if (dealIds) {
    [...host.children].forEach((el, i) => {
      if (!dealIds.has(+el.dataset.id)) return;
      const base = el.style.transform;
      el.style.opacity = 0;
      setTimeout(() => {
        el.style.opacity = '';
        anim(el, [
          { transform: `translate(${120 - i * 10}px,70px) rotate(18deg) scale(.7)`, opacity: 0 },
          { transform: base.replace('translateY(', 'translateY(-10px) translateY('), opacity: 1, offset: .7 },
          { transform: base, opacity: 1 }], 380);
      }, (RM ? 0 : i * 45));
    });
  }
}
function renderGame(dealAll) {
  renderHud();
  renderJokers($('jokers'), j => { if (!busy) jokerSheet(j, true); });
  renderHand(dealAll ? new Set(st.table.hand.map(c => c.id)) : null);
  renderPreview();
  renderButtons();
}
function toggle(id, el) {
  if (busy) return;
  if (sel.has(id)) { sel.delete(id); }
  else {
    if (sel.size >= 5) { anim(el, [{ transform: el.style.transform }, { transform: el.style.transform + ' translateX(-4px)' }, { transform: el.style.transform + ' translateX(4px)' }, { transform: el.style.transform }], 220, 'linear'); return; }
    sel.add(id);
  }
  layoutFan();
  squash(el.querySelector('.rk'));
  renderPreview(); renderButtons();
}
$('sortBtn').onclick = () => { sortMode = sortMode === 'rank' ? 'suit' : 'rank'; renderHud(); renderHand(); };
async function flyOut(els, dir) {
  await Promise.all(els.map((el, i) => {
    const base = getComputedStyle(el).transform;
    return anim(el, [
      { transform: base, opacity: 1 },
      { transform: `${base === 'none' ? '' : base} translateY(10px) scale(.96,1.04)`, opacity: 1, offset: .25 },
      { transform: dir === 'up' ? 'translateY(-160px) rotate(-8deg) scale(.8)' : 'translate(260px,-40px) rotate(24deg) scale(.8)', opacity: 0 }],
      360 + i * 30, 'cubic-bezier(.5,0,.8,.4)');
  }));
  els.forEach(el => el.remove());
  if (els[0] && !els[0].closest('#played')) layoutFan();
}

$('discardBtn').onclick = async () => {
  if (busy || !sel.size) return;
  busy = true; renderButtons();
  const ids = [...sel];
  const els = [...$('hand').children].filter(el => sel.has(+el.dataset.id));
  await flyOut(els, 'right');
  const drawn = E.discard(st, ids);
  sel.clear(); busy = false;
  renderHud(); renderHand(new Set(drawn.map(c => c.id))); renderPreview(); renderButtons();
};

$('stage').onclick = () => { if (busy) speed = 0.3; };

$('playBtn').onclick = async () => {
  const ids = [...sel];
  if (busy || !E.canPlay(st, ids)) return;
  busy = true; speed = 1; renderButtons();
  // keep the played cards in the order they sit in the hand
  const order = sortedHand().map(c => c.id).filter(id => sel.has(id));
  const playedCards = order.map(id => st.table.hand.find(c => c.id === id));
  const els = [...$('hand').children].filter(el => sel.has(+el.dataset.id));
  await flyOut(els, 'up');
  // stage
  const stage = $('played'); stage.innerHTML = '';
  const stageEls = {};
  playedCards.forEach((c, i) => {
    const el = cardEl(c); stageEls[c.id] = el; stage.appendChild(el);
    anim(el, [{ transform: 'translateY(120px) scale(.8) rotate(6deg)', opacity: 0 }, { transform: 'translateY(-8px) scale(1.04)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], 380 + i * 40);
  });
  const res = E.play(st, order);
  sel.clear();
  await sleep(420);
  const scoringIds = new Set(res.ev.scoring.map(c => c.id));
  Object.entries(stageEls).forEach(([id, el]) => { if (!scoringIds.has(+id)) el.style.opacity = .4; });

  for (const s of res.steps) {
    if (s.t === 'base') {
      $('hname').innerHTML = `${s.name}<span class="tw">lvl ${s.lv}</span>`;
      $('chips').textContent = fmt(s.chips); $('mult').textContent = fmtM(s.mult);
      squash($('hname')); squash($('chips')); squash($('mult'));
      await sleep(420);
    } else if (s.t === 'card') {
      const el = stageEls[s.card];
      anim(el, [{ transform: 'none' }, { transform: 'translateY(-16px) rotate(-5deg) scale(1.06,.96)', offset: .4 }, { transform: 'none' }], 300);
      floatText(el, '+' + s.chips, false);
      $('chips').textContent = fmt(s.chipsNow); squash($('chips'));
      await sleep(300);
    } else if (s.t === 'blot') {
      const el = stageEls[s.card];
      anim(el, [{ transform: 'none' }, { transform: 'translateX(-5px) rotate(-3deg)' }, { transform: 'translateX(5px) rotate(3deg)' }, { transform: 'none' }], 300, 'linear');
      floatText(el, 'blotted', true);
      await sleep(320);
    } else if (s.t === 'house') {
      const el = stageEls[s.card];
      anim(el, [{ transform: 'none' }, { transform: 'scale(1.12,.9)', offset: .3 }, { transform: 'scale(.95,1.08)', offset: .6 }, { transform: 'none' }], 320);
      const txt = s.house === 'C' ? `volley +${s.chips}` : s.house === 'D' ? `arcane ×${s.xmult}` : '+1 discard';
      floatText(el, txt, s.house !== 'C');
      if (s.house === 'H') { $('discardsLeft').textContent = `${st.table.discards} left`; squash($('discardBtn')); }
      $('chips').textContent = fmt(s.chipsNow); $('mult').textContent = fmtM(s.multNow);
      squash(s.house === 'C' ? $('chips') : $('mult'));
      await sleep(340);
    } else if (s.t === 'held') {
      const el = $('hand').querySelector(`[data-id="${s.card}"]`);
      if (el) { const base = el.style.transform; anim(el, [{ transform: base }, { transform: base + ' translateY(-18px) scale(1.08,.94)', offset: .4 }, { transform: base }], 320); floatText(el, `stalwart +${s.mult}`, true); }
      $('mult').textContent = fmtM(s.multNow); squash($('mult'));
      await sleep(320);
    } else if (s.t === 'joker') {
      const jel = $('jokers').querySelector(`[data-uid="${s.joker}"]`);
      if (jel) { anim(jel, [{ transform: 'none' }, { transform: 'rotate(-8deg) scale(1.12)' }, { transform: 'rotate(6deg) scale(1.05)' }, { transform: 'none' }], 360); }
      const parts = [];
      if (s.chips) parts.push(`+${s.chips} chips`);
      if (s.mult) parts.push(`+${fmtM(s.mult)} mult`);
      if (s.xmult) parts.push(`×${s.xmult} mult`);
      floatText(jel || stageEls[s.card], parts.join(' '), !s.chips);
      $('chips').textContent = fmt(s.chipsNow); $('mult').textContent = fmtM(s.multNow);
      if (s.chips) squash($('chips'));
      if (s.mult || s.xmult) squash($('mult'));
      await sleep(360);
    }
  }
  // total
  $('hname').innerHTML = `<span style="font-style:normal;font-size:34px">${fmt(res.total)}</span>`;
  squash($('hname'));
  await sleep(380);
  const from = st.table.score - res.total, to = st.table.score;
  splat($('scoreNow'));
  await countUp($('scoreNow'), from, to, 600);
  renderHud();
  await sleep(300);
  // sweep stage
  await Promise.all([...stage.children].map((el, i) => anim(el, [{ transform: 'none', opacity: +el.style.opacity || 1 }, { transform: `translate(${220 + i * 20}px,-20px) rotate(20deg)`, opacity: 0 }], 360, 'cubic-bezier(.5,0,.8,.4)')));
  stage.innerHTML = '';
  $('hname').innerHTML = ''; $('chips').textContent = '0'; $('mult').textContent = '0';
  speed = 1;

  if (res.cleared) { busy = false; return cashoutSheet(); }
  if (res.lost) { busy = false; return lostSheet(); }
  busy = false;
  renderHud(); renderHand(new Set(res.drawn.map(c => c.id))); renderPreview(); renderButtons();
};

async function countUp(el, from, to, dur) {
  if (RM) { el.textContent = fmt(to); return; }
  const t0 = performance.now(); dur *= speed;
  return new Promise(res => {
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(tick); else { squash(el); res(); }
    };
    requestAnimationFrame(tick);
  });
}
function splat(anchor) {
  if (RM) return;
  const r = anchor.getBoundingClientRect();
  const size = 150;
  const d = document.createElement('div');
  d.className = 'splat';
  d.style.cssText = `position:fixed;left:${r.right - r.width / 2 - size / 2}px;top:${r.top + r.height / 2 - size / 2}px;width:${size}px;height:${size}px;z-index:-1`;
  d.innerHTML = `<svg viewBox="0 0 60 60" fill="#000" width="${size}" height="${size}">${blobPath(Math.floor(Math.random() * 1000), 30, 30, 13)}</svg>`;
  document.body.appendChild(d);
  anim(d, [{ transform: 'scale(.1) rotate(-20deg)', opacity: .5 }, { transform: 'scale(1.1) rotate(4deg)', opacity: .12, offset: .25 }, { transform: 'scale(1) rotate(0)', opacity: .08, offset: .6 }, { transform: 'scale(1)', opacity: 0 }], 1400, 'ease-out').then(() => d.remove());
}

