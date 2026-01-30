/**
 * STAR TREK DIPLOMACY - Core Game Engine
 * 
 * Handles game state, order processing, and adjudication.
 * Based on standard Diplomacy rules with Star Trek modifications.
 */

const UNIT_TYPES = {
    FLEET: 'fleet',
    ARMY: 'army'
};

const ORDER_TYPES = {
    HOLD: 'hold',
    MOVE: 'move',
    SUPPORT: 'support',
    CONVOY: 'convoy'
};

const SEASONS = {
    SPRING: 'spring',
    FALL: 'fall'
};

// 7-Faction Configuration
const FACTIONS = {
    federation: {
        name: 'United Federation of Planets',
        color: '#3399ff',
        homeSystems: ['earth', 'vulcan', 'andoria', 'tellar', 'rigel'],
        startingUnits: [
            { type: 'fleet', location: 'earth' },
            { type: 'fleet', location: 'vulcan' },
            { type: 'fleet', location: 'andoria' },
            { type: 'fleet', location: 'tellar' },
            { type: 'fleet', location: 'rigel' }
        ]
    },
    klingon: {
        name: 'Klingon Empire',
        color: '#cc0000',
        homeSystems: ['qonos', 'tygokor', 'narendra', 'boreth', 'khitomer'],
        startingUnits: [
            { type: 'fleet', location: 'qonos' },
            { type: 'fleet', location: 'tygokor' },
            { type: 'fleet', location: 'narendra' },
            { type: 'fleet', location: 'boreth' },
            { type: 'fleet', location: 'khitomer' }
        ]
    },
    romulan: {
        name: 'Romulan Star Empire',
        color: '#006600',
        homeSystems: ['romulus', 'remus', 'rator', 'abraxas'],
        startingUnits: [
            { type: 'fleet', location: 'romulus' },
            { type: 'fleet', location: 'remus' },
            { type: 'fleet', location: 'rator' },
            { type: 'fleet', location: 'abraxas' }
        ]
    },
    cardassian: {
        name: 'Cardassian Union',
        color: '#996633',
        homeSystems: ['cardassia', 'chintoka', 'septimus', 'kelvas', 'rakal'],
        startingUnits: [
            { type: 'fleet', location: 'cardassia' },
            { type: 'fleet', location: 'chintoka' },
            { type: 'fleet', location: 'septimus' },
            { type: 'fleet', location: 'kelvas' },
            { type: 'fleet', location: 'rakal' }
        ]
    },
    ferengi: {
        name: 'Ferengi Alliance',
        color: '#ff9900',
        homeSystems: ['ferenginar', 'volchok', 'clarus'],
        startingUnits: [
            { type: 'fleet', location: 'ferenginar' },
            { type: 'fleet', location: 'volchok' },
            { type: 'fleet', location: 'clarus' }
        ]
    },
    breen: {
        name: 'Breen Confederacy',
        color: '#66cccc',
        homeSystems: ['breen', 'portas', 'dozaria', 'breen_core', 'breen_citadel', 'breen_fortress'],
        startingUnits: [
            { type: 'fleet', location: 'breen' },
            { type: 'fleet', location: 'portas' },
            { type: 'fleet', location: 'dozaria' },
            { type: 'fleet', location: 'breen_core' },
            { type: 'fleet', location: 'breen_citadel' },
            { type: 'fleet', location: 'breen_fortress' }
        ]
    },
    gorn: {
        name: 'Gorn Hegemony',
        color: '#88aa33',
        homeSystems: ['gornar', 'ssgaron', 'seudath', 'gorn_fortress', 'gorn_colony'],
        startingUnits: [
            { type: 'fleet', location: 'gornar' },
            { type: 'fleet', location: 'ssgaron' },
            { type: 'fleet', location: 'seudath' },
            { type: 'fleet', location: 'gorn_fortress' },
            { type: 'fleet', location: 'gorn_colony' }
        ]
    }
};

// Victory conditions per faction
const VICTORY_CONDITIONS = {
    federation: { supplyCenters: 10 },
    klingon: { supplyCenters: 12 },
    romulan: { supplyCenters: 8 },
    cardassian: { supplyCenters: 14 },
    ferengi: { supplyCenters: 9, latinum: 100 },
    breen: { supplyCenters: 18 },
    gorn: { supplyCenters: 9 }
};

// Map data storage
let MAP_DATA = {
    systems: {},
    adjacencies: {}
};

/**
 * Initialize map data
 */
function initializeMapData(systems, hyperlanes, verticalLanes = []) {
    MAP_DATA.systems = systems;
    MAP_DATA.adjacencies = {};
    
    // Initialize adjacency lists
    Object.keys(systems).forEach(id => {
        MAP_DATA.adjacencies[id] = [];
    });
    
    // Add horizontal hyperlanes
    hyperlanes.forEach(([a, b]) => {
        if (MAP_DATA.adjacencies[a] && MAP_DATA.adjacencies[b]) {
            if (!MAP_DATA.adjacencies[a].includes(b)) MAP_DATA.adjacencies[a].push(b);
            if (!MAP_DATA.adjacencies[b].includes(a)) MAP_DATA.adjacencies[b].push(a);
        }
    });
    
    // Add vertical lanes
    verticalLanes.forEach(({ from, to }) => {
        if (MAP_DATA.adjacencies[from] && MAP_DATA.adjacencies[to]) {
            if (!MAP_DATA.adjacencies[from].includes(to)) MAP_DATA.adjacencies[from].push(to);
            if (!MAP_DATA.adjacencies[to].includes(from)) MAP_DATA.adjacencies[to].push(from);
        }
    });
}

/**
 * Check if two locations are adjacent
 */
function isAdjacent(from, to) {
    return MAP_DATA.adjacencies[from]?.includes(to) || false;
}

/**
 * Get all adjacent locations
 */
function getAdjacent(location) {
    return MAP_DATA.adjacencies[location] || [];
}

/**
 * Game State Manager
 */
class GameState {
    constructor() {
        this.turn = 1;
        this.year = 2370;
        this.season = SEASONS.SPRING;
        this.units = {};
        this.ownership = {};
        this.dislodged = {};
        this.orders = {};
    }
    
    initialize() {
        // Set initial ownership
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
        
        // Place starting units
        Object.entries(FACTIONS).forEach(([factionId, faction]) => {
            faction.startingUnits.forEach(unit => {
                if (MAP_DATA.systems[unit.location]) {
                    this.units[unit.location] = { faction: factionId, type: unit.type };
                }
            });
        });
    }
    
    countSupplyCenters(faction) {
        return Object.entries(this.ownership)
            .filter(([_, owner]) => owner === faction)
            .length;
    }
    
    getUnits(faction) {
        return Object.entries(this.units)
            .filter(([_, unit]) => unit.faction === faction)
            .map(([location, unit]) => ({ location, ...unit }));
    }
    
    isEliminated(faction) {
        const units = this.getUnits(faction);
        const scs = this.countSupplyCenters(faction);
        return units.length === 0 && scs === 0;
    }
    
    clone() {
        const cloned = new GameState();
        cloned.turn = this.turn;
        cloned.year = this.year;
        cloned.season = this.season;
        cloned.units = JSON.parse(JSON.stringify(this.units));
        cloned.ownership = JSON.parse(JSON.stringify(this.ownership));
        cloned.dislodged = JSON.parse(JSON.stringify(this.dislodged));
        cloned.orders = JSON.parse(JSON.stringify(this.orders));
        return cloned;
    }
    
    toJSON() {
        return {
            turn: this.turn,
            year: this.year,
            season: this.season,
            units: this.units,
            ownership: this.ownership,
            dislodged: this.dislodged
        };
    }
}

/**
 * Order Validator
 */
class OrderValidator {
    constructor(state) {
        this.state = state;
    }
    
    validateOrder(order) {
        const unit = this.state.units[order.location];
        if (!unit) return { valid: false, reason: 'No unit at location' };
        if (unit.faction !== order.faction) return { valid: false, reason: 'Unit belongs to different faction' };
        
        switch (order.type) {
            case ORDER_TYPES.HOLD:
                return { valid: true };
                
            case ORDER_TYPES.MOVE:
                if (!isAdjacent(order.location, order.destination)) {
                    return { valid: false, reason: 'Destination not adjacent' };
                }
                return { valid: true };
                
            case ORDER_TYPES.SUPPORT:
                if (!isAdjacent(order.location, order.supportTo)) {
                    return { valid: false, reason: 'Cannot support non-adjacent location' };
                }
                return { valid: true };
                
            case ORDER_TYPES.CONVOY:
                return { valid: true };
                
            default:
                return { valid: false, reason: 'Unknown order type' };
        }
    }
}

/**
 * Move Adjudicator - Resolves simultaneous orders
 */
class Adjudicator {
    constructor(state) {
        this.state = state;
        this.orders = [];
        this.results = [];
    }
    
    setOrders(ordersByFaction) {
        this.orders = [];
        Object.entries(ordersByFaction).forEach(([faction, orders]) => {
            orders.forEach(order => {
                this.orders.push({ ...order, faction });
            });
        });
    }
    
    adjudicate() {
        this.results = [];
        const moves = this.orders.filter(o => o.type === ORDER_TYPES.MOVE);
        const supports = this.orders.filter(o => o.type === ORDER_TYPES.SUPPORT);
        
        // Calculate support for each move
        const moveStrengths = new Map();
        moves.forEach(move => {
            const key = `${move.location}->${move.destination}`;
            let strength = 1;
            
            // Add Klingon attack bonus
            if (move.klingonBonus) strength += move.klingonBonus;
            
            // Count valid supports
            supports.forEach(support => {
                if (support.supportFrom === move.location && 
                    support.supportTo === move.destination) {
                    // Check if support is cut
                    const supportCut = moves.some(m => 
                        m.destination === support.location && 
                        m.faction !== support.faction
                    );
                    if (!supportCut) {
                        strength++;
                    }
                }
            });
            
            moveStrengths.set(key, { move, strength });
        });
        
        // Resolve conflicts
        const successfulMoves = [];
        const failedMoves = [];
        
        // Group moves by destination
        const movesByDest = new Map();
        moves.forEach(move => {
            const dest = move.destination;
            if (!movesByDest.has(dest)) movesByDest.set(dest, []);
            movesByDest.get(dest).push(move);
        });
        
        // Resolve each destination
        movesByDest.forEach((competingMoves, destination) => {
            const defender = this.state.units[destination];
            let defenseStrength = 0;
            
            if (defender) {
                defenseStrength = 1;
                // Add Klingon defense penalty
                const defenderOrder = this.orders.find(o => o.location === destination);
                if (defenderOrder?.klingonPenalty) {
                    defenseStrength -= defenderOrder.klingonPenalty;
                }
                // Add supports for hold
                supports.forEach(support => {
                    if (support.supportTo === destination && !support.supportFrom) {
                        const supportCut = moves.some(m => 
                            m.destination === support.location && 
                            m.faction !== support.faction
                        );
                        if (!supportCut) defenseStrength++;
                    }
                });
            }
            
            if (competingMoves.length === 1) {
                const move = competingMoves[0];
                const key = `${move.location}->${move.destination}`;
                const attackStrength = moveStrengths.get(key)?.strength || 1;
                
                if (attackStrength > defenseStrength) {
                    successfulMoves.push(move);
                    if (defender) {
                        this.state.dislodged[destination] = {
                            ...defender,
                            retreatOptions: getAdjacent(destination).filter(loc => 
                                !this.state.units[loc] && 
                                loc !== move.location
                            )
                        };
                    }
                } else {
                    failedMoves.push(move);
                }
            } else {
                // Multiple units competing - find strongest
                let maxStrength = 0;
                let winners = [];
                
                competingMoves.forEach(move => {
                    const key = `${move.location}->${move.destination}`;
                    const strength = moveStrengths.get(key)?.strength || 1;
                    if (strength > maxStrength) {
                        maxStrength = strength;
                        winners = [move];
                    } else if (strength === maxStrength) {
                        winners.push(move);
                    }
                });
                
                if (winners.length === 1 && maxStrength > defenseStrength) {
                    successfulMoves.push(winners[0]);
                    competingMoves.filter(m => m !== winners[0]).forEach(m => failedMoves.push(m));
                    if (defender) {
                        this.state.dislodged[destination] = {
                            ...defender,
                            retreatOptions: getAdjacent(destination).filter(loc => 
                                !this.state.units[loc]
                            )
                        };
                    }
                } else {
                    // Standoff - all fail
                    competingMoves.forEach(m => failedMoves.push(m));
                }
            }
        });
        
        // Execute successful moves
        successfulMoves.forEach(move => {
            const unit = this.state.units[move.location];
            delete this.state.units[move.location];
            this.state.units[move.destination] = unit;
            
            this.results.push({
                type: 'move_success',
                from: move.location,
                to: move.destination,
                faction: move.faction
            });
        });
        
        failedMoves.forEach(move => {
            this.results.push({
                type: 'move_failed',
                from: move.location,
                to: move.destination,
                faction: move.faction,
                reason: 'bounce'
            });
        });
        
        return this.results;
    }
}

/**
 * Build Phase Handler
 */
class BuildPhaseHandler {
    constructor(state) {
        this.state = state;
    }
    
    updateOwnership() {
        Object.keys(this.state.units).forEach(location => {
            const system = MAP_DATA.systems[location];
            if (system?.supply) {
                this.state.ownership[location] = this.state.units[location].faction;
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
        if (!factionData) return [];
        
        return factionData.homeSystems.filter(loc => 
            this.state.ownership[loc] === faction && 
            !this.state.units[loc]
        );
    }
    
    processBuild(faction, location, unitType = 'fleet') {
        const available = this.getAvailableBuildLocations(faction);
        if (!available.includes(location)) return false;
        
        const builds = this.calculateBuilds(faction);
        if (builds <= 0) return false;
        
        this.state.units[location] = { faction, type: unitType };
        return true;
    }
    
    processDisband(faction, location) {
        const unit = this.state.units[location];
        if (!unit || unit.faction !== faction) return false;
        
        delete this.state.units[location];
        return true;
    }
}

/**
 * Retreat Phase Handler
 */
class RetreatPhaseHandler {
    constructor(state) {
        this.state = state;
    }
    
    processRetreat(from, to) {
        const dislodged = this.state.dislodged[from];
        if (!dislodged) return false;
        if (!dislodged.retreatOptions.includes(to)) return false;
        if (this.state.units[to]) return false;
        
        this.state.units[to] = { faction: dislodged.faction, type: dislodged.type };
        delete this.state.dislodged[from];
        return true;
    }
    
    disbandDislodged(location) {
        delete this.state.dislodged[location];
    }
}

module.exports = {
    UNIT_TYPES,
    ORDER_TYPES,
    SEASONS,
    FACTIONS,
    VICTORY_CONDITIONS,
    MAP_DATA,
    initializeMapData,
    isAdjacent,
    getAdjacent,
    GameState,
    OrderValidator,
    Adjudicator,
    BuildPhaseHandler,
    RetreatPhaseHandler
};
