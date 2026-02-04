import { useState } from 'react'
import { useGameStore } from '../hooks/useGameStore';
import { FACTION_NAMES, SYSTEMS } from '@star-trek-diplomacy/shared';

export default function OrderPanel({ gameState, myState, faction, disabled = false }) {
  const { pendingOrders, removeOrder, clearOrders, submitOrders, addOrder } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false)

  const myUnits = myState?.myUnits || [];
  const phase = gameState?.phase || 'orders';
  const submitted = gameState?.ordersSubmitted?.includes(faction);
  const allFactions = [
    'federation',
    'klingon',
    'romulan',
    'cardassian',
    'ferengi',
    'breen',
    'gorn',
  ];
  const activeFactions = allFactions.filter(f =>
    gameState?.eliminated ? !gameState.eliminated.includes(f) : true
  );

  const handleSubmit = async () => {
    setShowConfirm(false)
    const result = await submitOrders();
    if (!result.success) {
      alert(result.error || 'Failed to submit orders');
    }
  };
  
  const handleSubmitClick = () => {
    if (pendingOrders.length > 0) {
      setShowConfirm(true)
    }
  }

  // Add hold orders for units without orders
  const handleAddHolds = () => {
    myUnits.forEach(unit => {
      const hasOrder = pendingOrders.some(o => o.location === unit.location);
      if (!hasOrder) {
        addOrder({
          type: 'hold',
          location: unit.location,
        });
      }
    });
  };

  return (
    <div className="order-panel" data-testid="order-panel">
      {/* Disabled overlay for eliminated players */}
      {disabled && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center">
          <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 text-center">
            <div className="text-red-200 font-bold mb-2">Eliminated</div>
            <div className="text-sm text-red-300">Spectating Only</div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="mb-4">
        <h2 className="lcars-header">Orders</h2>
        <div className="text-sm text-gray-400 mt-1">
          Turn {gameState?.turn} - {gameState?.season} {gameState?.year}
        </div>
        <div className="text-sm mt-1">
          Phase: <span className="text-lcars-blue uppercase">{phase}</span>
        </div>
      </div>

      {/* My Units */}
      {phase === 'orders' && (
        <div className="mb-4">
          <h3 className="text-lcars-tan text-sm mb-2">Your Units ({myUnits.length})</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {myUnits.map(unit => {
              const hasOrder = pendingOrders.some(o => o.location === unit.location);
              return (
                <div
                  key={unit.location}
                  className={`text-sm px-2 py-1 rounded ${hasOrder ? 'bg-green-900/30' : 'bg-gray-800'}`}
                >
                  {unit.type === 'fleet' ? '🚀' : '⚔️'} {unit.location}
                  {hasOrder && <span className="text-green-400 ml-2">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Orders */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lcars-tan text-sm">Pending Orders ({pendingOrders.length})</h3>
          {pendingOrders.length > 0 && (
            <button onClick={clearOrders} className="text-red-400 text-xs hover:text-red-300">
              Clear All
            </button>
          )}
        </div>

        {pendingOrders.length === 0 ? (
          <div className="text-gray-500 text-sm">Click units on the map to issue orders</div>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {pendingOrders.map((order, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-gray-800 px-2 py-1 rounded text-sm"
              >
                <span>
                  {order.location}
                  <span className="text-lcars-blue mx-1">→</span>
                  {order.type === 'hold' ? 'HOLD' : order.destination}
                </span>
                <button onClick={() => removeOrder(i)} className="text-red-400 hover:text-red-300">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {phase === 'orders' && !submitted && (
        <div className="space-y-2 mb-4">
          <button
            onClick={handleAddHolds}
            className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Add HOLD for remaining units
          </button>
        </div>
      )}

      {/* Submit Button */}
      {(phase === 'orders' || phase === 'retreat' || phase === 'build') && (
        <>
          <button
            onClick={handleSubmitClick}
            disabled={submitted || pendingOrders.length === 0 || disabled}
            className={`w-full py-3 rounded font-bold transition-colors
              ${
                submitted
                  ? 'bg-green-600 cursor-not-allowed'
                  : pendingOrders.length === 0 || disabled
                    ? 'bg-gray-700 cursor-not-allowed'
                    : 'bg-lcars-orange hover:bg-lcars-tan text-black'
              }`}
          >
            {submitted
              ? '✓ Orders Submitted'
              : phase === 'retreat'
                ? 'Submit Retreats'
                : phase === 'build'
                  ? 'Submit Builds'
                  : 'Submit Orders'}
          </button>
          
          {/* Confirmation Dialog */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-space-blue border-2 border-lcars-orange rounded-lg p-6 max-w-md">
                <h3 className="text-lcars-orange text-xl font-bold mb-4">Confirm Submission</h3>
                <div className="mb-4">
                  <p className="text-white mb-3">You are about to submit {pendingOrders.length} order(s):</p>
                  <div className="bg-gray-800 rounded p-3 max-h-48 overflow-y-auto space-y-1">
                    {pendingOrders.map((order, i) => (
                      <div key={i} className="text-sm text-gray-300">
                        • {SYSTEMS[order.location]?.name || order.location}
                        {order.type === 'hold' && ' - HOLD'}
                        {order.destination && ` → ${SYSTEMS[order.destination]?.name || order.destination}`}
                        {order.type === 'support' && ` (supporting ${order.target})`}
                      </div>
                    ))}
                  </div>
                  <p className="text-yellow-400 text-sm mt-3">
                    ⚠ Once submitted, you cannot change your orders this turn.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-2 bg-lcars-orange hover:bg-lcars-tan text-black rounded font-bold"
                  >
                    Confirm Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Waiting Message */}
      {submitted && phase === 'orders' && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <div className="text-center text-lcars-orange text-sm font-bold mb-2">
            Waiting for other players...
          </div>
          <div className="text-xs space-y-1">
            {activeFactions.map(f => (
              <div key={f} className="flex items-center justify-between">
                <span className={f === faction ? 'text-white' : 'text-gray-400'}>
                  {FACTION_NAMES[f] || f}
                </span>
                <span>
                  {gameState?.ordersSubmitted?.includes(f) ? (
                    <span className="text-green-400">✓ Ready</span>
                  ) : (
                    <span className="text-yellow-400">⏳ Pending</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolution Results */}
      {phase === 'resolution' && gameState?.lastResolution && (
        <div className="mt-4">
          <h3 className="text-lcars-orange text-sm font-bold mb-2">Resolution Results</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto bg-gray-800 p-2 rounded text-xs">
            {gameState.lastResolution.moves?.map((move, i) => (
              <div key={i} className={move.success ? 'text-green-400' : 'text-red-400'}>
                {move.success ? '✓' : '✗'} {move.from} → {move.to}
                {!move.success && move.reason && (
                  <div className="text-gray-400 text-xs ml-4">{move.reason}</div>
                )}
              </div>
            ))}
            {gameState.lastResolution.dislodged?.length > 0 && (
              <div className="text-yellow-400 mt-2">
                ⚠ Dislodged: {gameState.lastResolution.dislodged.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Retreat Phase UI */}
      {phase === 'retreat' && myState?.dislodgedUnits?.length > 0 && (
        <div className="mt-4">
          <h3 className="text-red-400 text-sm font-bold mb-2">⚠ Units Dislodged - Must Retreat</h3>
          <div className="space-y-2">
            {myState.dislodgedUnits.map((unit, i) => (
              <div key={i} className="bg-red-900/30 p-2 rounded">
                <div className="text-sm mb-1">{unit.location}</div>
                <div className="text-xs text-gray-400 mb-2">
                  Retreat to: {unit.retreatOptions?.join(', ') || 'None - must disband'}
                </div>
                {unit.retreatOptions?.length > 0 && (
                  <select
                    className="w-full bg-gray-700 rounded px-2 py-1 text-sm"
                    onChange={e =>
                      addOrder({
                        type: 'retreat',
                        location: unit.location,
                        destination: e.target.value,
                      })
                    }
                  >
                    <option value="">Select retreat...</option>
                    {unit.retreatOptions.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                    <option value="disband">Disband unit</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build Phase UI */}
      {phase === 'build' && myState?.buildCount !== undefined && (
        <div className="mt-4">
          <h3 className="text-lcars-blue text-sm font-bold mb-2">
            {myState.buildCount > 0
              ? `Build ${myState.buildCount} Units`
              : `Disband ${-myState.buildCount} Units`}
          </h3>
          {myState.buildCount > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-gray-400 mb-2">Build in home centers:</div>
              {myState.availableBuildLocations?.map(loc => (
                <div key={loc} className="flex gap-2">
                  <button
                    onClick={() => addOrder({ type: 'build', location: loc, unitType: 'army' })}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 text-xs"
                  >
                    Build Army @ {loc}
                  </button>
                  <button
                    onClick={() => addOrder({ type: 'build', location: loc, unitType: 'fleet' })}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 rounded px-2 py-1 text-xs"
                  >
                    Build Fleet @ {loc}
                  </button>
                </div>
              ))}
            </div>
          )}
          {myState.buildCount < 0 && (
            <div className="space-y-1">
              <div className="text-xs text-gray-400 mb-2">Select units to disband:</div>
              {myUnits.map(unit => (
                <button
                  key={unit.location}
                  onClick={() => addOrder({ type: 'disband', location: unit.location })}
                  className="w-full bg-gray-700 hover:bg-red-600 rounded px-2 py-1 text-xs text-left"
                >
                  Disband {unit.type} @ {unit.location}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Latinum Balance (Ferengi) */}
      {faction === 'ferengi' && myState?.myLatinum !== undefined && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-lcars-tan text-sm">Latinum</span>
            <span className="text-ferengi font-bold">{myState.myLatinum} bars</span>
          </div>
        </div>
      )}

      {/* Alliance Info */}
      {myState?.myAlliance && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-lcars-tan text-sm mb-1">Alliance</div>
          <div className="text-sm">
            Allied with:{' '}
            <span className="text-lcars-blue">
              {myState.myAlliance.members.find(m => m !== faction)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
