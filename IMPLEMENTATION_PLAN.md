# Star Trek Diplomacy v2.1 — Implementation Plan

**Purpose:** This document is a detailed, actionable implementation plan for Claude Code to execute against the `star-trek-diplomacy-master` repository. Every change is specified with exact file paths, exact values, and expected outcomes. Work through each phase sequentially — later phases depend on earlier ones.

**Testing philosophy:** The owner prefers Selenium-style browser tests (already using `selenium-webdriver` in `tests/`) and Monte Carlo simulations for balance validation. No manual testing until near-completion. Every code change must have automated test coverage before moving on.

**Branch strategy:** Create a feature branch `v2.1-rebalance` from `master` before starting.

---

## Table of Contents

1. [Phase 1: Data Integrity Fixes](#phase-1-data-integrity-fixes)
2. [Phase 2: Faction Rebalancing — Engine Changes](#phase-2-faction-rebalancing--engine-changes)
3. [Phase 3: Latinum Economy Overhaul](#phase-3-latinum-economy-overhaul)
4. [Phase 4: Movement & Convoy Validation Tightening](#phase-4-movement--convoy-validation-tightening)
5. [Phase 5: Monte Carlo Balance Simulator](#phase-5-monte-carlo-balance-simulator)
6. [Phase 6: Map UX Improvements](#phase-6-map-ux-improvements)
7. [Phase 7: Selenium E2E Test Expansion](#phase-7-selenium-e2e-test-expansion)
8. [Phase 8: Rules Document Sync](#phase-8-rules-document-sync)
9. [Appendix: Exact Value Tables](#appendix-exact-value-tables)

---

## Phase 1: Data Integrity Fixes

### Goal
Fix all mismatches between `map-data.js`, `diplomacy-engine.js`, `faction-abilities.js`, and `RULES.md`. After this phase, every source of truth must agree exactly.

### 1.1 Breen Home Systems Mismatch

**Problem:** `shared/map-data.js` marks 6 Breen planets as `home: true` (`breen`, `portas`, `dozaria`, `breen_core`, `breen_citadel`, `breen_fortress`). But `backend/src/engine/diplomacy-engine.js` FACTIONS.breen.homeSystems only lists 4: `['breen', 'portas', 'dozaria', 'breen_core']`. RULES.md says 4 home systems. Two planets (`breen_citadel`, `breen_fortress`) are orphaned — marked home in map data but not recognized by the engine for builds.

**Decision:** The Breen should have 4 home systems per the rules. Remove the `home: true` flag from `breen_citadel` and `breen_fortress` in map-data.js but keep them as Breen-faction supply centers (they're still Breen territory, just not build-eligible home planets).

**File: `shared/map-data.js`**
```javascript
// CHANGE these two lines:
breen_citadel: { name: "Breen Citadel", layer: 2, faction: 'breen', supply: true, home: true, ... },
breen_fortress: { name: "Breen Fortress", layer: 2, faction: 'breen', supply: true, home: true, ... },

// TO:
breen_citadel: { name: "Breen Citadel", layer: 2, faction: 'breen', supply: true, home: false, ... },
breen_fortress: { name: "Breen Fortress", layer: 2, faction: 'breen', supply: true, home: false, ... },
```

**Verification:** After this change, count all systems where `faction === 'breen' && home === true`. Must equal exactly 4: `breen`, `portas`, `dozaria`, `breen_core`. Count all systems where `faction === 'breen' && supply === true`. Must equal exactly 6.

### 1.2 Starting Unit Placement — Fleet Position Bug

**Problem:** In `diplomacy-engine.js`, `GameState.initialize()` places fleets at `getOrbitPosition(unit.location)` for all fleet starting units. But the FACTIONS config specifies fleet locations as bare planet IDs (e.g., `{ type: 'fleet', location: 'earth' }`). This is correct — fleets start in orbit. However, verify that the RULES.md starting units table matches the FACTIONS config exactly.

**Verification checklist (compare RULES.md table vs FACTIONS in diplomacy-engine.js):**

| Faction | RULES.md Armies | Engine Armies | RULES.md Fleets | Engine Fleets | Match? |
|---------|----------------|--------------|-----------------|--------------|--------|
| Federation | Earth, Vulcan, Andoria | earth, vulcan, andoria | Earth, Vulcan | earth, vulcan | ✓ |
| Klingon | Qo'noS, Ty'Gokor | qonos, tygokor | Qo'noS, Narendra, Boreth | qonos, narendra, boreth | ✓ |
| Romulan | Romulus, Remus | romulus, remus | Romulus, Rator | romulus, rator | ✓ |
| Cardassian | Cardassia, Chin'toka, Septimus | cardassia, chintoka, septimus | Cardassia, Kelvas | cardassia, kelvas | ✓ |
| Ferengi | Ferenginar, Volchok | ferenginar, volchok | Ferenginar | ferenginar | ✓ |
| Breen | Breen, Portas | breen, portas | Breen, Dozaria | breen, dozaria | ✓ |
| Gorn | Gornar, S'sgaron, Seudath | gornar, ssgaron, seudath | Gornar, Gorn Fortress | gornar, gorn_fortress | ✓ |

If any don't match, fix the engine FACTIONS to match RULES.md.

### 1.3 Latinum Economy Scope Bug

**Problem:** In `backend/src/engine/faction-abilities.js`, `LatinumEconomy.processIncome()` gives ALL factions latinum income via `const rate = ability?.incomePerSC || 0.33`. Non-Ferengi factions get a 0.33 rate. RULES.md says latinum is Ferengi-exclusive.

**File: `backend/src/engine/faction-abilities.js`**

Replace the entire `processIncome` method:

```javascript
processIncome(gameState) {
    // Latinum income is Ferengi-exclusive per rules
    const ferengiRate = FACTION_ABILITIES.ferengi.incomePerSC;
    const ferengiSCs = gameState.countSupplyCenters('ferengi');
    // Do NOT floor — use exact value to allow fractional accumulation
    const income = ferengiSCs * ferengiRate;

    if (!this.balances['ferengi']) this.balances['ferengi'] = 0;
    this.balances['ferengi'] += income;
    this.transactions.push({
        turn: gameState.turn,
        faction: 'ferengi',
        type: 'income',
        amount: income,
        balance: this.balances['ferengi']
    });
}
```

**Note:** We're removing the `Math.floor()` so fractional latinum accumulates properly. At 0.5 per SC, 3 SCs = 1.5 latinum per turn, which should not be floored to 1. (We will increase the rate in Phase 3, but the floor removal matters regardless.)

### 1.4 Unit Test Updates for Phase 1

**File: `backend/src/engine/__tests__/adjudication.test.js`**

Add a new test group at the top of the file after the existing "Basic Movement" group:

```javascript
describe('Data Integrity', () => {
    test('Breen has exactly 4 home systems in engine', () => {
        expect(FACTIONS.breen.homeSystems).toHaveLength(4);
        expect(FACTIONS.breen.homeSystems).toEqual(
            expect.arrayContaining(['breen', 'portas', 'dozaria', 'breen_core'])
        );
    });

    test('Breen has exactly 6 supply centers in map data', () => {
        const breenSCs = Object.entries(SYSTEMS)
            .filter(([_, s]) => s.faction === 'breen' && s.supply);
        expect(breenSCs).toHaveLength(6);
    });

    test('Breen non-home supply centers cannot be used for builds', () => {
        const state = freshState();
        state.initialize();
        const handler = new BuildPhaseHandler(state);
        // Breen_citadel is owned by breen but is not a home system
        state.ownership['breen_citadel'] = 'breen';
        const locations = handler.getAvailableBuildLocations('breen');
        expect(locations.armies).not.toContain('breen_citadel');
        expect(locations.fleets).not.toContain('breen_citadel:orbit');
    });

    test('All faction starting unit counts match FACTIONS config', () => {
        const state = new GameState();
        // Need to initialize map data before this
        state.initialize();
        Object.entries(FACTIONS).forEach(([factionId, faction]) => {
            const units = state.getUnits(factionId);
            const expectedCount = faction.startingUnits.length;
            expect(units.length).toBe(expectedCount);
        });
    });

    test('Every home system in FACTIONS exists in SYSTEMS', () => {
        Object.entries(FACTIONS).forEach(([factionId, faction]) => {
            faction.homeSystems.forEach(planet => {
                expect(SYSTEMS[planet]).toBeDefined();
                expect(SYSTEMS[planet].faction).toBe(factionId);
                expect(SYSTEMS[planet].supply).toBe(true);
            });
        });
    });
});
```

**File: `backend/src/engine/__tests__/abilities.test.js`**

Add test for latinum scope:

```javascript
describe('Latinum Economy Scope', () => {
    test('Only Ferengi receives latinum income', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['federation', 'klingon', 'ferengi']);

        // Create a mock gameState
        const mockState = {
            countSupplyCenters: (faction) => {
                if (faction === 'ferengi') return 3;
                if (faction === 'federation') return 5;
                if (faction === 'klingon') return 5;
                return 0;
            },
            turn: 1,
        };

        economy.processIncome(mockState);

        expect(economy.getBalance('ferengi')).toBeGreaterThan(0);
        expect(economy.getBalance('federation')).toBe(0);
        expect(economy.getBalance('klingon')).toBe(0);
    });

    test('Latinum income is not floored', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['ferengi']);

        const mockState = {
            countSupplyCenters: () => 3, // 3 * 0.5 = 1.5
            turn: 1,
        };

        economy.processIncome(mockState);
        expect(economy.getBalance('ferengi')).toBe(1.5);
    });
});
```

**Run all tests after Phase 1. Every existing test must still pass.**

---

## Phase 2: Faction Rebalancing — Engine Changes

### Goal
Rebalance the four problematic factions: Klingon (too strong), Gorn (random), Romulan (too weak), Ferengi (unviable). The design intent is asymmetric balance — factions should feel different but have roughly equal win probability.

### 2.1 Klingon: Nerf Warrior's Rage

**Current:** +1 to ALL attack moves, -1 to ALL defenses. A single unsupported Klingon attacker has strength 2 vs a standard defender at 1 — auto-win without support.

**New design:** +1 attack on the **first** move order submitted each turn only. -1 defense on hold ONLY when no friendly fleet is in orbit (stacks with the existing fleet-in-orbit penalty, meaning an unprotected Klingon army defends at -2, but a Klingon army WITH fleet in orbit defends at normal 1).

**Rationale:** This preserves the Klingon glass-cannon identity but makes it a single tactical choice per turn rather than a blanket bonus. The defense penalty now interacts with the fleet-in-orbit mechanic — Klingons are extra-punished for not having fleet cover, which is thematic and creates interesting strategic decisions.

**File: `backend/src/engine/faction-abilities.js`**

```javascript
// CHANGE:
klingon: {
    name: "Warrior's Rage",
    description: "+1 attack strength, -1 defense strength (glass cannon)",
    passive: true,
    effect: 'attack_bonus_defense_penalty',
    attackBonus: 1,
    defensePenalty: 1
},

// TO:
klingon: {
    name: "Warrior's Rage",
    description: "+1 attack on first move order each turn. -1 defense when holding without fleet in orbit.",
    passive: true,
    effect: 'first_strike',
    attackBonus: 1,
    defensePenaltyNoFleet: 1,  // Only applies when no friendly fleet in orbit
    maxBonusMoves: 1           // Only first move gets the bonus
},
```

**File: `backend/src/game-manager.js` — `resolveOrders()` method**

Replace the Klingon bonus/penalty block (currently around lines 245-255):

```javascript
// OLD CODE (remove entirely):
// Apply Klingon bonuses/penalties
Object.values(this.pendingOrders)
    .flat()
    .forEach(order => {
        if (order.faction === 'klingon') {
            if (order.type === 'move') {
                order.klingonBonus = FACTION_ABILITIES.klingon.attackBonus;
            } else {
                order.klingonPenalty = FACTION_ABILITIES.klingon.defensePenalty;
            }
        }
    });

// NEW CODE:
// Apply Klingon first-strike: only the FIRST move order gets +1 attack
const klingonOrders = this.pendingOrders['klingon'] || [];
let klingonBonusApplied = false;
klingonOrders.forEach(order => {
    if (order.type === 'move' && !klingonBonusApplied) {
        order.klingonBonus = FACTION_ABILITIES.klingon.attackBonus;
        klingonBonusApplied = true;
    }
    // Defense penalty is now calculated in the adjudicator based on fleet-in-orbit status
    // Do NOT set klingonPenalty here anymore
});
```

**File: `backend/src/engine/diplomacy-engine.js` — `_calculateDefenseStrength()` method**

Replace the Klingon defense penalty block (currently around lines 846-849):

```javascript
// OLD CODE (remove):
// Klingon defense penalty
const defenderOrder = this.orders.find(o => o.location === destination && o.faction === defender.faction);
if (defenderOrder?.klingonPenalty) {
    strength -= defenderOrder.klingonPenalty;
}

// NEW CODE:
// Klingon defense penalty: applies ONLY when holding without friendly fleet in orbit
if (defender.faction === 'klingon' && posType === POSITION_TYPES.PLANET && defender.type === UNIT_TYPES.ARMY) {
    const orbitPos = getOrbitPosition(destination);
    const orbitUnit = preResolutionUnits[orbitPos];
    const hasFriendlyFleet = orbitUnit && orbitUnit.faction === 'klingon';
    if (!hasFriendlyFleet) {
        // Note: the standard fleet-in-orbit penalty is also applied below,
        // so a Klingon army without fleet cover gets -2 total (Klingon penalty + standard penalty)
        strength -= 1;
    }
}
```

### 2.2 Gorn: Make Resilience Deterministic

**Current:** 50% random survival chance on dislodgement. Introduces non-determinism into a deterministic game.

**New design:** When a Gorn unit is dislodged with **no valid retreats**, it automatically retreats to the nearest unoccupied Gorn home system. If all home systems are occupied, the unit is disbanded as normal. This is guaranteed, not random.

**Note:** This only triggers when a unit has NO valid retreats — if there are valid retreat destinations, the Gorn player must choose like anyone else. This replaces the 50% coin flip entirely.

**File: `backend/src/engine/faction-abilities.js`**

```javascript
// CHANGE:
gorn: {
    name: "Reptilian Resilience",
    description: "50% chance to survive destruction and return to nearest home system",
    passive: true,
    effect: 'survival_chance',
    survivalChance: 0.5
},

// TO:
gorn: {
    name: "Reptilian Resilience",
    description: "When dislodged with no valid retreats, automatically return to nearest unoccupied home system instead of being disbanded.",
    passive: true,
    effect: 'guaranteed_retreat_home',
},
```

Replace the `checkGornResilience` method:

```javascript
// OLD CODE (remove):
checkGornResilience(faction, originalLocation) {
    if (faction !== 'gorn') return { survived: false };
    const chance = FACTION_ABILITIES.gorn.survivalChance;
    if (Math.random() < chance) {
        const homeSystem = this.findNearestHomeSystem('gorn', originalLocation);
        return { survived: true, returnTo: homeSystem };
    }
    return { survived: false };
}

// NEW CODE:
checkGornResilience(faction, originalLocation, retreatOptions = []) {
    if (faction !== 'gorn') return { survived: false };
    // Only triggers when there are NO valid normal retreats
    if (retreatOptions && retreatOptions.length > 0) return { survived: false };

    const homeSystem = this.findNearestHomeSystem('gorn', originalLocation);
    if (homeSystem) {
        return { survived: true, returnTo: homeSystem };
    }
    // All home systems occupied — unit is disbanded
    return { survived: false };
}
```

Also update `findNearestHomeSystem` to be smarter about "nearest":

```javascript
// REPLACE:
findNearestHomeSystem(faction, from) {
    const { FACTIONS } = require('./diplomacy-engine');
    const homes = FACTIONS[faction]?.homeSystems || [];
    return homes.find(h => !this.state.units[h]) || homes[0];
}

// WITH:
findNearestHomeSystem(faction, from) {
    const { FACTIONS } = require('./diplomacy-engine');
    const homes = FACTIONS[faction]?.homeSystems || [];
    // Return first unoccupied home system, or null if all occupied
    const available = homes.filter(h => !this.state.units[h]);
    if (available.length === 0) return null;
    // TODO: In future, could use BFS to find truly nearest by graph distance
    return available[0];
}
```

**File: `backend/src/game-manager.js` — `resolveOrders()` method**

Update the Gorn resilience block (around line 269). The `checkGornResilience` now needs retreatOptions passed in:

```javascript
// OLD CODE:
Object.entries(this.state.dislodged).forEach(([location, dislodged]) => {
    if (dislodged.faction === 'gorn') {
        const resilience = this.abilities.checkGornResilience('gorn', location);

// NEW CODE:
Object.entries(this.state.dislodged).forEach(([location, dislodged]) => {
    if (dislodged.faction === 'gorn') {
        const resilience = this.abilities.checkGornResilience('gorn', location, dislodged.retreatOptions);
```

Do the same in `resolveRetreats()` (around line 369):

```javascript
// OLD CODE:
const resilience = this.abilities.checkGornResilience('gorn', loc);

// NEW CODE:
const resilience = this.abilities.checkGornResilience('gorn', loc, dislodged.retreatOptions);
```

### 2.3 Romulan: Buff Intelligence Ability

**Current:** See 1-2 random enemy orders. Barely useful — you might see one hold order from a faction you don't care about.

**New design:** Each turn, the Romulan player **chooses one enemy faction** and sees ALL of that faction's orders for the turn. This is a meaningful intelligence advantage that rewards good strategic thinking about which faction to spy on.

**File: `backend/src/engine/faction-abilities.js`**

```javascript
// CHANGE:
romulan: {
    name: "Tal Shiar Intelligence",
    description: "Each turn, reveal 1-2 random enemy orders before resolution",
    passive: true,
    effect: 'reveal_orders',
    ordersRevealed: { min: 1, max: 2 }
},

// TO:
romulan: {
    name: "Tal Shiar Intelligence",
    description: "Each turn, choose one enemy faction and see all their orders before resolution.",
    passive: true,
    effect: 'spy_on_faction',
},
```

Replace `useIntelligence`:

```javascript
// OLD CODE (remove):
useIntelligence(enemyOrders) {
    const numToReveal = Math.floor(Math.random() * 2) + 1;
    const allOrders = Object.entries(enemyOrders)
        .filter(([f]) => f !== 'romulan')
        .flatMap(([faction, orders]) => orders.map(o => ({ ...o, faction })));
    const shuffled = allOrders.sort(() => Math.random() - 0.5);
    this.revealedOrders = shuffled.slice(0, numToReveal);
    return this.revealedOrders;
}

// NEW CODE:
useIntelligence(enemyOrders, targetFaction = null) {
    if (!targetFaction || targetFaction === 'romulan') {
        this.revealedOrders = [];
        return this.revealedOrders;
    }
    const targetOrders = enemyOrders[targetFaction] || [];
    this.revealedOrders = targetOrders.map(o => ({ ...o, faction: targetFaction }));
    return this.revealedOrders;
}
```

**File: `backend/src/game-manager.js`**

Add a new field to track Romulan spy target:

```javascript
// In constructor, add:
this.romulanSpyTarget = null;
```

Add a new method:

```javascript
/**
 * Set Romulan spy target for this turn
 */
setRomulanSpyTarget(faction, targetFaction) {
    if (faction !== 'romulan') {
        return { success: false, reason: 'Only Romulan can use Tal Shiar' };
    }
    if (targetFaction === 'romulan') {
        return { success: false, reason: 'Cannot spy on yourself' };
    }
    if (this.state.isEliminated(targetFaction)) {
        return { success: false, reason: 'Target faction is eliminated' };
    }
    this.romulanSpyTarget = targetFaction;
    return { success: true, target: targetFaction };
}
```

In `resolveOrders()`, update the Romulan intelligence trigger:

```javascript
// OLD CODE:
if (this.playerFactions['romulan'] && !this.state.isEliminated('romulan')) {
    this.abilities.useIntelligence(this.pendingOrders);
}

// NEW CODE:
if (this.playerFactions['romulan'] && !this.state.isEliminated('romulan')) {
    this.abilities.useIntelligence(this.pendingOrders, this.romulanSpyTarget);
    this.romulanSpyTarget = null; // Reset after use
}
```

In `toJSON()` and `fromJSON()`, add `romulanSpyTarget` serialization.

**File: `backend/src/api/game-routes.js`**

Add a new API endpoint for setting the Romulan spy target. This should be called during the orders phase before resolution:

```javascript
// POST /api/game/:gameId/spy-target
// Body: { targetFaction: 'federation' }
router.post('/:gameId/spy-target', gameAuth, async (req, res) => {
    const { targetFaction } = req.body;
    const game = activeGames.get(req.params.gameId);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    const result = game.setRomulanSpyTarget(req.faction, targetFaction);
    res.json(result);
});
```

**Frontend:** In `getPlayerState()`, update the Romulan abilityData block:

```javascript
// In game-manager.js getAbilityData():
if (faction === 'romulan') {
    data.revealedOrders = this.abilities.revealedOrders || [];
    data.spyTarget = this.romulanSpyTarget;
    data.availableTargets = Object.keys(this.playerFactions)
        .filter(f => f !== 'romulan' && !this.state.isEliminated(f));
}
```

The frontend `FactionAbilityPanel.jsx` needs a dropdown/selector for the Romulan spy target. Add a select element that lists available target factions and calls the `/spy-target` endpoint.

### 2.4 Unit Tests for Rebalancing

**File: `backend/src/engine/__tests__/adjudication.test.js`**

Add a new test group:

```javascript
describe('Klingon First Strike (v2.1)', () => {
    test('First Klingon move gets +1 attack', () => {
        const state = freshState();
        state.units['qonos'] = { faction: 'klingon', type: 'army' };
        state.units['narendra'] = { faction: 'federation', type: 'army' };
        state.units['narendra:orbit'] = { faction: 'federation', type: 'fleet' };

        const adj = new Adjudicator(state);
        adj.setOrders({
            klingon: [
                { type: 'move', location: 'qonos', destination: 'narendra', faction: 'klingon', klingonBonus: 1 },
            ],
            federation: [
                { type: 'hold', location: 'narendra', faction: 'federation' },
                { type: 'hold', location: 'narendra:orbit', faction: 'federation' },
            ],
        });
        const results = adj.adjudicate();
        // Klingon attacks at 2, Federation defends at 1 (has fleet in orbit) → Klingon wins
        expect(state.units['narendra']?.faction).toBe('klingon');
    });

    test('Second Klingon move does NOT get +1 attack', () => {
        const state = freshState();
        state.units['qonos'] = { faction: 'klingon', type: 'army' };
        state.units['tygokor'] = { faction: 'klingon', type: 'army' };
        state.units['narendra'] = { faction: 'federation', type: 'army' };
        state.units['narendra:orbit'] = { faction: 'federation', type: 'fleet' };
        state.units['archanis'] = { faction: 'federation', type: 'army' };
        state.units['archanis:orbit'] = { faction: 'federation', type: 'fleet' };

        const adj = new Adjudicator(state);
        adj.setOrders({
            klingon: [
                // First move gets bonus
                { type: 'move', location: 'qonos', destination: 'narendra', faction: 'klingon', klingonBonus: 1 },
                // Second move does NOT get bonus
                { type: 'move', location: 'tygokor', destination: 'archanis', faction: 'klingon' },
            ],
            federation: [
                { type: 'hold', location: 'narendra', faction: 'federation' },
                { type: 'hold', location: 'narendra:orbit', faction: 'federation' },
                { type: 'hold', location: 'archanis', faction: 'federation' },
                { type: 'hold', location: 'archanis:orbit', faction: 'federation' },
            ],
        });
        const results = adj.adjudicate();
        // Second attack at 1 vs defense at 1 → standoff
        expect(state.units['archanis']?.faction).toBe('federation');
    });

    test('Klingon army without fleet in orbit defends at -2 (Klingon penalty + standard penalty)', () => {
        const state = freshState();
        state.units['qonos'] = { faction: 'klingon', type: 'army' };
        // No fleet in orbit
        state.units['narendra'] = { faction: 'federation', type: 'army' };

        const adj = new Adjudicator(state);
        adj.setOrders({
            federation: [
                { type: 'move', location: 'narendra', destination: 'qonos', faction: 'federation' },
            ],
            klingon: [
                { type: 'hold', location: 'qonos', faction: 'klingon' },
            ],
        });
        const results = adj.adjudicate();
        // Federation attacks at 1, Klingon defends at 1 - 1 (no fleet) - 1 (Klingon) = -1
        // Federation wins
        expect(state.units['qonos']?.faction).toBe('federation');
    });

    test('Klingon army WITH fleet in orbit defends at 1 (no Klingon penalty)', () => {
        const state = freshState();
        state.units['qonos'] = { faction: 'klingon', type: 'army' };
        state.units['qonos:orbit'] = { faction: 'klingon', type: 'fleet' };
        state.units['narendra'] = { faction: 'federation', type: 'army' };

        const adj = new Adjudicator(state);
        adj.setOrders({
            federation: [
                { type: 'move', location: 'narendra', destination: 'qonos', faction: 'federation' },
            ],
            klingon: [
                { type: 'hold', location: 'qonos', faction: 'klingon' },
                { type: 'hold', location: 'qonos:orbit', faction: 'klingon' },
            ],
        });
        const results = adj.adjudicate();
        // Federation attacks at 1, Klingon defends at 1 → standoff
        expect(state.units['qonos']?.faction).toBe('klingon');
    });
});

describe('Gorn Deterministic Resilience (v2.1)', () => {
    test('Gorn unit with no retreats goes to home system', () => {
        const state = freshState();
        // Set up Gorn unit surrounded
        state.units['gornar'] = { faction: 'gorn', type: 'army' };
        state.units['ssgaron'] = { faction: 'federation', type: 'army' };
        state.units['seudath'] = { faction: 'federation', type: 'army' };
        // Simulate dislodgement with no retreat options
        state.dislodged['gornar'] = {
            faction: 'gorn',
            type: 'army',
            retreatOptions: [], // No valid retreats
        };

        const abilities = new (require('../faction-abilities').AbilityManager)(state, null);
        const result = abilities.checkGornResilience('gorn', 'gornar', []);
        expect(result.survived).toBe(true);
        expect(result.returnTo).toBeDefined();
    });

    test('Gorn unit WITH valid retreats does not trigger resilience', () => {
        const abilities = new (require('../faction-abilities').AbilityManager)(
            { units: {} }, null
        );
        const result = abilities.checkGornResilience('gorn', 'gornar', ['ssgaron']);
        expect(result.survived).toBe(false);
    });

    test('Gorn unit with all home systems occupied is disbanded', () => {
        const state = freshState();
        // Fill all Gorn home systems
        FACTIONS.gorn.homeSystems.forEach(h => {
            state.units[h] = { faction: 'gorn', type: 'army' };
        });

        const abilities = new (require('../faction-abilities').AbilityManager)(state, null);
        const result = abilities.checkGornResilience('gorn', 'cestus', []);
        expect(result.survived).toBe(false);
    });
});
```

---

## Phase 3: Latinum Economy Overhaul

### Goal
Make the Ferengi economically viable and the latinum victory achievable within a normal game length (10-20 turns / 5-10 years).

### 3.1 New Latinum Values

**File: `backend/src/engine/faction-abilities.js`**

```javascript
// CHANGE:
ferengi: {
    name: "Rules of Acquisition",
    description: "Earn latinum from supply centers. Spend 15 latinum to bribe a neutral SC. Spend 25 latinum to sabotage one enemy support.",
    passive: true,
    effect: 'latinum_master',
    incomePerSC: 0.5,
    bribeCost: 15,
    sabotageCost: 25
},

// TO:
ferengi: {
    name: "Rules of Acquisition",
    description: "Earn 3 latinum per supply center each Fall. Spend 10 to bribe a neutral SC, 15 to sabotage an enemy support, 8 to spy on one faction's orders.",
    passive: true,
    effect: 'latinum_master',
    incomePerSC: 3,
    bribeCost: 10,
    sabotageCost: 15,
    espionageCost: 8,
},
```

### 3.2 New Ferengi Ability: Espionage

Add a third spending option: for 8 latinum, the Ferengi can see all orders from one faction (similar to the Romulan ability but costs money each time).

**File: `backend/src/engine/faction-abilities.js` — `AbilityManager` class**

Add new method:

```javascript
// Ferengi: Buy intelligence on a faction
buyEspionage(targetFaction, allOrders) {
    const cost = FACTION_ABILITIES.ferengi.espionageCost;
    if (!this.economy.canAfford('ferengi', cost)) {
        return { success: false, reason: 'Insufficient latinum' };
    }
    if (targetFaction === 'ferengi') {
        return { success: false, reason: 'Cannot spy on yourself' };
    }

    this.economy.spend('ferengi', cost, `Espionage on ${targetFaction}`);
    const targetOrders = allOrders[targetFaction] || [];
    return {
        success: true,
        orders: targetOrders.map(o => ({ ...o, faction: targetFaction })),
        cost,
    };
}
```

### 3.3 Latinum Victory Threshold

**File: `backend/src/engine/diplomacy-engine.js`**

```javascript
// CHANGE:
ferengi: { supplyCenters: 8, latinum: 100 },

// TO:
ferengi: { supplyCenters: 8, latinum: 50 },
```

### 3.4 Economic Math Validation

With the new values, at 3 latinum/SC/turn:
- 3 home SCs = 9 latinum/turn → 50 latinum in ~6 turns (3 years). Fast if unchecked.
- 5 SCs = 15/turn → 50 in ~4 turns. Very fast.
- But spending on bribes (10), sabotage (15), espionage (8) drains the pool.
- At 3 SCs + 1 bribe/turn + 1 espionage/turn = 9 income - 18 spending = net -9. Must expand to fund abilities.

This creates a real tension: spend latinum on abilities (useful now) or hoard for economic victory (useful later). That's good game design.

### 3.5 Latinum Economy Tests

**File: `backend/src/engine/__tests__/abilities.test.js`**

```javascript
describe('Latinum Economy v2.1', () => {
    test('Ferengi earns 3 latinum per SC per turn', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['ferengi']);
        const mockState = { countSupplyCenters: () => 4, turn: 1 };
        economy.processIncome(mockState);
        expect(economy.getBalance('ferengi')).toBe(12);
    });

    test('Ferengi wins at 50 latinum', () => {
        // Test via GameManager.checkVictory
        // Set ferengi balance to 50, verify victory triggers
    });

    test('Espionage costs 8 latinum and reveals target orders', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['ferengi']);
        economy.balances['ferengi'] = 20;

        const state = { units: {} };
        const abilities = new AbilityManager(state, economy);

        const mockOrders = {
            federation: [
                { type: 'move', location: 'earth', destination: 'vulcan', faction: 'federation' },
            ],
        };

        const result = abilities.buyEspionage('federation', mockOrders);
        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(1);
        expect(economy.getBalance('ferengi')).toBe(12); // 20 - 8
    });

    test('Bribe costs 10 latinum', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['ferengi']);
        economy.balances['ferengi'] = 15;

        const state = { units: {} };
        const abilities = new AbilityManager(state, economy);

        const mockGameState = {
            systems: { bajor: { supply: true } },
            ownership: { bajor: null },
        };

        const result = abilities.bribeNeutralSC('bajor', mockGameState);
        expect(result.success).toBe(true);
        expect(economy.getBalance('ferengi')).toBe(5); // 15 - 10
    });

    test('Sabotage costs 15 latinum', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['ferengi']);
        economy.balances['ferengi'] = 20;

        const state = { units: {} };
        const abilities = new AbilityManager(state, economy);

        const result = abilities.sabotageSupport('federation', 'earth');
        expect(result.success).toBe(true);
        expect(economy.getBalance('ferengi')).toBe(5); // 20 - 15
    });
});
```

---

## Phase 4: Movement & Convoy Validation Tightening

### Goal
Prevent invalid order submissions that would silently fail during adjudication.

### 4.1 Reject Non-Adjacent Army Moves Without Convoy Flag

**File: `backend/src/engine/diplomacy-engine.js` — `OrderValidator._validateMove()`**

```javascript
// CHANGE:
_validateMove(unit, from, to) {
    if (!to) {
        return { valid: false, reason: 'No destination specified' };
    }
    if (!isAdjacent(from, to, unit.type)) {
        return { valid: false, reason: 'Destination not adjacent' };
    }
    const destType = getPositionType(to);
    if (!canUnitOccupy(unit.type, destType)) {
        return { valid: false, reason: `${unit.type} cannot occupy ${destType}` };
    }
    return { valid: true };
}

// TO:
_validateMove(unit, from, to) {
    if (!to) {
        return { valid: false, reason: 'No destination specified' };
    }
    const destType = getPositionType(to);
    if (!canUnitOccupy(unit.type, destType)) {
        return { valid: false, reason: `${unit.type} cannot occupy ${destType}` };
    }
    if (!isAdjacent(from, to, unit.type)) {
        // Non-adjacent moves are only valid for armies via convoy
        if (unit.type === UNIT_TYPES.ARMY && isPlanetPosition(from) && isPlanetPosition(to)) {
            return { valid: true, requiresConvoy: true };
        }
        return { valid: false, reason: 'Destination not adjacent' };
    }
    return { valid: true };
}
```

**File: `backend/src/game-manager.js` — `submitOrders()`**

After validation, mark non-adjacent army moves as requiring convoy:

```javascript
// In the validation loop, after validator.validateOrder():
orders.forEach((order, index) => {
    const result = validator.validateOrder({ ...order, faction });
    if (result.valid) {
        const validatedOrder = { ...order, faction };
        if (result.requiresConvoy) {
            validatedOrder.viaConvoy = true;
        }
        validatedOrders.push(validatedOrder);
    } else {
        errors.push({ index, order, reason: result.reason });
    }
});
```

### 4.2 Duplicate Order Detection

**File: `backend/src/game-manager.js` — `submitOrders()`**

Add duplicate detection before validation:

```javascript
// Add at the start of submitOrders, after phase check:
// Check for duplicate orders to the same unit
const locations = orders.map(o => o.location);
const duplicates = locations.filter((loc, i) => locations.indexOf(loc) !== i);
if (duplicates.length > 0) {
    return {
        success: false,
        reason: `Duplicate orders for locations: ${[...new Set(duplicates)].join(', ')}`,
    };
}

// Check order count doesn't exceed unit count
const unitCount = this.state.getUnits(faction).length;
if (orders.length > unitCount) {
    return {
        success: false,
        reason: `Too many orders (${orders.length}) for units (${unitCount})`,
    };
}
```

### 4.3 Tests for Validation Tightening

```javascript
describe('Order Validation v2.1', () => {
    test('Non-adjacent army move is flagged as requiring convoy', () => {
        const state = freshState();
        state.units['earth'] = { faction: 'federation', type: 'army' };

        const validator = new OrderValidator(state);
        // earth -> romulus is not adjacent, but both are planets
        const result = validator.validateOrder({
            type: 'move', location: 'earth', destination: 'romulus', faction: 'federation',
        });
        expect(result.valid).toBe(true);
        expect(result.requiresConvoy).toBe(true);
    });

    test('Non-adjacent fleet move is rejected (fleets cannot convoy)', () => {
        const state = freshState();
        const edgeId = createEdgeId('earth', 'vulcan');
        state.units[edgeId] = [{ faction: 'federation', type: 'fleet' }];

        const validator = new OrderValidator(state);
        // Try to move fleet to a non-adjacent orbit
        const result = validator.validateOrder({
            type: 'move', location: edgeId, destination: 'romulus:orbit', faction: 'federation',
        });
        expect(result.valid).toBe(false);
    });

    test('Duplicate orders are rejected', () => {
        // This should be tested at the GameManager level
        // Create a game, submit two orders for the same location
    });
});
```

---

## Phase 5: Monte Carlo Balance Simulator

### Goal
Create a standalone simulation harness that plays thousands of random/heuristic games and measures faction win rates, average game length, and elimination rates. This validates balance changes without manual playtesting.

### 5.1 Create Simulation Directory

```
simulations/
├── package.json
├── simulate.js          # Main runner
├── strategies/
│   ├── random.js        # Pure random valid orders
│   ├── aggressive.js    # Prioritize attacking neutrals, then weakest neighbor
│   ├── defensive.js     # Hold home systems, only attack adjacent neutrals
│   └── balanced.js      # Mix of attack/defend based on SC count
├── analysis.js          # Win rate analysis and reporting
└── results/             # Output directory for CSV/JSON results
```

### 5.2 Simulation Engine

**File: `simulations/package.json`**

```json
{
    "name": "star-trek-diplomacy-simulations",
    "version": "1.0.0",
    "description": "Monte Carlo balance simulation for Star Trek Diplomacy",
    "scripts": {
        "sim:quick": "node simulate.js --games=100 --strategy=random",
        "sim:full": "node simulate.js --games=1000 --strategy=balanced",
        "sim:aggressive": "node simulate.js --games=500 --strategy=aggressive",
        "sim:all": "node simulate.js --games=500 --strategy=all --report",
        "analyze": "node analysis.js"
    },
    "dependencies": {}
}
```

**File: `simulations/simulate.js`**

Core requirements:
1. Import the engine directly (no HTTP, no database, no auth)
2. For each simulation:
   a. Create a fresh GameState, initialize it
   b. Each faction uses its assigned strategy to generate orders
   c. Resolve orders via Adjudicator
   d. Handle retreats automatically (random valid retreat or disband)
   e. Handle builds automatically (build armies on empty home planets first, then fleets)
   f. Check victory conditions
   g. Cap at 40 turns (20 years) — declare draw if no winner
3. Record per-game: winner faction, victory type, turn count, final SC counts per faction, eliminations
4. Output aggregate statistics

```javascript
/**
 * Monte Carlo Balance Simulator
 *
 * Usage:
 *   node simulate.js --games=1000 --strategy=random
 *   node simulate.js --games=500 --strategy=all --report
 *
 * Strategies: random, aggressive, defensive, balanced, all (runs each)
 */

const {
    GameState, Adjudicator, BuildPhaseHandler, RetreatPhaseHandler,
    OrderValidator, initializeMapData, FACTIONS, VICTORY_CONDITIONS,
    getValidDestinations, getPositionType, POSITION_TYPES, UNIT_TYPES,
} = require('../backend/src/engine/diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('../shared/map-data');
const { LatinumEconomy, AbilityManager, FACTION_ABILITIES } = require('../backend/src/engine/faction-abilities');
const { getOrbitPosition } = require('../shared/edge-utils');

// Parse CLI args
const args = Object.fromEntries(
    process.argv.slice(2).map(a => {
        const [k, v] = a.replace('--', '').split('=');
        return [k, v || true];
    })
);

const NUM_GAMES = parseInt(args.games) || 100;
const STRATEGY = args.strategy || 'random';
const MAX_TURNS = 40;
const REPORT = args.report || false;

// Initialize map data once
initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);

// --- Strategy implementations ---
// Each strategy function takes (faction, state, validMovesFn) and returns an array of orders.

function randomStrategy(faction, state) {
    const units = state.getUnits(faction);
    const orders = [];

    units.forEach(unit => {
        const destinations = getValidDestinations(unit.position, unit.type);
        const roll = Math.random();

        if (roll < 0.3 || destinations.length === 0) {
            // 30% hold
            orders.push({ type: 'hold', location: unit.position, faction });
        } else if (roll < 0.8) {
            // 50% move
            const dest = destinations[Math.floor(Math.random() * destinations.length)];
            orders.push({ type: 'move', location: unit.position, destination: dest, faction });
        } else {
            // 20% support a random friendly unit
            const friendlyUnits = state.getUnits(faction).filter(u => u.position !== unit.position);
            if (friendlyUnits.length > 0) {
                const target = friendlyUnits[Math.floor(Math.random() * friendlyUnits.length)];
                orders.push({
                    type: 'support', location: unit.position,
                    supportFrom: target.position, supportTo: target.position,
                    faction,
                });
            } else {
                orders.push({ type: 'hold', location: unit.position, faction });
            }
        }
    });

    return orders;
}

// Implement aggressive, defensive, balanced strategies similarly.
// aggressive: always try to move toward nearest unowned SC
// defensive: hold home, only attack adjacent unowned neutrals
// balanced: if SC count < 50% of victory threshold, be aggressive; else defensive

function simulateGame(strategyFn) {
    const state = new GameState();
    state.initialize();
    const economy = new LatinumEconomy();
    economy.initialize(Object.keys(FACTIONS));

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        // Orders phase
        const allOrders = {};
        Object.keys(FACTIONS).forEach(faction => {
            if (state.isEliminated(faction)) return;
            const orders = strategyFn(faction, state);

            // Apply Klingon first-strike bonus
            if (faction === 'klingon') {
                const firstMove = orders.find(o => o.type === 'move');
                if (firstMove) firstMove.klingonBonus = 1;
            }

            allOrders[faction] = orders;
        });

        // Adjudicate
        const adj = new Adjudicator(state);
        adj.setOrders(allOrders);
        adj.adjudicate();

        // Auto-resolve retreats
        Object.entries(state.dislodged).forEach(([location, dislodged]) => {
            // Gorn resilience
            if (dislodged.faction === 'gorn' && (!dislodged.retreatOptions || dislodged.retreatOptions.length === 0)) {
                const homes = FACTIONS.gorn.homeSystems;
                const available = homes.find(h => !state.units[h]);
                if (available) {
                    state.placeUnit(available, { faction: 'gorn', type: dislodged.type });
                    delete state.dislodged[location];
                    return;
                }
            }

            if (dislodged.retreatOptions && dislodged.retreatOptions.length > 0) {
                const dest = dislodged.retreatOptions[Math.floor(Math.random() * dislodged.retreatOptions.length)];
                state.placeUnit(dest, { faction: dislodged.faction, type: dislodged.type });
            }
            delete state.dislodged[location];
        });

        // Fall: update ownership, builds, check victory
        if (turn % 2 === 1) { // Fall turns are odd-indexed (0=Spring, 1=Fall, 2=Spring...)
            const buildHandler = new BuildPhaseHandler(state);
            buildHandler.updateOwnership();

            // Ferengi income
            economy.processIncome(state);

            // Auto-builds
            Object.keys(FACTIONS).forEach(faction => {
                if (state.isEliminated(faction)) return;
                const buildCount = buildHandler.calculateBuilds(faction);
                if (buildCount > 0) {
                    const locations = buildHandler.getAvailableBuildLocations(faction);
                    let remaining = buildCount;
                    // Build armies first
                    for (const loc of locations.armies) {
                        if (remaining <= 0) break;
                        buildHandler.processBuild(faction, loc, 'army');
                        remaining--;
                    }
                    // Then fleets
                    for (const loc of locations.fleets) {
                        if (remaining <= 0) break;
                        buildHandler.processBuild(faction, loc, 'fleet');
                        remaining--;
                    }
                } else if (buildCount < 0) {
                    // Must disband
                    const units = state.getUnits(faction);
                    let toDisband = Math.abs(buildCount);
                    for (const unit of units) {
                        if (toDisband <= 0) break;
                        state.removeUnit(unit.position, faction);
                        toDisband--;
                    }
                }
            });

            // Check victory
            for (const [faction, conditions] of Object.entries(VICTORY_CONDITIONS)) {
                const sc = state.countSupplyCenters(faction);
                if (sc >= conditions.supplyCenters) {
                    return {
                        winner: faction, type: 'solo', turn: turn + 1,
                        scCounts: getScCounts(state),
                    };
                }
                if (faction === 'ferengi' && conditions.latinum &&
                    economy.getBalance('ferengi') >= conditions.latinum) {
                    return {
                        winner: 'ferengi', type: 'latinum', turn: turn + 1,
                        scCounts: getScCounts(state),
                        latinum: economy.getBalance('ferengi'),
                    };
                }
            }
        }

        // Advance season
        if (state.season === 'fall') {
            state.season = 'spring';
            state.year++;
        } else {
            state.season = 'fall';
        }
        state.turn++;
    }

    // Draw — no winner within MAX_TURNS
    return {
        winner: null, type: 'draw', turn: MAX_TURNS,
        scCounts: getScCounts(state),
    };
}

function getScCounts(state) {
    const counts = {};
    Object.keys(FACTIONS).forEach(f => {
        counts[f] = state.countSupplyCenters(f);
    });
    return counts;
}

// --- Run simulations ---
console.log(`Running ${NUM_GAMES} games with strategy: ${STRATEGY}`);
console.log(`Max turns per game: ${MAX_TURNS}`);
console.log('');

const results = [];
const startTime = Date.now();

for (let i = 0; i < NUM_GAMES; i++) {
    const result = simulateGame(randomStrategy); // Replace with strategy selection
    results.push(result);
    if ((i + 1) % 100 === 0) {
        console.log(`  Completed ${i + 1}/${NUM_GAMES} games...`);
    }
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nCompleted in ${elapsed}s\n`);

// --- Analyze results ---
const wins = {};
const eliminations = {};
const avgTurns = results.reduce((sum, r) => sum + r.turn, 0) / results.length;
const draws = results.filter(r => r.winner === null).length;

Object.keys(FACTIONS).forEach(f => {
    wins[f] = results.filter(r => r.winner === f).length;
    // Could also track elimination rates from scCounts
});

console.log('=== BALANCE REPORT ===');
console.log(`Games: ${NUM_GAMES} | Avg turns: ${avgTurns.toFixed(1)} | Draws: ${draws}`);
console.log('');
console.log('Faction Win Rates:');
Object.entries(wins)
    .sort((a, b) => b[1] - a[1])
    .forEach(([f, w]) => {
        const pct = ((w / NUM_GAMES) * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(w / NUM_GAMES * 50));
        console.log(`  ${f.padEnd(12)} ${String(w).padStart(4)} wins (${pct}%) ${bar}`);
    });

console.log('');
console.log('Average Final SC Counts:');
const avgSCs = {};
Object.keys(FACTIONS).forEach(f => {
    avgSCs[f] = results.reduce((sum, r) => sum + (r.scCounts[f] || 0), 0) / results.length;
});
Object.entries(avgSCs)
    .sort((a, b) => b[1] - a[1])
    .forEach(([f, sc]) => {
        console.log(`  ${f.padEnd(12)} ${sc.toFixed(1)} avg SCs`);
    });

// Save results to JSON
const fs = require('fs');
const outputDir = __dirname + '/results';
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
const filename = `${outputDir}/sim_${STRATEGY}_${NUM_GAMES}_${Date.now()}.json`;
fs.writeFileSync(filename, JSON.stringify({ args, results, summary: { wins, avgTurns, draws, avgSCs } }, null, 2));
console.log(`\nResults saved to ${filename}`);
```

### 5.3 Balance Targets

After running simulations, the target metrics are:

| Metric | Target | Acceptable Range |
|--------|--------|-----------------|
| Win rate per faction | ~14.3% (1/7) | 8% - 22% |
| Ferengi latinum victory rate | > 0% | 2% - 15% of Ferengi wins |
| Average game length | 15-25 turns | 10-35 turns |
| Draw rate | < 20% | < 30% |
| Early elimination rate (before turn 10) | < 10% per faction | < 15% |

If any faction's win rate is outside 8-22%, flag it for further balancing. The simulation should run the `balanced` strategy with 1000+ games to get statistically significant results.

---

## Phase 6: Map UX Improvements

### Goal
Make the 2D map readable, navigable, and usable for issuing orders without needing the 3D view.

### 6.1 Add SVG Zoom and Pan

**File: `frontend/src/components/map/GameMap.jsx`**

Add zoom/pan state and handlers to the GameMap component:

```javascript
// Add state:
const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
const [isPanning, setIsPanning] = useState(false);
const [panStart, setPanStart] = useState({ x: 0, y: 0 });
const svgRef = useRef(null);

// Add zoom handler:
const handleWheel = (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());

    setViewBox(prev => {
        const newW = prev.w * scaleFactor;
        const newH = prev.h * scaleFactor;
        const dx = (svgPoint.x - prev.x) * (1 - scaleFactor);
        const dy = (svgPoint.y - prev.y) * (1 - scaleFactor);
        return {
            x: prev.x + dx,
            y: prev.y + dy,
            w: Math.max(200, Math.min(1600, newW)),
            h: Math.max(150, Math.min(1200, newH)),
        };
    });
};

// Add pan handlers:
const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+click
        setIsPanning(true);
        setPanStart({ x: e.clientX, y: e.clientY });
    }
};

const handleMouseMove = (e) => {
    if (!isPanning) return;
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    const dx = (e.clientX - panStart.x) / ctm.a;
    const dy = (e.clientY - panStart.y) / ctm.d;
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    setPanStart({ x: e.clientX, y: e.clientY });
};

const handleMouseUp = () => setIsPanning(false);
```

Update the SVG element:

```jsx
<svg
    ref={svgRef}
    viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
    className="w-full h-full"
    style={{ background: '#0a0a12', cursor: isPanning ? 'grabbing' : 'default' }}
    onWheel={handleWheel}
    onMouseDown={handleMouseDown}
    onMouseMove={handleMouseMove}
    onMouseUp={handleMouseUp}
    onMouseLeave={handleMouseUp}
>
```

Add a "Reset View" button near the 2D/3D toggle:

```jsx
<button
    onClick={() => setViewBox({ x: 0, y: 0, w: 800, h: 600 })}
    className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
>
    Reset View
</button>
```

### 6.2 Always-Visible System Labels for Supply Centers

**In the Systems rendering block of GameMap.jsx**, change the system name rendering:

```jsx
// OLD: Only show on hover/select
{(isHovered || isSelected) && (
    <text y={-20} textAnchor="middle" fontSize="10" fill="#fff" className="pointer-events-none">
        {system.name}
    </text>
)}

// NEW: Always show for supply centers, hover-only for non-supply
{(system.supply || isHovered || isSelected) && (
    <text
        y={system.supply ? -14 : -20}
        textAnchor="middle"
        fontSize={system.supply ? '7' : '10'}
        fill={isHovered || isSelected ? '#fff' : '#aaa'}
        className="pointer-events-none"
        opacity={isHovered || isSelected ? 1 : 0.7}
    >
        {system.name}
    </text>
)}
```

### 6.3 Wider Hyperlane Click Targets

Wrap hyperlane lines in an invisible wider clickable area:

```jsx
// In the hyperlanes rendering, add an invisible wider line for click targeting:
<g key={`lane-${i}`}>
    {/* Invisible wide click target */}
    <line
        x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
        stroke="transparent"
        strokeWidth={12}
        style={{ cursor: 'pointer' }}
        onClick={() => handlePositionClick(edgeId)}
    />
    {/* Visible line */}
    <line
        x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
        stroke={edgeValid ? '#4ade80' : '#334'}
        strokeWidth={edgeValid ? 2 : 1}
        style={{ cursor: 'pointer' }}
        onClick={() => handlePositionClick(edgeId)}
    />
    {/* Fleet indicators... (keep existing code) */}
</g>
```

### 6.4 Visual Orbit Rings

Add a dashed ring around each planet to visually represent the orbit slot:

```jsx
{/* Orbit ring - always visible */}
<circle
    r={18}
    fill="none"
    stroke={orbitUnit ? FACTION_COLORS[orbitUnit.faction] : '#222'}
    strokeWidth={0.5}
    strokeDasharray={orbitUnit ? 'none' : '2,2'}
    opacity={0.4}
    onClick={() => handlePositionClick(id + ':orbit')}
    style={{ cursor: 'pointer' }}
/>
```

Add this BEFORE the supply center indicator circle in the system rendering group.

### 6.5 Phase and Turn Timer Display on Map

Add a status overlay in the top-center of the map:

```jsx
{/* Turn/Phase Status Overlay */}
<div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-space-blue/80 border border-lcars-orange rounded px-4 py-1 text-center">
    <span className="text-lcars-orange font-bold">
        {gameState?.season?.toUpperCase()} {gameState?.year}
    </span>
    <span className="text-white mx-2">|</span>
    <span className="text-lcars-tan">
        {gameState?.phase?.toUpperCase()}
    </span>
    {gameState?.turnDeadline && (
        <>
            <span className="text-white mx-2">|</span>
            <span className="text-red-400 text-sm">
                Deadline: {new Date(gameState.turnDeadline).toLocaleDateString()}
            </span>
        </>
    )}
</div>
```

### 6.6 Order Undo (Individual)

**File: `frontend/src/hooks/useGameStore.js`**

Add a `removeOrder` action to the Zustand store:

```javascript
removeOrder: (index) => set((state) => ({
    pendingOrders: state.pendingOrders.filter((_, i) => i !== index),
})),
```

**File: `frontend/src/components/map/GameMap.jsx`**

In the pending orders summary, add a remove button per order:

```jsx
{pendingOrders.map((order, i) => (
    <div key={i} className="text-white flex items-center gap-2">
        <span className="flex-1">
            {formatPosition(order.location)}: {order.type}
            {order.destination && ` → ${formatPosition(order.destination)}`}
        </span>
        <button
            onClick={() => useGameStore.getState().removeOrder(i)}
            className="text-red-400 hover:text-red-300 text-xs"
        >
            ✕
        </button>
    </div>
))}
```

### 6.7 Hyperspace Layer Toggle (2D)

Add a toggle to show/hide layers 1 and 3 on the 2D map. When enabled, hyperspace nodes render in a different visual style (smaller, translucent) and vertical lanes show as dashed lines.

```javascript
// Add state:
const [showHyperspace, setShowHyperspace] = useState(false);

// Add toggle button next to 2D/3D buttons:
<button
    onClick={() => setShowHyperspace(!showHyperspace)}
    className={`px-3 py-1 rounded ${showHyperspace ? 'bg-purple-600' : 'bg-gray-700'}`}
>
    Hyperspace
</button>
```

When `showHyperspace` is true, also render Layer 1 and Layer 3 systems and their hyperlanes. Vertical lanes should be rendered as dashed lines connecting core-layer positions to hyperspace positions.

The hyperspace system positions need to be projected into 2D. Since they use x/z coordinates in different ranges, you can offset them: Layer 3 systems render at `y - 80` (above the core), Layer 1 systems render at `y + 80` (below). Use a smaller node radius (2) and lower opacity (0.4) for hyperspace nodes.

---

## Phase 7: Selenium E2E Test Expansion

### Goal
Replace the placeholder tests in `tests/victory.test.js` and expand `tests/ui.test.js` with real Selenium tests that validate the rebalanced mechanics.

### 7.1 GamePage Page Object Updates

**File: `tests/pages/GamePage.js`**

Add new selectors and methods for v2.1 features:

```javascript
// Add selectors:
get romulanSpyTargetSelect() {
    return By.css('[data-testid="spy-target-select"]');
}

get ferengiLatinumDisplay() {
    return By.css('[data-testid="latinum-balance"]');
}

get ferengiBribeButton() {
    return By.xpath("//button[contains(text(), 'Bribe')]");
}

get ferengiSabotageButton() {
    return By.xpath("//button[contains(text(), 'Sabotage')]");
}

get ferengiEspionageButton() {
    return By.xpath("//button[contains(text(), 'Espionage')]");
}

get zoomResetButton() {
    return By.xpath("//button[contains(text(), 'Reset View')]");
}

get hyperspaceToggle() {
    return By.xpath("//button[contains(text(), 'Hyperspace')]");
}

get phaseOverlay() {
    return By.css('.absolute.top-4'); // The phase/turn status overlay
}

get orbitRings() {
    return By.css('circle[stroke-dasharray]'); // Dashed orbit rings
}

// Add methods:
async getLatinumBalance() {
    const el = await this.driver.findElement(this.ferengiLatinumDisplay);
    return parseFloat(await el.getText());
}

async selectSpyTarget(faction) {
    const select = await this.driver.findElement(this.romulanSpyTargetSelect);
    await select.click();
    const option = await this.driver.findElement(By.xpath(`//option[contains(text(), '${faction}')]`));
    await option.click();
}

async removeOrder(index) {
    const removeButtons = await this.driver.findElements(By.css('[data-testid="remove-order"]'));
    if (removeButtons[index]) {
        await removeButtons[index].click();
    }
}

async zoomIn() {
    // Simulate scroll on the SVG
    const svg = await this.driver.findElement(By.css('svg'));
    await this.driver.executeScript(
        "arguments[0].dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }))",
        svg
    );
}

async toggleHyperspace() {
    const btn = await this.driver.findElement(this.hyperspaceToggle);
    await btn.click();
}
```

### 7.2 New Selenium Tests

**File: `tests/balance-ui.test.js`** (new file)

```javascript
/**
 * Balance & Rebalance UI Tests (v2.1)
 * Validates that rebalanced mechanics are reflected correctly in the UI.
 */

const { TestHelper } = require('./helpers/test-helper');
const GamePage = require('./pages/GamePage');

describe('v2.1 Rebalance UI Tests', () => {
    let helper;

    beforeEach(() => {
        helper = new TestHelper();
    });

    afterEach(async () => {
        await helper.closeAll();
    });

    describe('Map UX Improvements', () => {
        test('supply center labels are always visible', async () => {
            const { drivers } = await helper.setupThreePlayerGame();
            const gamePage = new GamePage(drivers.driver1);
            await gamePage.waitForLoad();

            // Supply center system labels should be visible without hover
            const labels = await drivers.driver1.findElements(
                By.xpath("//text[contains(text(), 'Earth')]")
            );
            expect(labels.length).toBeGreaterThan(0);
            const opacity = await labels[0].getAttribute('opacity');
            expect(parseFloat(opacity)).toBeGreaterThan(0);
        });

        test('orbit rings are rendered around planets', async () => {
            const { drivers } = await helper.setupThreePlayerGame();
            const gamePage = new GamePage(drivers.driver1);
            await gamePage.waitForLoad();

            const rings = await drivers.driver1.findElements(gamePage.orbitRings);
            expect(rings.length).toBeGreaterThan(0);
        });

        test('zoom controls work', async () => {
            const { drivers } = await helper.setupThreePlayerGame();
            const gamePage = new GamePage(drivers.driver1);
            await gamePage.waitForLoad();

            // Get initial viewBox
            const svg = await drivers.driver1.findElement(By.css('svg'));
            const initialViewBox = await svg.getAttribute('viewBox');

            // Zoom in
            await gamePage.zoomIn();
            await drivers.driver1.sleep(500);

            const newViewBox = await svg.getAttribute('viewBox');
            expect(newViewBox).not.toBe(initialViewBox);
        });

        test('hyperspace toggle shows additional layers', async () => {
            const { drivers } = await helper.setupThreePlayerGame();
            const gamePage = new GamePage(drivers.driver1);
            await gamePage.waitForLoad();

            // Initially no hyperspace nodes visible
            const before = await drivers.driver1.findElements(
                By.xpath("//text[contains(text(), 'Hyperspace')]")
            );

            await gamePage.toggleHyperspace();
            await drivers.driver1.sleep(500);

            const after = await drivers.driver1.findElements(
                By.xpath("//text[contains(text(), 'Hyperspace')]")
            );
            expect(after.length).toBeGreaterThan(before.length);
        });

        test('individual order removal works', async () => {
            // Setup game, issue two orders, remove one, verify only one remains
        });

        test('phase and turn info displayed on map', async () => {
            const { drivers } = await helper.setupThreePlayerGame();
            const gamePage = new GamePage(drivers.driver1);
            await gamePage.waitForLoad();

            const phaseText = await drivers.driver1.findElement(gamePage.phaseOverlay);
            const text = await phaseText.getText();
            expect(text).toContain('SPRING');
            expect(text).toContain('2370');
        });
    });

    describe('Ferengi Latinum UI', () => {
        test('latinum balance displays for Ferengi player', async () => {
            // Create game, login as Ferengi, verify latinum display
        });

        test('bribe button is clickable when affordable', async () => {
            // Set up Ferengi with enough latinum, verify bribe button enabled
        });

        test('espionage button shows target selection', async () => {
            // Verify the espionage UI flow
        });
    });

    describe('Romulan Spy Target UI', () => {
        test('spy target selector shows available factions', async () => {
            // Login as Romulan, verify dropdown lists all non-eliminated, non-Romulan factions
        });

        test('selecting spy target reveals orders after resolution', async () => {
            // Select target, submit orders, resolve, verify revealed orders shown
        });
    });
});
```

### 7.3 Update tests/package.json

Add new test script:

```json
"test:balance": "jest --runInBand --testTimeout=120000 balance-ui.test.js"
```

---

## Phase 8: Rules Document Sync

### Goal
Update RULES.md to match all code changes. This is the last phase because all mechanical changes must be finalized first.

### 8.1 Changes to RULES.md

**Klingon ability section — REPLACE entirely:**

```markdown
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
```

**Gorn ability section — REPLACE entirely:**

```markdown
### Gorn: Reptilian Resilience

**Type:** Passive

**Effect:** When a Gorn unit is dislodged and has **no valid retreat destinations**, it automatically returns to the nearest unoccupied Gorn home system instead of being disbanded.

**Restrictions:**
- Only triggers when there are zero valid retreats available
- If all Gorn home systems are occupied, the unit is disbanded normally
- If valid retreats exist, the Gorn player must choose a retreat as normal
```

**Romulan ability section — REPLACE entirely:**

```markdown
### Romulan: Tal Shiar Intelligence

**Type:** Active (each turn)

**Effect:** Each turn during the orders phase, choose one enemy faction. After all orders are submitted but before resolution, all of that faction's orders are revealed to the Romulan player.

**Usage:** Select a spy target from the ability panel during the orders phase. If no target is selected, no intelligence is gathered.
```

**Ferengi ability section — REPLACE entirely:**

```markdown
### Ferengi: Rules of Acquisition

**Type:** Passive economy + Active abilities

- Earn **3 latinum per supply center** each Fall Build Phase
- **Bribe** (10 latinum): Claim a neutral supply center without a unit there
- **Sabotage** (15 latinum): Cancel one enemy support order before resolution
- **Espionage** (8 latinum): See all orders from one enemy faction this turn

**Victory:** Ferengi can win by accumulating **50 latinum** instead of reaching the SC threshold.
```

**Latinum Economy section — UPDATE values:**

```markdown
### Earning
- **3 latinum per supply center** per Fall Build Phase (Ferengi only)

### Spending

| Action | Cost | Effect |
|--------|------|--------|
| Bribe | 10 | Claim a neutral supply center |
| Sabotage | 15 | Cancel one enemy support order |
| Espionage | 8 | See all orders from one enemy faction |

### Economic Victory
Ferengi wins immediately upon reaching **50 latinum** (checked during Build Phase).
```

**Breen home systems in Factions table — UPDATE:**

```markdown
| **Breen Confederacy** | 2 (Breen, Portas) | 2 (Breen, Dozaria) | 4 (Breen, Portas, Dozaria, Breen Core) | 10 SC |
```

Note: Breen Citadel and Breen Fortress are Breen-faction supply centers but NOT home systems (no builds).

### 8.2 Update CLAUDE.md

Add a section:

```markdown
## v2.1 Changelog

### Balance Changes
- Klingon: +1 attack on first move only (was all moves). Defense penalty only without fleet in orbit.
- Gorn: Deterministic resilience (was 50% random). Only triggers when no valid retreats.
- Romulan: Choose spy target each turn, see all their orders (was 1-2 random orders).
- Ferengi: Income 3/SC (was 0.5), bribe 10 (was 15), sabotage 15 (was 25), new espionage ability (8). Victory at 50 latinum (was 100).

### Data Fixes
- Breen: breen_citadel and breen_fortress are no longer marked as home systems in map-data.js (still Breen supply centers)
- Latinum economy is now Ferengi-exclusive (was bugged to give all factions income)
- Non-adjacent army moves are now flagged as requiring convoy at validation time
- Duplicate order detection added

### UX Improvements
- SVG zoom/pan on 2D map
- Always-visible labels for supply centers
- Orbit rings around planets
- Wider hyperlane click targets
- Individual order undo
- Hyperspace layer toggle
- Phase/turn overlay on map
```

---

## Appendix: Exact Value Tables

### Faction Starting Units (canonical)

| Faction | Armies (on planet) | Fleets (in orbit) | Total |
|---------|-------------------|--------------------|-------|
| Federation | earth, vulcan, andoria | earth:orbit, vulcan:orbit | 5 |
| Klingon | qonos, tygokor | qonos:orbit, narendra:orbit, boreth:orbit | 5 |
| Romulan | romulus, remus | romulus:orbit, rator:orbit | 4 |
| Cardassian | cardassia, chintoka, septimus | cardassia:orbit, kelvas:orbit | 5 |
| Ferengi | ferenginar, volchok | ferenginar:orbit | 3 |
| Breen | breen, portas | breen:orbit, dozaria:orbit | 4 |
| Gorn | gornar, ssgaron, seudath | gornar:orbit, gorn_fortress:orbit | 5 |

### Victory Conditions (v2.1)

| Faction | Solo SC | Alt Win | Notes |
|---------|---------|---------|-------|
| Federation | 10 | — | |
| Klingon | 10 | — | |
| Romulan | 8 | — | Lower threshold, weaker start |
| Cardassian | 10 | — | |
| Ferengi | 8 | 50 latinum | Economic victory |
| Breen | 10 | — | Chokepoint position |
| Gorn | 9 | — | Resilience compensates |

### Latinum Costs (v2.1)

| Action | Cost | Effect |
|--------|------|--------|
| Income | +3/SC/Fall | Ferengi only |
| Bribe | 10 | Claim neutral SC |
| Sabotage | 15 | Cancel 1 enemy support |
| Espionage | 8 | See 1 faction's orders |

### Klingon Combat Math (v2.1)

| Situation | Strength |
|-----------|----------|
| First move order | 2 (1 + 1 bonus) |
| Additional move orders | 1 |
| Hold with fleet in orbit | 1 |
| Hold without fleet in orbit | -1 (1 - 1 Klingon - 1 no fleet) |
| Hold without fleet + 1 support | 0 |
| Hold with fleet + 1 support | 2 |

### Supply Center Count

| Category | Count |
|----------|-------|
| Federation home | 5 |
| Klingon home | 5 |
| Romulan home | 4 |
| Cardassian home | 5 |
| Ferengi home | 3 |
| Breen home | 4 |
| Breen non-home faction SC | 2 |
| Gorn home | 5 |
| Neutral core layer | 14 |
| Neutral hyperspace (Layer 1+3) | 8 |
| **Total supply centers** | **55** |

Verify this count against the actual data: `Object.values(SYSTEMS).filter(s => s.supply).length` should equal 55.

---

## Execution Order Summary

1. **Phase 1** — Data fixes. Run existing tests. All must pass.
2. **Phase 2** — Engine rebalancing. Write and run new unit tests. All must pass.
3. **Phase 3** — Latinum overhaul. Write and run economy tests. All must pass.
4. **Phase 4** — Validation tightening. Write and run validation tests. All must pass.
5. **Phase 5** — Monte Carlo simulator. Run 1000+ games. Check balance targets.
6. **Phase 6** — Map UX changes. Verify visually that the 2D map renders correctly (the Selenium tests in Phase 7 will validate programmatically).
7. **Phase 7** — Selenium E2E tests for new features. All must pass.
8. **Phase 8** — RULES.md and CLAUDE.md sync. Final review.

**After each phase:** commit with a descriptive message like `fix: Breen home system mismatch (Phase 1.1)` or `feat: Klingon first-strike rebalance (Phase 2.1)`.

**End of Implementation Plan.**
