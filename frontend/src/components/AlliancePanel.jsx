import { useState } from 'react';
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared';

const ALLIANCE_TYPES = {
  MUTUAL_DEFENSE: {
    name: 'Mutual Defense Pact',
    description: 'Coordinate but win separately',
    victoryMultiplier: 1.0,
  },
  ECONOMIC_UNION: {
    name: 'Economic Union',
    description: 'Combined SC threshold (85%), shared latinum',
    victoryMultiplier: 0.85,
  },
  FULL_ALLIANCE: {
    name: 'Full Alliance',
    description: 'Deep alliance with major victory discount (75%)',
    victoryMultiplier: 0.75,
  },
};

/**
 * AlliancePanel - Manage secret alliances and proposals
 */
export default function AlliancePanel({ gameState, myState, onProposeAlliance, onRespondToProposal, onBreakAlliance }) {
  const [showProposeDialog, setShowProposeDialog] = useState(false);
  const [selectedAlly, setSelectedAlly] = useState(null);
  const [selectedType, setSelectedType] = useState('ECONOMIC_UNION');
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);

  const { myFaction, myAlliance, pendingProposals, supplyCounts } = myState || {};
  const totalSC = Object.values(supplyCounts || {}).reduce((sum, count) => sum + count, 0);

  // Get other factions (not self, not eliminated, not already allied)
  const availableFactions = ['federation', 'klingon', 'romulan', 'cardassian', 'ferengi', 'breen', 'gorn']
    .filter(f => f !== myFaction)
    .filter(f => !gameState?.eliminated?.includes(f))
    .filter(f => !myAlliance || !myAlliance.members.includes(f));

  // Get incoming proposals (to me)
  const incomingProposals = pendingProposals?.filter(p => p.to === myFaction) || [];

  // Get outgoing proposals (from me)
  const outgoingProposals = pendingProposals?.filter(p => p.from === myFaction) || [];

  // Get ally info if in an alliance
  const allyFaction = myAlliance?.members?.find(m => m !== myFaction);
  const allyName = allyFaction ? FACTION_NAMES[allyFaction] : null;
  const allyColor = allyFaction ? FACTION_COLORS[allyFaction] : null;

  // Calculate combined supply centers
  const mySC = supplyCounts?.[myFaction] || 0;
  const allySC = allyFaction ? (supplyCounts?.[allyFaction] || 0) : 0;
  const combinedSC = mySC + allySC;

  // Calculate victory threshold
  const individualThreshold = Math.ceil(totalSC / 2);
  const allianceThreshold = myAlliance 
    ? Math.ceil(individualThreshold * 2 * myAlliance.type.victoryMultiplier)
    : individualThreshold * 2;

  const handleProposeClick = () => {
    if (!selectedAlly) return;
    onProposeAlliance(myFaction, selectedAlly, selectedType);
    setShowProposeDialog(false);
    setSelectedAlly(null);
    setSelectedType('ECONOMIC_UNION');
  };

  const handleAcceptProposal = (proposalId) => {
    onRespondToProposal(proposalId, myFaction, true);
  };

  const handleRejectProposal = (proposalId) => {
    onRespondToProposal(proposalId, myFaction, false);
  };

  const handleBreakAlliance = () => {
    onBreakAlliance(myFaction);
    setShowBreakConfirm(false);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border-2 border-purple-500">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-lg font-bold text-purple-400">
          🤝 Alliance System
        </div>
      </div>

      {/* Current Alliance Status */}
      {myAlliance ? (
        <div className="space-y-3">
          <div className="bg-purple-900/30 p-3 rounded-lg border border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-purple-300">
                Active Alliance
              </div>
              <button
                onClick={() => setShowBreakConfirm(true)}
                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded transition-colors"
              >
                Break Alliance
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: FACTION_COLORS[myFaction] }}
                />
                <span className="text-sm font-semibold text-white">
                  {FACTION_NAMES[myFaction]}
                </span>
                <span className="text-xs text-gray-400">({mySC} SC)</span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: allyColor }}
                />
                <span className="text-sm font-semibold" style={{ color: allyColor }}>
                  {allyName}
                </span>
                <span className="text-xs text-gray-400">({allySC} SC)</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-purple-700">
              <div className="text-xs text-gray-400 mb-1">
                {myAlliance.type?.name || 'Economic Union'}
              </div>
              <div className="text-xs text-purple-300 mb-2">
                {myAlliance.type?.description}
              </div>

              <div className="bg-purple-950/50 p-2 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Combined SC:</span>
                  <span className="text-lg font-bold text-purple-400">
                    {combinedSC}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Victory at:</span>
                  <span className="text-sm font-semibold text-white">
                    {allianceThreshold}
                  </span>
                </div>
                {combinedSC >= allianceThreshold - 5 && combinedSC < allianceThreshold && (
                  <div className="text-xs text-yellow-400 mt-1 animate-pulse">
                    ⚠️ Near victory!
                  </div>
                )}
                {combinedSC >= allianceThreshold && (
                  <div className="text-xs text-green-400 mt-1 font-bold">
                    ✓ Victory conditions met!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Break Alliance Confirmation */}
          {showBreakConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-space-blue border-2 border-red-500 rounded-lg p-6 max-w-md">
                <h3 className="text-red-400 text-xl font-bold mb-4">⚠️ Break Alliance?</h3>
                <p className="text-white mb-4">
                  Are you sure you want to betray {allyName}? This cannot be undone and they will be
                  notified immediately!
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleBreakAlliance}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-bold transition-colors"
                  >
                    Break Alliance
                  </button>
                  <button
                    onClick={() => setShowBreakConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* No Alliance - Show Propose Button */}
          {availableFactions.length > 0 ? (
            <button
              onClick={() => setShowProposeDialog(true)}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded text-white font-semibold transition-colors"
            >
              + Propose Alliance
            </button>
          ) : (
            <div className="text-gray-500 text-sm text-center py-2">
              No factions available for alliance
            </div>
          )}

          {/* Propose Alliance Dialog */}
          {showProposeDialog && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-space-blue border-2 border-purple-500 rounded-lg p-6 max-w-md w-full">
                <h3 className="text-purple-400 text-xl font-bold mb-4">Propose Alliance</h3>

                <div className="space-y-4">
                  {/* Select Faction */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Allied Faction:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {availableFactions.map(f => (
                        <button
                          key={f}
                          onClick={() => setSelectedAlly(f)}
                          className={`px-3 py-2 rounded text-sm font-semibold transition-all ${
                            selectedAlly === f
                              ? 'ring-2 ring-white'
                              : 'hover:opacity-80'
                          }`}
                          style={{
                            backgroundColor: selectedAlly === f ? FACTION_COLORS[f] : `${FACTION_COLORS[f]}40`,
                            color: selectedAlly === f ? (f === 'ferengi' || f === 'breen' ? '#000' : '#fff') : FACTION_COLORS[f],
                          }}
                        >
                          {FACTION_NAMES[f].split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Alliance Type */}
                  <div>
                    <label className="text-gray-400 text-sm mb-2 block">Alliance Type:</label>
                    <div className="space-y-2">
                      {Object.entries(ALLIANCE_TYPES).map(([key, type]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedType(key)}
                          className={`w-full text-left px-3 py-2 rounded transition-all ${
                            selectedType === key
                              ? 'bg-purple-600 ring-2 ring-purple-400'
                              : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                        >
                          <div className="font-semibold text-sm text-white">{type.name}</div>
                          <div className="text-xs text-gray-400">{type.description}</div>
                          <div className="text-xs text-purple-300 mt-1">
                            Victory: {Math.round(type.victoryMultiplier * 100)}% of combined threshold
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleProposeClick}
                      disabled={!selectedAlly}
                      className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded font-semibold transition-colors"
                    >
                      Propose
                    </button>
                    <button
                      onClick={() => {
                        setShowProposeDialog(false);
                        setSelectedAlly(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Incoming Proposals */}
      {incomingProposals.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold text-yellow-400">
            📨 Incoming Proposals ({incomingProposals.length})
          </div>
          {incomingProposals.map(proposal => (
            <div
              key={proposal.id}
              className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: FACTION_COLORS[proposal.from] }}
                />
                <span className="text-sm font-semibold" style={{ color: FACTION_COLORS[proposal.from] }}>
                  {FACTION_NAMES[proposal.from]}
                </span>
                <span className="text-xs text-gray-400">proposes</span>
              </div>
              <div className="text-xs text-gray-300 mb-2">
                {ALLIANCE_TYPES[proposal.type]?.name || 'Economic Union'}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAcceptProposal(proposal.id)}
                  className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleRejectProposal(proposal.id)}
                  className="flex-1 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm transition-colors"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outgoing Proposals */}
      {outgoingProposals.length > 0 && (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold text-blue-400">
            📤 Pending Proposals ({outgoingProposals.length})
          </div>
          {outgoingProposals.map(proposal => (
            <div
              key={proposal.id}
              className="bg-blue-900/20 border border-blue-600 rounded-lg p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Proposal to</span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: FACTION_COLORS[proposal.to] }}
                />
                <span className="text-sm font-semibold" style={{ color: FACTION_COLORS[proposal.to] }}>
                  {FACTION_NAMES[proposal.to]}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Awaiting response...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
