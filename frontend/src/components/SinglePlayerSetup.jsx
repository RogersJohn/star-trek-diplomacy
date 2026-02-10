import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

const FACTIONS = [
  'federation', 'klingon', 'romulan', 'cardassian',
  'ferengi', 'breen', 'gorn',
];

const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', description: 'Basic expansion, no support coordination' },
  { id: 'medium', label: 'Medium', description: 'Support attacks, defend threats' },
  { id: 'hard', label: 'Hard', description: 'Focused aggression, fleet cover, targets leader' },
];

export default function SinglePlayerSetup() {
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!selectedFaction) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/singleplayer/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faction: selectedFaction,
          difficulty: selectedDifficulty,
        }),
      });

      const result = await response.json();
      if (result.success) {
        navigate(`/singleplayer/${result.gameId}`);
      } else {
        setError(result.reason || 'Failed to create game');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-space-dark text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-lcars-orange mb-2">Play vs AI</h1>
      <p className="text-gray-400 mb-8">Choose your faction and difficulty</p>

      {/* Faction Selection */}
      <div className="mb-8 w-full max-w-3xl">
        <h2 className="text-lg font-bold text-lcars-tan mb-4">Select Faction</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {FACTIONS.map(f => (
            <button
              key={f}
              onClick={() => setSelectedFaction(f)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedFaction === f
                  ? 'border-lcars-orange bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
              style={selectedFaction === f ? { borderColor: FACTION_COLORS[f] } : {}}
            >
              <div
                className="w-6 h-6 rounded-full mb-2"
                style={{ backgroundColor: FACTION_COLORS[f] }}
              />
              <div className="text-sm font-bold" style={{ color: FACTION_COLORS[f] }}>
                {FACTION_NAMES[f]}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="mb-8 w-full max-w-3xl">
        <h2 className="text-lg font-bold text-lcars-tan mb-4">AI Difficulty</h2>
        <div className="flex gap-3">
          {DIFFICULTIES.map(d => (
            <button
              key={d.id}
              onClick={() => setSelectedDifficulty(d.id)}
              className={`flex-1 p-4 rounded-lg border-2 transition-all text-left ${
                selectedDifficulty === d.id
                  ? 'border-lcars-orange bg-gray-800'
                  : 'border-gray-700 bg-gray-900 hover:border-gray-500'
              }`}
            >
              <div className="font-bold text-sm">{d.label}</div>
              <div className="text-xs text-gray-400 mt-1">{d.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Start Button */}
      {error && <div className="text-red-400 mb-4">{error}</div>}

      <button
        onClick={handleStart}
        disabled={!selectedFaction || loading}
        className="px-8 py-4 bg-lcars-orange hover:bg-lcars-tan text-black font-bold text-xl rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating Game...' : 'Start Game'}
      </button>

      <button
        onClick={() => navigate('/')}
        className="mt-4 text-gray-400 hover:text-white text-sm"
      >
        Back to Main Menu
      </button>
    </div>
  );
}
