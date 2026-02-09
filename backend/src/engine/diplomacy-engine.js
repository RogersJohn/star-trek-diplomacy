/**
 * STAR TREK DIPLOMACY v2.0 - Core Game Engine
 *
 * Dual unit system: Armies on planets, Fleets in orbit or on hyperlanes.
 * Simultaneous order resolution based on standard Diplomacy adjudication.
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

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Faction Configuration ───────────────────────────────────────────────────

const FACTIONS = {
  federation: {
    name: 'United Federation of Planets',
    color: '#3399ff',
    homeSystems: ['earth', 'vulcan', 'andoria', 'tellar', 'rigel'],
    startingUnits: [
      { type: 'army', location: 'earth' },
      { type: 'army', location: 'vulcan' },
      { type: 'army', location: 'andoria' },
      { type: 'fleet', location: 'earth' },
      { type: 'fleet', location: 'vulcan' },
    ],
  },
  klingon: {
    name: 'Klingon Empire',
    color: '#cc0000',
    homeSystems: ['qonos', 'tygokor', 'narendra', 'boreth', 'khitomer'],
    startingUnits: [
      { type: 'army', location: 'qonos' },
      { type: 'army', location: 'tygokor' },
      { type: 'fleet', location: 'qonos' },
      { type: 'fleet', location: 'narendra' },
      { type: 'fleet', location: 'boreth' },
    ],
  },
  romulan: {
    name: 'Romulan Star Empire',
    color: '#006600',
    homeSystems: ['romulus', 'remus', 'rator', 'abraxas'],
    startingUnits: [
      { type: 'army', location: 'romulus' },
      { type: 'army', location: 'remus' },
      { type: 'fleet', location: 'romulus' },
      { type: 'fleet', location: 'rator' },
    ],
  },
  cardassian: {
    name: 'Cardassian Union',
    color: '#996633',
    homeSystems: ['cardassia', 'chintoka', 'septimus', 'kelvas', 'rakal'],
    startingUnits: [
      { type: 'army', location: 'cardassia' },
      { type: 'army', location: 'chintoka' },
      { type: 'army', location: 'septimus' },
      { type: 'fleet', location: 'cardassia' },
      { type: 'fleet', location: 'kelvas' },
    ],
  },
  ferengi: {
    name: 'Ferengi Alliance',
    color: '#ff9900',
    homeSystems: ['ferenginar', 'volchok', 'clarus'],
    startingUnits: [
      { type: 'army', location: 'ferenginar' },
      { type: 'army', location: 'volchok' },
      { type: 'fleet', location: 'ferenginar' },
    ],
  },
  breen: {
    name: 'Breen Confederacy',
    color: '#66cccc',
    homeSystems: ['breen', 'portas', 'dozaria', 'breen_core'],
    startingUnits: [
      { type: 'army', location: 'breen' },
      { type: 'army', location: 'portas' },
      { type: 'fleet', location: 'breen' },
      { type: 'fleet', location: 'dozaria' },
    ],
  },
  gorn: {
    name: 'Gorn Hegemony',
    color: '#88aa33',
    homeSystems: ['gornar', 'ssgaron', 'seudath', 'gorn_fortress', 'gorn_colony'],
    startingUnits: [
      { type: 'army', location: 'gornar' },
      { type: 'army', location: 'ssgaron' },
      { type: 'army', location: 'seudath' },
      { type: 'fleet', location: 'gornar' },
      { type: 'fleet', location: 'gorn_fortress' },
    ],
  },
};

const VICTORY_CONDITIONS = {
  federation: { supplyCenters: 10 },
  klingon: { supplyCenters: 10 },
  romulan: { supplyCenters: 8 },
  cardassian: { supplyCenters: 10 },
  ferengi: { supplyCenters: 8, latinum: 50 },
  breen: { supplyCenters: 10 },
  gorn: { supplyCenters: 9 },
};

// ─── Position Utilities ──────────────────────────────────────────────────────

function getPositionType(position) {
  if (isEdgePosition(position)) return POSITION_TYPES.EDGE;
  if (isOrbitPosition(position)) return POSITION_TYPES.ORBIT;
  return POSITION_TYPES.PLANET;
}

function canUnitOccupy(unitType, positionType) {
  if (unitType === UNIT_TYPES.ARMY) {
    return positionType === POSITION_TYPES.PLANET;
  }
  if (unitType === UNIT_TYPES.FLEET) {
    return positionType === POSITION_TYPES.ORBIT || positionType === POSITION_TYPES.EDGE;
  }
  return false;
}

// ─── Map Data & Adjacency ────────────────────────────────────────────────────

let MAP_DATA = {
  systems: {},
  edges: [],
  planetAdjacency: {},
  edgeAdjacency: {},
  planetToEdges: {},
};

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

function getValidDestinations(position, unitType) {
  const posType = getPositionType(position);
  const destinations = [];

  if (unitType === UNIT_TYPES.ARMY) {
    if (posType === POSITION_TYPES.PLANET) {
      destinations.push(...(MAP_DATA.planetAdjacency[position] || []));
    }
  }

  if (unitType === UNIT_TYPES.FLEET) {
    if (posType === POSITION_TYPES.ORBIT) {
      const planet = getPlanetFromOrbit(position);
      destinations.push(...(MAP_DATA.planetToEdges[planet] || []));
    }
    if (posType === POSITION_TYPES.EDGE) {
      destinations.push(...(MAP_DATA.edgeAdjacency[position] || []));
      const [a, b] = getEdgeEndpoints(position);
      destinations.push(getOrbitPosition(a), getOrbitPosition(b));
    }
  }

  return destinations;
}

function isAdjacent(from, to, unitType) {
  return getValidDestinations(from, unitType).includes(to);
}

// ─── Game State ──────────────────────────────────────────────────────────────

/**
 * Units are stored by position:
 * - Armies on planets: { "earth": { faction: "federation", type: "army" } }
 * - Fleets in orbit:   { "earth:orbit": { faction: "federation", type: "fleet" } }
 * - Fleets on edges:   { "earth~vulcan": [{ faction: "federation", type: "fleet" }] }
 *
 * Edge positions store arrays (up to 2 allied fleets).
 * Planet/orbit positions store single unit objects or are absent.
 */
class GameState {
  constructor() {
    this.turn = 1;
    this.year = 2370;
    this.season = SEASONS.SPRING;
    this.units = {};
    this.ownership = {};
    this.dislodged = {};
  }

  initialize() {
    // Set initial ownership from faction homeSystems
    Object.entries(FACTIONS).forEach(([factionId, faction]) => {
      faction.homeSystems.forEach(planet => {
        const system = MAP_DATA.systems[planet];
        if (system?.supply) {
          this.ownership[planet] = factionId;
        }
      });
    });

    // Set neutral supply centers
    Object.entries(MAP_DATA.systems).forEach(([id, system]) => {
      if (system.supply && !(id in this.ownership)) {
        this.ownership[id] = null;
      }
    });

    // Place starting units
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

  getUnitsAt(position) {
    const posType = getPositionType(position);
    if (posType === POSITION_TYPES.EDGE) {
      return this.units[position] || [];
    }
    return this.units[position] || null;
  }

  placeUnit(position, unit) {
    const posType = getPositionType(position);
    if (posType === POSITION_TYPES.EDGE) {
      if (!this.units[position]) this.units[position] = [];
      this.units[position].push(unit);
    } else {
      this.units[position] = unit;
    }
  }

  removeUnit(position, faction = null) {
    const posType = getPositionType(position);
    if (posType === POSITION_TYPES.EDGE) {
      if (this.units[position]) {
        if (faction) {
          this.units[position] = this.units[position].filter(u => u.faction !== faction);
        } else {
          this.units[position].shift();
        }
        if (this.units[position].length === 0) delete this.units[position];
      }
    } else {
      delete this.units[position];
    }
  }

  canAcceptUnit(position, unit, allianceChecker = null) {
    const posType = getPositionType(position);
    const existing = this.getUnitsAt(position);

    if (posType === POSITION_TYPES.PLANET) {
      if (unit.type !== UNIT_TYPES.ARMY) return false;
      return existing === null;
    }

    if (posType === POSITION_TYPES.ORBIT) {
      if (unit.type !== UNIT_TYPES.FLEET) return false;
      return existing === null;
    }

    if (posType === POSITION_TYPES.EDGE) {
      if (unit.type !== UNIT_TYPES.FLEET) return false;
      if (existing.length >= 2) return false;
      if (existing.length === 1) {
        const existingFaction = existing[0].faction;
        if (existingFaction === unit.faction) return true;
        if (allianceChecker && allianceChecker(existingFaction, unit.faction)) return true;
        return false;
      }
      return true;
    }

    return false;
  }

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

  countSupplyCenters(faction) {
    return Object.values(this.ownership).filter(owner => owner === faction).length;
  }

  isEliminated(faction) {
    return this.getUnits(faction).length === 0 && this.countSupplyCenters(faction) === 0;
  }

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

// ─── Order Validator ─────────────────────────────────────────────────────────

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
    const { type, location, destination, faction } = order;

    // Find unit at location belonging to this faction
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
        return this._validateMove(unit, location, destination);

      case ORDER_TYPES.SUPPORT:
        return this._validateSupport(unit, location, order.target || order.supportFrom, order.destination || order.supportTo);

      case ORDER_TYPES.CONVOY:
        return this._validateConvoy(unit, location, order.convoyFrom, order.convoyTo);

      default:
        return { valid: false, reason: 'Unknown order type' };
    }
  }

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

  _validateSupport(unit, location, target, destination) {
    if (!target || !destination) {
      return { valid: false, reason: 'Support requires target and destination' };
    }

    if (!this._isAdjacentForSupport(location, destination, unit.type)) {
      return { valid: false, reason: 'Cannot support to that destination' };
    }

    return { valid: true };
  }

  _isAdjacentForSupport(from, to, unitType) {
    // Fleet in orbit can support army on the same planet
    if (isOrbitPosition(from) && isPlanetPosition(to)) {
      return getPlanetFromOrbit(from) === to;
    }
    // Fleet on edge can support army on endpoint planet
    if (isEdgePosition(from) && isPlanetPosition(to)) {
      return isPlanetEndpointOfEdge(to, from);
    }
    // Fleet in orbit can support fleet on adjacent edge
    if (isOrbitPosition(from) && isEdgePosition(to)) {
      const planet = getPlanetFromOrbit(from);
      return isPlanetEndpointOfEdge(planet, to);
    }
    // Fleet on edge can support fleet in endpoint orbit
    if (isEdgePosition(from) && isOrbitPosition(to)) {
      const planet = getPlanetFromOrbit(to);
      return isPlanetEndpointOfEdge(planet, from);
    }
    return isAdjacent(from, to, unitType);
  }

  _validateConvoy(unit, location, convoyFrom, convoyTo) {
    if (unit.type !== UNIT_TYPES.FLEET) {
      return { valid: false, reason: 'Only fleets can convoy' };
    }
    if (!isEdgePosition(location)) {
      return { valid: false, reason: 'Fleet must be on hyperlane to convoy' };
    }
    if (!isPlanetPosition(convoyFrom) || !isPlanetPosition(convoyTo)) {
      return { valid: false, reason: 'Convoy must be between planets' };
    }
    return { valid: true };
  }
}

// ─── Adjudicator ─────────────────────────────────────────────────────────────

class Adjudicator {
  constructor(state) {
    this.state = state;
    this.orders = [];
    this.results = [];
    this.protectedLocations = [];
    this.sabotagedSupports = [];
  }

  setOrders(ordersByFaction) {
    this.orders = [];
    Object.entries(ordersByFaction).forEach(([faction, orders]) => {
      orders.forEach(order => {
        this.orders.push({ ...order, faction });
      });
    });
  }

  setProtectedLocations(locations) {
    this.protectedLocations = locations || [];
  }

  setSabotagedSupports(sabotaged) {
    this.sabotagedSupports = sabotaged || [];
  }

  _isSupportSabotaged(support) {
    return this.sabotagedSupports.some(
      s => s.faction === support.faction && s.location === support.location
    );
  }

  adjudicate() {
    this.results = [];

    // Snapshot units before resolution (for fleet-in-orbit defense check)
    const preResolutionUnits = JSON.parse(JSON.stringify(this.state.units));

    const moves = this.orders.filter(o => o.type === ORDER_TYPES.MOVE);
    const supports = this.orders.filter(o => o.type === ORDER_TYPES.SUPPORT);
    const convoys = this.orders.filter(o => o.type === ORDER_TYPES.CONVOY);

    // Assign implicit HOLD orders to units without orders
    this._assignImplicitHolds();

    // Validate convoy chains for convoy moves
    const convoyMoves = moves.filter(m => m.viaConvoy);
    const regularMoves = moves.filter(m => !m.viaConvoy);

    // Resolve convoy viability
    const validConvoyMoves = [];
    convoyMoves.forEach(move => {
      if (this._isConvoyChainValid(move, convoys, moves)) {
        validConvoyMoves.push(move);
      } else {
        // Failed convoy — unit holds in place
        this.results.push({
          type: 'move_failed',
          from: move.location,
          to: move.destination,
          faction: move.faction,
          reason: 'convoy_broken',
        });
      }
    });

    const allValidMoves = [...regularMoves, ...validConvoyMoves];

    // Calculate attack strength for each move
    const moveStrengths = new Map();
    allValidMoves.forEach(move => {
      const key = `${move.faction}:${move.location}->${move.destination}`;
      let strength = 1;

      if (move.klingonBonus) strength += move.klingonBonus;

      supports.forEach(support => {
        if (this._supportMatchesMove(support, move)) {
          if (!this._isSupportCut(support, allValidMoves) && !this._isSupportSabotaged(support)) {
            strength++;
          }
        }
      });

      moveStrengths.set(key, { move, strength });
    });

    // Group moves by destination
    const movesByDest = new Map();
    allValidMoves.forEach(move => {
      if (!movesByDest.has(move.destination)) movesByDest.set(move.destination, []);
      movesByDest.get(move.destination).push(move);
    });

    // Calculate defense strength for each contested position
    const successfulMoves = [];
    const failedMoves = [];

    movesByDest.forEach((competingMoves, destination) => {
      // Check for friendly join on edge — no combat needed
      if (competingMoves.length === 1 && this._isFriendlyEdgeJoin(competingMoves[0], destination)) {
        successfulMoves.push(competingMoves[0]);
        return;
      }

      const defenseStrength = this._calculateDefenseStrength(
        destination, supports, allValidMoves, preResolutionUnits
      );

      if (competingMoves.length === 1) {
        const move = competingMoves[0];
        const key = `${move.faction}:${move.location}->${move.destination}`;
        const attackStrength = moveStrengths.get(key)?.strength || 1;

        if (attackStrength > defenseStrength) {
          if (this.protectedLocations.includes(destination)) {
            failedMoves.push(move);
            this.results.push({
              type: 'diplomatic_immunity',
              location: destination,
              attackingFaction: move.faction,
            });
          } else {
            successfulMoves.push(move);
            this._markDislodged(destination, move, preResolutionUnits);
          }
        } else {
          failedMoves.push(move);
        }
      } else {
        // Multiple competing moves — find strongest
        let maxStrength = 0;
        let winners = [];

        competingMoves.forEach(move => {
          const key = `${move.faction}:${move.location}->${move.destination}`;
          const strength = moveStrengths.get(key)?.strength || 1;
          if (strength > maxStrength) {
            maxStrength = strength;
            winners = [move];
          } else if (strength === maxStrength) {
            winners.push(move);
          }
        });

        if (winners.length === 1 && maxStrength > defenseStrength) {
          if (this.protectedLocations.includes(destination)) {
            competingMoves.forEach(m => failedMoves.push(m));
            this.results.push({
              type: 'diplomatic_immunity',
              location: destination,
              attackingFaction: winners[0].faction,
            });
          } else {
            successfulMoves.push(winners[0]);
            competingMoves.filter(m => m !== winners[0]).forEach(m => failedMoves.push(m));
            this._markDislodged(destination, winners[0], preResolutionUnits);
          }
        } else {
          competingMoves.forEach(m => failedMoves.push(m));
        }
      }
    });

    // Check for swap conflicts (A->B and B->A both succeed)
    this._resolveSwaps(successfulMoves, failedMoves);

    // Execute successful moves in two phases for simultaneous resolution:
    // Phase 1: Pick up all moving units from their sources
    const pickedUp = [];
    successfulMoves.forEach(move => {
      const unit = this._pickUpUnit(move);
      pickedUp.push({ move, unit });
    });

    // Remove dislodged defenders from destinations
    successfulMoves.forEach(move => {
      const dislodged = this.state.dislodged[move.destination];
      if (dislodged) {
        const toType = getPositionType(move.destination);
        if (toType === POSITION_TYPES.EDGE) {
          if (this.state.units[move.destination]) {
            this.state.units[move.destination] = this.state.units[move.destination].filter(
              u => u.faction !== dislodged.faction
            );
            if (this.state.units[move.destination].length === 0) {
              delete this.state.units[move.destination];
            }
          }
        } else {
          delete this.state.units[move.destination];
        }
      }
    });

    // Phase 2: Place all units at their destinations
    pickedUp.forEach(({ move, unit }) => {
      if (!unit) return;
      const toType = getPositionType(move.destination);
      if (toType === POSITION_TYPES.EDGE) {
        if (!this.state.units[move.destination]) this.state.units[move.destination] = [];
        this.state.units[move.destination].push(unit);
      } else {
        this.state.units[move.destination] = unit;
      }
      this.results.push({
        type: 'move_success',
        from: move.location,
        to: move.destination,
        faction: move.faction,
      });
    });

    failedMoves.forEach(move => {
      if (!this.results.find(r => r.type === 'move_failed' && r.from === move.location && r.faction === move.faction)) {
        this.results.push({
          type: 'move_failed',
          from: move.location,
          to: move.destination,
          faction: move.faction,
          reason: 'bounce',
        });
      }
    });

    // Enforce edge capacity after all moves
    this._enforceEdgeCapacity();

    return this.results;
  }

  _isFriendlyEdgeJoin(move, destination) {
    const posType = getPositionType(destination);
    if (posType !== POSITION_TYPES.EDGE) return false;

    const existing = this.state.units[destination];
    if (!existing || existing.length === 0) return false;
    if (existing.length >= 2) return false;

    // Check if the existing fleet is same faction
    return existing[0].faction === move.faction;
  }

  _assignImplicitHolds() {
    const orderedLocations = new Set(this.orders.map(o => o.location));
    Object.entries(this.state.units).forEach(([position, unitOrArray]) => {
      if (Array.isArray(unitOrArray)) {
        unitOrArray.forEach(u => {
          if (!orderedLocations.has(position)) {
            this.orders.push({
              type: ORDER_TYPES.HOLD,
              location: position,
              faction: u.faction,
            });
          }
        });
      } else if (unitOrArray) {
        if (!orderedLocations.has(position)) {
          this.orders.push({
            type: ORDER_TYPES.HOLD,
            location: position,
            faction: unitOrArray.faction,
          });
        }
      }
    });
  }

  _supportMatchesMove(support, move) {
    const supportFrom = support.supportFrom || support.target;
    const supportTo = support.supportTo || support.destination;
    return supportFrom === move.location && supportTo === move.destination;
  }

  _supportMatchesHold(support, position) {
    const supportTo = support.supportTo || support.destination;
    const supportFrom = support.supportFrom || support.target;
    return supportTo === position && !supportFrom;
  }

  _isSupportCut(support, allMoves) {
    const supportTo = support.supportTo || support.destination;
    return allMoves.some(
      m => m.destination === support.location &&
        m.faction !== support.faction &&
        m.location !== supportTo
    );
  }

  _calculateDefenseStrength(destination, supports, allMoves, preResolutionUnits) {
    const posType = getPositionType(destination);
    let defender = null;

    if (posType === POSITION_TYPES.EDGE) {
      const existing = this.state.units[destination];
      if (existing && existing.length > 0) {
        // Defender is the fleet on the edge
        defender = existing[0];
      }
    } else {
      defender = this.state.units[destination] || null;
    }

    if (!defender) return 0;

    // Check if the defender is also moving out
    const defenderMoving = allMoves.find(
      m => m.location === destination && m.faction === defender.faction
    );
    if (defenderMoving) return 0;

    let strength = 1;

    // Klingon defense penalty: applies ONLY when holding without friendly fleet in orbit
    if (defender.faction === 'klingon' && posType === POSITION_TYPES.PLANET && defender.type === UNIT_TYPES.ARMY) {
      const klingonOrbitPos = getOrbitPosition(destination);
      const klingonOrbitUnit = preResolutionUnits[klingonOrbitPos];
      const hasKlingonFleet = klingonOrbitUnit && klingonOrbitUnit.faction === 'klingon';
      if (!hasKlingonFleet) {
        strength -= 1;
      }
    }

    // Fleet-in-orbit defense bonus: army gets -1 if no friendly fleet in orbit
    if (posType === POSITION_TYPES.PLANET && defender.type === UNIT_TYPES.ARMY) {
      const orbitPos = getOrbitPosition(destination);
      const orbitUnit = preResolutionUnits[orbitPos];
      if (!orbitUnit || orbitUnit.faction !== defender.faction) {
        strength -= 1;
      }
    }

    // Add support for hold
    supports.forEach(support => {
      if (this._supportMatchesHold(support, destination)) {
        if (!this._isSupportCut(support, allMoves) && !this._isSupportSabotaged(support)) {
          strength++;
        }
      }
    });

    return strength;
  }

  _markDislodged(destination, attackMove, preResolutionUnits) {
    const posType = getPositionType(destination);
    let defender = null;

    if (posType === POSITION_TYPES.EDGE) {
      const existing = this.state.units[destination];
      if (existing && existing.length > 0) {
        // Find the defending unit (not the attacker's faction)
        defender = existing.find(u => u.faction !== attackMove.faction);
        if (!defender && existing.length > 0) defender = existing[0];
      }
    } else {
      defender = this.state.units[destination] || null;
    }

    if (!defender) return;

    // Don't dislodge if defender is moving out
    const defenderMoving = this.orders.find(
      o => o.type === ORDER_TYPES.MOVE && o.location === destination && o.faction === defender.faction
    );
    if (defenderMoving) return;

    const retreatOptions = this._getRetreatOptions(destination, defender, attackMove.location);

    this.state.dislodged[destination] = {
      ...defender,
      retreatOptions,
    };
  }

  _getRetreatOptions(from, unit, attackOrigin) {
    const validDests = getValidDestinations(from, unit.type);
    return validDests.filter(dest => {
      if (dest === attackOrigin) return false;

      const posType = getPositionType(dest);
      if (posType === POSITION_TYPES.EDGE) {
        const existing = this.state.units[dest];
        if (existing && existing.length >= 2) return false;
        if (existing && existing.length === 1 && existing[0].faction !== unit.faction) return false;
        return true;
      }
      return !this.state.units[dest];
    });
  }

  _resolveSwaps(successfulMoves, failedMoves) {
    // Detect A->B and B->A both in successful
    const toRemove = [];
    for (let i = 0; i < successfulMoves.length; i++) {
      for (let j = i + 1; j < successfulMoves.length; j++) {
        const a = successfulMoves[i];
        const b = successfulMoves[j];
        if (a.location === b.destination && a.destination === b.location) {
          // Both fail unless one is clearly stronger — in standard Diplomacy, swaps always fail
          toRemove.push(i, j);
        }
      }
    }

    // Remove in reverse order to maintain indices
    const uniqueRemove = [...new Set(toRemove)].sort((a, b) => b - a);
    uniqueRemove.forEach(idx => {
      const [removed] = successfulMoves.splice(idx, 1);
      failedMoves.push(removed);
    });
  }

  _pickUpUnit(move) {
    const fromType = getPositionType(move.location);
    let unit;

    if (fromType === POSITION_TYPES.EDGE) {
      const arr = this.state.units[move.location];
      if (arr) {
        const idx = arr.findIndex(u => u.faction === move.faction);
        if (idx >= 0) {
          unit = arr.splice(idx, 1)[0];
          if (arr.length === 0) delete this.state.units[move.location];
        }
      }
    } else {
      unit = this.state.units[move.location];
      delete this.state.units[move.location];
    }

    return unit || null;
  }

  _isConvoyChainValid(convoyMove, allConvoys, allMoves) {
    const from = convoyMove.location;
    const to = convoyMove.destination;

    // Find all convoy orders for this army's movement
    const relevantConvoys = allConvoys.filter(
      c => c.convoyFrom === from && c.convoyTo === to
    );

    if (relevantConvoys.length === 0) return false;

    // Build a graph of convoying fleet edges
    const convoyEdges = new Set(relevantConvoys.map(c => c.location));

    // Check if convoying fleets are dislodged by other moves
    for (const convoyOrder of relevantConvoys) {
      const isAttacked = allMoves.some(
        m => m.destination === convoyOrder.location && m.faction !== convoyOrder.faction
      );
      if (isAttacked) {
        // If the convoying fleet might be dislodged, convoy fails
        // (Simplified: any attack on convoying fleet breaks chain)
        convoyEdges.delete(convoyOrder.location);
      }
    }

    // BFS: can we get from 'from' to 'to' via convoy edges?
    return this._canReachViaConvoy(from, to, convoyEdges);
  }

  _canReachViaConvoy(from, to, convoyEdges) {
    // We need a path from 'from' planet to 'to' planet through edges in convoyEdges
    const visited = new Set();
    const queue = [from];
    visited.add(from);

    while (queue.length > 0) {
      const current = queue.shift();

      // Get all edges connected to current planet that are in convoyEdges
      const connectedEdges = (MAP_DATA.planetToEdges[current] || []).filter(e => convoyEdges.has(e));

      for (const edge of connectedEdges) {
        const [a, b] = getEdgeEndpoints(edge);
        const nextPlanet = a === current ? b : a;

        if (nextPlanet === to) return true;

        if (!visited.has(nextPlanet)) {
          visited.add(nextPlanet);
          queue.push(nextPlanet);
        }
      }
    }

    return false;
  }

  _enforceEdgeCapacity() {
    Object.entries(this.state.units).forEach(([position, unitOrArray]) => {
      if (!isEdgePosition(position) || !Array.isArray(unitOrArray)) return;
      if (unitOrArray.length <= 2) return;

      // Shouldn't happen, but enforce limit
      while (unitOrArray.length > 2) {
        const removed = unitOrArray.pop();
        this.results.push({
          type: 'edge_overflow',
          position,
          faction: removed.faction,
        });
      }
    });
  }
}

// ─── Build Phase Handler ─────────────────────────────────────────────────────

class BuildPhaseHandler {
  constructor(state) {
    this.state = state;
  }

  updateOwnership() {
    // Only armies on planets capture supply centers
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

// ─── Retreat Phase Handler ───────────────────────────────────────────────────

class RetreatPhaseHandler {
  constructor(state) {
    this.state = state;
  }

  processRetreat(from, to) {
    const dislodged = this.state.dislodged[from];
    if (!dislodged) return false;
    if (!dislodged.retreatOptions.includes(to)) return false;

    const posType = getPositionType(to);

    // Check the destination is still free
    if (posType === POSITION_TYPES.EDGE) {
      const existing = this.state.units[to] || [];
      if (existing.length >= 2) return false;
      if (existing.length === 1 && existing[0].faction !== dislodged.faction) return false;
    } else {
      if (this.state.units[to]) return false;
    }

    this.state.placeUnit(to, { faction: dislodged.faction, type: dislodged.type });
    delete this.state.dislodged[from];
    return true;
  }

  disbandDislodged(location) {
    delete this.state.dislodged[location];
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  UNIT_TYPES,
  POSITION_TYPES,
  ORDER_TYPES,
  SEASONS,
  FACTIONS,
  VICTORY_CONDITIONS,
  MAP_DATA,
  initializeMapData,
  getPositionType,
  canUnitOccupy,
  getValidDestinations,
  isAdjacent,
  GameState,
  OrderValidator,
  Adjudicator,
  BuildPhaseHandler,
  RetreatPhaseHandler,
};
