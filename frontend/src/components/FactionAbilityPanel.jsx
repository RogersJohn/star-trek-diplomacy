import { useState } from 'react';
import { FACTION_COLORS, FACTION_NAMES } from '../../../../shared/map-data';

/**
 * FactionAbilityPanel - Displays and controls faction-specific abilities
 */
export default function FactionAbilityPanel({ gameState, onUseAbility }) {
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);

  const { myFaction, myAbility, abilityData, units, ownership, phase } = gameState;

  if (!myFaction || !myAbility) return null;

  const factionColor = FACTION_COLORS[myFaction] || '#888';

  // Helper: Get all systems
  const getAllSystems = () => {
    return Object.keys(ownership || {});
  };

  // Helper: Get neutral supply centers
  const getNeutralSupplyCenters = () => {
    return getAllSystems().filter(sys => ownership[sys] === null);
  };

  // Helper: Get enemy factions with units
  const getEnemyFactions = () => {
    const enemies = [];
    Object.keys(units || {}).forEach(loc => {
      const unit = units[loc];
      if (unit && unit.faction !== myFaction && !enemies.includes(unit.faction)) {
        enemies.push(unit.faction);
      }
    });
    return enemies;
  };

  // Federation: Diplomatic Immunity
  const renderFederationAbility = () => {
    const canUse = abilityData?.canUseDiplomaticImmunity;
    const dislodgingUnits = abilityData?.dislodgingUnits || [];

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Once per game: Prevent one unit from being dislodged
        </div>

        {dislodgingUnits.length > 0 && canUse && (
          <div className="space-y-1">
            <div className="text-sm font-semibold">Units at risk:</div>
            {dislodgingUnits.map(loc => (
              <button
                key={loc}
                onClick={() => onUseAbility('diplomatic_immunity', { location: loc })}
                className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
              >
                Protect unit at {loc.toUpperCase()}
              </button>
            ))}
          </div>
        )}

        {!canUse && (
          <div className="text-yellow-500 text-sm">✓ Diplomatic Immunity already used</div>
        )}

        {canUse && dislodgingUnits.length === 0 && (
          <div className="text-gray-500 text-sm">No units currently at risk</div>
        )}
      </div>
    );
  };

  // Klingon: Warrior's Rage
  const renderKlingonAbility = () => {
    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Passive: +1 attack strength, -1 defense strength
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-green-900/30 p-2 rounded">
            <div className="text-green-400 font-bold">⚔️ +1 Attack</div>
            <div className="text-xs text-gray-400">When attacking</div>
          </div>
          <div className="bg-red-900/30 p-2 rounded">
            <div className="text-red-400 font-bold">🛡️ -1 Defense</div>
            <div className="text-xs text-gray-400">When defending</div>
          </div>
        </div>

        <div className="text-xs text-yellow-500 italic">
          Glass cannon: Hit harder, but more vulnerable
        </div>
      </div>
    );
  };

  // Romulan: Tal Shiar Intelligence
  const renderRomulanAbility = () => {
    const revealedOrders = abilityData?.revealedOrders || [];

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Passive: Reveal 1-2 random enemy orders each turn
        </div>

        {revealedOrders.length > 0 ? (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-green-400">🔍 Intercepted Orders:</div>
            {revealedOrders.map((order, idx) => (
              <div
                key={idx}
                className="bg-gray-800/50 p-2 rounded text-xs border-l-2"
                style={{ borderColor: FACTION_COLORS[order.faction] }}
              >
                <div className="font-semibold" style={{ color: FACTION_COLORS[order.faction] }}>
                  {FACTION_NAMES[order.faction]}
                </div>
                <div className="text-gray-300">
                  {order.unit} at {order.location}: {order.type.toUpperCase()}
                  {order.destination && ` → ${order.destination}`}
                  {order.supportTarget && ` (supporting ${order.supportTarget})`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No orders intercepted this turn</div>
        )}
      </div>
    );
  };

  // Cardassian: Obsidian Order
  const renderCardassianAbility = () => {
    const enemyDestinations = abilityData?.enemyDestinations || {};

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Passive: See all enemy move destinations (but not supports)
        </div>

        {Object.keys(enemyDestinations).length > 0 ? (
          <div className="space-y-1">
            <div className="text-sm font-semibold text-orange-400">👁️ Enemy Movement Detected:</div>
            {Object.entries(enemyDestinations).map(
              ([faction, destinations]) =>
                destinations.length > 0 && (
                  <div
                    key={faction}
                    className="bg-gray-800/50 p-2 rounded text-xs border-l-2"
                    style={{ borderColor: FACTION_COLORS[faction] }}
                  >
                    <div className="font-semibold" style={{ color: FACTION_COLORS[faction] }}>
                      {FACTION_NAMES[faction]}
                    </div>
                    <div className="text-gray-300">
                      Moving to: {destinations.map(d => d.toUpperCase()).join(', ')}
                    </div>
                  </div>
                )
            )}
          </div>
        ) : (
          <div className="text-gray-500 text-sm">No enemy movement detected</div>
        )}
      </div>
    );
  };

  // Ferengi: Rules of Acquisition
  const renderFerengiAbility = () => {
    const balance = abilityData?.latinumBalance || 0;
    const bribeCost = abilityData?.bribeCost || 15;
    const sabotageCost = abilityData?.sabotageCost || 25;
    const neutralSCs = getNeutralSupplyCenters();
    const enemyFactions = getEnemyFactions();

    const [bribeTarget, setBribeTarget] = useState(null);
    const [sabotageTarget, setSabotageTarget] = useState(null);

    return (
      <div className="space-y-3">
        <div className="text-xs text-gray-400">
          Passive: Earn latinum, bribe neutrals, sabotage supports
        </div>

        {/* Latinum Balance */}
        <div className="bg-yellow-900/30 p-3 rounded">
          <div className="text-2xl font-bold text-yellow-400">💰 {balance} Latinum</div>
          <div className="text-xs text-gray-400 mt-1">Earn 0.5 per supply center each turn</div>
        </div>

        {/* Bribe Action */}
        <div className="space-y-1">
          <div className="text-sm font-semibold">Bribe Neutral SC ({bribeCost} latinum)</div>
          {!bribeTarget ? (
            <>
              {neutralSCs.length > 0 ? (
                <select
                  className="w-full px-2 py-1 bg-gray-800 rounded text-sm"
                  onChange={e => setBribeTarget(e.target.value)}
                  value=""
                >
                  <option value="">Select neutral system...</option>
                  {neutralSCs.map(sys => (
                    <option key={sys} value={sys}>
                      {sys.toUpperCase()}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-500 text-xs">No neutral SCs available</div>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (balance >= bribeCost) {
                    onUseAbility('bribe', { location: bribeTarget });
                    setBribeTarget(null);
                  }
                }}
                disabled={balance < bribeCost}
                className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm transition-colors"
              >
                Bribe {bribeTarget.toUpperCase()}
              </button>
              <button
                onClick={() => setBribeTarget(null)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Sabotage Action */}
        <div className="space-y-1">
          <div className="text-sm font-semibold">Sabotage Support ({sabotageCost} latinum)</div>
          {!sabotageTarget ? (
            <>
              {enemyFactions.length > 0 ? (
                <select
                  className="w-full px-2 py-1 bg-gray-800 rounded text-sm"
                  onChange={e => setSabotageTarget(e.target.value)}
                  value=""
                >
                  <option value="">Select enemy faction...</option>
                  {enemyFactions.map(f => (
                    <option key={f} value={f}>
                      {FACTION_NAMES[f]}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-500 text-xs">No enemy units present</div>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (balance >= sabotageCost) {
                    onUseAbility('sabotage', { targetFaction: sabotageTarget });
                    setSabotageTarget(null);
                  }
                }}
                disabled={balance < sabotageCost}
                className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 rounded text-sm transition-colors"
              >
                Sabotage {FACTION_NAMES[sabotageTarget]}
              </button>
              <button
                onClick={() => setSabotageTarget(null)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Breen: Energy Dampening Weapon
  const renderBreenAbility = () => {
    const canUse = abilityData?.canUseFreeze;
    const frozenTerritories = abilityData?.frozenTerritories || [];
    const allSystems = getAllSystems();

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Once per game: Freeze a territory - no units can move in or out for one turn
        </div>

        {frozenTerritories.length > 0 && (
          <div className="bg-blue-900/30 p-2 rounded">
            <div className="text-blue-400 font-semibold text-sm">❄️ Frozen Territories:</div>
            <div className="text-xs text-gray-300">
              {frozenTerritories.map(t => t.toUpperCase()).join(', ')}
            </div>
          </div>
        )}

        {canUse ? (
          <div className="space-y-1">
            <div className="text-sm font-semibold">Select territory to freeze:</div>
            {!selectedSystem ? (
              <select
                className="w-full px-2 py-1 bg-gray-800 rounded text-sm"
                onChange={e => setSelectedSystem(e.target.value)}
                value=""
              >
                <option value="">Choose system...</option>
                {allSystems.map(sys => (
                  <option key={sys} value={sys}>
                    {sys.toUpperCase()}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onUseAbility('freeze_territory', { location: selectedSystem });
                    setSelectedSystem(null);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
                >
                  Freeze {selectedSystem.toUpperCase()}
                </button>
                <button
                  onClick={() => setSelectedSystem(null)}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-yellow-500 text-sm">✓ Energy dampening weapon already used</div>
        )}
      </div>
    );
  };

  // Gorn: Reptilian Resilience
  const renderGornAbility = () => {
    const survivalRolls = abilityData?.survivalRolls || [];

    return (
      <div className="space-y-2">
        <div className="text-xs text-gray-400">
          Passive: 50% chance to survive destruction and return to nearest home
        </div>

        <div className="bg-green-900/30 p-2 rounded">
          <div className="text-green-400 font-semibold text-sm">🦎 Reptilian Resilience Active</div>
          <div className="text-xs text-gray-300">
            Your units have a 50% survival chance when dislodged
          </div>
        </div>

        {survivalRolls.length > 0 && (
          <div className="space-y-1">
            <div className="text-sm font-semibold">Last Turn Survival Rolls:</div>
            {survivalRolls.map((roll, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-xs ${
                  roll.survived ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                }`}
              >
                {roll.location.toUpperCase()}: {roll.survived ? '✓ Survived!' : '✗ Destroyed'}
                {roll.returnedTo && ` → Returned to ${roll.returnedTo.toUpperCase()}`}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render appropriate ability based on faction
  const renderAbility = () => {
    switch (myFaction) {
      case 'federation':
        return renderFederationAbility();
      case 'klingon':
        return renderKlingonAbility();
      case 'romulan':
        return renderRomulanAbility();
      case 'cardassian':
        return renderCardassianAbility();
      case 'ferengi':
        return renderFerengiAbility();
      case 'breen':
        return renderBreenAbility();
      case 'gorn':
        return renderGornAbility();
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border-2" style={{ borderColor: factionColor }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="text-lg font-bold" style={{ color: factionColor }}>
          {myAbility.name}
        </div>
      </div>

      {renderAbility()}
    </div>
  );
}
