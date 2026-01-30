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
        description: "+1 attack strength, -1 defense strength (glass cannon)",
        passive: true,
        effect: 'attack_bonus_defense_penalty',
        attackBonus: 1,
        defensePenalty: 1
    },
    romulan: {
        name: "Tal Shiar Intelligence",
        description: "Each turn, reveal 1-2 random enemy orders before resolution",
        passive: true,
        effect: 'reveal_orders',
        ordersRevealed: { min: 1, max: 2 }
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
        description: "50% chance to survive destruction and return to nearest home system",
        passive: true,
        effect: 'survival_chance',
        survivalChance: 0.5
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
        Object.keys(this.balances).forEach(faction => {
            const scs = gameState.countSupplyCenters(faction);
            const ability = FACTION_ABILITIES[faction];
            const rate = ability?.incomePerSC || 0.33;
            const income = Math.floor(scs * rate);
            
            this.balances[faction] += income;
            this.transactions.push({
                turn: gameState.turn,
                faction,
                type: 'income',
                amount: income,
                balance: this.balances[faction]
            });
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
    }
    
    // Federation: Prevent dislodge
    useDiplomaticImmunity(faction, location) {
        if (faction !== 'federation') return { success: false, reason: 'Not Federation' };
        if (this.usedAbilities['federation_immunity']) return { success: false, reason: 'Already used' };
        
        this.usedAbilities['federation_immunity'] = true;
        return { success: true, protectedLocation: location };
    }
    
    // Klingon: Glass cannon (applied during adjudication)
    getKlingonModifiers() {
        return {
            attackBonus: FACTION_ABILITIES.klingon.attackBonus,
            defensePenalty: FACTION_ABILITIES.klingon.defensePenalty
        };
    }
    
    // Romulan: Reveal orders
    useIntelligence(enemyOrders) {
        const numToReveal = Math.floor(Math.random() * 2) + 1;
        const allOrders = Object.entries(enemyOrders)
            .filter(([f]) => f !== 'romulan')
            .flatMap(([faction, orders]) => orders.map(o => ({ ...o, faction })));
        
        const shuffled = allOrders.sort(() => Math.random() - 0.5);
        this.revealedOrders = shuffled.slice(0, numToReveal);
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
        return { success: true, targetFaction, targetLocation };
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
    
    // Gorn: Survival check
    checkGornResilience(faction, originalLocation) {
        if (faction !== 'gorn') return { survived: false };
        
        const chance = FACTION_ABILITIES.gorn.survivalChance;
        if (Math.random() < chance) {
            // Find nearest home system
            const homeSystem = this.findNearestHomeSystem('gorn', originalLocation);
            return { survived: true, returnTo: homeSystem };
        }
        return { survived: false };
    }
    
    findNearestHomeSystem(faction, from) {
        const { FACTIONS } = require('./diplomacy-engine');
        const homes = FACTIONS[faction]?.homeSystems || [];
        // Return first available home (simplified)
        return homes.find(h => !this.state.units[h]) || homes[0];
    }
    
    // Reset per-turn abilities
    resetTurn() {
        this.frozenTerritories = [];
        this.revealedOrders = [];
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
