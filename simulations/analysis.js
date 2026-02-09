/**
 * Analysis tool — reads simulation result files and prints comparative reports.
 *
 * Usage: node analysis.js [results-file.json]
 *
 * If no file specified, reads the most recent file in results/.
 */

const fs = require('fs');
const path = require('path');

const BALANCE_TARGETS = {
    winRateMin: 8,
    winRateMax: 22,
    avgGameLengthMin: 10,
    avgGameLengthMax: 35,
    drawRateMax: 30,
    earlyEliminationMax: 15,
};

const resultsDir = path.join(__dirname, 'results');

// Find input file
let inputFile = process.argv[2];
if (!inputFile) {
    if (!fs.existsSync(resultsDir)) {
        console.error('No results directory found. Run simulate.js first.');
        process.exit(1);
    }
    const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse();
    if (files.length === 0) {
        console.error('No result files found. Run simulate.js first.');
        process.exit(1);
    }
    inputFile = path.join(resultsDir, files[0]);
    console.log(`Reading: ${files[0]}`);
}

const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

console.log('\n=== BALANCE ANALYSIS ===\n');

Object.entries(data).forEach(([stratName, stratData]) => {
    const { summary } = stratData;
    if (!summary) return;

    console.log(`--- Strategy: ${stratName.toUpperCase()} (${stratData.games} games) ---`);

    // Win rate check
    console.log('\nWin Rate Check (target: 8-22% per faction):');
    const totalWins = Object.values(summary.wins).reduce((a, b) => a + b, 0) + summary.draws;

    Object.entries(summary.wins)
        .sort((a, b) => b[1] - a[1])
        .forEach(([faction, wins]) => {
            const pct = (wins / stratData.games * 100);
            const flag = pct < BALANCE_TARGETS.winRateMin ? ' << LOW'
                : pct > BALANCE_TARGETS.winRateMax ? ' << HIGH'
                : '';
            console.log(`  ${faction.padEnd(12)} ${pct.toFixed(1).padStart(5)}%${flag}`);
        });

    // Game length check
    const avgTurns = summary.avgTurns;
    const turnFlag = avgTurns < BALANCE_TARGETS.avgGameLengthMin ? ' << SHORT'
        : avgTurns > BALANCE_TARGETS.avgGameLengthMax ? ' << LONG'
        : '';
    console.log(`\nAvg Game Length: ${avgTurns.toFixed(1)} turns${turnFlag} (target: ${BALANCE_TARGETS.avgGameLengthMin}-${BALANCE_TARGETS.avgGameLengthMax})`);

    // Draw rate check
    const drawPct = (summary.draws / stratData.games * 100);
    const drawFlag = drawPct > BALANCE_TARGETS.drawRateMax ? ' << HIGH' : '';
    console.log(`Draw Rate: ${drawPct.toFixed(1)}%${drawFlag} (target: <${BALANCE_TARGETS.drawRateMax}%)`);

    // Latinum wins
    console.log(`Latinum Victories: ${summary.latinumWins}`);

    // Elimination rates
    if (summary.eliminationRate) {
        console.log('\nElimination Rates:');
        Object.entries(summary.eliminationRate)
            .sort((a, b) => b[1] - a[1])
            .forEach(([faction, count]) => {
                const pct = (count / stratData.games * 100);
                const flag = pct > BALANCE_TARGETS.earlyEliminationMax ? ' << HIGH' : '';
                console.log(`  ${faction.padEnd(12)} ${pct.toFixed(1).padStart(5)}%${flag}`);
            });
    }

    console.log('');
});

console.log('=== END ANALYSIS ===');
