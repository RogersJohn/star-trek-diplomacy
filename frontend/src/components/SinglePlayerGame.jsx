import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared';
import GameMap from './map/GameMap';
import FactionAbilityPanel from './FactionAbilityPanel';
import StatusBar from './StatusBar';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SinglePlayerGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [lastResults, setLastResults] = useState(null);

  const faction = playerState?.myFaction;

  // Fetch game state
  const fetchState = useCallback(async () => {
    try {
      const [pubRes, stateRes] = await Promise.all([
        fetch(`${API_URL}/api/singleplayer/${gameId}/public`),
        fetch(`${API_URL}/api/singleplayer/${gameId}/state`),
      ]);

      const pubData = await pubRes.json();
      const stateData = await stateRes.json();

      if (pubData.success) setGameState(pubData.gameState);
      if (stateData.success) setPlayerState(stateData.playerState);
      setLoading(false);
    } catch (err) {
      setError('Failed to load game state');
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Add an order
  const addOrder = (order) => {
    setPendingOrders(prev => {
      // Replace if same unit already has an order
      const filtered = prev.filter(o => o.location !== order.location);
      return [...filtered, order];
    });
  };

  // Remove an order
  const removeOrder = (index) => {
    setPendingOrders(prev => prev.filter((_, i) => i !== index));
  };

  // Clear all orders
  const clearOrders = () => setPendingOrders([]);

  // Submit orders
  const submitOrders = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/singleplayer/${gameId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: pendingOrders }),
      });

      const result = await response.json();
      if (result.success) {
        setLastResults(result.resolution);
        if (result.gameState) setGameState(result.gameState);
        if (result.playerState) setPlayerState(result.playerState);
        setPendingOrders([]);

        // Handle retreat/build phases
        if (result.resolution?.phase === 'retreats' || result.resolution?.phase === 'builds') {
          // Refresh state to get updated phase info
          await fetchState();
        }
      } else {
        setError(result.reason || result.errors?.map(e => e.reason).join(', ') || 'Failed to submit orders');
      }
    } catch (err) {
      setError('Failed to submit orders');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit retreats
  const submitRetreats = async (retreats) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/singleplayer/${gameId}/retreats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retreats }),
      });

      const result = await response.json();
      if (result.success) {
        if (result.gameState) setGameState(result.gameState);
        if (result.playerState) setPlayerState(result.playerState);
      }
    } catch (err) {
      setError('Failed to submit retreats');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit builds
  const submitBuilds = async (builds) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/singleplayer/${gameId}/builds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ builds }),
      });

      const result = await response.json();
      if (result.success) {
        if (result.gameState) setGameState(result.gameState);
        if (result.playerState) setPlayerState(result.playerState);
      }
    } catch (err) {
      setError('Failed to submit builds');
    } finally {
      setSubmitting(false);
    }
  };

  // Use ability
  const handleUseAbility = async (abilityName, params) => {
    try {
      const response = await fetch(`${API_URL}/api/singleplayer/${gameId}/ability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ abilityName, params }),
      });

      const result = await response.json();
      if (!result.success) {
        setError(result.reason || 'Failed to use ability');
      }
      await fetchState();
    } catch (err) {
      setError('Failed to use ability');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-space-dark text-white">
        <div className="text-lcars-orange text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameState || !playerState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-space-dark text-white">
        <div className="text-red-400 text-xl">Game not found</div>
        <button onClick={() => navigate('/singleplayer')} className="ml-4 text-lcars-orange underline">
          Back to Setup
        </button>
      </div>
    );
  }

  // Victory screen
  if (gameState.winner) {
    const winners = Array.isArray(gameState.winner.winners)
      ? gameState.winner.winners
      : [gameState.winner.winner];
    const isWinner = winners.includes(faction);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-space-dark to-gray-900 text-white">
        <h1 className={`text-6xl font-bold mb-4 ${isWinner ? 'text-lcars-orange' : 'text-gray-500'}`}>
          {isWinner ? 'VICTORY' : 'GAME OVER'}
        </h1>
        <div className="text-3xl mb-8">
          {winners.map((w, i) => (
            <span key={w}>
              <span className="font-bold" style={{ color: FACTION_COLORS[w] }}>
                {FACTION_NAMES[w]}
              </span>
              {i < winners.length - 1 && ' & '}
            </span>
          ))}
        </div>

        {/* SC standings */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 w-80">
          <h3 className="text-lcars-tan text-sm mb-3">Final Standings</h3>
          <div className="space-y-2">
            {Object.entries(gameState.supplyCounts || {})
              .sort(([, a], [, b]) => b - a)
              .map(([f, count]) => (
                <div key={f} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: FACTION_COLORS[f] }} />
                    <span className={f === faction ? 'text-white font-bold' : 'text-gray-400'}>
                      {FACTION_NAMES[f]}
                    </span>
                  </div>
                  <span className="text-white font-mono">{count} SC</span>
                </div>
              ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/singleplayer')}
            className="px-6 py-3 bg-lcars-orange hover:bg-lcars-tan text-black font-bold rounded"
          >
            Play Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded"
          >
            Main Menu
          </button>
        </div>
      </div>
    );
  }

  const myUnits = playerState.myUnits || [];
  const phase = gameState.phase;

  return (
    <div className="h-screen flex flex-col bg-space-dark text-white">
      {/* Status Bar */}
      <StatusBar gameState={gameState} myState={playerState} faction={faction} />

      {/* Faction Ability Panel */}
      {faction && playerState && (
        <div className="px-4 pt-4">
          <FactionAbilityPanel gameState={playerState} onUseAbility={handleUseAbility} />
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-4 pt-2">
          <div className="bg-red-900/80 border border-red-500 rounded p-2 text-sm text-red-200 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white ml-2">x</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <GameMap gameState={gameState} faction={faction} />
        </div>

        {/* Order Panel (custom for single-player) */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lcars-orange font-bold text-sm">
              {phase === 'orders' ? 'Orders Phase' :
               phase === 'retreats' ? 'Retreat Phase' :
               phase === 'builds' ? 'Build Phase' : phase}
            </h3>
            <div className="text-xs text-gray-400 mt-1">
              Turn {gameState.turn} - {gameState.season} {gameState.year}
            </div>
          </div>

          {/* Orders Phase */}
          {phase === 'orders' && (
            <div className="flex-1 p-4 space-y-3">
              <div className="text-xs text-gray-400 mb-2">
                {myUnits.length} unit(s) - {pendingOrders.length} order(s)
              </div>

              {/* Unit list with quick-order buttons */}
              {myUnits.map(unit => {
                const hasOrder = pendingOrders.find(o => o.location === unit.position);
                return (
                  <div key={unit.position} className="bg-gray-800 rounded p-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-mono">
                        {unit.type === 'army' ? 'A' : 'F'} {unit.position.toUpperCase()}
                      </span>
                      {hasOrder ? (
                        <span className="text-green-400 text-xs">
                          {hasOrder.type.toUpperCase()}
                          {hasOrder.destination && ` → ${hasOrder.destination.toUpperCase()}`}
                        </span>
                      ) : (
                        <button
                          onClick={() => addOrder({ type: 'hold', location: unit.position, faction })}
                          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                        >
                          Hold
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pending Orders */}
              {pendingOrders.length > 0 && (
                <div className="space-y-1 border-t border-gray-700 pt-3">
                  <div className="text-sm font-bold text-lcars-tan">Pending Orders:</div>
                  {pendingOrders.map((order, i) => (
                    <div key={i} className="flex justify-between items-center text-xs bg-gray-800 rounded p-2">
                      <span>
                        {order.location.toUpperCase()} {order.type.toUpperCase()}
                        {order.destination && ` → ${order.destination.toUpperCase()}`}
                      </span>
                      <button onClick={() => removeOrder(i)} className="text-red-400 hover:text-red-300">x</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <button
                  onClick={submitOrders}
                  disabled={submitting || pendingOrders.length === 0}
                  className="flex-1 px-4 py-2 bg-lcars-orange hover:bg-lcars-tan text-black font-bold rounded text-sm disabled:opacity-50"
                >
                  {submitting ? 'Resolving...' : 'Submit Orders'}
                </button>
                <button
                  onClick={clearOrders}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Retreats Phase */}
          {phase === 'retreats' && playerState.myDislodged?.length > 0 && (
            <div className="flex-1 p-4 space-y-3">
              <div className="text-yellow-400 text-sm font-bold">Units need to retreat!</div>
              {playerState.myDislodged.map((d, i) => (
                <div key={i} className="bg-gray-800 rounded p-3">
                  <div className="text-sm mb-2">Unit at {d.location.toUpperCase()}</div>
                  {d.retreatOptions.length > 0 ? (
                    <div className="space-y-1">
                      {d.retreatOptions.map(opt => (
                        <button
                          key={opt}
                          onClick={() => submitRetreats([{ from: d.location, to: opt, type: 'retreat' }])}
                          disabled={submitting}
                          className="w-full text-left px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                        >
                          Retreat to {opt.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => submitRetreats([{ location: d.location, type: 'disband' }])}
                        disabled={submitting}
                        className="w-full text-left px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs text-red-300"
                      >
                        Disband
                      </button>
                    </div>
                  ) : (
                    <div className="text-red-400 text-xs">No retreat options — unit will be disbanded</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Builds Phase */}
          {phase === 'builds' && (
            <BuildPanel
              playerState={playerState}
              faction={faction}
              submitting={submitting}
              onSubmitBuilds={submitBuilds}
            />
          )}

          {/* Last Results */}
          {lastResults && (
            <div className="p-4 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Last Resolution:</div>
              <div className="text-xs text-gray-300">
                Phase: {lastResults.phase || 'orders'}
                {lastResults.results?.length > 0 && ` (${lastResults.results.length} events)`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BuildPanel({ playerState, faction, submitting, onSubmitBuilds }) {
  const [pendingBuilds, setPendingBuilds] = useState([]);
  const buildCount = playerState.buildCount || 0;
  const buildLocations = playerState.buildLocations || { armies: [], fleets: [] };

  if (buildCount === 0) {
    return (
      <div className="flex-1 p-4">
        <div className="text-gray-400 text-sm">No builds or disbands needed.</div>
        <button
          onClick={() => onSubmitBuilds([])}
          disabled={submitting}
          className="mt-4 px-4 py-2 bg-lcars-orange hover:bg-lcars-tan text-black font-bold rounded text-sm w-full"
        >
          Continue
        </button>
      </div>
    );
  }

  const remaining = buildCount > 0
    ? buildCount - pendingBuilds.filter(b => b.type === 'build').length
    : Math.abs(buildCount) - pendingBuilds.filter(b => b.type === 'disband').length;

  return (
    <div className="flex-1 p-4 space-y-3">
      <div className="text-sm font-bold text-lcars-tan">
        {buildCount > 0 ? `Build ${buildCount} unit(s)` : `Disband ${Math.abs(buildCount)} unit(s)`}
      </div>
      <div className="text-xs text-gray-400">Remaining: {remaining}</div>

      {buildCount > 0 && (
        <>
          {buildLocations.armies?.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Build Army:</div>
              {buildLocations.armies.map(loc => (
                <button
                  key={loc}
                  onClick={() => setPendingBuilds(prev => [...prev, { type: 'build', location: loc, unitType: 'army' }])}
                  disabled={remaining <= 0}
                  className="w-full text-left px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs mb-1 disabled:opacity-50"
                >
                  Army at {loc.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          {buildLocations.fleets?.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Build Fleet:</div>
              {buildLocations.fleets.map(loc => (
                <button
                  key={loc}
                  onClick={() => setPendingBuilds(prev => [...prev, { type: 'build', location: loc, unitType: 'fleet' }])}
                  disabled={remaining <= 0}
                  className="w-full text-left px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs mb-1 disabled:opacity-50"
                >
                  Fleet at {loc.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {buildCount < 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">Disband unit:</div>
          {(playerState.myUnits || []).map(unit => (
            <button
              key={unit.position}
              onClick={() => setPendingBuilds(prev => [...prev, { type: 'disband', location: unit.position }])}
              disabled={remaining <= 0}
              className="w-full text-left px-2 py-1 bg-red-900 hover:bg-red-800 rounded text-xs mb-1 text-red-300 disabled:opacity-50"
            >
              {unit.type === 'army' ? 'A' : 'F'} {unit.position.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {pendingBuilds.length > 0 && (
        <div className="space-y-1 border-t border-gray-700 pt-2">
          {pendingBuilds.map((b, i) => (
            <div key={i} className="flex justify-between text-xs bg-gray-800 rounded p-1 px-2">
              <span>{b.type === 'build' ? `Build ${b.unitType} at ${b.location.toUpperCase()}` : `Disband at ${b.location.toUpperCase()}`}</span>
              <button onClick={() => setPendingBuilds(prev => prev.filter((_, j) => j !== i))} className="text-red-400">x</button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onSubmitBuilds(pendingBuilds)}
        disabled={submitting || remaining > 0}
        className="w-full px-4 py-2 bg-lcars-orange hover:bg-lcars-tan text-black font-bold rounded text-sm disabled:opacity-50"
      >
        {submitting ? 'Processing...' : 'Submit Builds'}
      </button>
    </div>
  );
}
