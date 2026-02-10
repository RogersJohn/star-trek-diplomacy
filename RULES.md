# Star Trek Diplomacy - Official Rules

**Version 2.1**

A 7-player strategy game of interstellar conquest and negotiation set in the Star Trek universe. Based on classic Diplomacy mechanics with dual-unit system, asymmetric faction abilities, and a 3-layer map.

---

## Table of Contents

1. [Overview](#overview)
2. [Factions](#factions)
3. [The Map](#the-map)
4. [Units](#units)
5. [Positions](#positions)
6. [Turn Structure](#turn-structure)
7. [Orders](#orders)
8. [Order Resolution](#order-resolution)
9. [Retreats](#retreats)
10. [Builds and Disbands](#builds-and-disbands)
11. [Victory Conditions](#victory-conditions)
12. [Alliances](#alliances)
13. [Faction Abilities](#faction-abilities)
14. [Latinum Economy](#latinum-economy)

---

## Overview

Star Trek Diplomacy is a game of negotiation, strategy, and careful timing. Seven factions vie for control of the Alpha and Beta Quadrants. There are no dice - success depends on cunning diplomacy and tactical coordination.

**Key Principles:**
- All orders are submitted simultaneously and resolved together
- Combat is deterministic - the side with more support wins
- Equal forces result in a standoff (no movement)
- Negotiation happens outside the game (Discord, WhatsApp, etc.) - promises are not binding
- Two unit types create strategic tension: armies hold territory, fleets project power

---

## Factions

| Faction | Starting Armies | Starting Fleets | Home Systems | Victory Threshold |
|---------|----------------|-----------------|--------------|-------------------|
| **United Federation of Planets** | 3 (Earth, Vulcan, Andoria) | 2 (Earth, Vulcan) | 5 | 10 SC |
| **Klingon Empire** | 2 (Qo'noS, Ty'Gokor) | 3 (Qo'noS, Narendra, Boreth) | 5 | 10 SC |
| **Romulan Star Empire** | 2 (Romulus, Remus) | 2 (Romulus, Rator) | 4 | 8 SC |
| **Cardassian Union** | 3 (Cardassia, Chin'toka, Septimus) | 2 (Cardassia, Kelvas) | 5 | 10 SC |
| **Ferengi Alliance** | 2 (Ferenginar, Volchok) | 1 (Ferenginar) | 3 | 8 SC or 50 latinum |
| **Breen Confederacy** | 2 (Breen, Portas) | 2 (Breen, Dozaria) | 4 (Breen, Portas, Dozaria, Breen Core) | 10 SC |
| **Gorn Hegemony** | 3 (Gornar, S'sgaron, Seudath) | 2 (Gornar, Gorn Fortress) | 5 | 9 SC |

---

## The Map

The map consists of three layers connected by vertical lanes:

### Layer 2: Core Sector (Primary)
- Contains all **47 supply centers**
- 33 home systems belonging to the 7 factions
- 14 neutral supply centers available for capture

### Layer 1 & 3: Hyperspace Bypass Routes
- 18 hyperspace territories (no supply centers)
- Allow rapid fleet movement between distant regions
- Strategic for flanking maneuvers

### Connections
- **Hyperlanes** connect systems within the same layer
- **Vertical lanes** connect systems between layers (Core to Upper/Lower Hyperspace)
- Each connection is a traversable edge that fleets can occupy

---

## Units

There are two unit types in v2:

### Armies
- Occupy **planets** (system nodes)
- Move planet-to-planet along hyperlanes
- **Capture supply centers** at the end of Fall turns
- One army per planet

### Fleets
- Occupy **orbits** or **hyperlanes**
- Move from orbit to hyperlane, hyperlane to hyperlane, or hyperlane to orbit
- **Cannot capture supply centers** (only armies can)
- Project power and control space routes
- One fleet per orbit; up to two **allied** fleets per hyperlane

### Strategic Tension
You need armies to hold territory and fleets to protect them. An army without a friendly fleet in orbit is vulnerable (-1 defense).

---

## Positions

Units occupy one of three position types:

### Planet Positions
- Named by system ID: `earth`, `vulcan`, `qonos`
- Occupied by armies (one per planet)

### Orbit Positions
- Planet ID with `:orbit` suffix: `earth:orbit`, `vulcan:orbit`
- Occupied by fleets (one per orbit)
- Adjacent to hyperlanes connected to that planet

### Hyperlane (Edge) Positions
- Two endpoint IDs sorted alphabetically, joined by tilde: `earth~vulcan`
- Occupied by fleets (up to two allied fleets)
- Adjacent to other hyperlanes sharing an endpoint, and to the orbits of both endpoint planets

---

## Turn Structure

Each game year consists of two turns: **Spring** and **Fall**.

### Spring Turn
1. **Order Phase** - All players simultaneously submit orders
2. **Resolution Phase** - Orders resolve; units move or bounce
3. **Retreat Phase** - Dislodged units retreat or disband

### Fall Turn
1. **Order Phase**
2. **Resolution Phase**
3. **Retreat Phase**
4. **Build Phase** - Ownership updates; adjust unit counts to match supply centers

After the Fall Build Phase, the year advances (2370, 2371, ...).

---

## Orders

Each unit must receive exactly one order per turn. Units without orders **hold** by default.

### Hold
```
Army Earth HOLD
Fleet Earth:orbit HOLD
```
The unit stays in place and defends with strength 1.

### Move
```
Army Earth MOVE to Vulcan
Fleet Earth:orbit MOVE to earth~vulcan
Fleet earth~vulcan MOVE to vulcan:orbit
```
The unit attempts to move to an adjacent position. Attack strength is 1.

**Movement rules by unit type:**

| Unit | From | Can Move To |
|------|------|-------------|
| Army | Planet | Adjacent planet |
| Fleet | Orbit | Hyperlane connected to that planet |
| Fleet | Hyperlane | Adjacent hyperlane, or orbit of either endpoint |

### Support
```
Army Vulcan SUPPORT Army Earth MOVE to Andoria
Fleet earth:orbit SUPPORT Army Earth HOLD
Fleet earth~vulcan SUPPORT Fleet vulcan:orbit HOLD
```
The unit adds +1 strength to another unit's move or hold. The supporting unit does not move.

**Support adjacency rules:**

| Supporter | Can Support |
|-----------|-------------|
| Army on planet | Army moving to/holding adjacent planet |
| Fleet in orbit | Army on same planet; fleet on adjacent hyperlane |
| Fleet on hyperlane | Army on either endpoint planet; fleet on adjacent hyperlane or either endpoint orbit |

**Support rules:**
- You can support any unit, including enemies
- Support can only be given to adjacent destinations
- Support is **cut** if the supporting unit is attacked (from any direction except the position being supported into)

### Convoy
```
Fleet earth~vulcan CONVOY Army from Earth to Andoria
```
Fleets on hyperlanes can convoy armies across non-adjacent planets. Multiple fleets form a convoy chain.

**Convoy rules:**
- Only fleets on hyperlanes can convoy
- The army orders MOVE with a convoy route
- Each fleet in the chain orders CONVOY specifying the army's origin and destination
- If the convoy chain is unbroken, the army moves to the destination
- If any convoying fleet is dislodged, the convoy fails

---

## Order Resolution

All orders resolve simultaneously:

### Combat Strength
- Base strength: **1**
- Each valid support: **+1**
- Klingon first attack: **+1** (faction ability, first MOVE order only)
- Klingon defending without fleet in orbit: **-1** (faction ability, stacks with standard penalty)
- Army without friendly fleet in orbit: **-1 defense**

### Fleet-in-Orbit Defense Bonus
An army on a planet defends at -1 if there is no friendly fleet in the same planet's orbit. This makes fleet support critical for holding territory.

### Resolution Rules

1. **Stronger force wins** - Higher strength moves/holds successfully
2. **Ties = standoff** - Neither unit moves; both stay in place
3. **Dislodgement** - A unit is dislodged when attacker strength exceeds defense
4. **Self-dislodgement prohibited** - You cannot dislodge your own units
5. **Armies fight armies** - For planet control
6. **Fleets fight fleets** - For space control (orbits and hyperlanes)
7. **Head-to-head** - When two units try to swap, stronger wins (tie = both stay)

### Hyperlane Capacity
- A hyperlane can hold **2 fleets maximum**
- Both fleets must be **allied** (same faction or formal alliance)
- If two enemy fleets end up on the same hyperlane, they fight (stronger stays, loser retreats)

---

## Retreats

When a unit is dislodged, it must retreat during the Retreat Phase.

### Valid Retreat Destinations
- Must be adjacent to the unit's current position
- Must be unoccupied
- Must not be the position the attacker came from
- Must not be a position where a standoff occurred this turn
- Must be a valid position type for that unit (armies to planets, fleets to orbits/edges)

### Retreat Options
1. **Retreat** - Move to a valid adjacent position
2. **Disband** - Remove the unit from the game

If no valid retreat exists, the unit is automatically disbanded.

---

## Builds and Disbands

After the Fall Retreat Phase, supply center ownership updates and each faction adjusts their unit count.

### Ownership
- A planet's supply center is controlled by the faction whose **army** occupies it at the end of Fall
- Fleets in orbit do **not** capture supply centers
- Ownership persists until another army takes the planet

### Counting
- Count your **supply centers** (planets you control)
- Count your **units** (armies + fleets) on the map

### Adjustments
- **More SCs than units:** Build new units (up to the difference)
- **More units than SCs:** Disband units (your choice which)
- **Equal:** No adjustment needed

### Build Rules
- **Armies** are built on unoccupied home planet supply centers
- **Fleets** are built in orbit of home planet supply centers (orbit must be empty)
- You can build **both** an army and a fleet at the same home planet if both the planet and orbit are empty
- You can only build on home planets you still control

### Disbands
- You choose which units to remove
- If you fail to submit disband orders, units are disbanded automatically

---

## Victory Conditions

Victory is checked at the end of each Fall Build Phase.

| Faction | Solo Victory |
|---------|-------------|
| Federation | 10 supply centers |
| Klingon | 10 supply centers |
| Romulan | 8 supply centers |
| Cardassian | 10 supply centers |
| Ferengi | 8 supply centers OR 50 latinum |
| Breen | 10 supply centers |
| Gorn | 9 supply centers |

### Alliance Victory
Two allied factions win together if their **combined** supply centers reach **24** (half of total). Both players share the victory.

### Elimination
A faction is eliminated when they control **0 supply centers** and have **0 units** at the end of a Fall Build Phase.

---

## Alliances

Players may form one official alliance at a time.

### Proposing an Alliance
- Any player may propose an alliance to any other player
- The recipient may accept or reject
- Accepting creates a formal alliance visible to all

### Alliance Benefits
- Combined supply center count toward 24-SC alliance victory
- Two allied fleets may share a single hyperlane

### Breaking an Alliance
- Either ally may break the alliance at any time
- No mechanical penalty, but earns distrust

### Restrictions
- Maximum one alliance per player
- Cannot ally with eliminated factions

---

## Faction Abilities

Each faction has a unique ability. Abilities are either **passive** (always active) or **active** (limited uses).

---

### Federation: Diplomatic Immunity

**Type:** Active (once per game)

**Effect:** Prevent one of your units from being dislodged.

**Timing:** During Retreat Phase, before submitting retreats, activate to keep a dislodged unit in place. The attacker does not advance.

**Restrictions:** Once per entire game. Cannot be used after the unit has already retreated.

---

### Klingon: Warrior's Rage

**Type:** Passive

**Effect:** +1 attack strength on the **first** MOVE order each turn. When holding without a friendly fleet in orbit, -1 defense (stacks with the standard fleet-in-orbit penalty for -2 total).

| Situation | Strength |
|-----------|----------|
| First attack (MOVE) | 1 + 1 = **2** |
| Additional attacks (MOVE) | **1** (normal) |
| Defending with fleet in orbit | **1** (normal) |
| Defending without fleet in orbit | 1 - 1 (Klingon) - 1 (no fleet) = **-1** |

Choose your first strike wisely. Keep fleet cover on defensive positions.

---

### Romulan: Tal Shiar Intelligence

**Type:** Active (each turn)

**Effect:** Each turn during the orders phase, choose one enemy faction. After all orders are submitted but before resolution, all of that faction's orders are revealed to the Romulan player.

**Usage:** Select a spy target from the ability panel during the orders phase. If no target is selected, no intelligence is gathered.

---

### Cardassian: Obsidian Order

**Type:** Passive

**Effect:** See the destination of all enemy MOVE orders (but not supports, holds, or which unit is moving). Information available after all orders submitted, before resolution.

---

### Ferengi: Rules of Acquisition

**Type:** Passive economy + Active abilities

- Earn **3 latinum per supply center** each Fall Build Phase
- **Bribe** (10 latinum): Claim a neutral supply center without a unit there
- **Sabotage** (15 latinum): Cancel one enemy support order before resolution
- **Espionage** (8 latinum): See all orders from one enemy faction this turn

**Victory:** Ferengi can win by accumulating **50 latinum** instead of reaching the SC threshold.

---

### Breen: Energy Dampening Weapon

**Type:** Active (once per game)

**Effect:** Freeze a territory for one turn. No units can move in or out. HOLD and SUPPORT still work. Units in frozen territory cannot be dislodged.

---

### Gorn: Reptilian Resilience

**Type:** Passive

**Effect:** When a Gorn unit is dislodged and has **no valid retreat destinations**, it automatically returns to the nearest unoccupied Gorn home system instead of being disbanded.

**Restrictions:**
- Only triggers when there are zero valid retreats available
- If all Gorn home systems are occupied, the unit is disbanded normally
- If valid retreats exist, the Gorn player must choose a retreat as normal

---

## Latinum Economy

Latinum is exclusive to the Ferengi Alliance.

### Earning
- **3 latinum per supply center** per Fall Build Phase (Ferengi only)
- Accumulates across turns

### Spending

| Action | Cost | Effect |
|--------|------|--------|
| Bribe | 10 | Claim a neutral supply center |
| Sabotage | 15 | Cancel one enemy support order |
| Espionage | 8 | See all orders from one enemy faction |

### Economic Victory
Ferengi wins immediately upon reaching **50 latinum** (checked during Build Phase).

---

## Quick Reference

### Turn Order
1. Orders -> 2. Resolution -> 3. Retreats -> (Fall only: 4. Builds)

### Combat Math
- Attacker: 1 + supports (+1 if Klingon first move)
- Defender: 1 + supports (-1 if Klingon without fleet in orbit, -1 if army without fleet in orbit)
- Higher wins; tie = standoff

### Movement Summary
- Armies: planet to adjacent planet
- Fleets in orbit: orbit to connected hyperlane
- Fleets on hyperlane: to adjacent hyperlane or endpoint orbit

### Position Notation
- Planet: `earth`
- Orbit: `earth:orbit`
- Hyperlane: `earth~vulcan` (alphabetical order)

---

**End of Rules**
