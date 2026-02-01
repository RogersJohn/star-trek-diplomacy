/**
 * Dev Mode Sign In Component
 * Quick player selection for local testing without Clerk
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevAuth } from '../hooks/useDevAuth';

const DEV_PLAYERS = [
  { id: 'dev_player1', name: 'Player1' },
  { id: 'dev_player2', name: 'Player2' },
  { id: 'dev_player3', name: 'Player3' },
  { id: 'dev_player4', name: 'Player4' },
  { id: 'dev_player5', name: 'Player5' },
  { id: 'dev_player6', name: 'Player6' },
  { id: 'dev_player7', name: 'Player7' },
];

export default function DevSignIn() {
  const { signIn } = useDevAuth();
  const navigate = useNavigate();

  const handleSelectPlayer = (player) => {
    signIn(player.id, player.name);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center mb-8">
        <div className="bg-yellow-600 text-black px-4 py-2 rounded mb-4 font-bold">
          DEV MODE - Select Test Player
        </div>
        <h1 className="text-4xl font-bold text-lcars-orange mb-2">
          STAR TREK DIPLOMACY
        </h1>
        <p className="text-gray-400">
          Select a player to test with. Use different players in different browser windows.
        </p>
      </div>

      <div className="lcars-panel max-w-md w-full">
        <h3 className="lcars-header mb-6">Select Player</h3>

        <div className="grid grid-cols-2 gap-3">
          {DEV_PLAYERS.map((player) => (
            <button
              key={player.id}
              onClick={() => handleSelectPlayer(player)}
              className="px-4 py-3 bg-lcars-orange hover:bg-lcars-tan text-black font-bold rounded transition-colors"
            >
              {player.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-6 text-center">
          Tip: Open multiple browser windows and select different players to test multiplayer
        </p>
      </div>
    </div>
  );
}
