/**
 * STAR TREK DIPLOMACY - Faction Abilities & Economy
 * 
 * Each faction has unique abilities reflecting their Star Trek identity.
 */

const FACTION_ABILITIES = {
    federation: {
        name: "Diplomatic Immunity",
        description: "Once per game, prevent one of your units from being dislodged",
        usesPerGame: 1,
        effect: 'prevent_dislodge'
    },
    klingon: {
        name: "Warrior's Rage",
        description: "+1 attack on first move order each turn. -1 defense when holding without fleet in orbit.",
        passive: true,
        effect: 'first_strike',
        attackBonus: 1,
        defensePenaltyNoFleet: 1,
        maxBonusMoves: 1
    },
    romulan: {
        name: "Tal Shiar Intelligence",
        description: "Each turn, choose one enemy faction and see all their orders before resolution.",
        passive: true,
        effect: 'spy_on_faction',
    },
    cardassian: {
        name: "Obsidian Order",
        description: "See the destination of all enemy move orders (but not supports)",
        passive: true,
        effect: 'see_destinations'
    },
    ferengi: {
        name: "Rules of Acquisition",
        description: "Earn latinum from supply centers. Spend 15 latinum to bribe a neutral SC. Spend 25 latinum to sabotage one enemy support.",
        passive: true,
        effect: 'latinum_master',
        incomePerSC: 0.5,
        bribeCost: 15,
        sabotageCost: 25
    },
    breen: {
        name: "Energy Dampening Weapon",
        description: "Once per game, freeze a territory - no units can move in or out for one turn",
        usesPerGame: 1,
        effect: 'freeze_territory'
    },
    gorn: {
        name: "Reptilian Resilience",
        description: "When dislodged with no valid retreats, automatically return to nearest unoccupied home system instead of being disbanded.",
        passive: true,
        effect: 'guaranteed_retreat_home',
    }
};

/**
 * Latinum Economy Manager
 */
class LatinumEconomy {
    constructor() {
        this.balances = {};
        this.transactions = [];
    }
    
    initialize(factions) {
        factions.forEach(f => {
            this.balances[f] = 0;
        });
    }
    
    getBalance(faction) {
        return this.balances[faction] || 0;
    }
    
    processIncome(gameState) {
        // Latinum income is Ferengi-exclusive per rules
        const ferengiRate = FACTION_ABILITIES.ferengi.incomePerSC;
        const ferengiSCs = gameState.countSupplyCenters('ferengi');
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
    
    spend(faction, amount, reason) {
        if (this.balances[faction] < amount) return false;
        
        this.balances[faction] -= amount;
        this.transactions.push({
            faction,
            type: 'spend',
            amount: -amount,
            reason,
            balance: this.balances[faction]
        });
        return true;
    }
    
    canAfford(faction, amount) {
        return this.balances[faction] >= amount;
    }
}

/**
 * Ability Manager - Tracks and applies faction abilities
 */
class AbilityManager {
    constructor(gameState, economy) {
        this.state = gameState;
        this.economy = economy;
        this.usedAbilities = {};
        this.frozenTerritories = [];
        this.revealedOrders = [];
        this.protectedLocations = [];
        this.sabotagedSupports = [];
    }
    
    // Federation: Prevent dislodge
    useDiplomaticImmunity(faction, location) {
        if (faction !== 'federation') return { success: false, reason: 'Not Federation' };
        if (this.usedAbilities['federation_immunity']) return { success: false, reason: 'Already used' };

        this.usedAbilities['federation_immunity'] = true;
        this.protectedLocations.push(location);
        return { success: true, protectedLocation: location };
    }

    // Get protected locations for adjudicator
    getProtectedLocations() {
        return this.protectedLocations;
    }
    
    // Klingon: First strike (applied during order processing in game-manager)
    getKlingonModifiers() {
        return {
            attackBonus: FACTION_ABILITIES.klingon.attackBonus,
            defensePenaltyNoFleet: FACTION_ABILITIES.klingon.defensePenaltyNoFleet
        };
    }
    
    // Romulan: Spy on chosen faction
    useIntelligence(enemyOrders, targetFaction = null) {
        if (!targetFaction || targetFaction === 'romulan') {
            this.revealedOrders = [];
            return this.revealedOrders;
        }
        const targetOrders = enemyOrders[targetFaction] || [];
        this.revealedOrders = targetOrders.map(o => ({ ...o, faction: targetFaction }));
        return this.revealedOrders;
    }
    
    // Cardassian: See destinations
    getVisibleDestinations(enemyOrders) {
        const destinations = {};
        Object.entries(enemyOrders).forEach(([faction, orders]) => {
            if (faction !== 'cardassian') {
                destinations[faction] = orders
                    .filter(o => o.type === 'move')
                    .map(o => o.destination);
            }
        });
        return destinations;
    }
    
    // Ferengi: Bribe neutral SC
    bribeNeutralSC(location, gameState) {
        const system = gameState.systems?.[location];
        if (!system?.supply) return { success: false, reason: 'Not a supply center' };
        if (gameState.ownership[location]) return { success: false, reason: 'Already owned' };
        
        const cost = FACTION_ABILITIES.ferengi.bribeCost;
        if (!this.economy.canAfford('ferengi', cost)) {
            return { success: false, reason: 'Insufficient latinum' };
        }
        
        this.economy.spend('ferengi', cost, `Bribed ${location}`);
        gameState.ownership[location] = 'ferengi';
        return { success: true, location };
    }
    
    // Ferengi: Sabotage support
    sabotageSupport(targetFaction, targetLocation) {
        const cost = FACTION_ABILITIES.ferengi.sabotageCost;
        if (!this.economy.canAfford('ferengi', cost)) {
            return { success: false, reason: 'Insufficient latinum' };
        }

        this.economy.spend('ferengi', cost, `Sabotaged support at ${targetLocation}`);
        this.sabotagedSupports.push({ faction: targetFaction, location: targetLocation });
        return { success: true, targetFaction, targetLocation };
    }

    // Get sabotaged supports for adjudicator
    getSabotagedSupports() {
        return this.sabotagedSupports;
    }
    
    // Breen: Freeze territory
    freezeTerritory(location) {
        if (this.usedAbilities['breen_freeze']) {
            return { success: false, reason: 'Already used' };
        }
        
        this.usedAbilities['breen_freeze'] = true;
        this.frozenTerritories.push(location);
        return { success: true, location };
    }
    
    isFrozen(location) {
        return this.frozenTerritories.includes(location);
    }
    
    // Gorn: Deterministic resilience — only triggers when no valid retreats
    checkGornResilience(faction, originalLocation, retreatOptions = []) {
        if (faction !== 'gorn') return { survived: false };
        if (retreatOptions && retreatOptions.length > 0) return { survived: false };

        const homeSystem = this.findNearestHomeSystem('gorn', originalLocation);
        if (homeSystem) {
            return { survived: true, returnTo: homeSystem };
        }
        return { survived: false };
    }

    findNearestHomeSystem(faction, from) {
        const { FACTIONS } = require('./diplomacy-engine');
        const homes = FACTIONS[faction]?.homeSystems || [];
        const available = homes.filter(h => !this.state.units[h]);
        if (available.length === 0) return null;
        return available[0];
    }
    
    // Reset per-turn abilities
    resetTurn() {
        this.frozenTerritories = [];
        this.revealedOrders = [];
        this.protectedLocations = [];
        this.sabotagedSupports = [];
    }
    
    // Reset per-year abilities
    resetYear() {
        // Currently nothing resets yearly
    }
}

module.exports = {
    FACTION_ABILITIES,
    LatinumEconomy,
    AbilityManager
};
