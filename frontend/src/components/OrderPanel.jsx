import { useGameStore } from '../hooks/useGameStore'

export default function OrderPanel({ gameState, myState, faction }) {
  const { 
    pendingOrders, 
    removeOrder, 
    clearOrders, 
    submitOrders,
    addOrder 
  } = useGameStore()
  
  const myUnits = myState?.myUnits || []
  const phase = gameState?.phase || 'orders'
  const submitted = gameState?.ordersSubmitted?.includes(faction)
  
  const handleSubmit = async () => {
    const result = await submitOrders()
    if (!result.success) {
      alert(result.error || 'Failed to submit orders')
    }
  }
  
  // Add hold orders for units without orders
  const handleAddHolds = () => {
    myUnits.forEach(unit => {
      const hasOrder = pendingOrders.some(o => o.location === unit.location)
      if (!hasOrder) {
        addOrder({
          type: 'hold',
          location: unit.location
        })
      }
    })
  }
  
  return (
    <div className="order-panel">
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
              const hasOrder = pendingOrders.some(o => o.location === unit.location)
              return (
                <div 
                  key={unit.location}
                  className={`text-sm px-2 py-1 rounded ${hasOrder ? 'bg-green-900/30' : 'bg-gray-800'}`}
                >
                  {unit.type === 'fleet' ? '🚀' : '⚔️'} {unit.location}
                  {hasOrder && <span className="text-green-400 ml-2">✓</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Pending Orders */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lcars-tan text-sm">Pending Orders ({pendingOrders.length})</h3>
          {pendingOrders.length > 0 && (
            <button 
              onClick={clearOrders}
              className="text-red-400 text-xs hover:text-red-300"
            >
              Clear All
            </button>
          )}
        </div>
        
        {pendingOrders.length === 0 ? (
          <div className="text-gray-500 text-sm">
            Click units on the map to issue orders
          </div>
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
                <button 
                  onClick={() => removeOrder(i)}
                  className="text-red-400 hover:text-red-300"
                >
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
      {phase === 'orders' && (
        <button
          onClick={handleSubmit}
          disabled={submitted || pendingOrders.length === 0}
          className={`w-full py-3 rounded font-bold transition-colors
            ${submitted 
              ? 'bg-green-600 cursor-not-allowed' 
              : pendingOrders.length === 0
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-lcars-orange hover:bg-lcars-tan text-black'
            }`}
        >
          {submitted ? '✓ Orders Submitted' : 'Submit Orders'}
        </button>
      )}
      
      {/* Waiting Message */}
      {submitted && (
        <div className="text-center text-gray-400 text-sm mt-4">
          Waiting for other players...
          <div className="mt-2">
            {gameState?.ordersSubmitted?.length || 0} / {Object.keys(gameState?.units || {}).length > 0 ? '?' : '0'} ready
          </div>
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
            Allied with: <span className="text-lcars-blue">
              {myState.myAlliance.members.find(m => m !== faction)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
