/**
 * OrderBuilder - Base class for AI strategy order construction.
 *
 * Tracks unit assignments, prevents duplicate orders, validates moves
 * against the game engine, and produces a clean order list.
 */

const {
  getValidDestinations,
  getPositionType,
  POSITION_TYPES,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { isOrbitPosition, isPlanetPosition } = require('@star-trek-diplomacy/shared/edge-utils');

class OrderBuilder {
  constructor(faction, state) {
    this.faction = faction;
    this.state = state;
    this.orders = [];
    this.assignedUnits = new Set();
    this.assignedDestinations = new Set();
  }

  isAssigned(position) {
    return this.assignedUnits.has(position);
  }

  hold(position) {
    if (this.assignedUnits.has(position)) return false;
    this.assignedUnits.add(position);
    this.orders.push({ type: 'hold', location: position, faction: this.faction });
    return true;
  }

  move(position, destination) {
    if (this.assignedUnits.has(position)) return false;
    if (this.assignedDestinations.has(destination)) return false;

    const unitOrArray = this.state.getUnitsAt(position);
    const unit = Array.isArray(unitOrArray)
      ? unitOrArray.find(u => u.faction === this.faction)
      : unitOrArray;

    if (!unit || unit.faction !== this.faction) return false;

    const validDests = getValidDestinations(position, unit.type);
    if (!validDests.includes(destination)) return false;

    this.assignedUnits.add(position);
    this.assignedDestinations.add(destination);
    this.orders.push({
      type: 'move',
      location: position,
      destination,
      faction: this.faction,
    });
    return true;
  }

  support(position, from, to) {
    if (this.assignedUnits.has(position)) return false;

    const unitOrArray = this.state.getUnitsAt(position);
    const unit = Array.isArray(unitOrArray)
      ? unitOrArray.find(u => u.faction === this.faction)
      : unitOrArray;

    if (!unit || unit.faction !== this.faction) return false;

    // Verify the supporting unit can reach the target destination
    const validDests = getValidDestinations(position, unit.type);
    // Support-to adjacency is more permissive (see _isAdjacentForSupport in engine)
    // For simplicity we check basic adjacency — the engine validator will catch edge cases
    if (!validDests.includes(to) && !this._isAdjacentForSupport(position, to, unit.type)) {
      return false;
    }

    this.assignedUnits.add(position);
    this.orders.push({
      type: 'support',
      location: position,
      supportFrom: from,
      supportTo: to,
      faction: this.faction,
    });
    return true;
  }

  /**
   * Assign hold orders to all remaining unassigned units of this faction.
   */
  holdRemaining() {
    const units = this.state.getUnits(this.faction);
    units.forEach(unit => {
      if (!this.assignedUnits.has(unit.position)) {
        this.hold(unit.position);
      }
    });
  }

  getOrders() {
    return this.orders;
  }

  // ─── Internal ──────────────────────────────────────────────────────────

  _isAdjacentForSupport(from, to, unitType) {
    // Fleet in orbit can support army on same planet
    if (isOrbitPosition(from) && isPlanetPosition(to)) {
      const { getPlanetFromOrbit } = require('@star-trek-diplomacy/shared/edge-utils');
      return getPlanetFromOrbit(from) === to;
    }
    // Fleet on edge can support army on endpoint planet
    const { isEdgePosition, isPlanetEndpointOfEdge } = require('@star-trek-diplomacy/shared/edge-utils');
    if (isEdgePosition(from) && isPlanetPosition(to)) {
      return isPlanetEndpointOfEdge(to, from);
    }
    if (isOrbitPosition(from) && isEdgePosition(to)) {
      const { getPlanetFromOrbit } = require('@star-trek-diplomacy/shared/edge-utils');
      const planet = getPlanetFromOrbit(from);
      return isPlanetEndpointOfEdge(planet, to);
    }
    return false;
  }
}

module.exports = OrderBuilder;
