# CLAUDE.md - Star Trek Diplomacy Development Guide

## Communication Style

**Be direct and technical. No flattery, no "great question!", no "I'd be happy to help!"**

- If code is broken, say it's broken and why
- If an approach is suboptimal, say so and propose better
- If you don't know something, say "I don't know"
- If a request is unclear, ask for clarification rather than guessing
- Disagreement is fine - push back when you have a better idea
- Don't apologize excessively - fix the problem and move on

**When reviewing code:**
- Point out bugs, inefficiencies, and anti-patterns directly
- "This works but..." is better than "Great job! One small thing..."
- Suggest refactors when code is messy, don't just patch around it

---

## Project Context

**What this is:** A 7-player Diplomacy-style strategy game with Star Trek factions. Turn-based, simultaneous order resolution, secret alliances, asymmetric abilities.

**Current state: v1 complete, starting v2 rewrite.**

v1 (complete):
- Backend engine with all faction abilities
- Frontend with 2D map, order panel, messaging
- PostgreSQL persistence, Clerk auth, Socket.io real-time
- Turn timers with kick voting
- Docker integration tests

v2 goals:
1. **Dual unit system:** Armies occupy planets, Fleets occupy space (orbit or hyperlanes)
2. **3D map visualization:** Mobile-friendly Three.js rendering of all 3 layers
3. **Removed in-game messaging:** Players use external tools (Discord/WhatsApp)
4. **Simplified and balanced gameplay**

**Tech stack:**
- Backend: Node.js, Express, Socket.io, PostgreSQL
- Frontend: React 18, Vite, Tailwind CSS, Zustand
- Auth: Clerk (required for all environments)
- Database: PostgreSQL (Railway-compatible)
- New in v2: Three.js / React Three Fiber for 3D map

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Backend: backend/.env
#   - DATABASE_URL=postgresql://...
#   - CLERK_SECRET_KEY=sk_...

# Frontend: frontend/.env
#   - VITE_CLERK_PUBLISHABLE_KEY=pk_...

# 3. Start development servers
npm run dev:backend   # Port 3000
npm run dev:frontend  # Port 5173

# 4. Run Docker integration tests
npm run test:docker
```

---

## Architecture Overview

### Authentication Flow
1. User signs in via Clerk on frontend
2. Frontend gets JWT token via `useAuth().getToken()`
3. All API calls include `Authorization: Bearer <token>`
4. Backend verifies token via `@clerk/clerk-sdk-node`
5. Socket.io connections also authenticated via token

### Database Schema
- `users` - Clerk user IDs and display names
- `games` - Game state JSON, turn info, settings
- `game_players` - Authoritative user-to-faction mapping
- `user_games` - User's game history

### Key Files
- `backend/src/index.js` - Express + Socket.io server
- `backend/src/game-manager.js` - Game state orchestration
- `backend/src/engine/diplomacy-engine.js` - Core game rules
- `backend/src/engine/faction-abilities.js` - Faction powers
- `frontend/src/hooks/useGameStore.js` - Zustand state management
- `frontend/src/components/map/GameMap.jsx` - Map rendering (2D currently, 3D in v2)
- `shared/map-data.js` - Map topology (npm workspace package)
- `shared/edge-utils.js` - Edge ID generation and parsing (v2)

---

## v2 Game Model

### Unit Types and Positions

| Unit Type | Can Occupy | Capacity Rules |
|-----------|------------|----------------|
| **Army** | Planet (node) | 1 army per planet |
| **Fleet** | Planet orbit OR Hyperlane (edge) | 1 fleet per planet orbit, 2 allied fleets per hyperlane |

### Position Notation

- **Planet positions:** `earth`, `vulcan`, `qonos` (existing node IDs)
- **Orbit positions:** `earth:orbit`, `vulcan:orbit` (planet ID + `:orbit` suffix)
- **Hyperlane positions:** `earth~vulcan` (alphabetically sorted, tilde separator)

Hyperlane IDs are always sorted alphabetically: `earth~vulcan` not `vulcan~earth`. This prevents duplicate edge representations.

### Movement Rules

| Unit | From | To | Order Type |
|------|------|-----|------------|
| Army | Planet | Adjacent planet | MOVE |
| Army | Planet | Same planet (defend) | HOLD |
| Fleet | Orbit | Adjacent hyperlane | MOVE |
| Fleet | Orbit | Same orbit (defend) | HOLD |
| Fleet | Hyperlane | Adjacent hyperlane | MOVE |
| Fleet | Hyperlane | Endpoint planet orbit | MOVE |
| Fleet | Hyperlane | Hold position | HOLD |

### Support Rules

| Supporter | Can Support |
|-----------|-------------|
| Army on planet | Army moving to/holding adjacent planet |
| Fleet in orbit | Army on same planet, Fleet on adjacent hyperlane |
| Fleet on hyperlane | Army on either endpoint planet, Fleet on adjacent hyperlane, Fleet in either endpoint orbit |

### Combat Rules

- Armies fight armies (for planet control)
- Fleets fight fleets (for space control)
- Fleets in orbit can be attacked by fleets on adjacent hyperlanes
- An army without a supporting fleet in orbit is easier to dislodge (-1 defense if no friendly fleet in orbit)

### Convoy Rules

Fleets on hyperlanes can convoy armies across non-adjacent planets:
- Army at Planet A orders: `MOVE to Planet C via convoy`
- Fleet on hyperlane A~B orders: `CONVOY Army from A to C`
- Fleet on hyperlane B~C orders: `CONVOY Army from A to C`
- If convoy chain is unbroken, army moves from A to C

### Supply Center Control

- A planet's supply center is controlled by the faction whose **army** occupies it at the end of Fall
- Fleets in orbit do NOT capture supply centers
- This creates strategic tension: you need armies to hold territory, fleets to project power

### Build Rules

- **Armies:** Built on home planet supply centers (must be unoccupied by army)
- **Fleets:** Built in orbit of home planet supply centers (must be unoccupied by fleet)
- You can build both an army AND a fleet at the same home planet if both positions are empty

### Hyperlane Capacity

- A hyperlane can hold **2 fleets maximum**
- Both fleets must be **allied** (same faction OR formal alliance)
- If two enemy fleets end up on the same hyperlane, they fight immediately (higher strength stays, loser retreats)

---

## v2 File Changes Summary

### Files to DELETE
```
frontend/src/components/Messages.jsx
frontend/src/components/MessageNotification.jsx
backend/src/database.js (messages table and related functions - modify, don't delete file)
```

### Files to REWRITE (complete rewrite)
```
backend/src/engine/diplomacy-engine.js    — New position model, adjacency, combat
backend/src/engine/__tests__/*.js          — All new unit tests for new mechanics
frontend/src/components/map/GameMap.jsx   — 3D Three.js implementation
shared/map-data.js                         — Add edge IDs, orbit positions
```

### Files to MODIFY (significant changes)
```
backend/src/game-manager.js               — Remove message handling, new order types
backend/src/index.js                      — Remove message socket handlers
backend/src/api/game-routes.js            — Remove message endpoints
frontend/src/components/Game.jsx          — Remove Messages component, update layout
frontend/src/components/OrderPanel.jsx    — New order types for fleet/army
frontend/src/hooks/useGameStore.js        — Remove message state
RULES.md                                  — Complete rewrite for new mechanics
```

### Files to CREATE
```
shared/edge-utils.js                      — Edge ID generation and parsing utilities
frontend/src/components/map/Map3D.jsx     — Three.js 3D map component
frontend/src/components/map/SystemNode.jsx — 3D system/planet rendering
frontend/src/components/map/HyperlaneEdge.jsx — 3D hyperlane rendering
frontend/src/components/map/FleetModel.jsx — 3D fleet unit model
frontend/src/components/map/ArmyModel.jsx  — 3D army unit model
```

---

## v2 Development Phases

### Phase 1: Data Model
- Create edge utilities (ID generation, parsing, adjacency)
- Update map-data.js with edge metadata
- Rewrite diplomacy-engine.js with new position model
- Write comprehensive unit tests for new adjudicator

### Phase 2: Backend Integration
- Update game-manager.js for new order types
- Remove all messaging code from backend
- Update database schema (remove messages table)
- Update API routes

### Phase 3: 3D Map
- Implement Three.js canvas with React Three Fiber
- Render planets as spheres across 3 layers
- Render hyperlanes as lines/tubes
- Render units (armies on planets, fleets in orbit or on lanes)
- Implement camera controls (orbit, zoom, pan) with touch support
- Implement click detection for unit selection and order input

### Phase 4: Order Panel & UI
- Update OrderPanel for army/fleet distinction
- Add convoy order support
- Remove Messages component from Game.jsx
- Mobile-responsive layout adjustments

### Phase 5: Testing & Polish
- Integration tests for new mechanics
- Balance testing (adjust victory thresholds if needed)
- Performance optimization for mobile
- Documentation update

---

## v2 Implementation Details

### SECTION 1: Edge Utilities and Map Data

#### 1A: Create Edge Utility Module

Create `shared/edge-utils.js`:

```javascript
/**
 * Edge utilities for hyperlane positioning
 *
 * Edge IDs are formed by alphabetically sorting the two endpoint node IDs
 * and joining with a tilde: "earth~vulcan" (not "vulcan~earth")
 */

/**
 * Create a canonical edge ID from two node IDs
 */
function createEdgeId(nodeA, nodeB) {
  return [nodeA, nodeB].sort().join('~');
}

/**
 * Parse an edge ID into its two endpoint node IDs
 * Returns [nodeA, nodeB] in alphabetical order
 */
function parseEdgeId(edgeId) {
  return edgeId.split('~');
}

/**
 * Check if a position is an edge (hyperlane) position
 */
function isEdgePosition(position) {
  return position.includes('~');
}

/**
 * Check if a position is an orbit position
 */
function isOrbitPosition(position) {
  return position.endsWith(':orbit');
}

/**
 * Check if a position is a planet (node) position
 */
function isPlanetPosition(position) {
  return !isEdgePosition(position) && !isOrbitPosition(position);
}

/**
 * Get the planet from an orbit position
 */
function getPlanetFromOrbit(orbitPosition) {
  if (!isOrbitPosition(orbitPosition)) return null;
  return orbitPosition.replace(':orbit', '');
}

/**
 * Get the orbit position for a planet
 */
function getOrbitPosition(planetId) {
  return `${planetId}:orbit`;
}

/**
 * Get endpoints of an edge
 */
function getEdgeEndpoints(edgeId) {
  return parseEdgeId(edgeId);
}

/**
 * Check if a planet is an endpoint of an edge
 */
function isPlanetEndpointOfEdge(planetId, edgeId) {
  const [a, b] = parseEdgeId(edgeId);
  return planetId === a || planetId === b;
}

/**
 * Get all edges connected to a planet
 */
function getEdgesFromPlanet(planetId, allEdges) {
  return allEdges.filter(edgeId => isPlanetEndpointOfEdge(planetId, edgeId));
}

/**
 * Get edges adjacent to an edge (share exactly one endpoint)
 */
function getAdjacentEdges(edgeId, allEdges) {
  const [a, b] = parseEdgeId(edgeId);
  return allEdges.filter(other => {
    if (other === edgeId) return false;
    const [x, y] = parseEdgeId(other);
    // Adjacent if shares exactly one endpoint
    const sharedEndpoints = [a, b].filter(e => e === x || e === y).length;
    return sharedEndpoints === 1;
  });
}

module.exports = {
  createEdgeId,
  parseEdgeId,
  isEdgePosition,
  isOrbitPosition,
  isPlanetPosition,
  getPlanetFromOrbit,
  getOrbitPosition,
  getEdgeEndpoints,
  isPlanetEndpointOfEdge,
  getEdgesFromPlanet,
  getAdjacentEdges,
};
```

#### 1B: Update shared/map-data.js

Add edge IDs and orbit positions to the map data:

```javascript
// After HYPERLANES array, add:

/**
 * Generate canonical edge IDs from hyperlane pairs
 */
const EDGES = HYPERLANES.map(([a, b]) => [a, b].sort().join('~'));

/**
 * Vertical lane edges (between layers)
 */
const VERTICAL_EDGES = VERTICAL_LANES.map(({ from, to }) => [from, to].sort().join('~'));

/**
 * All edges (horizontal + vertical)
 */
const ALL_EDGES = [...new Set([...EDGES, ...VERTICAL_EDGES])];

// Update exports:
module.exports = {
  SYSTEMS,
  HYPERLANES,
  VERTICAL_LANES,
  EDGES,
  VERTICAL_EDGES,
  ALL_EDGES,
  FACTION_COLORS,
  FACTION_NAMES
};
```

#### 1C: Update shared/package.json exports

```json
{
  "name": "@star-trek-diplomacy/shared",
  "version": "0.2.0",
  "main": "map-data.js",
  "exports": {
    ".": "./map-data.js",
    "./edge-utils": "./edge-utils.js"
  }
}
```

---

### SECTION 2: Rewrite the Game Engine

Completely rewrite `backend/src/engine/diplomacy-engine.js`:

#### 2A: Constants and Types

```javascript
/**
 * STAR TREK DIPLOMACY v2.0 - Core Game Engine
 *
 * Dual unit system: Armies on planets, Fleets in orbit or on hyperlanes
 */

const {
  createEdgeId,
  parseEdgeId,
  isEdgePosition,
  isOrbitPosition,
  isPlanetPosition,
  getPlanetFromOrbit,
  getOrbitPosition,
  getEdgeEndpoints,
  isPlanetEndpointOfEdge,
  getEdgesFromPlanet,
  getAdjacentEdges,
} = require('@star-trek-diplomacy/shared/edge-utils');

const UNIT_TYPES = {
  ARMY: 'army',
  FLEET: 'fleet',
};

const POSITION_TYPES = {
  PLANET: 'planet',
  ORBIT: 'orbit',
  EDGE: 'edge',
};

const ORDER_TYPES = {
  HOLD: 'hold',
  MOVE: 'move',
  SUPPORT: 'support',
  CONVOY: 'convoy',
};

const SEASONS = {
  SPRING: 'spring',
  FALL: 'fall',
};
```

#### 2B: Position Utilities

```javascript
/**
 * Determine the type of a position
 */
function getPositionType(position) {
  if (isEdgePosition(position)) return POSITION_TYPES.EDGE;
  if (isOrbitPosition(position)) return POSITION_TYPES.ORBIT;
  return POSITION_TYPES.PLANET;
}

/**
 * Check if a unit type can occupy a position type
 */
function canUnitOccupy(unitType, positionType) {
  if (unitType === UNIT_TYPES.ARMY) {
    return positionType === POSITION_TYPES.PLANET;
  }
  if (unitType === UNIT_TYPES.FLEET) {
    return positionType === POSITION_TYPES.ORBIT || positionType === POSITION_TYPES.EDGE;
  }
  return false;
}
```

#### 2C: Adjacency Model

```javascript
/**
 * Map data storage - initialized by initializeMapData
 */
let MAP_DATA = {
  systems: {},        // Planet data
  edges: [],          // All edge IDs
  planetAdjacency: {},    // Planet -> adjacent planets
  edgeAdjacency: {},      // Edge -> adjacent edges
  planetToEdges: {},      // Planet -> edges touching that planet
};

/**
 * Initialize map data with the new adjacency model
 */
function initializeMapData(systems, hyperlanes, verticalLanes = []) {
  MAP_DATA.systems = systems;

  // Generate all edge IDs
  const horizontalEdges = hyperlanes.map(([a, b]) => createEdgeId(a, b));
  const verticalEdges = verticalLanes.map(({ from, to }) => createEdgeId(from, to));
  MAP_DATA.edges = [...new Set([...horizontalEdges, ...verticalEdges])];

  // Build planet adjacency (planet to planet, via edges)
  MAP_DATA.planetAdjacency = {};
  Object.keys(systems).forEach(id => {
    MAP_DATA.planetAdjacency[id] = [];
  });

  [...hyperlanes, ...verticalLanes.map(v => [v.from, v.to])].forEach(([a, b]) => {
    if (MAP_DATA.planetAdjacency[a] && MAP_DATA.planetAdjacency[b]) {
      if (!MAP_DATA.planetAdjacency[a].includes(b)) MAP_DATA.planetAdjacency[a].push(b);
      if (!MAP_DATA.planetAdjacency[b].includes(a)) MAP_DATA.planetAdjacency[b].push(a);
    }
  });

  // Build planet-to-edges mapping
  MAP_DATA.planetToEdges = {};
  Object.keys(systems).forEach(id => {
    MAP_DATA.planetToEdges[id] = MAP_DATA.edges.filter(e => isPlanetEndpointOfEdge(id, e));
  });

  // Build edge adjacency (edge to edge)
  MAP_DATA.edgeAdjacency = {};
  MAP_DATA.edges.forEach(edgeId => {
    MAP_DATA.edgeAdjacency[edgeId] = getAdjacentEdges(edgeId, MAP_DATA.edges);
  });
}

/**
 * Get valid destinations for a unit at a position
 */
function getValidDestinations(position, unitType) {
  const posType = getPositionType(position);
  const destinations = [];

  if (unitType === UNIT_TYPES.ARMY) {
    // Armies can only move planet to planet
    if (posType === POSITION_TYPES.PLANET) {
      destinations.push(...MAP_DATA.planetAdjacency[position] || []);
    }
  }

  if (unitType === UNIT_TYPES.FLEET) {
    if (posType === POSITION_TYPES.ORBIT) {
      // From orbit: can move to any edge connected to this planet
      const planet = getPlanetFromOrbit(position);
      destinations.push(...(MAP_DATA.planetToEdges[planet] || []));
    }
    if (posType === POSITION_TYPES.EDGE) {
      // From edge: can move to adjacent edges or to orbit of either endpoint
      destinations.push(...(MAP_DATA.edgeAdjacency[position] || []));
      const [a, b] = getEdgeEndpoints(position);
      destinations.push(getOrbitPosition(a), getOrbitPosition(b));
    }
  }

  return destinations;
}

/**
 * Check if two positions are adjacent for a given unit type
 */
function isAdjacent(from, to, unitType) {
  return getValidDestinations(from, unitType).includes(to);
}
```

#### 2D: Game State Class

```javascript
/**
 * Game State Manager
 *
 * Units are stored by position:
 * - Armies: { "earth": { faction: "federation", type: "army" } }
 * - Fleets in orbit: { "earth:orbit": { faction: "federation", type: "fleet" } }
 * - Fleets on edges: { "earth~vulcan": [{ faction: "federation", type: "fleet" }] }
 *
 * Note: Edge positions can hold an ARRAY of up to 2 allied fleets
 */
class GameState {
  constructor() {
    this.turn = 1;
    this.year = 2370;
    this.season = SEASONS.SPRING;
    this.units = {};      // Position -> unit or array of units (for edges)
    this.ownership = {};  // Planet -> faction (supply centers only)
    this.dislodged = {};  // Position -> dislodged unit info
  }

  initialize() {
    // Set initial ownership (only planets with supply: true)
    Object.entries(MAP_DATA.systems).forEach(([id, system]) => {
      if (system.supply) {
        if (system.home && FACTIONS[system.faction]) {
          this.ownership[id] = system.faction;
        } else if (system.faction !== 'neutral' && system.faction !== 'deepspace' && FACTIONS[system.faction]) {
          this.ownership[id] = system.faction;
        } else {
          this.ownership[id] = null;
        }
      }
    });

    // Place starting units (armies on planets, fleets in orbit)
    Object.entries(FACTIONS).forEach(([factionId, faction]) => {
      faction.startingUnits.forEach(unit => {
        if (unit.type === UNIT_TYPES.ARMY) {
          this.units[unit.location] = { faction: factionId, type: UNIT_TYPES.ARMY };
        } else if (unit.type === UNIT_TYPES.FLEET) {
          const orbitPos = getOrbitPosition(unit.location);
          this.units[orbitPos] = { faction: factionId, type: UNIT_TYPES.FLEET };
        }
      });
    });
  }

  /**
   * Get unit(s) at a position
   * For edges, returns array. For planets/orbits, returns single unit or null.
   */
  getUnitsAt(position) {
    const posType = getPositionType(position);
    if (posType === POSITION_TYPES.EDGE) {
      return this.units[position] || [];
    }
    return this.units[position] || null;
  }

  /**
   * Place a unit at a position
   */
  placeUnit(position, unit) {
    const posType = getPositionType(position);
    if (posType === POSITION_TYPES.EDGE) {
      if (!this.units[position]) this.units[position] = [];
      this.units[position].push(unit);
    } else {
      this.units[position] = unit;
    }
  }

  /**
   * Remove a unit from a position
   * For edges, removes the unit matching the faction
   */
  removeUnit(position, faction = null) {
    const posType = getPositionType(position);
    if (posType === POSITION_TYPES.EDGE) {
      if (this.units[position]) {
        if (faction) {
          this.units[position] = this.units[position].filter(u => u.faction !== faction);
        } else {
          this.units[position].shift(); // Remove first
        }
        if (this.units[position].length === 0) delete this.units[position];
      }
    } else {
      delete this.units[position];
    }
  }

  /**
   * Check if a position can accept another unit
   */
  canAcceptUnit(position, unit, allianceChecker = null) {
    const posType = getPositionType(position);
    const existing = this.getUnitsAt(position);

    if (posType === POSITION_TYPES.PLANET) {
      // Planet: only one army
      if (unit.type !== UNIT_TYPES.ARMY) return false;
      return existing === null;
    }

    if (posType === POSITION_TYPES.ORBIT) {
      // Orbit: only one fleet
      if (unit.type !== UNIT_TYPES.FLEET) return false;
      return existing === null;
    }

    if (posType === POSITION_TYPES.EDGE) {
      // Edge: up to 2 allied fleets
      if (unit.type !== UNIT_TYPES.FLEET) return false;
      if (existing.length >= 2) return false;
      if (existing.length === 1) {
        // Must be allied
        const existingFaction = existing[0].faction;
        if (existingFaction === unit.faction) return true;
        if (allianceChecker && allianceChecker(existingFaction, unit.faction)) return true;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Get all units for a faction
   */
  getUnits(faction) {
    const units = [];
    Object.entries(this.units).forEach(([position, unitOrArray]) => {
      if (Array.isArray(unitOrArray)) {
        unitOrArray.forEach(u => {
          if (u.faction === faction) {
            units.push({ position, ...u });
          }
        });
      } else if (unitOrArray && unitOrArray.faction === faction) {
        units.push({ position, ...unitOrArray });
      }
    });
    return units;
  }

  /**
   * Count supply centers for a faction
   */
  countSupplyCenters(faction) {
    return Object.values(this.ownership).filter(owner => owner === faction).length;
  }

  /**
   * Check if faction is eliminated
   */
  isEliminated(faction) {
    return this.getUnits(faction).length === 0 && this.countSupplyCenters(faction) === 0;
  }

  /**
   * Clone the state
   */
  clone() {
    const cloned = new GameState();
    cloned.turn = this.turn;
    cloned.year = this.year;
    cloned.season = this.season;
    cloned.units = JSON.parse(JSON.stringify(this.units));
    cloned.ownership = JSON.parse(JSON.stringify(this.ownership));
    cloned.dislodged = JSON.parse(JSON.stringify(this.dislodged));
    return cloned;
  }

  toJSON() {
    return {
      turn: this.turn,
      year: this.year,
      season: this.season,
      units: this.units,
      ownership: this.ownership,
      dislodged: this.dislodged,
    };
  }

  static fromJSON(data) {
    const state = new GameState();
    state.turn = data.turn;
    state.year = data.year;
    state.season = data.season;
    state.units = data.units;
    state.ownership = data.ownership;
    state.dislodged = data.dislodged || {};
    return state;
  }
}
```

#### 2E: Order Validator

```javascript
/**
 * Order Validator
 */
class OrderValidator {
  constructor(state, allianceChecker = null) {
    this.state = state;
    this.allianceChecker = allianceChecker;
    this.frozenTerritories = [];
  }

  setFrozenTerritories(territories) {
    this.frozenTerritories = territories || [];
  }

  validateOrder(order) {
    const { type, location, destination, target, faction } = order;

    // Check unit exists and belongs to faction
    const units = this.state.getUnitsAt(location);
    let unit = null;

    if (Array.isArray(units)) {
      unit = units.find(u => u.faction === faction);
    } else {
      unit = units && units.faction === faction ? units : null;
    }

    if (!unit) {
      return { valid: false, reason: 'No unit at location' };
    }

    // Check frozen territories
    if (this.frozenTerritories.includes(location)) {
      if (type === ORDER_TYPES.MOVE) {
        return { valid: false, reason: 'Cannot move from frozen territory' };
      }
    }

    if (destination && this.frozenTerritories.includes(destination)) {
      return { valid: false, reason: 'Cannot move to frozen territory' };
    }

    switch (type) {
      case ORDER_TYPES.HOLD:
        return { valid: true };

      case ORDER_TYPES.MOVE:
        return this.validateMove(unit, location, destination);

      case ORDER_TYPES.SUPPORT:
        return this.validateSupport(unit, location, target, destination);

      case ORDER_TYPES.CONVOY:
        return this.validateConvoy(unit, location, order.convoyFrom, order.convoyTo);

      default:
        return { valid: false, reason: 'Unknown order type' };
    }
  }

  validateMove(unit, from, to) {
    if (!to) {
      return { valid: false, reason: 'No destination specified' };
    }

    if (!isAdjacent(from, to, unit.type)) {
      return { valid: false, reason: 'Destination not adjacent' };
    }

    // Check unit type can occupy destination type
    const destType = getPositionType(to);
    if (!canUnitOccupy(unit.type, destType)) {
      return { valid: false, reason: `${unit.type} cannot occupy ${destType}` };
    }

    return { valid: true };
  }

  validateSupport(unit, location, target, destination) {
    if (!target || !destination) {
      return { valid: false, reason: 'Support requires target and destination' };
    }

    const validDests = getValidDestinations(location, unit.type);

    if (!validDests.includes(destination) && !this.isAdjacentForSupport(location, destination, unit.type)) {
      return { valid: false, reason: 'Cannot support to that destination' };
    }

    return { valid: true };
  }

  isAdjacentForSupport(from, to, unitType) {
    // Fleets in orbit can support armies on the same planet
    if (isOrbitPosition(from) && isPlanetPosition(to)) {
      return getPlanetFromOrbit(from) === to;
    }
    // Fleets on edges can support armies on endpoint planets
    if (isEdgePosition(from) && isPlanetPosition(to)) {
      return isPlanetEndpointOfEdge(to, from);
    }
    return isAdjacent(from, to, unitType);
  }

  validateConvoy(unit, location, convoyFrom, convoyTo) {
    // Only fleets on edges can convoy
    if (unit.type !== UNIT_TYPES.FLEET) {
      return { valid: false, reason: 'Only fleets can convoy' };
    }
    if (!isEdgePosition(location)) {
      return { valid: false, reason: 'Fleet must be on hyperlane to convoy' };
    }

    // convoyFrom and convoyTo must be planets
    if (!isPlanetPosition(convoyFrom) || !isPlanetPosition(convoyTo)) {
      return { valid: false, reason: 'Convoy must be between planets' };
    }

    return { valid: true };
  }
}
```

#### 2F: Adjudicator

Write a complete `Adjudicator` class that handles:
- Army vs Army combat (planet control)
- Fleet vs Fleet combat (edge and orbit control)
- Support calculation with the new adjacency model
- Support cutting rules
- Convoy resolution
- The "no fleet in orbit = -1 defense" rule for armies
- Edge capacity enforcement (max 2 allied fleets)
- Dislodgement and retreat options

The adjudicator should:
1. Collect all HOLD orders (implicit for units without orders)
2. Collect all MOVE orders
3. Collect all SUPPORT orders
4. Calculate strength for each move and each defense
5. Apply faction abilities (Klingon bonus/penalty, etc.)
6. Resolve conflicts by strength
7. Handle standoffs (equal strength = no movement)
8. Track dislodgements and calculate retreat options
9. Execute successful moves

#### 2G: Build Phase Handler

Update to handle building armies on planets and fleets in orbit:

```javascript
class BuildPhaseHandler {
  constructor(state) {
    this.state = state;
  }

  updateOwnership() {
    // Only armies capture supply centers
    Object.entries(this.state.units).forEach(([position, unitOrArray]) => {
      if (isPlanetPosition(position)) {
        const unit = unitOrArray;
        if (unit && unit.type === UNIT_TYPES.ARMY) {
          const system = MAP_DATA.systems[position];
          if (system?.supply) {
            this.state.ownership[position] = unit.faction;
          }
        }
      }
    });
  }

  calculateBuilds(faction) {
    const scs = this.state.countSupplyCenters(faction);
    const units = this.state.getUnits(faction).length;
    return scs - units;
  }

  getAvailableBuildLocations(faction) {
    const factionData = FACTIONS[faction];
    if (!factionData) return { armies: [], fleets: [] };

    const armies = [];
    const fleets = [];

    factionData.homeSystems.forEach(planet => {
      if (this.state.ownership[planet] !== faction) return;

      // Can build army if planet is empty
      if (!this.state.units[planet]) {
        armies.push(planet);
      }

      // Can build fleet if orbit is empty
      const orbit = getOrbitPosition(planet);
      if (!this.state.units[orbit]) {
        fleets.push(orbit);
      }
    });

    return { armies, fleets };
  }

  processBuild(faction, position, unitType) {
    const available = this.getAvailableBuildLocations(faction);

    if (unitType === UNIT_TYPES.ARMY) {
      if (!available.armies.includes(position)) return false;
      this.state.units[position] = { faction, type: UNIT_TYPES.ARMY };
    } else if (unitType === UNIT_TYPES.FLEET) {
      if (!available.fleets.includes(position)) return false;
      this.state.units[position] = { faction, type: UNIT_TYPES.FLEET };
    } else {
      return false;
    }

    return true;
  }

  processDisband(faction, position) {
    const units = this.state.getUnitsAt(position);

    if (Array.isArray(units)) {
      const unit = units.find(u => u.faction === faction);
      if (!unit) return false;
      this.state.removeUnit(position, faction);
    } else {
      if (!units || units.faction !== faction) return false;
      this.state.removeUnit(position);
    }

    return true;
  }
}
```

#### 2H: Faction Configuration

Update `FACTIONS` to have both armies and fleets as starting units:

```javascript
const FACTIONS = {
  federation: {
    name: 'United Federation of Planets',
    color: '#3399ff',
    homeSystems: ['earth', 'vulcan', 'andoria', 'tellar', 'rigel'],
    startingUnits: [
      // Armies on planets
      { type: 'army', location: 'earth' },
      { type: 'army', location: 'vulcan' },
      { type: 'army', location: 'andoria' },
      // Fleets in orbit
      { type: 'fleet', location: 'earth' },  // Will be placed at earth:orbit
      { type: 'fleet', location: 'vulcan' },
    ]
  },
  // ... similar for other factions
  // Each faction gets armies on ~60% of home systems, fleets on ~40%
  // This creates immediate strategic choices
};
```

Rebalance all factions to have a mix of armies and fleets. Suggested starting positions:
- **Federation** (5 home): 3 armies, 2 fleets
- **Klingon** (5 home): 2 armies, 3 fleets (aggressive, fleet-heavy)
- **Romulan** (4 home): 2 armies, 2 fleets
- **Cardassian** (5 home): 3 armies, 2 fleets
- **Ferengi** (3 home): 2 armies, 1 fleet
- **Breen** (4 home, reduced from 6): 2 armies, 2 fleets
- **Gorn** (5 home): 3 armies, 2 fleets

Update `VICTORY_CONDITIONS` to be achievable:
```javascript
const VICTORY_CONDITIONS = {
  federation: { supplyCenters: 10 },
  klingon: { supplyCenters: 10 },
  romulan: { supplyCenters: 8 },
  cardassian: { supplyCenters: 10 },
  ferengi: { supplyCenters: 8, latinum: 100 },
  breen: { supplyCenters: 10 },  // Reduced from 18
  gorn: { supplyCenters: 9 },
};
```

---

### SECTION 3: Remove Messaging System

#### 3A: Backend Cleanup

In `backend/src/database.js`:
- Remove the `messages` table creation from `initializeDatabase()`
- Remove `saveMessage()` function
- Remove `getMessages()` function
- Keep the table in schema for now (don't drop existing data), but stop using it

In `backend/src/game-manager.js`:
- Remove `this.messages = []` from constructor
- Remove `addMessage()` method
- Remove `getMessages()` method
- Remove message-related code from `toJSON()` and `fromJSON()`

In `backend/src/index.js`:
- Remove `socket.on('private_message', ...)` handler
- Remove `socket.on('broadcast_message', ...)` handler
- Remove any message-related socket emissions

In `backend/src/api/game-routes.js`:
- Remove any `/messages` endpoints

#### 3B: Frontend Cleanup

Delete these files:
- `frontend/src/components/Messages.jsx`
- `frontend/src/components/MessageNotification.jsx`

In `frontend/src/components/Game.jsx`:
- Remove `import Messages from './Messages'`
- Remove `<Messages ... />` component from render
- Remove any message-related state or handlers

In `frontend/src/hooks/useGameStore.js`:
- Remove `messages` state
- Remove `sendMessage` action
- Remove message-related socket listeners

---

### SECTION 4: 3D Map Implementation

#### 4A: Create Map3D Component

Create `frontend/src/components/map/Map3D.jsx` using React Three Fiber with:
- Canvas with Stars background
- OrbitControls for camera (orbit, zoom, pan, touch support)
- Render all planets as SystemNode components across 3 layers
- Render all hyperlanes as HyperlaneEdge components
- Render units on edges at midpoints
- Hover info overlay
- Scale factor converting map coordinates to 3D space

#### 4B: Create SystemNode Component

Create `frontend/src/components/map/SystemNode.jsx` with:
- Planet sphere (size based on supply center status)
- Ownership color on planet material
- Supply center ring indicator
- Orbit ring (torus, clickable for fleet placement)
- Army indicator (box on planet surface)
- Fleet in orbit indicator (cone on orbit ring)
- Html label with system name
- Selection/hover visual feedback

#### 4C: Create HyperlaneEdge Component

Create `frontend/src/components/map/HyperlaneEdge.jsx` with:
- Line rendering between endpoints
- Invisible tube for click hit detection
- Visual distinction for vertical lanes
- Selection/hover glow effect

#### 4D: Update GameMap.jsx

Replace to use Map3D component with order mode controls (move, support, hold, cancel) and pending orders display overlay.

---

### SECTION 5: Update Order Panel

Update `frontend/src/components/OrderPanel.jsx` to handle the new unit types and positions:

- Show separate lists for Armies and Fleets
- Army orders: HOLD, MOVE (to adjacent planet)
- Fleet orders (in orbit): HOLD, MOVE (to adjacent hyperlane)
- Fleet orders (on hyperlane): HOLD, MOVE (to adjacent hyperlane or endpoint orbit), CONVOY
- Support orders for both types
- Build phase: show available army positions and fleet positions separately

---

### SECTION 6: Comprehensive Unit Tests

Create `backend/src/engine/__tests__/adjudication.test.js` with tests for:

#### Basic Movement (10 tests)
1. Army moves to empty adjacent planet
2. Army cannot move to non-adjacent planet
3. Army cannot move to edge
4. Fleet in orbit moves to adjacent hyperlane
5. Fleet on hyperlane moves to adjacent hyperlane
6. Fleet on hyperlane moves to endpoint orbit
7. Fleet cannot move to planet (only orbit)
8. Unit holds successfully
9. Move to frozen territory fails
10. Move from frozen territory fails

#### Combat - Same Type (10 tests)
11. Army vs Army - stronger wins
12. Army vs Army - equal strength standoff
13. Fleet vs Fleet on edge - stronger wins
14. Fleet vs Fleet on edge - equal strength standoff
15. Fleet vs Fleet in orbit - attacker wins with support
16. Two fleets attack same edge - standoff if equal
17. Three-way standoff on edge
18. Dislodged army gets retreat options
19. Dislodged fleet gets retreat options
20. No retreat options = disband

#### Support Mechanics (10 tests)
21. Army supports army attack
22. Army supports army hold
23. Fleet in orbit supports army on same planet
24. Fleet on edge supports army on endpoint
25. Fleet supports fleet attack on adjacent edge
26. Support is cut when supporter attacked
27. Support NOT cut when attacked from supported destination
28. Fleet in orbit support gives army +1 defense
29. Army without fleet support has -1 defense
30. Sabotaged support doesn't count

#### Edge Capacity (5 tests)
31. Two allied fleets can share edge
32. Two enemy fleets on same edge fight
33. Third fleet cannot enter edge with 2 fleets
34. Allied fleet can join single fleet on edge
35. Non-allied fleet cannot join single enemy fleet

#### Convoy (5 tests)
36. Basic convoy: Army A→C via B, fleet on A~B, fleet on B~C
37. Convoy fails if chain broken
38. Convoy fails if convoying fleet dislodged
39. Army can attack destination during convoy
40. Convoy across multiple edges

#### Build Phase (5 tests)
41. Can build army on empty home planet
42. Can build fleet in empty home orbit
43. Can build both army and fleet at same home planet
44. Cannot build on occupied position
45. Must disband if over capacity

#### Victory Conditions (3 tests)
46. Solo victory when reaching threshold
47. Allied victory at combined threshold
48. Ferengi latinum victory

---

### SECTION 7: Update RULES.md

Completely rewrite `RULES.md` to document:
- The new dual-unit system
- Position types (planet, orbit, hyperlane)
- Movement rules for each unit type
- Combat rules
- Support rules (including fleet-in-orbit bonus)
- Convoy mechanics
- Build rules
- Victory conditions
- Faction abilities (unchanged from before)

Remove all references to in-game messaging.

---

### SECTION 8: Testing & Verification

#### Run all backend tests
```bash
cd backend && npm test
```

#### Run Docker integration tests
```bash
npm run test:docker
```

#### Manual Verification Checklist

1. **3D Map renders correctly** — All 3 layers visible, planets show ownership colors, hyperlanes connect correctly, vertical lanes visible in different color
2. **Camera controls work** — Rotate with mouse drag, zoom with scroll, pan with right-click drag, touch gestures on mobile
3. **Unit display correct** — Armies on planet surface, fleets in orbit on orbit ring, fleets on hyperlanes at midpoint, two fleets on same edge visible
4. **Order input works** — Select army → see valid planet destinations, select fleet in orbit → see valid hyperlane destinations, select fleet on edge → see valid edge and orbit destinations, support and convoy order flows work
5. **Combat resolves correctly** — Armies fight for planets, fleets fight for edges, support counted correctly, fleet-in-orbit bonus applies
6. **Build phase works** — Can build army on planet, can build fleet in orbit, both at same location allowed, over-capacity forces disband
7. **No messaging UI** — Messages component removed, no message-related errors in console

---

## v2 Deliverables

After completing all sections:

1. New game engine with army/fleet dual-unit system
2. Edge-based positioning for fleets
3. 3D map with Three.js/React Three Fiber
4. Mobile-friendly touch controls
5. All messaging code removed
6. Comprehensive unit tests (48+ tests)
7. Updated rules documentation
8. All existing tests passing

---

## Code Standards

**File organization:**
- One component per file
- Hooks in `/hooks`
- API calls centralized in useGameStore
- No business logic in components

**Naming:**
- Components: PascalCase
- Files: kebab-case or match component name
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

**Testing:**
- Backend: Jest (`npm test` in backend folder)
- E2E: Docker integration tests (`npm run test:docker`)

**Commits:**
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`
- One logical change per commit
- No `// TODO` comments
- No `console.log` in production code
- All tests must assert real behavior
- Run tests after each section

---

## Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:pass@localhost:5432/star_trek_diplomacy
CLERK_SECRET_KEY=sk_test_...
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

---

## Deployment

### Railway (Recommended)
1. Connect GitHub repo
2. Add PostgreSQL addon (provides DATABASE_URL)
3. Set environment variables in Railway dashboard
4. Backend deploys from `backend/Dockerfile`
5. Frontend deploys from `frontend/Dockerfile`

### Docker Compose (Local)
```bash
# Set CLERK keys in environment
docker-compose up --build
```

---

## Don't Do These Things

- Don't bypass Clerk auth - there is no dev mode
- Don't trust client-provided faction - always verify via database
- Don't add features without updating tests
- Don't commit .env files or secrets
- Don't make PRs > 500 lines without splitting
- Don't skip sections in the v2 implementation order
- Don't write placeholder tests - every test must assert real behavior

---

## Troubleshooting

**"Authentication required" errors:**
- Check CLERK_SECRET_KEY is set in backend
- Check VITE_CLERK_PUBLISHABLE_KEY is set in frontend
- Ensure Clerk keys are from same Clerk application

**Socket.io connection fails:**
- Check FRONTEND_URL in backend matches actual frontend origin
- Verify token is being passed in socket auth

**Database connection fails:**
- Check DATABASE_URL format: `postgresql://user:pass@host:5432/dbname`
- Ensure PostgreSQL is running
