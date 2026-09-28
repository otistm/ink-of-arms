# Ink of Arms: notes for Claude Code

Ink of Arms is a Balatro-like card game drawn like a paper-and-ink cartoon. It's a sister game to Ink Nine (`../ink-nine`) and Ink Rally (`../ink-rally`) and shares their look, fonts and way of working. The cards are soldiers from four medieval houses instead of numbers and suits.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts.
- `index.html`: the front page (a hand of ink cards fanning open behind a Play button).
- `play/index.html`: the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, during an animation) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/`: home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.
- `tools/check.js`: tests the rules without a browser. Run `node tools/check.js`.

| File | What's in it |
|---|---|
| config.js | `VERSION` |
| engine.js | The rules, with no drawing: houses and their abilities, titles, attacks (poker hands) and their levels, relics, lords, campaign targets, scoring, the armory. Exposed as `Engine` |
| art.js | Ink drawings as SVG: house marks, crown, relic icons, tactic icon, trophy, lock, ink blots |
| ui.js | The run in progress (`st`), picked cards (`sel`), the save, animation helpers (`anim`, `squash`, `floatText`), screens, overlay cards (`sheet`), card sizing |
| siege.js | The siege screen: the hand fan, picking, sorting, discarding, and the attack's step-by-step scoring animation |
| screens.js | Home, siege intro, relic card, codex, walls breached, siege failed, trophy won, the armory |
| main.js | Startup (always last) |

## How it plays
- A campaign is a war on one ruler (Baron Vorn, Duke Morcant, King Aldous): nine sieges at three named castles, each an outpost, a keep and a citadel. The first two citadels have a random lord who changes the rules; the third castle is the ruler's seat and siege 9 is the ruler, with a rule of their own (`RULERS` in engine.js). A line of story opens every siege. Take all nine for the campaign's trophy; winning a campaign unlocks the next. The home screen shows only the next locked campaign, so III stays hidden until II is won.
- Each siege: a hand of 8, up to 5 cards per attack, 4 attacks and 3 discards. Damage is chips × mult; beat the wall's strength before the attacks run out.
- Cards: four houses (Knights solid shield, Archers solid arrow, Mages outline star, Clerics outline chalice) and thirteen titles, I Peasant to XIII King. Princes, Queens and Kings are royals and wear a crown.
- Attacks are poker hands with new names: Lone Rider, Duel, Double Duel, Council, Chain of Command (five titles in a row, no wrap-around), Banner (five of one house), Garrison, Warband, Crusade.
- House abilities: Archers volley (+6 chips per other Archer in the attack), Mages arcane (×1.2 mult each), Clerics bless (restore a discard, once per attack), Knights stalwart (+2 mult for each Knight held back in hand, not played).
- Lords blot cards (blotted cards score nothing and trigger nothing), or change attacks, discards or hand size. Rulers: the Baron mends his walls 10% after each attack that doesn't breach, the Duke allows each attack kind once (Lone Rider is always allowed, so a hand can't get stuck), the King's guard blots the highest title in each attack.
- The armory sells relics (up to 5, they fire left to right) and tactics (level up an attack). Money: siege reward, $1 per unused attack, interest of $1 per $5 held (max $5).
- Balance check: `node tools/check.js` has a simple bot play 60 runs of each campaign. Current win rates are roughly 58% / 25% / 5%. Ruler walls are tuned so the bot falls at siege 9 a little more often than it did against a random lord. A strategic human should do better. Re-run it after changing numbers and tell Otis how the rates moved.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Run `node tools/check.js` if you touched the rules.
4. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a phone size (390 × 844). Also check a tall, wide screen (a foldable, about 640 × 860): the hand of cards must never touch the buttons.

## Protect players' saved progress
Progress is kept in the browser's localStorage under `inkofarms-save`: `{ trophies: [bool, bool, bool] }`.
- Never rename that key or remove a field. Add new fields with defaults.
- Never rename a relic `id`, house key or attack `key`; future saves may store them.

## Look and feel (same as Ink Nine and Ink Rally; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey `#5c5c5c` only for secondary text. Never color. Things are told apart by ink: solid versus outline, filled versus hollow, dashed for locked or sold.
- Chips are a white outlined pill, mult is a solid black pill. Mult bonuses float up in a black pill; chip bonuses float up as plain numbers.
- Outlines are clean 2–2.5px black lines with hard offset shadows (7px 8px on panels, 4px 5px on event cards, 3px 4px on cards, relics and pills). No blur, no gradients.
- Fonts: Fraunces (display, italic 900 for titles and names, upright 800/900 for numbers) and Figtree (UI, 600–800).
- Shared components copied from Ink Nine and Ink Rally: `.panel`, `.btn` and `.btn.ghost`, `.event`, `.board`, `.srow` and `.sbuy`, `.wallet`, `.how`, `.tw`, `.award` and the trophy.
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out. Use the shared keyframes (`bump`, `cardIn`, `pickIn`, `rowIn`, `trophyIn`, `nope`).
- Mobile first, portrait, one thumb. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon.

## Smoke test
- The front page shows the fanning cards and a Play button; Play opens the home screen with Campaign I open and II and III locked (dashed).
- Campaign I shows the siege intro: the nine progress dots (square citadels, a crown for the ruler), a line of story, "Thornwick", "The outpost" and the wall strength. Lay siege deals eight cards with a bounce.
- Tapping cards lifts them and shows the attack name, level and chips × mult. Attack plays them out: each scoring card hops with its chips, house abilities and relics call out their bonuses, the total lands and the score counts up.
- Discard throws the picked cards away and deals new ones.
- Winning a siege shows "Walls breached" with the payout board; Collect opens the armory. Buying a relic adds it to the row; tapping a relic lets you move or sell it.
- A citadel shows its lord's rule in a dashed box, and blotted cards show an ink blot.
- Losing shows "The siege failed" with Try again. Taking all nine sieges shows the trophy, and it's still on the home screen after a refresh.
- No errors in the browser console.
