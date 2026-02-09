/**
 * Faction Abilities Unit Tests
 */

const { AbilityManager, LatinumEconomy, FACTION_ABILITIES } = require('../faction-abilities');
const { GameState, Adjudicator, OrderValidator, initializeMapData, FACTIONS } = require('../diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');

// Initialize map data before tests
beforeAll(() => {
    initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);
});

describe('Federation Diplomatic Immunity', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['federation', 'klingon']);
        abilities = new AbilityManager(state, economy);
    });

    test('prevents dislodgement at protected location', () => {
        // Use diplomatic immunity on Earth
        const result = abilities.useDiplomaticImmunity('federation', 'earth');
        expect(result.success).toBe(true);
        expect(result.protectedLocation).toBe('earth');
        expect(abilities.getProtectedLocations()).toContain('earth');
    });

    test('can only be used once per game', () => {
        abilities.useDiplomaticImmunity('federation', 'earth');
        const result = abilities.useDiplomaticImmunity('federation', 'vulcan');
        expect(result.success).toBe(false);
        expect(result.reason).toBe('Already used');
    });

    test('only Federation can use it', () => {
        const result = abilities.useDiplomaticImmunity('klingon', 'qonos');
        expect(result.success).toBe(false);
        expect(result.reason).toBe('Not Federation');
    });

    test('adjudicator respects protected locations', () => {
        // Set up: Klingon with attack bonus attacks Federation at earth from betazed (adjacent)
        // Without protection, Klingon with +1 attack bonus (strength 2) beats Federation hold (strength 1)
        state.units = {
            'earth': { faction: 'federation', type: 'army' },
            'betazed': { faction: 'klingon', type: 'army' }
        };

        abilities.useDiplomaticImmunity('federation', 'earth');

        const adjudicator = new Adjudicator(state);
        adjudicator.setProtectedLocations(abilities.getProtectedLocations());
        adjudicator.setOrders({
            federation: [{ type: 'hold', location: 'earth', faction: 'federation' }],
            klingon: [{
                type: 'move',
                location: 'betazed',
                destination: 'earth',
                faction: 'klingon',
                klingonBonus: 1  // +1 attack, so strength = 2 vs defense = 1
            }]
        });

        const results = adjudicator.adjudicate();

        // Federation unit should still be at earth (protected by Diplomatic Immunity)
        expect(state.units['earth']).toBeDefined();
        expect(state.units['earth'].faction).toBe('federation');
        // Klingon should have bounced back to betazed
        expect(state.units['betazed']).toBeDefined();
        // Result should contain diplomatic immunity event
        expect(results.some(r => r.type === 'diplomatic_immunity')).toBe(true);
    });
});

describe('Breen Freeze Territory', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['breen', 'federation']);
        abilities = new AbilityManager(state, economy);
    });

    test('freezes territory successfully', () => {
        const result = abilities.freezeTerritory('neutral_zone');
        expect(result.success).toBe(true);
        expect(result.location).toBe('neutral_zone');
        expect(abilities.isFrozen('neutral_zone')).toBe(true);
    });

    test('can only be used once per game', () => {
        abilities.freezeTerritory('neutral_zone');
        const result = abilities.freezeTerritory('badlands');
        expect(result.success).toBe(false);
        expect(result.reason).toBe('Already used');
    });

    test('validator blocks moves out of frozen territory', () => {
        // earth and vulcan are adjacent
        state.units['earth'] = { faction: 'federation', type: 'army' };
        abilities.freezeTerritory('earth');

        const validator = new OrderValidator(state);
        validator.setFrozenTerritories(abilities.frozenTerritories);

        const result = validator.validateOrder({
            type: 'move',
            location: 'earth',
            destination: 'vulcan',
            faction: 'federation'
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('frozen');
    });

    test('validator blocks moves into frozen territory', () => {
        // vulcan and earth are adjacent
        state.units['vulcan'] = { faction: 'federation', type: 'army' };
        abilities.freezeTerritory('earth');

        const validator = new OrderValidator(state);
        validator.setFrozenTerritories(abilities.frozenTerritories);

        const result = validator.validateOrder({
            type: 'move',
            location: 'vulcan',
            destination: 'earth',
            faction: 'federation'
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('frozen');
    });

    test('freeze resets after turn', () => {
        abilities.freezeTerritory('neutral_zone');
        expect(abilities.isFrozen('neutral_zone')).toBe(true);

        abilities.resetTurn();
        expect(abilities.isFrozen('neutral_zone')).toBe(false);
    });
});

describe('Ferengi Bribe', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['ferengi', 'federation']);
        // Give Ferengi enough latinum
        economy.balances['ferengi'] = 50;
        abilities = new AbilityManager(state, economy);
    });

    test('claims neutral supply center', () => {
        // Find a neutral supply center
        const neutralSC = Object.entries(SYSTEMS).find(
            ([id, sys]) => sys.supply && !state.ownership[id]
        );

        if (neutralSC) {
            const context = { systems: SYSTEMS, ownership: state.ownership };
            const result = abilities.bribeNeutralSC(neutralSC[0], context);

            expect(result.success).toBe(true);
            expect(state.ownership[neutralSC[0]]).toBe('ferengi');
            expect(economy.getBalance('ferengi')).toBe(50 - FACTION_ABILITIES.ferengi.bribeCost);
        }
    });

    test('fails if target is already owned', () => {
        const context = { systems: SYSTEMS, ownership: state.ownership };
        const result = abilities.bribeNeutralSC('earth', context);

        expect(result.success).toBe(false);
        expect(result.reason).toBe('Already owned');
    });

    test('fails if insufficient latinum', () => {
        economy.balances['ferengi'] = 5;

        const neutralSC = Object.entries(SYSTEMS).find(
            ([id, sys]) => sys.supply && !state.ownership[id]
        );

        if (neutralSC) {
            const context = { systems: SYSTEMS, ownership: state.ownership };
            const result = abilities.bribeNeutralSC(neutralSC[0], context);

            expect(result.success).toBe(false);
            expect(result.reason).toBe('Insufficient latinum');
        }
    });
});

describe('Ferengi Sabotage', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['ferengi', 'federation']);
        economy.balances['ferengi'] = 50;
        abilities = new AbilityManager(state, economy);
    });

    test('sabotages support and deducts latinum', () => {
        const result = abilities.sabotageSupport('federation', 'earth');

        expect(result.success).toBe(true);
        expect(result.targetFaction).toBe('federation');
        expect(result.targetLocation).toBe('earth');
        expect(economy.getBalance('ferengi')).toBe(50 - FACTION_ABILITIES.ferengi.sabotageCost);
    });

    test('fails if insufficient latinum', () => {
        economy.balances['ferengi'] = 10;
        const result = abilities.sabotageSupport('federation', 'earth');

        expect(result.success).toBe(false);
        expect(result.reason).toBe('Insufficient latinum');
    });

    test('sabotaged support tracks correctly', () => {
        abilities.sabotageSupport('federation', 'earth');

        const sabotaged = abilities.getSabotagedSupports();
        expect(sabotaged).toContainEqual({ faction: 'federation', location: 'earth' });
    });

    test('adjudicator ignores sabotaged support', () => {
        // Set up scenario where support would normally help
        state.units = {
            'earth': { faction: 'federation', type: 'army' },
            'vulcan': { faction: 'federation', type: 'army' },
            'qonos': { faction: 'klingon', type: 'army' }
        };

        abilities.sabotageSupport('federation', 'vulcan');

        const adjudicator = new Adjudicator(state);
        adjudicator.setSabotagedSupports(abilities.getSabotagedSupports());
        adjudicator.setOrders({
            federation: [
                { type: 'hold', location: 'earth', faction: 'federation' },
                { type: 'support', location: 'vulcan', supportTo: 'earth', faction: 'federation' }
            ],
            klingon: [
                { type: 'move', location: 'qonos', destination: 'earth', faction: 'klingon', klingonBonus: 1 }
            ]
        });

        // The sabotaged support should not count, so Klingon with +1 attack should win
        // Federation: 1 base (sabotaged support doesn't count)
        // Klingon: 1 base + 1 attack bonus = 2
        const results = adjudicator.adjudicate();

        // Earth should be dislodged
        expect(state.dislodged['earth']).toBeDefined();
    });
});

describe('Romulan Intelligence (v2.1)', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['romulan', 'federation', 'klingon']);
        abilities = new AbilityManager(state, economy);
    });

    test('choosing a target reveals all their orders', () => {
        const orders = {
            federation: [
                { type: 'move', location: 'earth', destination: 'vulcan' },
                { type: 'hold', location: 'andoria' }
            ],
            klingon: [{ type: 'move', location: 'qonos', destination: 'tygokor' }],
            romulan: [{ type: 'hold', location: 'romulus' }]
        };

        const revealed = abilities.useIntelligence(orders, 'federation');

        expect(revealed).toHaveLength(2);
        expect(revealed.every(o => o.faction === 'federation')).toBe(true);
    });

    test('no target selected reveals nothing', () => {
        const orders = {
            federation: [{ type: 'move', location: 'earth', destination: 'vulcan' }],
            romulan: [{ type: 'hold', location: 'romulus' }]
        };

        const revealed = abilities.useIntelligence(orders, null);
        expect(revealed).toHaveLength(0);
    });

    test('cannot spy on own faction', () => {
        const orders = {
            federation: [{ type: 'move', location: 'earth', destination: 'vulcan' }],
            romulan: [{ type: 'hold', location: 'romulus' }]
        };

        const revealed = abilities.useIntelligence(orders, 'romulan');
        expect(revealed).toHaveLength(0);
    });
});

describe('Cardassian Obsidian Order', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['cardassian', 'federation', 'klingon']);
        abilities = new AbilityManager(state, economy);
    });

    test('sees enemy move destinations', () => {
        const orders = {
            federation: [
                { type: 'move', location: 'earth', destination: 'vulcan' },
                { type: 'support', location: 'andoria', supportTo: 'vulcan', supportFrom: 'earth' }
            ],
            klingon: [{ type: 'move', location: 'qonos', destination: 'tygokor' }],
            cardassian: [{ type: 'hold', location: 'cardassia' }]
        };

        const destinations = abilities.getVisibleDestinations(orders);

        // Should see Federation moving to vulcan (but not support)
        expect(destinations.federation).toContain('vulcan');
        expect(destinations.federation.length).toBe(1); // Only moves, not supports

        // Should see Klingon moving to tygokor
        expect(destinations.klingon).toContain('tygokor');

        // Should not see own orders
        expect(destinations.cardassian).toBeUndefined();
    });
});

describe('Klingon Warriors Rage (v2.1)', () => {
    test('attack bonus defined correctly', () => {
        expect(FACTION_ABILITIES.klingon.attackBonus).toBe(1);
    });

    test('first strike config defined correctly', () => {
        expect(FACTION_ABILITIES.klingon.effect).toBe('first_strike');
        expect(FACTION_ABILITIES.klingon.maxBonusMoves).toBe(1);
        expect(FACTION_ABILITIES.klingon.defensePenaltyNoFleet).toBe(1);
    });
});

describe('Gorn Deterministic Resilience (v2.1)', () => {
    let state, economy, abilities;

    beforeEach(() => {
        state = new GameState();
        state.initialize();
        economy = new LatinumEconomy();
        economy.initialize(['gorn', 'federation']);
        abilities = new AbilityManager(state, economy);
    });

    test('guaranteed retreat home config defined correctly', () => {
        expect(FACTION_ABILITIES.gorn.effect).toBe('guaranteed_retreat_home');
        expect(FACTION_ABILITIES.gorn.survivalChance).toBeUndefined();
    });

    test('unit with no retreat options goes to home system', () => {
        const result = abilities.checkGornResilience('gorn', 'neutral_zone', []);

        expect(result.survived).toBe(true);
        expect(FACTIONS.gorn.homeSystems).toContain(result.returnTo);
    });

    test('unit WITH valid retreats does NOT trigger resilience', () => {
        const result = abilities.checkGornResilience('gorn', 'neutral_zone', ['badlands']);

        expect(result.survived).toBe(false);
    });

    test('unit with all home systems occupied is disbanded', () => {
        // Fill all Gorn home systems
        FACTIONS.gorn.homeSystems.forEach(h => {
            state.units[h] = { faction: 'gorn', type: 'army' };
        });

        const result = abilities.checkGornResilience('gorn', 'neutral_zone', []);
        expect(result.survived).toBe(false);
    });

    test('only applies to Gorn faction', () => {
        const result = abilities.checkGornResilience('federation', 'earth', []);
        expect(result.survived).toBe(false);
    });
});

describe('Latinum Economy', () => {
    let economy;

    beforeEach(() => {
        economy = new LatinumEconomy();
        economy.initialize(['ferengi', 'federation']);
    });

    test('initializes with zero balance', () => {
        expect(economy.getBalance('ferengi')).toBe(0);
    });

    test('spending deducts from balance', () => {
        economy.balances['ferengi'] = 100;
        const result = economy.spend('ferengi', 25, 'test');

        expect(result).toBe(true);
        expect(economy.getBalance('ferengi')).toBe(75);
    });

    test('cannot spend more than balance', () => {
        economy.balances['ferengi'] = 10;
        const result = economy.spend('ferengi', 25, 'test');

        expect(result).toBe(false);
        expect(economy.getBalance('ferengi')).toBe(10);
    });

    test('canAfford check works', () => {
        economy.balances['ferengi'] = 20;

        expect(economy.canAfford('ferengi', 15)).toBe(true);
        expect(economy.canAfford('ferengi', 25)).toBe(false);
    });
});

describe('Latinum Economy Scope', () => {
    test('Only Ferengi receives latinum income', () => {
        const economy = new LatinumEconomy();
        economy.initialize(['federation', 'klingon', 'ferengi']);

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
