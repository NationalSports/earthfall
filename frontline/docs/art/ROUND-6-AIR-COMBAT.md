# Round 6 — aircraft, aerial enemies and combat art direction

This is an art/design handoff, not a code change. The Osprey-style **Kestrel tiltrotor**, **Goshawk helicopter** and **Bulwark mech** are intended to become available support/vehicle options. Claude owns Meshy, controls, flight physics, AI, damage systems, networking and all implementation. All mechanics and numerical values below are proposals for playtesting, not tested balance.

## Three powerful vehicles with different jobs

| Vehicle | Primary job | Strength | Deliberate limit | Readable vulnerability |
| --- | --- | --- | --- | --- |
| Kestrel tiltrotor | Squad transport, cargo and extraction | Fast relocation in cruise; can land vertically | One defensive gun, no bombing loadout; exposed while landing/loading; must service | Wingtip nacelles, cooling vents and ramp approach |
| Goshawk helicopter | Escort and short attack runs | Maneuverable close support; cannon and limited rockets | Finite ammunition, forward firing arcs, finite service endurance; cannot also carry the whole squad | Tail drive and engine housings; sustained hover invites interception |
| Bulwark mech | Ground breakthrough and defensive anchor | Armor, rotary cannon and small launcher | Slow turn/traverse, finite ammunition, exposed rear radiator; cannot enter narrow tunnels | Rear radiator, knee hydraulics and flanks |

The tiltrotor must not become a second helicopter with better guns. Its transport/extraction role should matter. The helicopter protects the transport but relies on infantry to clear nests, confined objectives and landing areas. The mech holds ground while infantry handles confined routes and repairs. Do not make any vehicle an all-purpose invulnerable platform.

For availability, retain a pilot/cockpit and service-access design so Claude can support player control or commanded support flights. Those interaction modes are implementation choices, not behavior supplied by these images. The Kestrel can be used alongside the Round 4 shuttle; keep model IDs separate unless explicitly replacing that extraction vehicle.

## Five flying enemies, each with a fair answer

| Enemy | Threat | Warning / attack window | Counter available to infantry | Aircraft response |
| --- | --- | --- | --- | --- |
| Dartwing | Small swarm that chips exposed systems and harasses infantry | Audible wing buzz; short visible approach before contact | Ordinary rifle fire; fragile body, clear hit feedback | Keep moving; escort clears swarms, avoid prolonged hover |
| Razorwing | Fast interceptor that makes committed slashing passes | Wing flare and orange throat brightening before a straight attack run | Shoot exposed throat during approach/recovery; dodge sideways | Bank or change height before committed pass; escort covers recovery arc |
| Blight Bomber | Slow acid lobber that pressures stationary aircraft and landing zones | Underside sacs inflate and brighten before a lob; visible projectile travel | Shoot exposed green sacs to interrupt; move out of marked splash area | Break hover and change direction; no unavoidable instant-hit acid |
| Storm Moth | Local support-disruption pressure | Ribbed orange throat pulses; visible bounded interference area | Shoot throat to interrupt or leave affected area | Reposition outside pulse; manual flight controls must remain responsive |
| Sky Tyrant | Rare aerial boss with armor and a vulnerable keel-core | Distinct wind-ups for passes and area attacks; recovery windows expose core | Ground weapons remain useful against exposed core/wing joints | Escort, attack during openings and retreat for service; no permanent safe orbit |

Spawn these as authored encounters with recovery time, not an endless punishment for entering an aircraft. Ground players must be able to respond without owning an aircraft or a special mandatory weapon. Flying enemies may threaten ground troops too; they must not be scenery until the player takes off.

## First playtest targets

These are deliberately conservative starting hypotheses, recorded in `round-6-design-spec.json` for review. Tune them against actual mission size, movement speed, available cover and encounter duration.

- Shared vehicle budget: initially one heavy vehicle active for a solo squad. Permit an escort-plus-transport encounter only when map/mission budgets support both; the showcase concept is not a promise of simultaneous availability in every mission.
- Kestrel: one defensive gun with 300 rounds; four infantry seats as a target. A clear 8-second loading/landing commitment. No passenger invulnerability outside the closed cabin. Ground objectives still require disembarking.
- Goshawk: 300 cannon rounds and 8 rockets; approximately 75 seconds of combat service endurance before return/service. Clearly display remaining ammo and service time; never silently remove the aircraft.
- Mech: 500 cannon rounds and 6 rockets; slow movement/turning and deliberate weapon arcs. Repairs consume a resource and require exposure.
- Vehicle service cooldown starting target: 180 seconds, with one shared budget rather than chaining unlimited fresh platforms. Begin cooldown when the platform returns/is lost, not a loophole that produces a new one while the first remains active.
- Flying encounter starting cap: 6 Dartwings, 2 Razorwings, 1 Bomber, 1 Moth. These are per-species ceilings, not a direction to spawn every ceiling together. Use a smaller total threat budget, start with one enemy role at a time, and introduce counters before combinations. One Sky Tyrant replaces other heavy aerial pressure.
- Attack tells should remain readable for at least 1.5–2 seconds in the first prototype. Boss attacks need longer tells and visible recovery windows. Speed may be tuned later; readability must survive the change.

**Fairness rules:** no unseen offscreen instant kills; no unavoidable tracking attacks; no indefinite control disable; no invulnerable flight ceiling; no unlimited rocket or ammunition refill in midair. Show directional warnings and meaningful system damage before a loss. Prefer a recoverable forced landing/retreat state before catastrophic destruction when mission rules permit. Preserve meaningful grounded threats too: cover, weapon arcs, exposed systems and required landings keep infantry relevant.

## Extraction sequence reference

1. Complete the main objective; unlock an extraction beacon.
2. Player calls the Kestrel/shuttle and receives a visible arrival countdown and landing-zone marker.
3. Telegraph an authored pressure wave. Infantry secures the zone and an escort may suppress incoming flyers.
4. Aircraft lands; ramp opens; dust/downwash and clear interior lighting identify the boarding route.
5. Squad boards. Show remaining squad status and a final departure countdown; objective/sample recovery rules must be explicit.
6. Ramp closes, rotors transition for departure, mission results resolve after the departure sequence.

Round 4 has shuttle/pod art and Round 5 has the beacon and extraction HUD layout. Round 6 adds a tiltrotor ramp/cargo reference and battle compositions. These are references, not a functioning extraction implementation.

## Additional accepted art directions

The pack also supplies enemy damage states and a detached plate, cave/objective/civilian references, three command-ship interiors, four movement/healing key poses, weather overlays and scene targets. Movement images are animation references only; they do not constitute a rig or animation clip. Weather images are single transparent overlays, not timed sprite sheets or a weather simulation. Ship scenes are environmental concepts, not ready-to-walk meshes. The Round 5 intact/damaged building set remains the starting point for environmental destruction; runtime fracture/collision requires Claude's implementation.

Online co-op remains a separate engineering milestone; no image asset can provide networking. The proposed squad roles, warning vocabulary and shared vehicle budget are suitable for later co-op consideration without claiming it exists now.
