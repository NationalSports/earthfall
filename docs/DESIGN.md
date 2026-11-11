# Earthfall — game design

The working plan for the game. **Built** means it is in the current build; **Planned** means agreed direction, not coded yet.
The graphic-novel story presentation and multiplayer are deliberately left out for now.

## The war in one paragraph
A swarm took East Asia in three weeks. You command the Earth Defense Coalition from Los Angeles. A world clock runs only while you play. Nothing is locked: any target can be attempted at any time, it is just harder. You win by killing the Overlord. You lose if Los Angeles falls, the Harvest reaches 100%, or you hold fewer than 8 territories.

## Characters

### Your strike team (Built: pick one at the start)
| Leader | Role | Trait |
| --- | --- | --- |
| Vanguard | Assault | Fights in the line as 3 extra troops; hits harder in defense battles |
| Cipher | Shadow | +15% covert strikes; never spotted while hiding in enemy land |
| Engineer | Engineer | Cheaper structures; +1 defense where the team stands |

Planned: veterancy (the team earns a perk after 2 and 5 successful operations), and a second team unlocked mid-campaign.

### The invaders (Built)
A chain of command you can see once you have intel on it: one **Overlord**, **Warlords** under him, **Commanders** under them.
- Each Warlord alive gives the Overlord 2 extra guards. Kill a Warlord and his theater falls into disarray for 4 days.
- Commanders whose Warlord is dead stop coordinating. After 3 days one is promoted.
- Leaders move. A relocating leader is exposed for 36 hours.

**Traits** (Built): every Warlord and Commander carries one, revealed when you locate them.
| Trait | Effect |
| --- | --- |
| Butcher | War parties from his territory roll +1 |
| Warden | One extra guard |
| Ghost | Covert strikes against him are 12% harder |
| Breeder | His territory grows one extra strength per day |
| Raider | War parties from his territory arrive 30% sooner |

Story note for art: the invaders are later revealed to be future humans. They read as alien at first glance but keep human proportions.

## Enemy AI (Built)
The swarm picks an **objective** and works toward it for up to 4 days:
- It values Los Angeles (far more once you start a warhead), uranium cities, special cities, missile batteries, radars, and any territory that would break one of your region bonuses. Weak garrisons attract it; fortresses put it off.
- If the front is too thin it **masses** troops from the rear first. With radar coverage you get a warning.
- From threat level 2 it attacks from **two sides at once**.
- Difficulty sets how often it plans like this instead of attacking at random: Recruit 30%, Veteran 70%, Last Stand always.

## Special cities (Built)
| City | Name | Boost while you hold it |
| --- | --- | --- |
| London | Signals Hub | +1 intel per day |
| Berlin | Foundries | +4 metal per day |
| São Paulo | Refineries | +4 fuel per day |
| Nairobi | Field Labs | +3 research per day |
| Cairo | Canal Zone | +2 metal and +2 fuel per day |
| Delhi | Recruitment Depot | +1 reserve every second day |
| Denver | Mountain Complex | Defenders roll +1 |
| Moscow | Winter Line | Defenders roll +1 |
| Sydney | Deep Space Array | +2 intel per day (starts occupied) |

Also: Vancouver, Astana, Perth and Johannesburg produce uranium. Holding every territory of a region adds daily reserves (North America 2, South America 1, Europe 2, Africa 1, Asia 3, Oceania 1).

## Strongholds (Built)
Los Angeles and the nine special cities. They produce double their resource, and their buildings go further: Industry to level 5 (3 elsewhere), Barracks to 4 (2), Fortress to 3 (1). Each fortress level adds +1 to the defenders' best die. The swarm values them accordingly.

## The opening (Built)
1. **Choose** difficulty, a doctrine and a strike team leader.
2. **The landing.** The swarm takes 12 territories: a main landing of 8 around one of six cities (Tokyo, Johannesburg, São Paulo, Stockholm, Sydney, Tehran) and a beachhead of 4 in another region. Los Angeles and its neighbors are always spared. The Overlord sits in the main landing.
3. **Mobilization.** The clock is stopped. You have a war chest (400 metal, 350 fuel, 280 research) and 20 reserve troops. Buildings finish at once, troops can be placed and moved anywhere, research can be bought, and nothing costs Orders. "Mobilize for me" spends it to suit the doctrine.
4. **Begin the war.** Normal rules apply from here.

Your own garrisons follow population: great cities start with 3, remote outposts with 1, the rest with 2, Los Angeles with 5.

### Doctrines (Built): permanent, chosen before the war
| Doctrine | Effect |
| --- | --- |
| Fortress Earth | Fortresses and batteries cost half. Defenders roll +1 |
| Blitz | 7 Orders a day. Your attacks roll +1 in the first exchange |
| Shadow War | Strike team recovers twice as fast, +10% on covert work, +2 intel a day |
| War Economy | Each Industry level yields +4, not +3. Construction takes a third less time |

### Reserves
About 7 new troops a day at the start: one per 11 territories held plus region bonuses. For comparison, Risk gives one per 3 territories (minimum 3) plus continent bonuses and card sets.

### Armor (Built)
A second unit type. Trained at any city with a Barracks: 30 metal and 20 fuel each, up to 3 per Order. Armor counts **double when attacking** and single when defending. Infantry take losses first, so armor is the last to fall. It marches with your troops and goes in first. On the map a garrison shows as its total with an armor mark (▰2).

## Difficulty (Built)
| Level | Invasion growth | Escalation | Harvest speed | AI planning |
| --- | --- | --- | --- | --- |
| Recruit | slow | every 8 days | slow | 30% |
| Veteran | normal | every 6 days | normal | 70% |
| Last Stand | fast | every 5 days | fast | 100% |

A simple test bot that never uses the strike team, cards or defense battles wins about 95% / 55% / 15% of games.

## Weapons and structures (Built)
| Thing | What it does |
| --- | --- |
| Industry (3 levels) | +3 of the city's resource per day, per level |
| Barracks (2 levels) | Raises 1 troop in the city every 3 days, per level |
| Fortress | Defenders roll +1; a wall in defense battles |
| Radar | Reveals strength, leaders and war parties within 2 territories; +1 intel per day; longer gun range in defense battles |
| Missile battery | Salvo on territories or war parties within 2 territories; strikes you call in defense battles |
| Railgun (research) | Batteries hit harder; a third strike in defense battles |
| Strategic bombers (research) | Bomber raid anywhere, then rearm |
| EMP warhead | Reaches anywhere; halves leader guards and stops attacks from the target for 3 days |
| Signal disruptor (research) | Slows invasion growth |
| Warhead | Three 60-hour stages and uranium. Erases a territory for good. Each launch raises the threat level |

Planned: orbital interceptor (shoots down one war party per week), naval landing for assaults without a land border, shield dome (blocks one breakout).

## Time: the war room (Built)
A running clock, slow: one game hour takes about 5 seconds (a day in 2 minutes), or 1 second on fast. It pauses itself when a war party is spotted, a city is attacked or lost, a column's destination falls, the strike team arrives, or a warhead is ready.

You give orders instantly; most of them take time to carry out, and you watch them happen on the map.

| Action | Time |
| --- | --- |
| March | 6 hours per territory (4 with Rapid Transport), up to 3 territories |
| Airlift | 3 hours, anywhere, up to 3 troops |
| Attack | Instant: the troops are already on the border |
| Any building or upgrade | 24 hours (16 for the Engineer), one job per city |
| Reinforce | Instant and free, at strongholds only: reserves muster there and march out |

Troops on the road defend nothing. If their destination falls first, the clock pauses and you choose: return, or divert to one of your territories beside either end. A build in progress is lost if the city falls.

## Orders (Built)
One daily budget that every action draws on. You get 6 at midnight; unused Orders carry over, up to 3 above the daily amount. A Command Post (strongholds only) adds +1 a day each. The Double Time card adds 2 on the spot.

| Action | Orders |
| --- | --- |
| Attack | 2 |
| Airlift | 2 |
| March, build or upgrade, missile salvo, bomber raid, send the strike team, sabotage, covert strike | 1 |
| Reinforce from reserve, play a card, defend | Free |

## Who fights in an attack (Built)
Rule of thumb: if two territories touch on the map, they connect. The attack screen lists every bordering territory with its own slider, and gold arrows on the map show who can join.

The spare troops in your territories bordering the target (each keeps one behind). Your reserve is for reinforcing, except when you have no land border: then the reserve lands from the sea and the defenders roll +1. **Flanking** is automatic, not a choice: commit troops from two or more bordering territories and your best die gets +1. The decision is getting troops onto two sides in the first place. Missile and air support cost resources.

## Battles

### When you attack (Built)
The fight plays out over several seconds, one exchange about every second, with losses shown on both sides as they happen. You can withdraw or skip to the end. Under the hood it is Risk dice: you roll up to 3, they roll up to 2, highest pairs compared, ties to the defender. Before the first roll you can add tactics: Flank (+1 on your best die), Missile support (defense −2), Air support (defense −3). You can withdraw between rounds.

### When they attack (Built): Command the defense
War parties of 3 or more can be fought in person, or auto-resolved with dice.
- Three lanes run from the swarm on the left to your city on the right.
- Each defender is a squad. Before the fight you place squads in the lanes; the front ones take the first hits.
- A fortress is a wall the swarm must break. While it stands, every squad can fire on creatures stuck at it.
- A battery gives 2 strikes (3 with railgun): tap the field. Tap a creature to focus fire.
- Every creature that gets through hurts your rearmost squad. Lose every squad and the city falls.
- On autopilot the battle gives close to the same odds as the dice; good play does better.

### Knowing what to do (Built)
A panel on the map titled "What you can do now" lists up to four concrete options for the current moment, each with a Show button: defend a threatened city, place reserves, the best available attack with its odds, train armor, build Industry, or run the clock. During mobilization the same panel lists what the war chest can still buy and ends with Begin the war.

### The city view (Built)
Zoom past the closest board level and the camera keeps descending into the nearest city: its streets, garrison, structures, and gold pads where a fortress, radar or battery can still be built. Tap a pad to build.

Planned: live assault battles (you attacking down the lanes), boss fights when a leader is in the city, upgrades for individual structures.

## Command cards (Built)
Earned by liberating a territory (one per day) or killing a leader. Hold up to 6. Play one, or trade any three for reserves (4, then 6, then 8...).
| Card | Effect |
| --- | --- |
| Airdrop | +3 reserve troops |
| Intercept | Largest incoming war party loses 3 strength |
| Quiet Night | The invasion skips its next day of growth |
| Supply Convoy | +40 metal, +40 fuel |
| Eyes Everywhere | +6 intel, whole map revealed for 48 hours |
| Rally | Strike team back to full readiness |
| Dig In | +2 troops in every territory with a war party inbound |

Planned: an enemy deck (Pandemic-style) that reveals the swarm's next move a day early when you hold enough intel.

## Open questions for Steve
1. Should a lost defense battle you commanded cost more than dice would (higher stakes), or stay equal?
2. Do special cities need a downside when the swarm holds them (for example the Refineries speeding the Harvest)?
3. Should cards have suits, so matched sets trade for more, as in Risk?

## Turn structure (replaces the running clock)

Earthfall is turn-based. One day is one turn.

1. **Morning.** Income arrives, new troops join the reserve, finished buildings and research are announced, and the attacks the swarm declared last night are listed.
2. **Your turn.** Any order: place reserves at strongholds, attack (fought at once), build (ready next morning; tonight for Engineers and the Economy doctrine), train, strike team (lands tonight), research project.
3. **Moves.** Next door is instant; the first 3 a day are free, then 1 Order. Two or three territories away costs 1 Order and arrives tonight, before the swarm moves. Airlift reaches anywhere, once a day.
4. **End day.** The swarm's turn plays on the map: it grows, yesterday's declared attacks land, and it declares tomorrow's. Capturing the city an attack comes from cancels it.

The top bar's gold **Next** button always names the one thing still waiting (place troops, choose research, defend, use Orders), then End day. Research is a project: pick one and it is bought automatically the morning it becomes affordable.

Under the hood the engine still counts hours (24 per night), so cooldowns and leader movement are unchanged.
