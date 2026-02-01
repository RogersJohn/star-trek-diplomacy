# Star Trek Diplomacy - Official Rules

**Version 1.0**

A 7-player strategy game of interstellar conquest and negotiation set in the Star Trek universe. Based on classic Diplomacy mechanics with asymmetric faction abilities.

---

## Table of Contents

1. [Overview](#overview)
2. [Factions](#factions)
3. [The Map](#the-map)
4. [Turn Structure](#turn-structure)
5. [Orders](#orders)
6. [Order Resolution](#order-resolution)
7. [Retreats](#retreats)
8. [Builds and Disbands](#builds-and-disbands)
9. [Victory Conditions](#victory-conditions)
10. [Alliances](#alliances)
11. [Faction Abilities](#faction-abilities)
12. [Latinum Economy](#latinum-economy)

---

## Overview

Star Trek Diplomacy is a game of negotiation, strategy, and careful timing. Seven factions vie for control of the Alpha and Beta Quadrants. There are no dice - success depends on cunning diplomacy and tactical coordination.

**Key Principles:**
- All orders are submitted simultaneously and resolved together
- Combat is deterministic - the side with more support wins
- Equal forces result in a standoff (no movement)
- Negotiation happens outside the game system - promises are not binding

---

## Factions

| Faction | Starting Units | Home Systems | Victory Threshold |
|---------|----------------|--------------|-------------------|
| **United Federation of Planets** | 5 fleets | Earth, Vulcan, Andoria, Tellar Prime, Rigel | 10 supply centers |
| **Klingon Empire** | 5 fleets | Qo'noS, Ty'Gokor, Narendra III, Boreth, Khitomer | 12 supply centers |
| **Romulan Star Empire** | 4 fleets | Romulus, Remus, Rator III, Abraxas | 8 supply centers |
| **Cardassian Union** | 5 fleets | Cardassia Prime, Chin'toka, Septimus III, Kelvas V, Rakal | 14 supply centers |
| **Ferengi Alliance** | 3 fleets | Ferenginar, Volchok Prime, Clarus | 9 supply centers OR 100 latinum |
| **Breen Confederacy** | 6 fleets | Breen, Portas V, Dozaria, Breen Core, Breen Citadel, Breen Fortress | 18 supply centers |
| **Gorn Hegemony** | 5 fleets | Gornar, S'sgaron, Seudath, Gorn Fortress, Gorn Colony | 9 supply centers |

---

## The Map

The map consists of three layers connected by hyperlanes:

### Layer 2: Core Sector (Primary)
- Contains all **47 supply centers** (marked with a star icon)
- 33 home systems belonging to the 7 factions
- 14 neutral supply centers available for capture

### Layer 1 & 3: Hyperspace Bypass Routes
- 20 hyperspace territories (no supply centers)
- Allow rapid movement between distant regions
- Strategic for flanking maneuvers

### Movement
- Units may move to any **adjacent** territory via hyperlane
- Hyperlanes connect systems within the same layer
- **Vertical lanes** connect systems between layers
- All units are fleets (space vessels) - there are no armies

---

## Turn Structure

Each game year consists of two turns: **Spring** and **Fall**.

### Spring Turn
1. **Diplomacy Phase** - Negotiate with other players (no time limit)
2. **Order Phase** - All players simultaneously submit orders
3. **Resolution Phase** - Orders are resolved; units move or bounce
4. **Retreat Phase** - Dislodged units retreat or disband

### Fall Turn
1. **Diplomacy Phase**
2. **Order Phase**
3. **Resolution Phase**
4. **Retreat Phase**
5. **Build Phase** - Adjust unit counts to match supply centers

After the Fall Build Phase, the year advances (2370 → 2371 → ...).

---

## Orders

Each unit must receive exactly one order per turn. If no order is submitted, the unit **holds** by default.

### Hold
```
Fleet Earth HOLD
```
The unit stays in place and defends with strength 1.

### Move
```
Fleet Earth MOVE to Vulcan
```
The unit attempts to move to an adjacent territory. Attack strength is 1.

### Support
```
Fleet Vulcan SUPPORT Fleet Earth MOVE to Andoria
Fleet Vulcan SUPPORT Fleet Andoria HOLD
```
The unit adds +1 strength to another unit's move or hold. The supporting unit does not move.

**Support Rules:**
- You can support any unit, including enemies
- Support can only be given to adjacent destinations
- Support is **cut** if the supporting unit is attacked (from any direction except the territory being supported into)
- Support is **not cut** if attacked from the destination of the supported move

### Convoy
```
Fleet Hyperspace Alpha CONVOY Fleet Earth to Romulus
```
Convoys allow units to move through non-adjacent territories via hyperspace chains. Multiple fleets can form a convoy chain.

---

## Order Resolution

All orders resolve simultaneously using these principles:

### Combat Strength
- Base strength: **1**
- Each valid support: **+1**
- Klingon attacking: **+1** (faction ability)
- Klingon defending: **-1** (faction ability)

### Resolution Rules

1. **Stronger force wins** - The unit with higher strength moves/holds successfully
2. **Ties result in standoff** - Neither unit moves; both stay in place
3. **Dislodgement** - A unit is dislodged if an attacker's strength exceeds its defense
4. **Self-dislodgement prohibited** - You cannot dislodge your own unit
5. **Head-to-head battles** - When two units try to swap positions, the stronger one succeeds (ties = both stay)
6. **Beleaguered garrison** - A unit attacked from multiple directions with equal strength from each is not dislodged

### Support Cutting
Support is **cut** when the supporting unit is attacked, EXCEPT:
- The attack comes from the territory the support is directed toward
- The attacking unit belongs to the same faction as the supporter

---

## Retreats

When a unit is dislodged, it must retreat during the Retreat Phase.

### Valid Retreat Destinations
- Must be adjacent to the unit's current location
- Must be unoccupied
- Must not be the territory the attacker came from
- Must not be a territory where a standoff occurred this turn

### Retreat Options
1. **Retreat** - Move to a valid adjacent territory
2. **Disband** - Remove the unit from the game

If no valid retreat exists, the unit is automatically disbanded.

**Multiple retreats to same territory:** If two or more dislodged units attempt to retreat to the same location, all are disbanded.

---

## Builds and Disbands

After the Fall Retreat Phase, each faction adjusts their unit count.

### Counting
- Count your **supply centers** (systems you control)
- Count your **units** currently on the map

### Adjustments
- **More SCs than units:** Build new units (up to the difference)
- **More units than SCs:** Disband units (mandatory, your choice which)
- **Equal:** No adjustment needed

### Build Rules
- New units may only be built on **unoccupied home systems**
- You cannot build on occupied home systems, even if you own them
- You cannot build more units than you have unoccupied home systems

### Disbands
- If you cannot build but must disband, you choose which units to remove
- If you fail to submit disband orders, units are disbanded automatically (furthest from home systems first)

---

## Victory Conditions

Victory is achieved at the end of any Fall Build Phase. Each faction has an **asymmetric victory threshold**:

| Faction | Solo Victory Condition |
|---------|----------------------|
| Federation | Control **10** supply centers |
| Klingon | Control **12** supply centers |
| Romulan | Control **8** supply centers |
| Cardassian | Control **14** supply centers |
| Ferengi | Control **9** supply centers OR accumulate **100 latinum** |
| Breen | Control **18** supply centers |
| Gorn | Control **9** supply centers |

### Alliance Victory
Two players may form an official alliance. Allied factions win together if their **combined** supply centers reach **24** (half of total). Both players share the victory.

### Elimination
A faction is eliminated when they control **0 supply centers** at the end of a Fall Build Phase. Eliminated players may continue to observe but cannot issue orders or negotiate.

---

## Alliances

Players may form one official alliance at a time.

### Proposing an Alliance
- Any player may propose an alliance to any other player during the Diplomacy Phase
- The recipient may accept or reject
- Accepting creates a formal alliance

### Alliance Benefits
- Combined supply center count toward the 24-SC alliance victory
- Alliance status is visible to all players

### Breaking an Alliance
- Either ally may break the alliance at any time
- Breaking an alliance has no penalty, but earns distrust

### Alliance Restrictions
- Maximum one alliance per player
- Cannot ally with eliminated factions
- Cannot propose to a faction you already have a pending proposal with

---

## Faction Abilities

Each faction has a unique ability reflecting their Star Trek identity. Abilities fall into two categories:

- **Passive** - Always active, no action required
- **Active** - Must be activated, often limited uses

---

### Federation: Diplomatic Immunity

**Type:** Active (once per game)

**Effect:** Prevent one of your units from being dislodged.

**Timing:**
1. Resolution Phase completes - your unit would be dislodged
2. During Retreat Phase, before retreating, you may activate this ability
3. The protected unit remains in place as if not dislodged
4. The attacker does not advance into the territory

**Restrictions:**
- Once per game (entire game, not per turn)
- Must be used during the Retreat Phase before submitting retreat orders
- Cannot be used if the unit has already retreated or disbanded

---

### Klingon: Warrior's Rage

**Type:** Passive (always active)

**Effect:** +1 attack strength, -1 defense strength.

**Timing:**
- Applied automatically during Order Resolution
- Attack bonus applies to all MOVE orders
- Defense penalty applies when holding or being attacked

**Details:**
| Situation | Klingon Strength |
|-----------|------------------|
| Attacking (MOVE) | Base 1 + 1 bonus = **2** |
| Defending (HOLD) | Base 1 - 1 penalty = **0** |
| With 1 support attacking | 2 + 1 support = **3** |
| With 1 support defending | 0 + 1 support = **1** |

**Strategic Note:** Klingon units are powerful attackers but vulnerable when stationary. Keep them moving or well-supported.

---

### Romulan: Tal Shiar Intelligence

**Type:** Passive (each turn)

**Effect:** Before orders resolve, reveal 1-2 random enemy orders.

**Timing:**
1. All players submit orders
2. Before Resolution Phase begins, 1-2 enemy orders are randomly selected
3. These orders are revealed to the Romulan player only
4. Resolution proceeds normally

**Details:**
- Reveals complete order (unit, order type, destination)
- Selected randomly from all non-Romulan orders
- Resets each turn (new orders revealed next turn)
- Cannot choose which orders to reveal

---

### Cardassian: Obsidian Order

**Type:** Passive (always active)

**Effect:** See the destination of all enemy MOVE orders (but not supports or holds).

**Timing:**
1. All players submit orders
2. Before Resolution Phase, Cardassian sees all enemy move destinations
3. Does NOT reveal: which unit is moving there, or support/hold orders

**Details:**
- Only shows destination systems, not origins
- Does not reveal convoy orders
- Does not reveal hold or support orders
- Information is per-faction (you know Klingon units are moving to Organia, but not which ones)

---

### Ferengi: Rules of Acquisition

**Type:** Passive economy + Active abilities

**Effect:**
- Earn **0.5 latinum per supply center** each Fall Build Phase
- Spend **15 latinum** to claim a neutral supply center (Bribe)
- Spend **25 latinum** to cancel one enemy support order (Sabotage)

**Timing - Income:**
1. Fall Build Phase begins
2. Count Ferengi supply centers
3. Add 0.5 latinum per SC to Ferengi treasury (rounded down)

**Timing - Bribe:**
1. During Order Phase, select a neutral (unowned) supply center
2. Pay 15 latinum
3. During Build Phase, that SC is automatically claimed by Ferengi
4. No unit required in that territory

**Timing - Sabotage:**
1. During Order Phase, select one enemy support order to sabotage
2. Pay 25 latinum
3. That support order is canceled before resolution
4. The supporting unit still cannot move (treated as failed support)

**Victory:** Ferengi can win by accumulating **100 latinum** instead of 9 SCs.

---

### Breen: Energy Dampening Weapon

**Type:** Active (once per game)

**Effect:** Freeze a territory - no units can move in or out for one turn.

**Timing:**
1. During Order Phase, designate a territory to freeze
2. The freeze takes effect for the current turn only
3. During Resolution:
   - Units in frozen territory cannot leave (MOVE orders fail)
   - Units cannot enter frozen territory (MOVE orders fail)
   - HOLD and SUPPORT orders in/to frozen territory still work
4. Freeze expires at end of turn

**Restrictions:**
- Once per game
- Can freeze any territory (including your own)
- Units in frozen territory are not dislodged (attackers bounce)
- Support can still be given from frozen territory

---

### Gorn: Reptilian Resilience

**Type:** Passive (automatic)

**Effect:** 50% chance to survive dislodgement and return to nearest home system.

**Timing:**
1. Gorn unit is dislodged and has no valid retreat options
2. Normally this unit would be disbanded
3. A 50% survival check is made
4. If successful: unit teleports to nearest unoccupied Gorn home system
5. If failed: unit is disbanded normally

**Details:**
- Only triggers when unit would be disbanded (no retreat options)
- Does NOT trigger if retreat is available
- "Nearest" = first available unoccupied home system
- If all home systems occupied, unit is disbanded regardless of roll
- Each unit gets its own independent roll

---

## Latinum Economy

Latinum is the currency of the Ferengi Alliance.

### Earning Latinum
- **Ferengi only** - Other factions do not earn or use latinum
- **0.5 latinum per supply center** per Fall Build Phase
- Accumulates across turns

### Spending Latinum

| Action | Cost | Effect |
|--------|------|--------|
| Bribe | 15 | Claim a neutral supply center |
| Sabotage | 25 | Cancel one enemy support order |

### Economic Victory
If Ferengi accumulates **100 latinum** at any point, they immediately win the game (checked during Build Phase).

---

## Quick Reference

### Turn Order
1. Diplomacy → 2. Orders → 3. Resolution → 4. Retreats → (Fall only: 5. Builds)

### Combat Math
- Attacker strength = 1 + supports (+1 if Klingon)
- Defender strength = 1 + supports (-1 if Klingon)
- Higher strength wins; ties = standoff

### Ability Timing Summary

| Ability | When It Applies |
|---------|-----------------|
| Federation: Diplomatic Immunity | Retreat Phase (before retreating) |
| Klingon: Warrior's Rage | Resolution Phase (automatic) |
| Romulan: Tal Shiar Intelligence | After orders submitted, before resolution |
| Cardassian: Obsidian Order | After orders submitted, before resolution |
| Ferengi: Bribe | Order Phase (takes effect in Build Phase) |
| Ferengi: Sabotage | Order Phase (takes effect in Resolution) |
| Breen: Energy Dampening | Order Phase (lasts until end of turn) |
| Gorn: Reptilian Resilience | Retreat Phase (when no retreat available) |

---

## Designer's Notes

Star Trek Diplomacy adapts classic Diplomacy for the Star Trek universe while maintaining strategic depth:

- **Asymmetric victory conditions** create natural alliances and rivalries
- **Faction abilities** encourage thematic play styles
- **3-layer map** adds vertical maneuver options
- **Latinum economy** gives Ferengi an alternate path to victory

The key to success remains the same: diplomacy. Make deals, break them at the right moment, and always have a backup plan.

*Live long and prosper. Or don't - this is Diplomacy.*

---

**End of Rules**
