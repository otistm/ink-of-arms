// Checks the rules without a browser: hand names, scoring, house abilities, and a bot playing 180 campaigns.
// Run it from the repo folder with: node tools/check.js
const E = require('../play/js/engine.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const C = (r, s) => ({ id: Math.random(), r, s });
const ev = cs => E.evaluate(cs).key;
ok(ev([C(14,'S')]) === 'hc', 'hc');
ok(ev([C(5,'S'),C(5,'H')]) === 'pair', 'pair');
ok(ev([C(5,'S'),C(5,'H'),C(9,'S'),C(9,'D'),C(2,'C')]) === '2pair', '2pair');
ok(ev([C(5,'S'),C(5,'H'),C(5,'D')]) === 'three', 'three');
ok(ev([C(14,'S'),C(2,'H'),C(3,'D'),C(4,'S'),C(5,'C')]) !== 'straight', 'no wheel');
ok(ev([C(10,'S'),C(11,'H'),C(12,'D'),C(13,'S'),C(14,'C')]) === 'straight', 'broadway');
ok(ev([C(2,'S'),C(7,'S'),C(9,'S'),C(11,'S'),C(4,'S')]) === 'flush', 'flush');
ok(ev([C(5,'S'),C(5,'H'),C(5,'D'),C(9,'S'),C(9,'D')]) === 'full', 'full');
ok(ev([C(5,'S'),C(5,'H'),C(5,'D'),C(5,'C'),C(9,'D')]) === 'four', 'four');
ok(ev([C(5,'S'),C(6,'S'),C(7,'S'),C(8,'S'),C(9,'S')]) === 'sf', 'sf');
ok(E.evaluate([C(5,'S'),C(5,'H'),C(9,'D')]).scoring.length === 2, 'pair scoring 2');

// scoring check: pair of kings with Inkwell
let st = E.newRun(0, 1); E.startTable(st);
st.table.hand = [{id:100,r:13,s:'S'},{id:101,r:13,s:'H'},{id:102,r:2,s:'C'}];
st.jokers.push({id:'whetstone',uid:9,n:0});
let r = E.play(st, [100,101,102]);
ok(r.chips === 10+10+10 && r.mult === 6 && r.total === 180, 'pair K + whetstone = 30x6 got '+r.chips+'x'+r.mult);

// boss blot
st = E.newRun(0, 2); st.tIdx = 2; st.bosses[0] = E.BOSSES[0]; E.startTable(st);
st.table.hand = [{id:1,r:14,s:'H'},{id:2,r:14,s:'S'}];
r = E.play(st, [1,2]);
ok(r.chips === 10 + 11 + 0, 'blot heart ace scores nothing: '+r.chips);

// autoplay bot
function combos(arr, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < arr.length; i++) { cur.push(arr[i]); combos(arr, k, i + 1, cur, out); cur.pop(); }
  return out;
}
function best(st) {
  let bestSet = null, bestV = -1;
  const sizes = st.table.boss && st.table.boss.mustFive ? [5] : [1,2,3,4,5];
  for (const k of sizes) for (const set of combos(st.table.hand, k)) {
    if (E.spent(st, set)) continue;
    const e = E.evaluate(set); const b = E.handBase(e.key, st.levels[e.key]);
    const g = E.guarded(st, set);
    const ch = b.chips + e.scoring.filter(c => !E.isBlotted(st, c) && c !== g).reduce((a, c) => a + E.cardChips(c.r), 0);
    const v = ch * b.mult;
    if (v > bestV) { bestV = v; bestSet = set; }
  }
  return { set: bestSet, v: bestV };
}
let wins = [0,0,0], runs = 60, deepest = [];
for (const inv of [0,1,2]) for (let s = 1; s <= runs; s++) {
  const st = E.newRun(inv, s * 7919);
  let guard = 0;
  while (!st.over && guard++ < 500) {
    E.startTable(st);
    while (true) {
      const b = best(st);
      // discard if weak and discards left
      if (b.v < 150 && st.table.discards > 0 && st.table.hands > 1) {
        const keep = new Set(b.set.map(c => c.id));
        const d = st.table.hand.filter(c => !keep.has(c.id)).sort((a, c) => a.r - c.r).slice(0, 5).map(c => c.id);
        if (d.length) { E.discard(st, d); continue; }
      }
      const res = E.play(st, b.set.map(c => c.id));
      if (!res) throw new Error('play null');
      if (!isFinite(res.total)) throw new Error('nan');
      if (res.cleared || res.lost) break;
    }
    if (st.over) break;
    E.cashout(st);
    if (E.advance(st) === 'won') break;
    E.openShop(st);
    for (let i = 0; i < 4; i++) { const it = st.shop.items[i]; if (it.kind === 'joker') E.buy(st, i); }
    for (let i = 0; i < 4; i++) E.buy(st, i);
  }
  if (st.won) wins[inv]++;
  deepest.push(st.stats.tablesCleared);
}
console.log('bot wins per campaign out of', runs, wins, 'avg sieges taken', (deepest.reduce((a,b)=>a+b,0)/deepest.length).toFixed(1));
console.log(fails ? fails + ' failures' : 'all assertions pass');
{
const st = E.newRun(0, 5); E.startTable(st);
st.table.hand = [{id:1,r:5,s:'C'},{id:2,r:5,s:'C'},{id:3,r:9,s:'S'},{id:4,r:10,s:'S'}];
let r = E.play(st, [1,2]); // duel of archers: 10 + 5+6 + 5+6 = 32 chips, mult 2 + 2 held knights*2 = 6
ok(r.chips === 32 && r.mult === 6, 'volley+stalwart ' + r.chips + 'x' + r.mult);
const st2 = E.newRun(0, 6); E.startTable(st2);
st2.table.hand = [{id:1,r:7,s:'D'},{id:2,r:7,s:'H'}]; const d0 = st2.table.discards;
r = E.play(st2, [1,2]);
ok(Math.abs(r.mult - 2.4) < 1e-9 && st2.table.discards === d0 + 1, 'arcane+bless ' + r.mult + ' ' + st2.table.discards);
console.log(fails ? fails + ' failures' : 'house assertions pass');
}
{
// rulers face you at siege 9 of each campaign
const at9 = inv => { const st = E.newRun(inv, 3); st.ante = 2; st.tIdx = 2; E.startTable(st); return st; };
let st = at9(0);
ok(st.table.boss.id === 'baron' && st.table.castle === 'Vorn Hall', 'baron at vorn hall');
st.table.hand = [{id:1,r:2,s:'S'},{id:2,r:3,s:'H'}]; const w0 = st.table.target;
let r = E.play(st, [1]);
ok(r.mended > 0 && st.table.target === w0 + r.mended, 'baron mends walls ' + w0 + ' -> ' + st.table.target);
st = at9(1);
st.table.hand = [{id:1,r:5,s:'S'},{id:2,r:5,s:'H'},{id:3,r:9,s:'S'},{id:4,r:9,s:'H'},{id:5,r:2,s:'C'}];
E.play(st, [1,2]);
ok(!E.canPlay(st, [3,4]) && E.canPlay(st, [5]), 'duke: one duel per siege');
st = at9(2);
st.table.hand = [{id:1,r:14,s:'S'},{id:2,r:14,s:'H'}];
r = E.play(st, [1,2]);
ok(r.chips === 10 + 0 + 11 && r.steps.some(x => x.t === 'blot' && x.card === 1), 'king guard blots the highest card, Knights first on a tie: ' + r.chips);
st = E.newRun(0, 4); st.tIdx = 2; E.startTable(st);
ok(!st.table.boss.ruler, 'first citadel has a lord, not a ruler');
console.log(fails ? fails + ' failures' : 'ruler assertions pass');
}
