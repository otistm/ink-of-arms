/* =====================================================================
   The rules. No drawing here, so it can be tested on its own (node tools/check.js).
   Houses, titles, attacks (poker hands), relics, lords (bosses), rulers, campaigns, scoring, the armory.
   Never rename a relic id: they will be saved in players' runs once runs are saved.
   ===================================================================== */
"use strict";
const Engine = (() => {
  const SUITS = ['S', 'H', 'C', 'D'];
  const RED = { H: 1, D: 1 };
  const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 };
  // Houses: S Knights, C Archers, D Mages, H Clerics. Ranks 2..14 are titles I..XIII.
  const HOUSE = {
    S: { name: 'Knights', one: 'Knight', ability: 'Stalwart', text: 'Each Knight you hold back in your hand gives +2 mult when you attack' },
    C: { name: 'Archers', one: 'Archer', ability: 'Volley', text: 'When scored, gives +6 chips for each other Archer in the attack' },
    D: { name: 'Mages', one: 'Mage', ability: 'Arcane', text: 'When scored, gives ×1.2 mult' },
    H: { name: 'Clerics', one: 'Cleric', ability: 'Blessing', text: 'When scored, restores one discard, once per attack' },
  };
  const TITLES = ['', '', 'Peasant', 'Page', 'Squire', 'Yeoman', 'Sergeant', 'Captain', 'Marshal', 'Baron', 'Earl', 'Duke', 'Prince', 'Queen', 'King'];
  const ROMAN = ['', '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII'];
  const rankLabel = r => ROMAN[r];
  const titleOf = r => TITLES[r];
  const cardChips = r => (r === 14 ? 11 : r >= 11 ? 10 : r);
  const isFace = c => c.r >= 12;

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // A random stream that counts its draws, so a saved run can pick up exactly where it left off.
  function seeded(seed, n = 0) {
    const g = mulberry(seed);
    for (let i = 0; i < n; i++) g();
    const r = () => { r.n++; return g(); };
    r.n = n;
    return r;
  }
  function shuffle(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function makeDeck() {
    const d = []; let id = 0;
    for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ id: id++, s, r });
    return d;
  }

  const HANDS = [
    { key: 'hc', name: 'Lone Rider', c: 5, m: 1, lc: 10, lm: 1 },
    { key: 'pair', name: 'Duel', c: 10, m: 2, lc: 15, lm: 1 },
    { key: '2pair', name: 'Double Duel', c: 20, m: 2, lc: 20, lm: 1 },
    { key: 'three', name: 'Council', c: 30, m: 3, lc: 20, lm: 2 },
    { key: 'straight', name: 'Chain of Command', c: 30, m: 4, lc: 30, lm: 3 },
    { key: 'flush', name: 'Banner', c: 35, m: 4, lc: 15, lm: 2 },
    { key: 'full', name: 'Garrison', c: 40, m: 4, lc: 25, lm: 2 },
    { key: 'four', name: 'Warband', c: 60, m: 7, lc: 30, lm: 3 },
    { key: 'sf', name: 'Crusade', c: 100, m: 8, lc: 40, lm: 4 },
  ];
  const HAND = Object.fromEntries(HANDS.map(h => [h.key, h]));
  const handBase = (key, lv) => {
    const h = HAND[key];
    return { chips: h.c + h.lc * (lv - 1), mult: h.m + h.lm * (lv - 1) };
  };

  function evaluate(cards) {
    if (!cards.length) return null;
    const byRank = {};
    cards.forEach(c => (byRank[c.r] = byRank[c.r] || []).push(c));
    const groups = Object.values(byRank).sort((a, b) => b.length - a.length || b[0].r - a[0].r);
    let flush = false, straight = false;
    if (cards.length === 5) {
      flush = cards.every(c => c.s === cards[0].s);
      const rs = [...new Set(cards.map(c => c.r))].sort((a, b) => a - b);
      if (rs.length === 5 && rs[4] - rs[0] === 4) straight = true;
    }
    const g0 = groups[0].length, g1 = groups[1] ? groups[1].length : 0;
    let key, scoring;
    if (straight && flush) { key = 'sf'; scoring = cards; }
    else if (g0 === 4) { key = 'four'; scoring = groups[0]; }
    else if (g0 === 3 && g1 === 2) { key = 'full'; scoring = cards; }
    else if (flush) { key = 'flush'; scoring = cards; }
    else if (straight) { key = 'straight'; scoring = cards; }
    else if (g0 === 3) { key = 'three'; scoring = groups[0]; }
    else if (g0 === 2 && g1 === 2) { key = '2pair'; scoring = [...groups[0], ...groups[1]]; }
    else if (g0 === 2) { key = 'pair'; scoring = groups[0]; }
    else { key = 'hc'; scoring = [cards.reduce((a, b) => (b.r > a.r ? b : a))]; }
    const set = new Set(scoring);
    return {
      key, scoring: cards.filter(c => set.has(c)),
      has: { pair: g0 >= 2, twopair: g0 >= 2 && g1 >= 2, three: g0 >= 3, four: g0 >= 4, straight, flush },
    };
  }

  // ---------- Jokers ----------
  const JOKERS = [
    { id: 'whetstone', name: 'Whetstone', rarity: 1, cost: 4, desc: '+4 mult', onHand: () => ({ mult: 4 }) },
    { id: 'holyseal', name: 'Holy Seal', rarity: 1, cost: 5, desc: 'Scored Clerics and Mages give +3 mult', onCard: c => (RED[c.s] ? { mult: 3 } : null) },
    { id: 'ironco', name: 'Iron Company', rarity: 1, cost: 5, desc: 'Scored Knights and Archers give +25 chips', onCard: c => (!RED[c.s] ? { chips: 25 } : null) },
    { id: 'glove', name: 'Dueling Glove', rarity: 1, cost: 4, desc: '+8 mult if the attack contains a Duel', onHand: x => (x.ev.has.pair ? { mult: 8 } : null) },
    { id: 'horn', name: 'War Horn', rarity: 1, cost: 5, desc: '+12 mult if the attack is a Chain of Command', onHand: x => (x.ev.has.straight ? { mult: 12 } : null) },
    { id: 'arms', name: 'Coat of Arms', rarity: 1, cost: 5, desc: 'Scored royals give +30 chips', onCard: c => (isFace(c) ? { chips: 30 } : null) },
    { id: 'drum', name: 'Drum', rarity: 1, cost: 4, desc: 'Scored cards with even titles, II to XII, give +4 mult', onCard: c => ((c.r - 1) % 2 === 0 ? { mult: 4 } : null) },
    { id: 'fife', name: 'Fife', rarity: 1, cost: 4, desc: 'Scored cards with odd titles, I to XIII, give +25 chips', onCard: c => ((c.r - 1) % 2 === 1 ? { chips: 25 } : null) },
    { id: 'reserves', name: 'Reserves', rarity: 1, cost: 4, desc: '+20 chips for each discard you have left', onHand: x => (x.discards > 0 ? { chips: 20 * x.discards } : null) },
    { id: 'jewel', name: 'Crown Jewel', rarity: 1, cost: 5, desc: 'Scored Kings give +20 chips and +4 mult', onCard: c => (c.r === 14 ? { chips: 20, mult: 4 } : null) },
    { id: 'skirmisher', name: 'Skirmisher', rarity: 1, cost: 4, desc: '+20 mult if you attack with 3 or fewer cards', onHand: x => (x.played.length <= 3 ? { mult: 20 } : null) },
    { id: 'tithe', name: 'Tithe Box', rarity: 1, cost: 5, desc: 'Earn $3 after each siege you win', endTable: () => 3 },
    { id: 'bearer', name: 'Standard Bearer', rarity: 1, cost: 5, desc: 'Knights held in hand give +4 mult instead of +2' },
    { id: 'longbow', name: 'Longbow', rarity: 1, cost: 5, desc: 'Archer volleys give +12 chips per Archer instead of +6' },
    { id: 'roundtable', name: 'Round Table', rarity: 2, cost: 7, desc: '×3 mult if the attack contains a Council', onHand: x => (x.ev.has.three ? { xmult: 3 } : null) },
    { id: 'heraldry', name: 'Heraldry', rarity: 2, cost: 6, desc: '×2 mult if the attack is a Banner', onHand: x => (x.ev.has.flush ? { xmult: 2 } : null) },
    { id: 'laststand', name: 'Last Stand', rarity: 2, cost: 6, desc: '×3 mult on your final attack of a siege', onHand: x => (x.isLast ? { xmult: 3 } : null) },
    { id: 'treasury', name: 'Treasury', rarity: 2, cost: 6, desc: '+1 mult for every $3 you hold', onHand: x => (x.money >= 3 ? { mult: Math.floor(x.money / 3) } : null) },
    { id: 'veteran', name: 'Veteran', rarity: 2, cost: 6, desc: 'Gains +1 mult every attack you make', live: j => `Now +${j.n || 0} mult`, onHand: (x, j) => { j.n = (j.n || 0) + 1; return { mult: j.n }; } },
    { id: 'throne', name: 'Throne', rarity: 2, cost: 7, desc: 'Scored Queens and Kings give ×1.5 mult', onCard: c => (c.r === 13 || c.r === 14 ? { xmult: 1.5 } : null) },
    { id: 'blotter', name: 'Blotter', rarity: 2, cost: 5, desc: 'Blotted cards give +8 mult instead of nothing', onBlot: () => ({ mult: 8 }) },
    { id: 'grimoire', name: 'Grimoire', rarity: 2, cost: 7, desc: 'Arcane gives ×1.4 mult instead of ×1.2' },
    { id: 'reliquary', name: 'Reliquary', rarity: 2, cost: 6, desc: 'Every scored Cleric restores a discard, not just the first' },
    { id: 'emptyhall', name: 'Empty Hall', rarity: 3, cost: 8, desc: '×1 mult for each empty relic slot, plus this one', onHand: x => ({ xmult: 1 + x.emptySlots }) },
    { id: 'royalseal', name: 'Royal Seal', rarity: 3, cost: 8, desc: '×2 mult if all five cards in the attack score', onHand: x => (x.ev.scoring.length === 5 ? { xmult: 2 } : null) },
  ];
  const JOKER = Object.fromEntries(JOKERS.map(j => [j.id, j]));

  // ---------- Bosses ----------
  const BOSSES = [
    { id: 'heretic', name: 'The Heretic', desc: 'Every Cleric is blotted and scores nothing.', blot: c => c.s === 'H' },
    { id: 'downpour', name: 'The Downpour', desc: 'Wet bowstrings. Every Archer is blotted.', blot: c => c.s === 'C' },
    { id: 'hexer', name: 'The Hexer', desc: 'Every Mage is blotted and scores nothing.', blot: c => c.s === 'D' },
    { id: 'rust', name: 'The Rust Lord', desc: 'Every Knight is blotted, even held back.', blot: c => c.s === 'S' },
    { id: 'usurper', name: 'The Usurper', desc: 'Princes, Queens and Kings are blotted.', blot: isFace },
    { id: 'duelist', name: 'The Duelist', desc: 'You get one attack. The walls are half as strong.', hands: 1, targetMul: 0.5 },
    { id: 'drill', name: 'The Drillmaster', desc: 'Every attack must be exactly five cards.', mustFive: true },
    { id: 'plague', name: 'The Plague', desc: 'You hold one fewer card.', handSize: -1 },
    { id: 'warden', name: 'The Warden', desc: 'No discards, and Clerics cannot restore any.', discards: 0, noBless: true },
  ];

  // ---------- Rulers: the final siege of each campaign ----------
  // Wall sizes (targetMul) are tuned so the bot falls at each ruler a little more often than at the old random lord.
  const RULERS = [
    { id: 'baron', name: 'Baron Vorn', ruler: true, mend: 0.1, targetMul: 1.3,
      desc: "His masons mend the walls. They grow 10% stronger after every attack that doesn't bring them down." },
    { id: 'duke', name: 'Duke Morcant', ruler: true, oneEach: true, targetMul: 1.4,
      desc: 'He has read your tactics. Each kind of attack works only once in this siege. Only a Lone Rider can ride again.' },
    { id: 'queen', name: 'Queen Maelis', ruler: true, court: true, targetMul: 1,
      desc: 'She closes her court to you. After each attack, the house you used most is blotted for the rest of the siege.' },
    { id: 'king', name: 'King Aldous', ruler: true, guard: true, targetMul: 1.1,
      desc: 'His guard strikes down your best soldier. The highest title in every attack is blotted.' },
  ];

  // Each campaign is a war against one ruler. The third castle is the ruler's own seat.
  // Campaigns are kept in players' saves by position. The Queen was added as III in 0.4.0, which moved the King to IV;
  // ui.js converts older saves. Add new campaigns at the end from now on.
  const INVITATIONALS = [
    { name: 'Campaign I', mul: 1.3, ruler: 'Baron Vorn', foe: 'the Baron', land: 'the borderlands',
      castles: ['Thornwick', 'Ashford', 'Vorn Hall'],
      story: ['Baron Vorn has seized the borderlands. Your march begins at Thornwick.',
        'Thornwick is free. The road runs on to Ashford.',
        'Only Vorn Hall is left, and the Baron waits inside.'],
      end: 'The Baron kneels. The borderlands are free.' },
    { name: 'Campaign II', mul: 2.1, ruler: 'Duke Morcant', foe: 'the Duke', land: 'the marsh country',
      castles: ['Greymoor', 'Blackwater', 'Morcant Keep'],
      story: ['Duke Morcant rules the marsh country from behind three walls. The first is Greymoor.',
        "Greymoor is yours. Blackwater's towers rise out of the fog.",
        'The Duke has fallen back to Morcant Keep. End it there.'],
      end: 'The Duke hands over his seal. The marshes are yours.' },
    { name: 'Campaign III', mul: 2.7, ruler: 'Queen Maelis', foe: 'the Queen', land: 'the river kingdom',
      castles: ['Rosewater', 'Saltmere', 'Glasswater'],
      story: ['Queen Maelis rules the river kingdom, and her spies are everywhere. The march begins at Rosewater.',
        'Rosewater is taken. Saltmere guards the mouth of the river.',
        'Glasswater, where the Queen holds court behind walls of glass. Her doors are closed to you.'],
      end: 'Queen Maelis gives up her court. The river kingdom is yours.' },
    { name: 'Campaign IV', mul: 3.3, ruler: 'King Aldous', foe: 'the King', land: 'the realm',
      castles: ['Stonegate', 'Ravenspire', 'Highcrown'],
      story: ['With the Queen fallen, King Aldous has called every banner in the realm. Stonegate guards the road to his capital.',
        'Stonegate has fallen. Ravenspire is the last fortress before the crown.',
        'Highcrown, seat of King Aldous. Take it and the realm is yours.'],
      end: 'King Aldous lays down his crown. The realm is yours.' },
  ];
  const ANTE_BASE = [300, 800, 2000];
  const TABLE_KIND = ['The outpost', 'The keep', 'The citadel'];
  const TABLE_MUL = [1, 1.5, 2];
  const TABLE_REWARD = [3, 4, 5];

  function niceRound(n) {
    const step = n >= 2000 ? 50 : 10;
    return Math.round(n / step) * step;
  }

  function newRun(inv, seed) {
    const rnd = seeded(seed);
    const levels = Object.fromEntries(HANDS.map(h => [h.key, 1]));
    const bosses = shuffle(BOSSES.slice(), rnd).slice(0, 3);
    return {
      inv, seed, rnd, ante: 0, tIdx: 0, money: 4, jokers: [], maxJokers: 5, levels,
      handsMax: 4, discardsMax: 3, handSize: 8, bosses, uid: 1, table: null, shop: null,
      stats: { handsPlayed: 0, best: 0, bestHand: null, tablesCleared: 0 }, over: false, won: false,
    };
  }

  function tableInfo(st) {
    const inv = INVITATIONALS[st.inv];
    const boss = st.tIdx !== 2 ? null : st.ante === 2 ? RULERS[st.inv] : st.bosses[st.ante];
    let target = ANTE_BASE[st.ante] * TABLE_MUL[st.tIdx] * INVITATIONALS[st.inv].mul;
    if (boss && boss.targetMul) target *= boss.targetMul;
    return {
      kind: TABLE_KIND[st.tIdx], boss, target: niceRound(target), reward: TABLE_REWARD[st.tIdx],
      castle: inv.castles[st.ante], tIdx: st.tIdx, ante: st.ante,
      number: st.ante * 3 + st.tIdx + 1,
    };
  }

  function startTable(st) {
    const info = tableInfo(st);
    const b = info.boss || {};
    st.table = {
      ...info, score: 0,
      hands: b.hands != null ? b.hands : st.handsMax,
      discards: b.discards != null ? b.discards : st.discardsMax,
      handSize: st.handSize + (b.handSize || 0),
      draw: shuffle(makeDeck(), st.rnd), hand: [], used: [], closed: [],
    };
    drawUp(st);
    return st.table;
  }

  function drawUp(st) {
    const t = st.table;
    const drawn = [];
    while (t.hand.length < t.handSize && t.draw.length) { const c = t.draw.pop(); t.hand.push(c); drawn.push(c); }
    return drawn;
  }

  function isBlotted(st, c) {
    const t = st.table, b = t && t.boss;
    if (b && b.court && t.closed && t.closed.includes(c.s)) return true;
    return !!(b && b.blot && b.blot(c));
  }

  // King Aldous's guard: the highest title in the attack. Ties go by house order, so the pick never depends on card order.
  function guarded(st, played) {
    const b = st.table && st.table.boss;
    if (!b || !b.guard || !played.length) return null;
    return played.reduce((a, c) => (c.r > a.r || (c.r === a.r && SUIT_ORDER[c.s] < SUIT_ORDER[a.s]) ? c : a));
  }
  // Duke Morcant: an attack kind already used this siege. A Lone Rider is always allowed, so a hand can never get stuck.
  function spent(st, cards) {
    const t = st.table;
    if (!t || !t.boss || !t.boss.oneEach || !cards.length) return false;
    const key = evaluate(cards).key;
    return key !== 'hc' && t.used.includes(key);
  }

  function canPlay(st, ids) {
    const t = st.table;
    if (!t || t.hands <= 0 || !ids.length || ids.length > 5) return false;
    if (t.boss && t.boss.mustFive && ids.length !== 5) return false;
    if (spent(st, ids.map(id => t.hand.find(c => c.id === id)).filter(Boolean))) return false;
    return true;
  }

  function scoreHand(st, played) {
    const t = st.table;
    const ev = evaluate(played);
    const lv = st.levels[ev.key];
    let { chips, mult } = handBase(ev.key, lv);
    const steps = [{ t: 'base', key: ev.key, name: HAND[ev.key].name, lv, chips, mult }];
    const x = {
      ev, played, isLast: t.hands === 1, discards: t.discards, money: st.money,
      emptySlots: st.maxJokers - st.jokers.length,
    };
    const has = id => st.jokers.some(j => j.id === id);
    let blessed = 0;
    const guard = guarded(st, played);
    const apply = (e, base) => {
      if (e.chips) chips += e.chips;
      if (e.mult) mult += e.mult;
      if (e.xmult) mult *= e.xmult;
      mult = Math.round(mult * 100) / 100;
      steps.push({ ...base, ...e, chipsNow: chips, multNow: mult });
    };
    for (const c of ev.scoring) {
      if (isBlotted(st, c) || c === guard) {
        steps.push({ t: 'blot', card: c.id, chipsNow: chips, multNow: mult });
        for (const j of st.jokers) {
          const d = JOKER[j.id];
          if (d.onBlot) apply(d.onBlot(c, x, j), { t: 'joker', joker: j.uid, card: c.id });
        }
        continue;
      }
      apply({ chips: cardChips(c.r) }, { t: 'card', card: c.id });
      if (c.s === 'C') {
        const others = played.filter(o => o !== c && o.s === 'C').length;
        if (others) apply({ chips: others * (has('longbow') ? 12 : 6) }, { t: 'house', card: c.id, house: 'C' });
      } else if (c.s === 'D') {
        apply({ xmult: has('grimoire') ? 1.4 : 1.2 }, { t: 'house', card: c.id, house: 'D' });
      } else if (c.s === 'H' && !(t.boss && t.boss.noBless) && (blessed === 0 || has('reliquary'))) {
        blessed++;
        steps.push({ t: 'house', card: c.id, house: 'H', discard: 1, chipsNow: chips, multNow: mult });
      }
      for (const j of st.jokers) {
        const d = JOKER[j.id];
        if (d.onCard) { const e = d.onCard(c, x, j); if (e) apply(e, { t: 'joker', joker: j.uid, card: c.id }); }
      }
    }
    const held = t.hand.filter(c => c.s === 'S' && !played.includes(c) && !isBlotted(st, c));
    for (const c of held) apply({ mult: has('bearer') ? 4 : 2 }, { t: 'held', card: c.id });
    for (const j of st.jokers) {
      const d = JOKER[j.id];
      if (d.onHand) { const e = d.onHand(x, j); if (e) apply(e, { t: 'joker', joker: j.uid }); }
    }
    const total = Math.floor(chips * mult);
    return { ev, name: HAND[ev.key].name, chips, mult, total, steps, blessed };
  }

  function play(st, ids) {
    if (!canPlay(st, ids)) return null;
    const t = st.table;
    const played = ids.map(id => t.hand.find(c => c.id === id)).filter(Boolean);
    const res = scoreHand(st, played);
    t.hands -= 1;
    t.score += res.total;
    t.discards += res.blessed;
    t.hand = t.hand.filter(c => !ids.includes(c.id));
    st.stats.handsPlayed++;
    if (res.total > st.stats.best) { st.stats.best = res.total; st.stats.bestHand = res.name; }
    t.used.push(res.ev.key);
    res.cleared = t.score >= t.target;
    res.lost = !res.cleared && t.hands <= 0;
    if (!res.cleared && !res.lost && t.boss && t.boss.court) {
      // Queen Maelis closes her court to the house you used most (ties go by house order)
      const count = {};
      res.ev.scoring.forEach(c => { if (!t.closed.includes(c.s)) count[c.s] = (count[c.s] || 0) + 1; });
      const house = Object.keys(count).sort((a, b) => count[b] - count[a] || SUIT_ORDER[a] - SUIT_ORDER[b])[0];
      if (house) { t.closed.push(house); res.closed = house; }
    }
    if (!res.cleared && !res.lost && t.boss && t.boss.mend) {
      const was = t.target;
      t.target = niceRound(t.target * (1 + t.boss.mend));
      res.mended = t.target - was;
    }
    if (!res.cleared && !res.lost) res.drawn = drawUp(st);
    if (res.lost) { st.over = true; }
    return res;
  }

  function discard(st, ids) {
    const t = st.table;
    if (!t || t.discards <= 0 || !ids.length || ids.length > 5) return null;
    t.discards -= 1;
    t.hand = t.hand.filter(c => !ids.includes(c.id));
    return drawUp(st);
  }

  function cashout(st) {
    const t = st.table;
    const lines = [{ label: `Took ${t.kind.toLowerCase()}`, amount: t.reward }];
    if (t.hands > 0) lines.push({ label: `${t.hands} attack${t.hands > 1 ? 's' : ''} left over`, amount: t.hands });
    const interest = Math.min(5, Math.floor(st.money / 5));
    if (interest > 0) lines.push({ label: 'Interest, $1 per $5 held', amount: interest });
    for (const j of st.jokers) {
      const d = JOKER[j.id];
      if (d.endTable) lines.push({ label: d.name, amount: d.endTable(st, j) });
    }
    const total = lines.reduce((a, l) => a + l.amount, 0);
    st.money += total;
    st.stats.tablesCleared++;
    return { lines, total };
  }

  // advance after cashout; returns 'shop' or 'won'
  function advance(st) {
    st.tIdx++;
    if (st.tIdx > 2) { st.tIdx = 0; st.ante++; }
    if (st.ante > 2) { st.won = true; st.over = true; return 'won'; }
    return 'shop';
  }

  function rollJoker(st, exclude) {
    const owned = new Set([...st.jokers.map(j => j.id), ...exclude]);
    const r = st.rnd();
    const rarity = r < 0.7 ? 1 : r < 0.95 ? 2 : 3;
    let pool = JOKERS.filter(j => j.rarity === rarity && !owned.has(j.id));
    if (!pool.length) pool = JOKERS.filter(j => !owned.has(j.id));
    if (!pool.length) return null;
    return pool[Math.floor(st.rnd() * pool.length)].id;
  }
  function rollShopItems(st) {
    const jokers = [];
    for (let i = 0; i < 2; i++) { const id = rollJoker(st, jokers); if (id) jokers.push(id); }
    const keys = shuffle(HANDS.map(h => h.key), st.rnd).slice(0, 2);
    return [
      ...jokers.map(id => ({ kind: 'joker', id, cost: JOKER[id].cost, sold: false })),
      ...keys.map(key => ({ kind: 'study', key, cost: 3, sold: false })),
    ];
  }
  function openShop(st) {
    st.shop = { items: rollShopItems(st), reroll: 5 };
    return st.shop;
  }
  function reroll(st) {
    if (st.money < st.shop.reroll) return false;
    st.money -= st.shop.reroll;
    st.shop.reroll += 1;
    st.shop.items = rollShopItems(st);
    return true;
  }
  function buy(st, idx) {
    const it = st.shop.items[idx];
    if (!it || it.sold || st.money < it.cost) return false;
    if (it.kind === 'joker') {
      if (st.jokers.length >= st.maxJokers) return false;
      st.jokers.push({ id: it.id, uid: st.uid++, n: 0 });
    } else {
      st.levels[it.key]++;
    }
    st.money -= it.cost;
    it.sold = true;
    return true;
  }
  const sellValue = j => Math.max(1, Math.floor(JOKER[j.id].cost / 2));
  function sell(st, uid) {
    const i = st.jokers.findIndex(j => j.uid === uid);
    if (i < 0) return false;
    st.money += sellValue(st.jokers[i]);
    st.jokers.splice(i, 1);
    return true;
  }
  function moveJoker(st, uid, dir) {
    const i = st.jokers.findIndex(j => j.uid === uid);
    const k = i + dir;
    if (i < 0 || k < 0 || k >= st.jokers.length) return false;
    [st.jokers[i], st.jokers[k]] = [st.jokers[k], st.jokers[i]];
    return true;
  }

  // ---------- Saving a run in progress ----------
  // A plain copy of the run that fits in localStorage. Lords and rulers are stored by id.
  // If the shape changes, bump v and make restore() ignore or convert older snapshots.
  function snapshot(st) {
    const { rnd, bosses, table, ...rest } = st;
    return { v: 1, lay: 2, ...JSON.parse(JSON.stringify(rest)), rn: rnd.n, bosses: bosses.map(b => b.id),
      table: table && JSON.parse(JSON.stringify({ ...table, boss: table.boss ? table.boss.id : null })) };
  }
  function restore(s) {
    if (!s || s.v !== 1) return null;
    // runs saved before the Queen was added have no lay: their Campaign III was the King's, now IV
    if (!s.lay && s.inv === 2) s = { ...s, inv: 3 };
    if (!INVITATIONALS[s.inv]) return null;
    const byId = id => BOSSES.find(b => b.id === id) || RULERS.find(b => b.id === id);
    const { v, lay, rn, bosses, table, phase, at, ...rest } = s;
    const st = { ...rest, rnd: seeded(s.seed, rn), bosses: bosses.map(byId) };
    st.table = table && { ...table, boss: table.boss ? byId(table.boss) : null };
    if (st.bosses.some(b => !b) || (table && table.boss && !st.table.boss)) return null;
    if (st.jokers.some(j => !JOKER[j.id])) return null;
    return st;
  }

  return {
    SUITS, RED, SUIT_ORDER, HOUSE, titleOf, HANDS, HAND, JOKERS, JOKER, BOSSES, RULERS, INVITATIONALS,
    rankLabel, cardChips, isFace, handBase, evaluate, newRun, tableInfo, startTable,
    canPlay, guarded, spent, play, discard, cashout, advance, openShop, reroll, buy, sell, sellValue, moveJoker, isBlotted, mulberry, snapshot, restore,
  };
})();
if (typeof module !== 'undefined') module.exports = Engine; // lets tools/check.js load the rules in Node
