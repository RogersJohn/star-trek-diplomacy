/**
 * STAR TREK DIPLOMACY - Game Manager
 *
 * Manages a single game instance, coordinating all subsystems.
 */

const {
  GameState,
  Adjudicator,
  BuildPhaseHandler,
  RetreatPhaseHandler,
  OrderValidator,
  initializeMapData,
  FACTIONS,
  VICTORY_CONDITIONS,
  getAdjacent,
} = require('./engine/diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');
const { LatinumEconomy, AbilityManager, FACTION_ABILITIES } = require('./engine/faction-abilities');
const { AllianceManager } = require('./engine/alliance-system');
const { saveGame, saveMessage, getActiveGames } = require('./database');

class GameManager {
  constructor(gameId, playerFactions, settings = {}) {
    this.gameId = gameId;
    this.playerFactions = playerFactions; // { faction: playerName }
    this.settings = settings;

    // Initialize map
    initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);

    // Initialize game state
    this.state = new GameState();
    this.state.initialize();

    // Initialize subsystems
    this.economy = new LatinumEconomy();
    this.economy.initialize(Object.keys(playerFactions));

    this.abilities = new AbilityManager(this.state, this.economy);
    this.alliances = new AllianceManager();

    // Track submitted orders
    this.pendingOrders = {};
    this.pendingRetreats = {};
    this.pendingBuilds = {};

    // Game phase: 'orders', 'retreats', 'builds', 'ended'
    this.phase = 'orders';

    // Turn history
    this.history = [];

    // Messages
    this.messages = [];

    // Turn timer state
    this.turnDeadline = null;           // ISO timestamp when orders due
    this.delinquentPlayers = [];        // Factions who missed deadline
    this.kickVotes = {};                // { targetFaction: [votingFactions] }
    this.kickedPlayers = [];            // Factions that have been kicked

    // Set initial deadline for first turn if timer is configured
    if (this.settings.turnTimerDays) {
      this.turnDeadline = this.calculateDeadline();
    }
  }

  /**
   * Get public game state (visible to all)
   */
  getPublicState() {
    return {
      gameId: this.gameId,
      turn: this.state.turn,
      year: this.state.year,
      season: this.state.season,
      phase: this.phase,
      units: this.state.units,
      ownership: this.state.ownership,
      dislodged: Object.keys(this.state.dislodged),
      supplyCounts: this.getSupplyCounts(),
      ordersSubmitted: Object.keys(this.pendingOrders),
      winner: this.winner || null,
      // Turn timer info
      turnDeadline: this.turnDeadline,
      turnTimerDays: this.settings.turnTimerDays || null,
      delinquentPlayers: this.delinquentPlayers,
      kickVotes: this.kickVotes,
      kickedPlayers: this.kickedPlayers,
    };
  }

  /**
   * Get state for specific player (includes their private info)
   */
  getPlayerState(faction) {
    const publicState = this.getPublicState();

    // Faction-specific ability data
    const abilityData = this.getAbilityData(faction);

    return {
      ...publicState,
      myFaction: faction,
      myUnits: this.state.getUnits(faction),
      myLatinum: this.economy.getBalance(faction),
      myAbility: FACTION_ABILITIES[faction],
      myAlliance: this.alliances.getAlliance(faction),
      pendingProposals: this.alliances.getPendingProposals(faction),
      myDislodged: Object.entries(this.state.dislodged)
        .filter(([_, d]) => d.faction === faction)
        .map(([loc, d]) => ({ location: loc, retreatOptions: d.retreatOptions })),
      buildCount: this.phase === 'builds' ? this.calculateBuilds(faction) : 0,
      buildLocations: this.phase === 'builds' ? this.getAvailableBuildLocations(faction) : [],
      abilityData,
    };
  }

  /**
   * Get faction-specific ability data
   */
  getAbilityData(faction) {
    const data = {
      usedAbilities: this.abilities.usedAbilities,
      frozenTerritories: this.abilities.frozenTerritories,
    };

    // Federation: Can use diplomatic immunity if not yet used
    if (faction === 'federation') {
      data.canUseDiplomaticImmunity = !this.abilities.usedAbilities['federation_immunity'];
      data.dislodgingUnits = Object.entries(this.state.dislodged)
        .filter(([_, d]) => d.faction === 'federation')
        .map(([loc]) => loc);
    }

    // Romulan: See revealed enemy orders
    if (faction === 'romulan') {
      data.revealedOrders = this.abilities.revealedOrders || [];
    }

    // Cardassian: See enemy move destinations
    if (faction === 'cardassian') {
      data.enemyDestinations = this.abilities.getVisibleDestinations(this.pendingOrders);
    }

    // Ferengi: Latinum economy info
    if (faction === 'ferengi') {
      data.latinumBalance = this.economy.getBalance('ferengi');
      data.bribeCost = FACTION_ABILITIES.ferengi.bribeCost;
      data.sabotageCost = FACTION_ABILITIES.ferengi.sabotageCost;
    }

    // Breen: Freeze ability status
    if (faction === 'breen') {
      data.canUseFreeze = !this.abilities.usedAbilities['breen_freeze'];
    }

    // Gorn: Last survival rolls (stored in history)
    if (faction === 'gorn') {
      const lastTurn = this.history[this.history.length - 1];
      data.survivalRolls = lastTurn?.survivalRolls || [];
    }

    return data;
  }

  /**
   * Submit orders for a faction
   */
  submitOrders(faction, orders) {
    if (this.phase !== 'orders') {
      return { success: false, reason: 'Not in orders phase' };
    }

    if (!this.playerFactions[faction]) {
      return { success: false, reason: 'Invalid faction' };
    }

    // Validate each order
    const validator = new OrderValidator(this.state);
    // Pass frozen territories to validator (Phase 2 - Breen)
    validator.setFrozenTerritories(this.abilities.frozenTerritories);
    const validatedOrders = [];
    const errors = [];

    orders.forEach((order, index) => {
      const result = validator.validateOrder({ ...order, faction });
      if (result.valid) {
        validatedOrders.push({ ...order, faction });
      } else {
        errors.push({ index, order, reason: result.reason });
      }
    });

    if (errors.length > 0) {
      return { success: false, errors };
    }

    this.pendingOrders[faction] = validatedOrders;

    return { success: true, ordersAccepted: validatedOrders.length };
  }

  /**
   * Check if all orders are submitted
   */
  allOrdersSubmitted() {
    const activeFactions = Object.keys(this.playerFactions).filter(
      f => !this.state.isEliminated(f)
    );

    // Auto-submit holds for kicked players who haven't submitted
    activeFactions.forEach(f => {
      if (this.kickedPlayers.includes(f) && !this.pendingOrders[f]) {
        this.autoSubmitHolds(f);
      }
    });

    return activeFactions.every(f => this.pendingOrders[f]);
  }

  /**
   * Resolve the current phase
   */
  resolvePhase() {
    if (this.phase === 'orders') {
      return this.resolveOrders();
    } else if (this.phase === 'retreats') {
      return this.resolveRetreats();
    } else if (this.phase === 'builds') {
      return this.resolveBuilds();
    }

    return { success: false, reason: 'Invalid phase' };
  }

  /**
   * Resolve order phase
   */
  resolveOrders() {
    // Trigger Romulan intelligence (Phase 4)
    if (this.playerFactions['romulan'] && !this.state.isEliminated('romulan')) {
      this.abilities.useIntelligence(this.pendingOrders);
    }

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

    // Adjudicate
    const adjudicator = new Adjudicator(this.state);

    // Pass ability data to adjudicator
    adjudicator.setProtectedLocations(this.abilities.getProtectedLocations());
    adjudicator.setSabotagedSupports(this.abilities.getSabotagedSupports());

    adjudicator.setOrders(this.pendingOrders);
    const results = adjudicator.adjudicate();

    // Apply Gorn resilience - triggers for ALL dislodged Gorn units
    const survivalRolls = [];
    Object.entries(this.state.dislodged).forEach(([location, dislodged]) => {
      if (dislodged.faction === 'gorn') {
        const resilience = this.abilities.checkGornResilience('gorn', location);
        survivalRolls.push({
          location,
          survived: resilience.survived,
          returnTo: resilience.returnTo
        });
        if (resilience.survived) {
          this.state.units[resilience.returnTo] = {
            faction: 'gorn',
            type: dislodged.type,
          };
          delete this.state.dislodged[location];
          results.push({
            type: 'gorn_survived',
            from: location,
            to: resilience.returnTo,
          });
        }
      }
    });

    // Record in history (including Gorn survival rolls)
    this.history.push({
      turn: this.state.turn,
      season: this.state.season,
      orders: JSON.parse(JSON.stringify(this.pendingOrders)),
      results,
      survivalRolls: survivalRolls.length > 0 ? survivalRolls : undefined,
    });

    // Clear pending orders
    this.pendingOrders = {};

    // Save to database after resolution
    this.saveToDatabase();

    // Check for retreats needed
    if (Object.keys(this.state.dislodged).length > 0) {
      this.phase = 'retreats';
      return { phase: 'retreats', results, dislodged: this.state.dislodged };
    }

    // If Fall, go to builds
    if (this.state.season === 'fall') {
      this.updateOwnership();
      this.economy.processIncome(this.state);
      this.phase = 'builds';
      return { phase: 'builds', results };
    }

    // Otherwise advance turn
    return this.advanceTurn(results);
  }

  /**
   * Submit retreats
   */
  submitRetreats(faction, retreats) {
    if (this.phase !== 'retreats') {
      return { success: false, reason: 'Not in retreats phase' };
    }

    this.pendingRetreats[faction] = retreats;

    // Check if all retreats submitted
    const needRetreats = Object.entries(this.state.dislodged)
      .map(([_, d]) => d.faction)
      .filter((f, i, arr) => arr.indexOf(f) === i);

    if (needRetreats.every(f => this.pendingRetreats[f])) {
      return this.resolveRetreats();
    }

    return { success: true, waiting: needRetreats.filter(f => !this.pendingRetreats[f]) };
  }

  /**
   * Resolve retreats
   */
  resolveRetreats() {
    const handler = new RetreatPhaseHandler(this.state);
    const results = [];

    Object.entries(this.pendingRetreats).forEach(([faction, retreats]) => {
      retreats.forEach(retreat => {
        if (retreat.type === 'retreat') {
          const success = handler.processRetreat(retreat.from, retreat.to);
          results.push({ faction, ...retreat, success });
        } else {
          handler.disbandDislodged(retreat.location);
          results.push({ faction, type: 'disband', location: retreat.location, success: true });
        }
      });
    });

    // Disband any remaining dislodged (check Gorn resilience first)
    Object.entries(this.state.dislodged).forEach(([loc, dislodged]) => {
      if (dislodged.faction === 'gorn') {
        const resilience = this.abilities.checkGornResilience('gorn', loc);
        if (resilience.survived) {
          this.state.units[resilience.returnTo] = {
            faction: 'gorn',
            type: dislodged.type,
          };
          results.push({
            type: 'gorn_survived',
            from: loc,
            to: resilience.returnTo,
          });
        }
      }
      handler.disbandDislodged(loc);
    });

    this.pendingRetreats = {};

    // Save to database after resolution
    this.saveToDatabase();

    // If Fall, go to builds
    if (this.state.season === 'fall') {
      this.updateOwnership();
      this.economy.processIncome(this.state);
      this.phase = 'builds';
      return { phase: 'builds', results };
    }

    return this.advanceTurn(results);
  }

  /**
   * Submit builds
   */
  submitBuilds(faction, builds) {
    if (this.phase !== 'builds') {
      return { success: false, reason: 'Not in builds phase' };
    }

    this.pendingBuilds[faction] = builds;

    // Check if all factions submitted (or have 0 builds/disbands)
    const needBuilds = Object.keys(this.playerFactions)
      .filter(f => !this.state.isEliminated(f))
      .filter(f => this.calculateBuilds(f) !== 0);

    if (needBuilds.every(f => this.pendingBuilds[f])) {
      return this.resolveBuilds();
    }

    return { success: true, waiting: needBuilds.filter(f => !this.pendingBuilds[f]) };
  }

  /**
   * Resolve builds
   */
  resolveBuilds() {
    const handler = new BuildPhaseHandler(this.state);
    const results = [];

    Object.entries(this.pendingBuilds).forEach(([faction, builds]) => {
      builds.forEach(build => {
        if (build.type === 'build') {
          const success = handler.processBuild(faction, build.location, build.unitType);
          results.push({ faction, ...build, success });
        } else {
          const success = handler.processDisband(faction, build.location);
          results.push({ faction, type: 'disband', location: build.location, success });
        }
      });
    });

    this.pendingBuilds = {};

    // Save to database after resolution
    this.saveToDatabase();

    return this.advanceTurn(results);
  }

  /**
   * Advance to next turn
   */
  advanceTurn(lastResults) {
    // Check victory
    const victory = this.checkVictory();
    if (victory) {
      this.phase = 'ended';
      this.winner = victory;
      return { phase: 'ended', victory, lastResults };
    }

    // Advance season/year
    if (this.state.season === 'fall') {
      this.state.season = 'spring';
      this.state.year++;
    } else {
      this.state.season = 'fall';
    }
    this.state.turn++;

    this.phase = 'orders';
    this.abilities.resetTurn();

    // Reset turn timer state
    if (this.settings.turnTimerDays) {
      this.turnDeadline = this.calculateDeadline();
    }
    this.delinquentPlayers = [];
    this.kickVotes = {};

    return {
      phase: 'orders',
      turn: this.state.turn,
      year: this.state.year,
      season: this.state.season,
      lastResults,
    };
  }

  /**
   * Check for victory
   */
  checkVictory() {
    // Check allied victory first
    const alliedVictory = this.alliances.checkAlliedVictory(this.state, VICTORY_CONDITIONS);
    if (alliedVictory.victory) {
      this.saveToDatabase(); // Save immediately on victory
      return alliedVictory;
    }

    // Check solo victory
    for (const [faction, conditions] of Object.entries(VICTORY_CONDITIONS)) {
      if (!this.playerFactions[faction]) continue;

      const sc = this.state.countSupplyCenters(faction);
      if (sc >= conditions.supplyCenters) {
        this.saveToDatabase(); // Save immediately on victory
        return {
          victory: true,
          winners: [faction],
          type: 'solo',
          supplyCenters: sc,
        };
      }

      // Ferengi latinum victory
      if (faction === 'ferengi' && conditions.latinum) {
        if (this.economy.getBalance('ferengi') >= conditions.latinum) {
          this.saveToDatabase(); // Save immediately on victory
          return {
            victory: true,
            winners: ['ferengi'],
            type: 'latinum',
            latinum: this.economy.getBalance('ferengi'),
          };
        }
      }
    }

    return null;
  }

  /**
   * Update supply center ownership
   */
  updateOwnership() {
    const handler = new BuildPhaseHandler(this.state);
    handler.updateOwnership();
  }

  /**
   * Calculate builds for a faction
   */
  calculateBuilds(faction) {
    const handler = new BuildPhaseHandler(this.state);
    return handler.calculateBuilds(faction);
  }

  /**
   * Get available build locations
   */
  getAvailableBuildLocations(faction) {
    const handler = new BuildPhaseHandler(this.state);
    return handler.getAvailableBuildLocations(faction);
  }

  /**
   * Get supply center counts
   */
  getSupplyCounts() {
    const counts = {};
    Object.keys(FACTIONS).forEach(f => {
      counts[f] = this.state.countSupplyCenters(f);
    });
    return counts;
  }

  /**
   * Get available moves for a location
   */
  getAvailableMoves(location) {
    const unit = this.state.units[location];
    if (!unit) return [];

    return getAdjacent(location);
  }

  /**
   * Alliance management
   */
  proposeAlliance(from, to, type) {
    const proposal = this.alliances.proposeAlliance(from, to, type);
    return { success: true, proposal };
  }

  acceptAlliance(proposalId, faction) {
    return this.alliances.acceptProposal(proposalId, faction);
  }

  rejectAlliance(proposalId, faction) {
    return this.alliances.rejectProposal(proposalId, faction);
  }

  /**
   * Use faction ability
   */
  useAbility(faction, abilityName, params) {
    switch (abilityName) {
      case 'diplomatic_immunity':
        return this.abilities.useDiplomaticImmunity(faction, params.location);

      case 'freeze_territory':
        return this.abilities.freezeTerritory(params.location);

      case 'bribe':
        return this.abilities.bribeNeutralSC(params.location, {
          systems: SYSTEMS,
          ownership: this.state.ownership
        });

      case 'sabotage':
        return this.abilities.sabotageSupport(params.targetFaction, params.targetLocation);

      default:
        return { success: false, reason: 'Unknown ability' };
    }
  }

  /**
   * Get turn history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Add a message
   */
  async addMessage(from, to, content, isPublic = false) {
    const message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      from,
      to: isPublic ? 'all' : to,
      content,
      timestamp: new Date().toISOString(),
      turn: this.state.turn,
    };

    this.messages.push(message);

    // Save message to database
    await saveMessage(this.gameId, from, isPublic ? null : to, content);

    return message;
  }

  /**
   * Get messages for a faction
   */
  getMessages(faction) {
    return this.messages.filter(m => m.from === faction || m.to === faction || m.to === 'all');
  }

  /**
   * Calculate deadline for current turn
   */
  calculateDeadline() {
    const days = this.settings.turnTimerDays || 3; // Default 3 days
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    return deadline.toISOString();
  }

  /**
   * Check if deadline has expired and identify delinquent players
   */
  checkDeadline() {
    if (!this.turnDeadline || this.phase !== 'orders') {
      return { expired: false };
    }

    const now = new Date();
    const deadline = new Date(this.turnDeadline);

    if (now > deadline) {
      // Find players who haven't submitted
      const activeFactions = Object.keys(this.playerFactions)
        .filter(f => !this.state.isEliminated(f) && !this.kickedPlayers.includes(f));

      const delinquent = activeFactions.filter(f => !this.pendingOrders[f]);
      this.delinquentPlayers = delinquent;

      return { expired: true, delinquentPlayers: delinquent };
    }

    return { expired: false, deadline: this.turnDeadline };
  }

  /**
   * Vote to kick a delinquent player
   */
  initiateKickVote(targetFaction, votingFaction) {
    // Can only vote to kick delinquent players
    if (!this.delinquentPlayers.includes(targetFaction)) {
      return { success: false, reason: 'Player is not delinquent' };
    }

    // Can't vote if you're kicked or eliminated
    if (this.kickedPlayers.includes(votingFaction) ||
        this.state.isEliminated(votingFaction)) {
      return { success: false, reason: 'You cannot vote' };
    }

    // Can't vote to kick yourself
    if (targetFaction === votingFaction) {
      return { success: false, reason: 'You cannot vote to kick yourself' };
    }

    // Initialize vote array if needed
    if (!this.kickVotes[targetFaction]) {
      this.kickVotes[targetFaction] = [];
    }

    // Add vote if not already voted
    if (!this.kickVotes[targetFaction].includes(votingFaction)) {
      this.kickVotes[targetFaction].push(votingFaction);
    }

    // Check if unanimous (all active non-target players must vote)
    const eligibleVoters = Object.keys(this.playerFactions)
      .filter(f => f !== targetFaction &&
                   !this.state.isEliminated(f) &&
                   !this.kickedPlayers.includes(f));

    const allVoted = eligibleVoters.every(f =>
      this.kickVotes[targetFaction].includes(f)
    );

    if (allVoted && eligibleVoters.length > 0) {
      this.kickedPlayers.push(targetFaction);
      return {
        success: true,
        kicked: true,
        player: targetFaction,
        message: `${targetFaction} has been kicked from the game`
      };
    }

    return {
      success: true,
      kicked: false,
      votes: this.kickVotes[targetFaction].length,
      needed: eligibleVoters.length
    };
  }

  /**
   * Auto-submit hold orders for a faction (used for kicked players)
   */
  autoSubmitHolds(faction) {
    const units = this.state.getUnits(faction);
    const holdOrders = units.map(unit => ({
      type: 'hold',
      location: unit.location,
      faction: faction
    }));

    this.pendingOrders[faction] = holdOrders;
  }

  /**
   * Serialize game state for storage
   */
  toJSON() {
    return {
      gameId: this.gameId,
      playerFactions: this.playerFactions,
      settings: this.settings,
      state: this.state.toJSON(),
      economy: {
        balances: this.economy.balances,
        transactions: this.economy.transactions,
      },
      alliances: this.alliances.toJSON(),
      phase: this.phase,
      history: this.history,
      messages: this.messages,
      winner: this.winner,
      turn: this.state.turn,
      year: this.state.year,
      season: this.state.season,
      // Turn timer state
      turnDeadline: this.turnDeadline,
      delinquentPlayers: this.delinquentPlayers,
      kickVotes: this.kickVotes,
      kickedPlayers: this.kickedPlayers,
    };
  }

  /**
   * Save game state to database
   */
  async saveToDatabase() {
    try {
      const gameData = this.toJSON();
      await saveGame(this.gameId, gameData, this.playerFactions);
      console.log(`Game ${this.gameId} saved to database`);
    } catch (error) {
      console.error(`Error saving game ${this.gameId}:`, error);
    }
  }

  /**
   * Load game from storage
   */
  static fromJSON(data) {
    const game = new GameManager(data.gameId, data.playerFactions, data.settings);

    // Restore state
    game.state.turn = data.state.turn;
    game.state.year = data.state.year;
    game.state.season = data.state.season;
    game.state.units = data.state.units;
    game.state.ownership = data.state.ownership;
    game.state.dislodged = data.state.dislodged || {};

    // Restore economy
    game.economy.balances = data.economy.balances;
    game.economy.transactions = data.economy.transactions;

    // Restore alliances
    game.alliances = AllianceManager.fromJSON(data.alliances);

    // Restore other state
    game.phase = data.phase;
    game.history = data.history;
    game.messages = data.messages || [];
    game.winner = data.winner;

    // Restore turn timer state
    game.turnDeadline = data.turnDeadline || null;
    game.delinquentPlayers = data.delinquentPlayers || [];
    game.kickVotes = data.kickVotes || {};
    game.kickedPlayers = data.kickedPlayers || [];

    return game;
  }

  /**
   * Load all active games from database
   */
  static async loadActiveGames() {
    console.log('Loading active games from database...');
    const games = new Map();

    try {
      const activeGames = await getActiveGames();

      for (const { gameId, gameData } of activeGames) {
        try {
          const game = GameManager.fromJSON(gameData);
          games.set(gameId, game);
          console.log(`Loaded game ${gameId} - Turn ${game.state.turn}, ${game.state.season} ${game.state.year}`);
        } catch (error) {
          console.error(`Error loading game ${gameId}:`, error);
        }
      }

      console.log(`Successfully loaded ${games.size} active game(s)`);
    } catch (error) {
      console.error('Error loading active games:', error);
    }

    return games;
  }
}

module.exports = GameManager;
