import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useGameStore, setAuthTokenGetter } from '../hooks/useGameStore';
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared';
import GameMap from './map/GameMap';
import OrderPanel from './OrderPanel';
import StatusBar from './StatusBar';
import Messages from './Messages';
import FactionAbilityPanel from './FactionAbilityPanel';
import AlliancePanel from './AlliancePanel';

export default function Game() {
  const { gameId } = useParams();
  const { getToken } = useAuth();
  const {
    connect,
    joinGame,
    gameState,
    myState,
    faction,
    fetchGameState,
    fetchPlayerState,
    useAbility,
    proposeAlliance,
    respondToAlliance,
  } = useGameStore();

  const [showHistory, setShowHistory] = useState(false);
  const [isEliminated, setIsEliminated] = useState(false);

  // Handle faction ability usage
  const handleUseAbility = async (abilityName, params) => {
    const result = await useAbility(abilityName, params);
    if (!result.success) {
      alert(result.reason || 'Failed to use ability');
    }
  };

  // Handle alliance proposal
  const handleProposeAlliance = async (from, to, type) => {
    const result = await proposeAlliance(to, type);
    if (!result.success) {
      alert(result.reason || 'Failed to propose alliance');
    }
  };

  // Handle alliance response
  const handleRespondToProposal = async (proposalId, faction, accept) => {
    const result = await respondToAlliance(proposalId, accept);
    if (!result.success) {
      alert(result.reason || 'Failed to respond to proposal');
    }
  };

  // Handle break alliance
  const handleBreakAlliance = async (faction) => {
    const { useGameStore } = await import('../hooks/useGameStore');
    const state = useGameStore.getState();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    };

    try {
      const response = await fetch(`/api/game/${gameId}/alliance/break`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ faction }),
      });

      const result = await response.json();

      if (result.success) {
        fetchGameState();
        fetchPlayerState();
        alert(result.message || 'Alliance broken!');
      } else {
        alert(result.reason || 'Failed to break alliance');
      }
    } catch (error) {
      console.error('Failed to break alliance:', error);
      alert('Failed to break alliance');
    }
  };

  // Handle vote to kick delinquent player
  const handleVoteKick = async (targetFaction) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    };

    try {
      const response = await fetch(`/api/game/${gameId}/vote-kick`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          votingFaction: faction,
          targetFaction,
        }),
      });

      const result = await response.json();

      if (result.kicked) {
        alert(`${FACTION_NAMES[targetFaction]} has been kicked from the game.`);
      }

      fetchGameState();
    } catch (error) {
      console.error('Vote kick failed:', error);
      alert('Failed to submit kick vote');
    }
  };

  // Check deadline status
  const handleCheckDeadline = async () => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await getToken()}`,
    };

    try {
      const response = await fetch(`/api/game/${gameId}/check-deadline`, {
        method: 'POST',
        headers,
      });

      await response.json();
      fetchGameState();
    } catch (error) {
      console.error('Check deadline failed:', error);
    }
  };

  // Initialize auth and connection
  useEffect(() => {
    // Set the auth token getter for the store to use
    setAuthTokenGetter(getToken);

    // Connect to socket with auth
    connect();

    // Join the game - server will determine our faction from the database
    // Using a small delay to ensure socket is connected
    const joinTimeout = setTimeout(() => {
      joinGame(gameId);
    }, 500);

    // Poll for updates (fallback if WebSocket fails)
    const interval = setInterval(() => {
      fetchGameState();
      if (faction) fetchPlayerState();
    }, 10000); // Reduced to 10s since we have WebSocket

    return () => {
      clearTimeout(joinTimeout);
      clearInterval(interval);
    };
  }, [gameId, getToken]);

  // Fetch player state when we learn our faction
  useEffect(() => {
    if (faction) {
      fetchPlayerState();
    }
  }, [faction]);

  // Check if player is eliminated
  useEffect(() => {
    if (gameState && faction) {
      const eliminated = gameState.eliminated?.includes(faction) || false;
      setIsEliminated(eliminated);
    }
  }, [gameState, faction]);

  // Periodically check deadline during orders phase
  useEffect(() => {
    if (gameState?.phase === 'orders' && gameState?.turnDeadline) {
      // Check deadline every minute
      const interval = setInterval(() => {
        handleCheckDeadline();
      }, 60000);

      // Initial check
      handleCheckDeadline();

      return () => clearInterval(interval);
    }
  }, [gameState?.phase, gameState?.turnDeadline, gameId]);

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lcars-orange text-xl">Loading game...</div>
      </div>
    );
  }

  if (!faction) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lcars-orange text-xl">Joining game...</div>
      </div>
    );
  }

  // If game ended, show victory screen
  if (gameState.winner) {
    const winners = Array.isArray(gameState.winner.winners)
      ? gameState.winner.winners
      : [gameState.winner.winner];
    const isWinner = winners.includes(faction);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-space-dark to-gray-900">
        <div className="text-center max-w-2xl mx-auto p-8">
          <h1
            className={`text-6xl font-bold mb-4 ${isWinner ? 'text-lcars-orange' : 'text-gray-500'}`}
          >
            {isWinner ? '🏆 VICTORY 🏆' : 'GAME OVER'}
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
            {gameState.winner.type === 'allied_victory' && (
              <div className="text-xl text-lcars-blue mt-2">Allied Victory</div>
            )}
            {gameState.winner.type === 'latinum' && (
              <div className="text-xl text-lcars-orange mt-2">Economic Victory</div>
            )}
            {gameState.winner.type === 'solo' && (
              <div className="text-xl text-lcars-orange mt-2">Solo Victory</div>
            )}
          </div>

          <div className="bg-space-blue border-2 border-lcars-orange rounded-lg p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <span className="text-gray-400">Final Turn:</span>
                <span className="text-white ml-2 font-bold">{gameState.turn}</span>
              </div>
              <div>
                <span className="text-gray-400">Year:</span>
                <span className="text-white ml-2 font-bold">{gameState.year}</span>
              </div>
              {gameState.winner.supplyCenters && (
                <div>
                  <span className="text-gray-400">Supply Centers:</span>
                  <span className="text-lcars-orange ml-2 font-bold">
                    {gameState.winner.supplyCenters}
                  </span>
                </div>
              )}
              {gameState.winner.combinedSC && (
                <div>
                  <span className="text-gray-400">Combined SCs:</span>
                  <span className="text-lcars-blue ml-2 font-bold">
                    {gameState.winner.combinedSC}
                  </span>
                </div>
              )}
              {gameState.winner.latinum && (
                <div>
                  <span className="text-gray-400">Latinum:</span>
                  <span className="text-ferengi ml-2 font-bold">
                    {gameState.winner.latinum} bars
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Final Standings */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lcars-tan text-sm mb-3">Final Standings</h3>
            <div className="space-y-2">
              {Object.entries(gameState.supplyCounts || {})
                .sort(([, a], [, b]) => b - a)
                .map(([f, count]) => (
                  <div key={f} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: FACTION_COLORS[f] }}
                      />
                      <span
                        className={f === faction ? 'text-white font-bold' : 'text-gray-400'}
                      >
                        {FACTION_NAMES[f]}
                      </span>
                    </div>
                    <span className="text-white font-mono">{count} SC</span>
                  </div>
                ))}
            </div>
          </div>

          <button
            onClick={() => (window.location.href = '/')}
            className="mt-6 px-6 py-3 bg-lcars-orange hover:bg-lcars-tan text-black font-bold rounded"
          >
            Return to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Status Bar */}
      <StatusBar gameState={gameState} myState={myState} faction={faction} />

      {/* Faction Ability Panel */}
      {faction && myState && !gameState?.winner && (
        <div className="px-4 pt-4">
          <FactionAbilityPanel gameState={myState} onUseAbility={handleUseAbility} />
        </div>
      )}

      {/* Alliance Panel */}
      {faction && myState && !gameState?.winner && (
        <div className="px-4 pt-4">
          <AlliancePanel
            gameState={gameState}
            myState={myState}
            onProposeAlliance={handleProposeAlliance}
            onRespondToProposal={handleRespondToProposal}
            onBreakAlliance={handleBreakAlliance}
          />
        </div>
      )}

      {/* Delinquent Player Alert & Kick Vote UI */}
      {gameState?.delinquentPlayers?.length > 0 && !gameState?.winner && (
        <div className="px-4 pt-4">
          <div className="bg-red-900/80 border-2 border-red-500 rounded-lg p-4">
            <h3 className="text-red-200 font-bold mb-2 flex items-center gap-2">
              <span className="animate-pulse">⚠</span> Deadline Passed
            </h3>
            <p className="text-red-100 text-sm mb-3">
              The following players have not submitted orders:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {gameState.delinquentPlayers.map((f) => (
                <span
                  key={f}
                  className="px-3 py-1 rounded text-sm font-bold text-white"
                  style={{ backgroundColor: FACTION_COLORS[f] }}
                >
                  {FACTION_NAMES[f]}
                  {gameState.kickedPlayers?.includes(f) && ' (Kicked)'}
                </span>
              ))}
            </div>

            {/* Kick Vote UI - only show if player can vote */}
            {faction &&
              !gameState.kickedPlayers?.includes(faction) &&
              !gameState.eliminated?.includes(faction) && (
                <div className="bg-gray-800/50 rounded-lg p-3 mt-3">
                  <h4 className="text-lcars-tan text-sm font-bold mb-2">Vote to Kick</h4>
                  {gameState.delinquentPlayers
                    .filter((f) => !gameState.kickedPlayers?.includes(f))
                    .map((targetFaction) => {
                      const votes = gameState.kickVotes?.[targetFaction] || [];
                      const hasVoted = votes.includes(faction);
                      const isSelf = targetFaction === faction;

                      return (
                        <div
                          key={targetFaction}
                          className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                        >
                          <span className="font-bold" style={{ color: FACTION_COLORS[targetFaction] }}>
                            {FACTION_NAMES[targetFaction]}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-sm">{votes.length} vote(s)</span>
                            {!isSelf && !hasVoted && (
                              <button
                                onClick={() => handleVoteKick(targetFaction)}
                                className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-sm rounded font-bold"
                              >
                                Vote Kick
                              </button>
                            )}
                            {hasVoted && <span className="text-green-400 text-sm">✓ Voted</span>}
                            {isSelf && (
                              <span className="text-gray-500 text-sm italic">Cannot vote</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  <p className="text-gray-500 text-xs mt-2">
                    Kick requires unanimous vote from all active players
                  </p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* Kicked Player Banner */}
      {gameState?.kickedPlayers?.includes(faction) && (
        <div className="bg-orange-900 border-b-2 border-orange-500 px-4 py-2 text-center">
          <span className="text-orange-200 font-bold">
            ⚠ You have been kicked - Your units will auto-hold each turn
          </span>
        </div>
      )}

      {/* Elimination Banner */}
      {isEliminated && (
        <div className="bg-red-900 border-b-2 border-red-500 px-4 py-2 text-center">
          <span className="text-red-200 font-bold">
            ⚠ You have been eliminated - Spectating Mode
          </span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <GameMap gameState={gameState} faction={faction} />

          {/* Turn History Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="absolute top-4 right-4 px-4 py-2 bg-lcars-blue hover:bg-lcars-tan text-black font-bold rounded shadow-lg z-20"
          >
            📜 History
          </button>

          {/* Turn History Panel */}
          {showHistory && (
            <div className="absolute top-16 right-4 w-96 max-h-[80%] bg-space-blue border-2 border-lcars-orange rounded shadow-2xl z-20 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-lcars-orange">
                <h3 className="text-lcars-orange font-bold">Turn History</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-white hover:text-lcars-orange"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {gameState.history && gameState.history.length > 0 ? (
                  gameState.history
                    .slice()
                    .reverse()
                    .map((entry, i) => (
                      <div key={i} className="bg-gray-800 rounded p-2">
                        <div className="text-lcars-tan text-sm font-bold mb-1">
                          Turn {entry.turn} - {entry.season} {entry.year}
                        </div>
                        {entry.orders && entry.orders.length > 0 && (
                          <div className="text-xs space-y-1">
                            {entry.orders.map((order, j) => (
                              <div key={j} className="text-gray-300">
                                <span style={{ color: FACTION_COLORS[order.faction] }}>
                                  {order.faction}
                                </span>
                                : {order.location} → {order.destination || order.type}
                                {order.success === false && (
                                  <span className="text-red-400 ml-1">✗</span>
                                )}
                                {order.success === true && (
                                  <span className="text-green-400 ml-1">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {entry.dislodged && entry.dislodged.length > 0 && (
                          <div className="text-yellow-400 text-xs mt-1">
                            Dislodged: {entry.dislodged.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                ) : (
                  <div className="text-gray-500 text-center py-8">No history yet</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Panel - disabled if eliminated */}
        <OrderPanel
          gameState={gameState}
          myState={myState}
          faction={faction}
          disabled={isEliminated}
        />
      </div>

      {/* Messages Panel */}
      {faction && !gameState?.winner && (
        <Messages gameState={gameState} faction={faction} />
      )}
    </div>
  );
}
