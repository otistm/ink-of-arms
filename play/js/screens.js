/* =====================================================================
   Every screen except the siege: home, siege intro, relic card, codex,
   walls breached, siege failed, trophy won, and the armory.
   ===================================================================== */
"use strict";
function renderTitle() {
  const invs = $('invs');
  invs.innerHTML = '';
  E.INVITATIONALS.forEach((inv, i) => {
    const locked = i > 0 && !save.trophies[i - 1];
    // only the next locked campaign is shown; the ones after it stay a surprise
    if (i > 1 && !save.trophies[i - 2]) return;
    const won = save.trophies[i];
    const b = document.createElement('button');
    b.className = 'event' + (locked ? ' locked' : '');
    b.style.animationDelay = (i * 0.08) + 's';
    const kicker = `March on ${inv.ruler}`;
    const line = locked ? `Win ${E.INVITATIONALS[i - 1].name} to march on ${inv.ruler}.`
      : won ? inv.end
      : `Take ${inv.castles[0]}, ${inv.castles[1]} and ${inv.castles[2]}, then bring down ${inv.foe}.`;
    b.innerHTML = `<div class="tw-wrap">${locked ? LOCK : TROPHY(won)}<small>${locked ? 'Locked' : won ? 'Won' : 'Trophy'}</small></div><div class="ev"><i>${kicker}</i><b>${inv.name}</b><span>${line}</span></div>`;
    b.onclick = () => { if (locked) { b.classList.remove('nope'); void b.offsetWidth; b.classList.add('nope'); return; } startRun(i); };
    invs.appendChild(b);
  });
  show('title');
}
$('howBtn').onclick = () => sheet(`<h2>How to play</h2><p>Draw cards. Take castles. Get trophies.</p>
  <div class="how"><p>Your cards are soldiers from four houses, ranked by title from Peasant (I) to King (XIII). Pick up to five and attack.</p>
  <p>Attacks work like poker hands. Two of a title is a Duel, five of one house is a Banner, five titles in a row is a Chain of Command.</p>
  <p>Every attack deals chips × mult. Breach the walls before you run out of attacks.</p>
  <p>Each house has an ability. Archers volley together, Mages multiply, Clerics give back a discard, and Knights you hold back add mult.</p>
  <p>Between sieges, buy relics and tactics in the armory.</p>
  <p>Each campaign is a war on a ruler. Take three castles, beat the lords who hold them, then face the ruler in the last citadel. Lords and rulers change the rules.</p></div>
  <button class="btn" onclick="document.getElementById('veil').classList.remove('on')">Got it</button>`);

function startRun(inv) {
  st = E.newRun(inv, (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  showIntro();
}

// ---------- intro ----------
function showIntro() {
  const info = E.tableInfo(st);
  const pips = $('pips'); pips.innerHTML = '';
  for (let i = 1; i <= 9; i++) {
    const p = document.createElement('i');
    if (i < info.number) p.className = 'done'; else if (i === info.number) p.className = 'now';
    if (i % 3 === 0) p.classList.add('cit');
    if (i === 9) { p.classList.add('crown'); p.innerHTML = CROWN; }
    pips.appendChild(p);
    if (i % 3 === 0 && i < 9) { const g = document.createElement('i'); g.className = 'gap'; pips.appendChild(g); }
  }
  $('introWhere').textContent = `${E.INVITATIONALS[st.inv].name}, siege ${info.number} of 9`;
  $('introStory').textContent = storyLine(info);
  $('introKind').textContent = info.boss ? info.boss.name : info.castle;
  $('introPlace').textContent = info.boss ? `${info.castle}, the citadel` : info.kind;
  $('introTarget').textContent = fmt(info.target);
  $('introBoss').textContent = info.boss ? info.boss.desc : '';
  $('introBoss').classList.toggle('hidden', !info.boss);
  $('introReward').textContent = `Take it for $${info.reward}, plus $1 for each attack you don't use.`;
  show('intro');
  const p = $('introPanel'); p.style.animation = 'none'; void p.offsetHeight; p.style.animation = '';
}
$('sitBtn').onclick = () => {
  E.startTable(st);
  sel.clear();
  sizeCards();
  show('game');
  renderGame(true);
};


// The line of story that opens each siege.
function storyLine(info) {
  const inv = E.INVITATIONALS[st.inv];
  if (info.tIdx === 0) return inv.story[info.ante];
  if (info.tIdx === 1) return `${info.castle}'s outpost has fallen. The keep still stands.`;
  if (info.boss.ruler) return `No lords left to hide behind. ${inv.ruler} will defend ${info.castle} in person.`;
  return `${info.boss.name} holds ${info.castle} for ${inv.foe}.`;
}
const capital = s => s[0].toUpperCase() + s.slice(1);

// ---------- relic card and codex ----------
function jokerSheet(j, allowSell) {
  const d = E.JOKER[j.id];
  const i = st.jokers.indexOf(j);
  sheet(`<div class="relicHead"><div class="sid">${jIcon(j.id)}</div><div><div class="sub">${['', 'Common', 'Uncommon', 'Rare'][d.rarity]} relic</div><h2>${d.name}</h2></div></div>
    <div class="how" style="font-size:15px;font-weight:700">${d.desc}.${d.live ? ' ' + d.live(j) + '.' : ''}</div>
    <p style="font-size:13px;text-align:left;margin-top:0">Relics fire from left to right, so put ×mult relics last.</p>
    <div class="twobtn"><button class="btn ghost" id="jl" ${i <= 0 ? 'disabled' : ''}>Move left</button><button class="btn ghost" id="jr" ${i >= st.jokers.length - 1 ? 'disabled' : ''}>Move right</button></div>
    ${allowSell ? `<button class="btn ghost" id="js" style="margin-top:8px">Sell for $${E.sellValue(j)}</button>` : ''}
    <button class="btn" id="jc" style="margin-top:8px">Done</button>`);
  const refresh = () => { if ($('shop').classList.contains('on')) renderShop(); else renderGame(); };
  $('jl').onclick = () => { E.moveJoker(st, j.uid, -1); refresh(); jokerSheet(j, allowSell); };
  $('jr').onclick = () => { E.moveJoker(st, j.uid, 1); refresh(); jokerSheet(j, allowSell); };
  if (allowSell) $('js').onclick = () => { E.sell(st, j.uid); closeSheet(); refresh(); };
  $('jc').onclick = closeSheet;
}

$('handsBtn').onclick = () => handsSheet();
function handsSheet() {
  sheet(`<h2>Codex</h2><p>The four houses, and your attacks.</p>
    <h3>Houses</h3><div class="board">` +
    ['S', 'C', 'D', 'H'].map(k => { const h = E.HOUSE[k]; return `<div class="row" style="grid-template-columns:24px 1fr"><span class="ic">${suitSvg(k, '')}</span><span class="nm">${h.name}, ${h.ability.toLowerCase()}<small>${h.text}.</small></span></div>`; }).join('') +
    `</div><h3>Attacks</h3><div class="board">` +
    E.HANDS.slice().reverse().map(h => { const lv = st.levels[h.key], b = E.handBase(h.key, lv);
      return `<div class="row"><span class="nm">${h.name}<small>Level ${lv}</small></span><b>${b.chips} × ${b.mult}</b></div>`; }).join('') +
    `</div><button class="btn" onclick="document.getElementById('veil').classList.remove('on')">Close</button>`);
}
const HOUSE_WORD = { C: 'volley', D: 'arcane', H: 'blessing' };


// ---------- cashout / end ----------
function cashoutSheet() {
  const t = st.table;
  const fell = !t.boss ? `${t.castle}'s ${t.kind.slice(4)} has fallen.`
    : t.boss.ruler ? `${t.boss.name} is beaten. ${t.castle} is yours.`
    : `${t.boss.name} yields. ${t.castle} is yours.`;
  const scored = t.score, target = t.target;
  const c = E.cashout(st);
  sheet(`<h2>Walls breached</h2><p>${fell}</p>
    <div class="big">${fmt(scored)}</div><p style="margin-top:0">damage against walls of ${fmt(target)}</p>
    <div class="board">` +
    c.lines.map((l, i) => `<div class="row" style="animation-delay:${0.25 + i * 0.08}s"><span class="nm">${l.label}</span><b>$${l.amount}</b></div>`).join('') +
    `<div class="row me" style="animation-delay:${0.25 + c.lines.length * 0.08}s"><span class="nm">Total</span><b>$${c.total}</b></div></div>
    <button class="btn" id="collect">Collect $${c.total}</button>`, false);
  $('collect').onclick = () => {
    closeSheet();
    const next = E.advance(st);
    if (next === 'won') return wonSheet();
    E.openShop(st);
    renderShop();
    show('shop');
  };
}
function lostSheet() {
  const t = st.table;
  const inv = st.inv;
  const held = t.boss ? `${t.boss.name} holds ${t.castle}.` : `${t.castle}'s ${t.kind.slice(4)} holds.`;
  sheet(`<h2>The siege failed</h2><p>${held} Out of attacks at siege ${t.number}.</p>
    <div class="big">${fmt(t.score)}</div><p style="margin-top:0">of the ${fmt(t.target)} needed to breach</p>
    <div class="board">
      <div class="row"><span class="nm">Sieges won</span><b>${st.stats.tablesCleared}</b></div>
      <div class="row" style="animation-delay:.08s"><span class="nm">Best attack${st.stats.bestHand ? `<small>${st.stats.bestHand}</small>` : ''}</span><b>${st.stats.bestHand ? fmt(st.stats.best) : '0'}</b></div>
    </div>
    <button class="btn" id="again">Try again</button><button class="btn ghost" id="home">Back to start</button>`, false);
  $('home').onclick = () => { closeSheet(); renderTitle(); };
  $('again').onclick = () => { closeSheet(); startRun(inv); };
}
function wonSheet() {
  save.trophies[st.inv] = true; writeSave(save);
  const inv = E.INVITATIONALS[st.inv];
  sheet(`<h2>Trophy won</h2><p>${inv.end}</p>
    <div class="award"><div class="troph" id="troph">${TROPHY(true)}</div><p>${capital(inv.foe)} has fallen</p></div>
    <div class="board">
      <div class="row"><span class="nm">Best attack<small>${st.stats.bestHand}</small></span><b>${fmt(st.stats.best)}</b></div>
      <div class="row" style="animation-delay:.08s"><span class="nm">Attacks made</span><b>${st.stats.handsPlayed}</b></div>
    </div>
    <button class="btn" id="home">Back to start</button>`, false);
  $('home').onclick = () => { closeSheet(); renderTitle(); };
}


// ---------- shop ----------
function renderShop(flashIdx) {
  $('shopMoney').textContent = '$' + st.money;
  renderJokers($('shopJokers'), j => jokerSheet(j, true));
  const shelf = $('shelf'); shelf.innerHTML = '';
  st.shop.items.forEach((it, i) => {
    const row = document.createElement('div');
    const full = it.kind === 'joker' && st.jokers.length >= st.maxJokers;
    const can = !it.sold && !full && st.money >= it.cost;
    row.className = 'srow' + (it.sold ? ' sold' : '') + (flashIdx === i ? ' flash' : '');
    if (flashIdx == null) row.style.animationDelay = (i * 0.06) + 's';
    let icon, kicker, name, text;
    if (it.kind === 'joker') {
      const d = E.JOKER[it.id];
      icon = jIcon(it.id); kicker = `${['', 'Common', 'Uncommon', 'Rare'][d.rarity]} relic`; name = d.name; text = d.desc;
    } else {
      const h = E.HAND[it.key], lv = st.levels[it.key];
      icon = `<svg viewBox="0 0 48 48" ${S}>${STUDY_ICON}</svg>`; kicker = 'Tactic'; name = h.name; text = `Level ${lv} to ${lv + 1}: +${h.lc} chips and +${h.lm} mult`;
    }
    const label = it.sold ? (it.kind === 'joker' ? 'Bought' : 'Drilled') : full ? 'Full' : '$' + it.cost;
    const sub = it.sold ? '' : full ? 'sell one' : 'buy';
    row.innerHTML = `<div class="sid">${icon}</div><div class="sinfo"><i>${kicker}</i><b>${name}</b><small>${text}</small></div>
      <button class="sbuy" aria-disabled="${!can}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
    const btn = row.querySelector('.sbuy');
    btn.onclick = () => {
      if (it.sold) return;
      if (E.buy(st, i)) {
        renderShop(i);
        squash($('shopMoney'));
        const slots = $('shopJokers').querySelectorAll('.joker');
        if (it.kind === 'joker') anim(slots[slots.length - 1], [{ transform: 'translateY(-40px) scale(.6)', opacity: 0 }, { transform: 'translateY(4px) scale(1.1,.9)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], 420);
      } else {
        btn.classList.remove('nope'); void btn.offsetWidth; btn.classList.add('nope');
      }
    };
    shelf.appendChild(row);
  });
  $('rerollBtn').innerHTML = `Restock<small>$${st.shop.reroll}</small>`;
  $('rerollBtn').disabled = st.money < st.shop.reroll;
}
$('rerollBtn').onclick = () => { if (E.reroll(st)) { renderShop(); squash($('shopMoney')); } };
$('nextBtn').onclick = () => showIntro();

