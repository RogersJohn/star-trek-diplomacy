/**
 * Monte Carlo Balance Simulator
 *
 * Usage:
 *   node simulate.js --games=1000 --strategy=random
 *   node simulate.js --games=500 --strategy=all --report
 *   node simulate.js --games=100 --strategy=medium --report
 *
 * Strategies: random, easy, medium, hard, all (runs each)
 */

const fs = require('fs');
const path = require('path');

const {
    GameState, Adjudicator, BuildPhaseHandler, RetreatPhaseHandler,
    initializeMapData, FACTIONS, VICTORY_CONDITIONS,
    getValidDestinations, getPositionType, POSITION_TYPES,
} = require('../backend/src/engine/diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');
const { LatinumEconomy, FACTION_ABILITIES } = require('../backend/src/engine/faction-abilities');

// AI strategy imports
const AIPlayer = require('../backend/src/engine/ai/ai-player');

// Legacy random strategy (kept for comparison)
const randomStrategy = require('./strategies/random');

/**
 * Wrap an AI difficulty level as a simulation strategy function.
 * Returns a function with signature (faction, state) => orders[]
 */
function makeAIStrategy(difficulty) {
    // Create one AIPlayer per faction, cached
    const players = {};
    Object.keys(FACTIONS).forEach(f => {
        players[f] = new AIPlayer(f, difficulty);
    });

    return function aiStrategy(faction, state) {
        const ai = players[faction];
        if (!ai) return [];
        const { orders } = ai.generateOrders(state);
        return orders;
    };
}

const STRATEGIES = {
    random: randomStrategy,
    easy: makeAIStrategy('easy'),
    medium: makeAIStrategy('medium'),
    hard: makeAIStrategy('hard'),
};

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

function simulateGame(strategyFn) {
    const state = new GameState();
    state.initialize();
    const economy = new LatinumEconomy();
    economy.initialize(Object.keys(FACTIONS));
    const eliminated = new Set();

    for (let turn = 0; turn < MAX_TURNS; turn++) {
        // Orders phase
        const allOrders = {};
        Object.keys(FACTIONS).forEach(faction => {
            if (state.isEliminated(faction)) {
                eliminated.add(faction);
                return;
            }
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
        if (turn % 2 === 1) {
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
                    for (const loc of locations.armies) {
                        if (remaining <= 0) break;
                        buildHandler.processBuild(faction, loc, 'army');
                        remaining--;
                    }
                    for (const loc of locations.fleets) {
                        if (remaining <= 0) break;
                        buildHandler.processBuild(faction, loc, 'fleet');
                        remaining--;
                    }
                } else if (buildCount < 0) {
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
                        eliminated: [...eliminated],
                    };
                }
                if (faction === 'ferengi' && conditions.latinum &&
                    economy.getBalance('ferengi') >= conditions.latinum) {
                    return {
                        winner: 'ferengi', type: 'latinum', turn: turn + 1,
                        scCounts: getScCounts(state),
                        latinum: economy.getBalance('ferengi'),
                        eliminated: [...eliminated],
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

    return {
        winner: null, type: 'draw', turn: MAX_TURNS,
        scCounts: getScCounts(state),
        eliminated: [...eliminated],
    };
}

function getScCounts(state) {
    const counts = {};
    Object.keys(FACTIONS).forEach(f => {
        counts[f] = state.countSupplyCenters(f);
    });
    return counts;
}

function printReport(strategyName, results) {
    const wins = {};
    const avgTurns = results.reduce((sum, r) => sum + r.turn, 0) / results.length;
    const draws = results.filter(r => r.winner === null).length;
    const latinumWins = results.filter(r => r.type === 'latinum').length;

    Object.keys(FACTIONS).forEach(f => {
        wins[f] = results.filter(r => r.winner === f).length;
    });

    const avgSCs = {};
    Object.keys(FACTIONS).forEach(f => {
        avgSCs[f] = results.reduce((sum, r) => sum + (r.scCounts[f] || 0), 0) / results.length;
    });

    const eliminationRate = {};
    Object.keys(FACTIONS).forEach(f => {
        eliminationRate[f] = results.filter(r => r.eliminated.includes(f)).length;
    });

    console.log(`\n=== BALANCE REPORT: ${strategyName.toUpperCase()} ===`);
    console.log(`Games: ${results.length} | Avg turns: ${avgTurns.toFixed(1)} | Draws: ${draws} | Latinum wins: ${latinumWins}`);
    console.log('');
    console.log('Faction Win Rates:');
    Object.entries(wins)
        .sort((a, b) => b[1] - a[1])
        .forEach(([f, w]) => {
            const pct = ((w / results.length) * 100).toFixed(1);
            const bar = '#'.repeat(Math.round(w / results.length * 50));
            console.log(`  ${f.padEnd(12)} ${String(w).padStart(4)} wins (${pct.padStart(5)}%) ${bar}`);
        });

    console.log('');
    console.log('Average Final SC Counts:');
    Object.entries(avgSCs)
        .sort((a, b) => b[1] - a[1])
        .forEach(([f, sc]) => {
            console.log(`  ${f.padEnd(12)} ${sc.toFixed(1)} avg SCs`);
        });

    console.log('');
    console.log('Elimination Rate:');
    Object.entries(eliminationRate)
        .sort((a, b) => b[1] - a[1])
        .forEach(([f, count]) => {
            const pct = ((count / results.length) * 100).toFixed(1);
            console.log(`  ${f.padEnd(12)} ${pct.padStart(5)}% eliminated`);
        });

    return { wins, avgTurns, draws, latinumWins, avgSCs, eliminationRate };
}

// --- Run simulations ---
const strategiesToRun = STRATEGY === 'all'
    ? Object.keys(STRATEGIES)
    : [STRATEGY];

if (!STRATEGIES[strategiesToRun[0]] && STRATEGY !== 'all') {
    console.error(`Unknown strategy: ${STRATEGY}. Available: ${Object.keys(STRATEGIES).join(', ')}, all`);
    process.exit(1);
}

const allSummaries = {};

strategiesToRun.forEach(stratName => {
    const strategyFn = STRATEGIES[stratName];
    console.log(`Running ${NUM_GAMES} games with strategy: ${stratName}`);
    console.log(`Max turns per game: ${MAX_TURNS}`);

    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < NUM_GAMES; i++) {
        const result = simulateGame(strategyFn);
        results.push(result);
        if ((i + 1) % 100 === 0) {
            console.log(`  Completed ${i + 1}/${NUM_GAMES} games...`);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Completed in ${elapsed}s`);

    const summary = printReport(stratName, results);
    allSummaries[stratName] = { ...summary, results };
});

// Save results to JSON
const outputDir = path.join(__dirname, 'results');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = path.join(outputDir, `sim_${STRATEGY}_${NUM_GAMES}_${timestamp}.json`);

const output = {};
Object.entries(allSummaries).forEach(([name, data]) => {
    const { results, ...summary } = data;
    output[name] = {
        summary,
        games: results.length,
        results: REPORT ? results : undefined,
    };
});

fs.writeFileSync(filename, JSON.stringify(output, null, 2));
console.log(`\nResults saved to ${filename}`);
