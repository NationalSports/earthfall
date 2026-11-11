# Earthfall: Frontline — handoff

Working title for the shooter that goes with Earthfall. This file is the starting brief for a **new repository**. It is written so a fresh Claude session and ChatGPT can both pick it up cold.

Owner: Steve (beginner coder; wants short, plain-language updates).
Code: Claude. Art: ChatGPT. Steve merges pull requests himself.

---

## 1. What it is

A first- or third-person **tower-defense shooter**. You stand on the ground in one of Earthfall's cities while the swarm invades it. You place defenses, then fight alongside them with a real gun.

It is the "battle you can play" that the strategy game has been missing. Earthfall decides *where* the war is fought; Frontline is *how one battle feels*.

One sentence for the pitch: **hold the city, wave by wave, with turrets you placed and a weapon your research unlocked.**

## 2. How it connects to Earthfall

Earthfall stays a turn-based strategy game on a world map. Frontline is launched from it and reports back.

**Launch points in Earthfall**

| Earthfall moment | Frontline mode |
|---|---|
| A declared attack lands on your stronghold | **Defense**: hold for N waves |
| You attack an enemy territory | **Assault**: push to the hive and destroy it (later milestone) |
| An orbital drop hits your rear | **Drop defense**: enemies arrive from the sky, no front line |

**The contract between the two games**

Earthfall hands Frontline a small setup object and gets a small result back. Earthfall's existing optional lane battle already works this way, so the plumbing exists.

```js
// Earthfall -> Frontline
{
  city: "london",            // which arena to load
  mode: "defense",           // defense | assault | drop
  attackers: 9,              // swarm strength -> wave budget
  defenders: 5,              // your troops -> allied soldiers on the field
  armor: 1,                  // your tanks -> allied vehicles
  fort: 2, battery: 1, radar: 1,   // built in the base -> free starting defenses
  research: ["railgun", "exo"],    // unlocked upgrades -> weapons and gear
  leader: { rank: "warlord", trait: "butcher" } // boss wave, if one is attacking
}

// Frontline -> Earthfall
{ won: true, defendersLeft: 3, armorLeft: 1, attackersKilled: 9 }
```

Every battle must also be skippable ("Auto-resolve"), because a strategy turn can contain several fights.

Until the link is built, Frontline runs standalone with a menu that lets you pick a city and a setup.

## 3. Core loop of one battle

1. **Prepare (about 45 seconds).** Walk the arena. Spend a build budget on turrets, walls and mines at marked build pads. What you built in Earthfall is already standing.
2. **Wave.** The swarm comes down fixed lanes toward the objective (the city core). Turrets fire on their own. You shoot, move between lanes, and repair.
3. **Between waves.** Scrap dropped by the swarm buys more defenses or ammo.
4. **End.** Core survives the last wave: you hold the city. Core destroyed: the city falls.

A battle should take **4 to 8 minutes**.

## 4. Design decisions already made by Steve

- It is a **real shooter**, not a top-down auto-battler.
- It is **tower defense / invasion**: defenses matter as much as aim.
- **Research is a big deal for weapons.** Earthfall's Lab is where new guns and turrets come from.
- It should feel **semi-open-world as you move between fronts**.
- **New repo**, separate from `NationalSports/earthfall`.
- **ChatGPT makes the graphics.**

## 5. Recommended answers to the open design questions

These are Claude's recommendations. Steve has not confirmed them.

**First or third person?** Start third-person, over the shoulder. It makes placing turrets and reading lanes much easier, it shows off ChatGPT's character art, and it plays better with a touch screen later. A first-person aim-down-sights view can be a toggle.

**"Semi open world."** Do not build one continuous world. Treat the Earthfall map as the open world: each of the 10 strongholds is its own hand-built arena (about 150 m across) with its own look, and you travel between fronts from the map. Inside an arena you roam freely across two or three lanes, side routes and high ground. That gives the feeling of moving between fronts at a fraction of the cost.

**Research to weapons.** Reuse Earthfall's existing Lab items so the two games share one tech tree:

| Earthfall research | In Frontline |
|---|---|
| (start) | Rifle, basic gun turret, barricade |
| Elite Training | Faster reload, sprint, second weapon slot |
| Exo Armor | More health, melee slam |
| Railgun Batteries | Railgun turret and a hand-held rail rifle |
| Strategic Bombers | Call in an airstrike once per battle |
| Hardened Garrisons | Tougher walls, allied soldiers hold longer |
| Deep Scan | Minimap shows the whole wave before it arrives |
| Ghost Suits | Short cloak to reposition or repair unseen |
| Disruptor | Slow field that weakens the swarm in one lane |
| Warhead | Not usable in a battle (it is a map weapon) |

**Enemies.** Start with three: a fast swarmling (rushes the core), a spitter (shoots turrets from range), a brute (soaks damage, breaks walls). Leaders from Earthfall arrive as boss waves, and their trait changes the fight (a Butcher's wave hits harder, a Breeder's wave is larger).

## 6. Technology

- **Browser game**, same as Earthfall, so it runs from a link on Mac, iPad and phone.
- **three.js** for 3D. Use the current release and a normal build tool (Vite); Earthfall's single-file r128 setup is not suitable for a shooter.
- **Controls:** desktop first, with W A S D, mouse aim and pointer lock. Touch (twin-stick with auto-fire assist) is a later milestone.
- **Physics:** start with simple capsule-versus-box collision written by hand. Add a physics library only if needed.
- **Hosting:** GitHub Pages or Netlify from the new repo.
- **Performance target:** 60 frames a second on a recent laptop, 30 on an iPad. Budget about 150 enemies on screen, drawn with instancing.

**The 3D art question (needs a decision before real art starts).** ChatGPT produces images, not 3D models. Three workable routes:

1. **Billboard sprites** in a 3D world, the way early shooters and many stylised indie games do it. ChatGPT paints each enemy and turret from 8 angles. Fastest, and it keeps Earthfall's painted-miniature look.
2. **Free low-poly model packs** (CC0 libraries such as Kenney or Quaternius) for geometry, with ChatGPT painting textures, skyboxes, UI and concept art.
3. **Image-to-3D tools** to turn ChatGPT's concept art into models. Results vary and need cleanup.

Recommendation: route 1 for enemies and props, simple hand-built geometry for the arena, and revisit after the first playable.

## 7. Repository layout and who owns what

```
/src            Claude   game code
/public/assets  ChatGPT  images, sprites, textures, audio
/docs/art       ChatGPT  concept sheets, style notes
/docs           Claude   design notes, this handoff
/tools          Claude   build and test scripts
README.md       Claude
```

Same working rules as the Earthfall repo:

- Claude posts art requests as GitHub issues labelled `art-request`, each with exact file names, sizes and a checklist.
- ChatGPT only changes `public/assets/` and `docs/art/`.
- Everything goes through branches and pull requests. Nobody pushes to `main`. Steve merges.

## 8. Milestones

Each one ends with something Steve can play from a link.

1. **Greybox arena.** One flat test arena with boxes. Move, aim, shoot a rifle. One enemy type walks a lane to the core. Three waves. Win and lose screens.
2. **Tower defense.** Prepare phase, build pads, gun turret, barricade, scrap economy, repair. Three enemy types.
3. **First real city.** One stronghold arena (suggest Los Angeles) with ChatGPT's art, sound, a proper HUD and a boss wave.
4. **Research weapons.** The unlock table in section 5, driven by a setup object.
5. **Link to Earthfall.** "Fight this battle" button on Earthfall's defend screen, result returned to the map. Auto-resolve stays.
6. **More fronts.** Arenas for the other strongholds, assault mode, drop defense, touch controls.

Milestones 1 and 2 need no art from ChatGPT, so code and art can start in parallel.

## 9. First art requests for ChatGPT

To be filed as issues once the repo exists. Match Earthfall's painted-miniature style.

1. **Style sheet**: one page showing a soldier, a swarmling, a turret and a street corner together, to lock scale and palette.
2. **Player soldier**: third-person character, 8 directions, idle, run and fire poses.
3. **Three enemies** (swarmling, spitter, brute): 8 directions each, walk, attack and death frames.
4. **Defenses**: gun turret, barricade, mine, railgun turret; intact and damaged.
5. **Los Angeles arena kit**: ground textures, building facades, rubble, cover pieces, a skybox, and the city core objective.
6. **HUD**: health, ammo, wave counter, build menu icons, crosshair, minimap frame.
7. **Weapon art**: rifle and rail rifle, seen from the player's view.

## 10. Questions for Steve

1. Third-person first (recommended), or first-person?
2. Painted billboard sprites (recommended), or 3D models?
3. Repository name and whether it is private. Suggested: `NationalSports/earthfall-frontline`, private.
4. Desktop first with touch later (recommended), or must the first playable work on a phone?
5. Which city should be the first arena?

## 11. What exists today in Earthfall that this builds on

- Repo `NationalSports/earthfall`, playable from a single HTML file. Turn-based: one day per turn, End day, then the swarm moves.
- 42 territories, 10 strongholds that act as bases (Industry, Barracks, Fortress, Radar, Missile Battery, Command Post), a Lab at Los Angeles, three resources (metal, fuel, research).
- Enemy leaders (Overlord, Warlords, Commanders) with traits and Warlord powers; orbital drops at each threat level; a research-unlocked Warhead.
- An optional lane-defense minigame (`src/battle.js`) that already takes a setup object and returns survivors. Frontline replaces it.
- Design notes in `docs/DESIGN.md` in that repo.

## 12. Added by Steve after the first draft

- **Camera:** third-person. **Platform:** desktop first. **First arena:** Los Angeles.
- **Location:** lives in the `frontline/` folder of `NationalSports/earthfall`, not a separate repository.
- **Models:** built in three.js code from simple shapes (clean low-poly figures). Claude builds the soldier, enemies and turrets; ChatGPT paints textures, skybox, HUD and concept art, and may add model files.
- **Multiplayer variant (later):** Steve wants a **Halo-style multiplayer shooter**: players against players in arenas, set **on other worlds as well as in Earth's cities**. Not designed yet. Open questions: team sizes and modes (slayer, capture the flag, objective), whether a co-op mode against the swarm is also wanted, and how many other worlds. It needs a small game server, which the single-player build does not, so it is a separate milestone after the Earthfall link.
