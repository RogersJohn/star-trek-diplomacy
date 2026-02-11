import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared';
import GameMap from './map/GameMap';
import OrderPanel from './OrderPanel';
import FactionAbilityPanel from './FactionAbilityPanel';
import StatusBar from './StatusBar';
import { useGameStore } from '../hooks/useGameStore';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function SinglePlayerGame() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState(null);
  const [playerState, setPlayerState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastResults, setLastResults] = useState(null);

  const faction = playerState?.myFaction;

  // Get store methods for order management (used by GameMap and OrderPanel)
  const clearOrders = useGameStore(s => s.clearOrders);

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

  // Initialize: set faction in store and clear orders
  useEffect(() => {
    if (faction) {
      useGameStore.setState({ faction, gameId, pendingOrders: [], selectedUnit: null });
    }
  }, [faction, gameId]);

  // Override the store's submitOrders to use singleplayer endpoint
  useEffect(() => {
    if (!gameId || !faction) return;

    // Override submitOrders in the store for singleplayer
    const originalSubmitOrders = useGameStore.getState().submitOrders;

    useGameStore.setState({
      submitOrders: async () => {
        const { pendingOrders } = useGameStore.getState();
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
            useGameStore.setState({ pendingOrders: [], selectedUnit: null });

            // If we moved to retreats or builds, refresh
            if (result.resolution?.phase === 'retreats' || result.resolution?.phase === 'builds') {
              await fetchState();
            }
            return { success: true };
          } else {
            return { success: false, error: result.reason || result.errors?.map(e => e.reason).join(', ') || 'Failed' };
          }
        } catch (err) {
          return { success: false, error: 'Failed to submit orders' };
        }
      },

      submitRetreats: async (retreats) => {
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
            useGameStore.setState({ pendingOrders: [], selectedUnit: null });
          }
          return result;
        } catch (err) {
          return { success: false, error: 'Failed to submit retreats' };
        }
      },

      submitBuilds: async (builds) => {
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
            useGameStore.setState({ pendingOrders: [], selectedUnit: null });
          }
          return result;
        } catch (err) {
          return { success: false, error: 'Failed to submit builds' };
        }
      },
    });

    // Cleanup: restore original on unmount (prevents leaking singleplayer overrides)
    return () => {
      useGameStore.setState({
        submitOrders: originalSubmitOrders,
        pendingOrders: [],
        selectedUnit: null,
      });
    };
  }, [gameId, faction, fetchState]);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

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

        {/* Reuse the real OrderPanel */}
        <div className="w-80 bg-gray-900 border-l border-gray-700 overflow-y-auto">
          <OrderPanel gameState={gameState} myState={playerState} faction={faction} />
        </div>
      </div>
    </div>
  );
}
