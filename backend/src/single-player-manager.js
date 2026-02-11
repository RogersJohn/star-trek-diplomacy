/**
 * SinglePlayerManager - Manages a single-player game with AI opponents.
 *
 * Extends GameManager, overrides database persistence (no-op for SP),
 * and coordinates human + AI order submission/resolution in one call.
 */

const GameManager = require('./game-manager');
const AIPlayer = require('./engine/ai/ai-player');
const { FACTIONS } = require('./engine/diplomacy-engine');

class SinglePlayerManager extends GameManager {
  /**
   * @param {string} humanFaction - The human player's faction
   * @param {string|Object} aiDifficulty - Difficulty level or { faction: difficulty } map
   * @param {Object} settings - Game settings
   */
  constructor(humanFaction, aiDifficulty = 'medium', settings = {}) {
    // Build playerFactions map with all 7 factions
    const playerFactions = {};
    Object.keys(FACTIONS).forEach(f => {
      playerFactions[f] = f === humanFaction ? 'human' : 'ai';
    });

    super(`sp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, playerFactions, settings);

    this.humanFaction = humanFaction;
    this.aiPlayers = {};

    // Create AI players for each non-human faction
    Object.keys(FACTIONS).forEach(f => {
      if (f === humanFaction) return;
      const difficulty = typeof aiDifficulty === 'object'
        ? (aiDifficulty[f] || 'medium')
        : aiDifficulty;
      this.aiPlayers[f] = new AIPlayer(f, difficulty);
    });
  }

  /**
   * No-op: single-player games are not persisted to database.
   */
  async saveToDatabase() {
    // Intentionally empty for single-player
  }

  /**
   * Submit human orders, then generate + submit AI orders, then resolve.
   */
  submitHumanOrders(orders) {
    // Submit human orders
    const humanResult = this.submitOrders(this.humanFaction, orders);
    if (!humanResult.success) return humanResult;

    // Generate and submit AI orders
    this._submitAIOrders();

    // Resolve
    const resolution = this.resolvePhase();
    return {
      success: true,
      resolution,
      gameState: this.getPublicState(),
      playerState: this.getHumanState(),
    };
  }

  /**
   * Submit human retreats, then generate + submit AI retreats, then resolve.
   */
  submitHumanRetreats(retreats) {
    const humanResult = this.submitRetreats(this.humanFaction, retreats);

    // If still waiting (for AI retreats), handle AI retreats
    if (humanResult.waiting) {
      this._submitAIRetreats();
    }

    // Check if we need to resolve again after AI submission
    if (this.phase === 'retreats') {
      // All retreats should be submitted now, resolve
      const resolution = this.resolveRetreats();
      return {
        success: true,
        resolution,
        gameState: this.getPublicState(),
        playerState: this.getHumanState(),
      };
    }

    return {
      success: true,
      resolution: humanResult,
      gameState: this.getPublicState(),
      playerState: this.getHumanState(),
    };
  }

  /**
   * Submit human builds, then generate + submit AI builds, then resolve.
   */
  submitHumanBuilds(builds) {
    const humanResult = this.submitBuilds(this.humanFaction, builds);

    // If still waiting, handle AI builds
    if (humanResult.waiting) {
      this._submitAIBuilds();
    }

    if (this.phase === 'builds') {
      const resolution = this.resolveBuilds();
      return {
        success: true,
        resolution,
        gameState: this.getPublicState(),
        playerState: this.getHumanState(),
      };
    }

    return {
      success: true,
      resolution: humanResult,
      gameState: this.getPublicState(),
      playerState: this.getHumanState(),
    };
  }

  /**
   * Get the human player's state view.
   */
  getHumanState() {
    return this.getPlayerState(this.humanFaction);
  }

  // ─── Internal AI coordination ──────────────────────────────────────────

  _submitAIOrders() {
    Object.entries(this.aiPlayers).forEach(([faction, ai]) => {
      if (this.state.isEliminated(faction)) return;
      if (this.pendingOrders[faction]) return;

      const { orders, abilityActions } = ai.generateOrders(this.state);
      const result = this.submitOrders(faction, orders);

      if (!result.success) {
        // AI generated invalid orders — fall back to all holds
        console.warn(`AI ${faction} generated invalid orders: ${result.reason || JSON.stringify(result.errors?.slice(0, 2))}. Falling back to holds.`);
        const holdOrders = this.state.getUnits(faction).map(u => ({
          type: 'hold',
          location: u.position,
          faction,
        }));
        this.submitOrders(faction, holdOrders);
      }

      // Process ability actions
      abilityActions.forEach(action => {
        this.useAbility(faction, action.type, action.params);
      });
    });
  }

  _submitAIRetreats() {
    // Collect all retreats per faction first, then submit once per faction
    const retreatsByFaction = {};

    Object.entries(this.state.dislodged).forEach(([location, dislodged]) => {
      if (dislodged.faction === this.humanFaction) return;
      const ai = this.aiPlayers[dislodged.faction];
      if (!ai) return;

      if (!retreatsByFaction[dislodged.faction]) {
        retreatsByFaction[dislodged.faction] = [];
      }
      const retreat = ai.chooseRetreat(this.state, location, dislodged.retreatOptions);
      retreatsByFaction[dislodged.faction].push(retreat);
    });

    // Submit collected retreats for each faction
    Object.entries(retreatsByFaction).forEach(([faction, retreats]) => {
      if (!this.pendingRetreats[faction]) {
        this.submitRetreats(faction, retreats);
      }
    });
  }

  _submitAIBuilds() {
    Object.entries(this.aiPlayers).forEach(([faction, ai]) => {
      if (this.state.isEliminated(faction)) return;
      if (this.pendingBuilds[faction]) return;

      const buildCount = this.calculateBuilds(faction);
      if (buildCount === 0) return;

      const availableLocations = this.getAvailableBuildLocations(faction);
      const builds = ai.chooseBuild(this.state, buildCount, availableLocations);
      const result = this.submitBuilds(faction, builds);

      if (!result.success) {
        console.warn(`AI ${faction} build submission failed: ${result.reason}. Submitting empty builds.`);
        this.submitBuilds(faction, []);
      }
    });
  }
}

module.exports = SinglePlayerManager;
