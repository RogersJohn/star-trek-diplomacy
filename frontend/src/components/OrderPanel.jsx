import { useState, useMemo, useEffect } from 'react'
import { useGameStore } from '../hooks/useGameStore';
import { FACTION_NAMES, FACTION_COLORS, SYSTEMS, HYPERLANES, VERTICAL_LANES, ALL_EDGES } from '@star-trek-diplomacy/shared';
import { formatPosition } from '../utils/position-display';
import {
  isEdgePosition, isOrbitPosition, isPlanetPosition,
  getPlanetFromOrbit, getOrbitPosition, parseEdgeId,
  getEdgesFromPlanet, getAdjacentEdges,
} from '../utils/edge-utils';

// ─── Adjacency helpers (mirrors GameMap logic) ───────────────────────────────

function buildAdjacencies() {
  const adj = {};
  Object.keys(SYSTEMS).forEach(id => { adj[id] = []; });
  HYPERLANES.forEach(([a, b]) => {
    if (adj[a] && adj[b]) {
      if (!adj[a].includes(b)) adj[a].push(b);
      if (!adj[b].includes(a)) adj[b].push(a);
    }
  });
  VERTICAL_LANES.forEach(({ from, to }) => {
    if (adj[from] && adj[to]) {
      if (!adj[from].includes(to)) adj[from].push(to);
      if (!adj[to].includes(from)) adj[to].push(from);
    }
  });
  return adj;
}

function buildEdgeMaps() {
  const p2e = {};
  Object.keys(SYSTEMS).forEach(id => {
    p2e[id] = getEdgesFromPlanet(id, ALL_EDGES);
  });
  const eAdj = {};
  ALL_EDGES.forEach(edgeId => {
    eAdj[edgeId] = getAdjacentEdges(edgeId, ALL_EDGES);
  });
  return { planetToEdges: p2e, edgeAdjacency: eAdj };
}

function getValidDests(position, unitType, adjacencies, planetToEdges, edgeAdjacency) {
  const destinations = [];
  if (unitType === 'army' && isPlanetPosition(position)) {
    destinations.push(...(adjacencies[position] || []));
  } else if (unitType === 'fleet' && isOrbitPosition(position)) {
    const planet = getPlanetFromOrbit(position);
    destinations.push(...(planetToEdges[planet] || []));
  } else if (unitType === 'fleet' && isEdgePosition(position)) {
    destinations.push(...(edgeAdjacency[position] || []));
    const [a, b] = parseEdgeId(position);
    destinations.push(getOrbitPosition(a), getOrbitPosition(b));
  }
  return destinations;
}

// Check if unitPos can "support into" target for support adjacency
function canSupportInto(unitPos, unitType, target, adjacencies, planetToEdges, edgeAdjacency) {
  const dests = getValidDests(unitPos, unitType, adjacencies, planetToEdges, edgeAdjacency);
  if (dests.includes(target)) return true;
  // Fleet in orbit can support army on same planet
  if (isOrbitPosition(unitPos) && isPlanetPosition(target) && getPlanetFromOrbit(unitPos) === target) return true;
  // Army on planet can support fleet in own orbit
  if (isPlanetPosition(unitPos) && isOrbitPosition(target) && getPlanetFromOrbit(target) === unitPos) return true;
  return false;
}

// Collect all units from gameState.units
function getAllUnits(units) {
  if (!units) return [];
  const result = [];
  Object.entries(units).forEach(([position, unitOrArray]) => {
    if (Array.isArray(unitOrArray)) {
      unitOrArray.forEach(u => result.push({ position, ...u }));
    } else if (unitOrArray) {
      result.push({ position, ...unitOrArray });
    }
  });
  return result;
}

const ALL_FACTIONS = ['federation', 'klingon', 'romulan', 'cardassian', 'ferengi', 'breen', 'gorn'];

// ─── UnitOrderDropdown ───────────────────────────────────────────────────────

function UnitOrderDropdown({
  unit, isMine, allUnits, adjacencies, planetToEdges, edgeAdjacency,
  pendingOrders, addOrder, removeOrder, faction, selectUnit,
  expanded, onToggle,
}) {
  const [orderType, setOrderType] = useState(null);
  const [supportTarget, setSupportTarget] = useState(null);

  const existingOrder = pendingOrders.find(o => o.location === unit.position);
  const existingOrderIdx = pendingOrders.findIndex(o => o.location === unit.position);

  const validDests = useMemo(
    () => getValidDests(unit.position, unit.type, adjacencies, planetToEdges, edgeAdjacency),
    [unit.position, unit.type, adjacencies, planetToEdges, edgeAdjacency]
  );

  const prefix = unit.type === 'fleet' ? 'F' : 'A';
  const posName = formatPosition(unit.position);
  const fColor = FACTION_COLORS[unit.faction] || '#888';

  // Units this unit could support (any unit at a position we can reach)
  const supportableUnits = useMemo(() => {
    if (!isMine) return [];
    return allUnits.filter(other => {
      if (other.position === unit.position) return false;
      return canSupportInto(unit.position, unit.type, other.position, adjacencies, planetToEdges, edgeAdjacency);
    });
  }, [isMine, allUnits, unit.position, unit.type, adjacencies, planetToEdges, edgeAdjacency]);

  // For support-move: destinations the supported unit can move to that we can also reach
  const getSupportMoveDests = (supported) => {
    const theirDests = getValidDests(supported.position, supported.type, adjacencies, planetToEdges, edgeAdjacency);
    return theirDests.filter(d =>
      canSupportInto(unit.position, unit.type, d, adjacencies, planetToEdges, edgeAdjacency)
    );
  };

  const resetDropdown = () => { setOrderType(null); setSupportTarget(null); };

  const handleToggle = () => {
    if (expanded) resetDropdown();
    onToggle();
  };

  const issueOrder = (order) => {
    addOrder(order);
    resetDropdown();
    onToggle();
  };

  return (
    <div className="rounded overflow-hidden border border-gray-700/50">
      {/* Unit header */}
      <button
        onClick={handleToggle}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors ${
          expanded ? 'bg-gray-700' : 'bg-gray-800/70 hover:bg-gray-700/60'
        }`}
      >
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: fColor }} />
        <span className="font-mono text-xs flex-shrink-0" style={{ color: fColor }}>{prefix}</span>
        <span className="text-gray-200 text-xs truncate flex-1">{posName}</span>
        {existingOrder && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/60 text-green-400 flex-shrink-0">
            {existingOrder.type === 'hold' ? 'HOLD' :
             existingOrder.type === 'move' ? `→ ${formatPosition(existingOrder.destination)}` :
             existingOrder.type === 'support' ? 'SUP' :
             existingOrder.type === 'convoy' ? 'CONV' : existingOrder.type.toUpperCase()}
          </span>
        )}
        <span className={`text-gray-500 text-xs transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-700/50 bg-gray-900/80">
          {/* Existing order display with remove */}
          {existingOrder && (
            <div className="px-3 py-2 border-b border-gray-700/30 flex items-center justify-between">
              <span className="text-xs text-green-400">
                {existingOrder.type === 'hold' && 'HOLD'}
                {existingOrder.type === 'move' && `MOVE → ${formatPosition(existingOrder.destination)}`}
                {existingOrder.type === 'support' && `SUPPORT ${formatPosition(existingOrder.supportFrom || existingOrder.target)} → ${formatPosition(existingOrder.supportTo || existingOrder.destination)}`}
                {existingOrder.type === 'convoy' && `CONVOY ${formatPosition(existingOrder.convoyFrom)} → ${formatPosition(existingOrder.convoyTo)}`}
              </span>
              {isMine && (
                <button onClick={() => removeOrder(existingOrderIdx)} className="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              )}
            </div>
          )}

          {/* Non-mine: read-only move list */}
          {!isMine && !orderType && (
            <div className="px-3 py-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Can move to</div>
              {validDests.length > 0 ? (
                <div className="space-y-0.5 max-h-32 overflow-y-auto">
                  {validDests.map(d => (
                    <div key={d} className="text-xs text-gray-400 pl-2">→ {formatPosition(d)}</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-600 italic">No valid moves</div>
              )}
            </div>
          )}

          {/* ── Level 1: Order type selection ── */}
          {isMine && !existingOrder && !orderType && (
            <div className="p-1.5 space-y-0.5">
              <button onClick={() => issueOrder({ type: 'hold', location: unit.position })}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-yellow-900/40 text-yellow-300 transition-colors">
                ■ Hold
              </button>
              {validDests.length > 0 && (
                <button onClick={() => setOrderType('move')}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-blue-900/40 text-blue-300 transition-colors">
                  → Move to…
                </button>
              )}
              {supportableUnits.length > 0 && (
                <button onClick={() => setOrderType('support-pick')}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-green-900/40 text-green-300 transition-colors">
                  ⊕ Support…
                </button>
              )}
              {unit.type === 'fleet' && isEdgePosition(unit.position) && (
                <button onClick={() => setOrderType('convoy')}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-purple-900/40 text-purple-300 transition-colors">
                  ⇄ Convoy…
                </button>
              )}
            </div>
          )}

          {/* ── Level 2: Move destinations ── */}
          {isMine && orderType === 'move' && (
            <div className="p-1.5">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] text-blue-400 uppercase tracking-wider">Move to</span>
                <button onClick={resetDropdown} className="text-gray-500 hover:text-gray-300 text-[10px]">← Back</button>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {validDests.map(d => (
                  <button key={d}
                    onClick={() => issueOrder({ type: 'move', location: unit.position, destination: d })}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-blue-900/40 text-gray-300 transition-colors">
                    → {formatPosition(d)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Level 2: Support — pick unit ── */}
          {isMine && orderType === 'support-pick' && (
            <div className="p-1.5">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] text-green-400 uppercase tracking-wider">Support which unit?</span>
                <button onClick={resetDropdown} className="text-gray-500 hover:text-gray-300 text-[10px]">← Back</button>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {supportableUnits.map(other => {
                  const oColor = FACTION_COLORS[other.faction] || '#888';
                  return (
                    <button key={other.position}
                      onClick={() => { setSupportTarget(other); setOrderType('support-action'); }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs hover:bg-green-900/30 text-gray-300 transition-colors">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: oColor }} />
                      <span className="font-mono" style={{ color: oColor }}>{other.type === 'fleet' ? 'F' : 'A'}</span>
                      <span className="truncate">{formatPosition(other.position)}</span>
                      {other.faction !== faction && (
                        <span className="text-gray-600 text-[10px] ml-auto">{FACTION_NAMES[other.faction]}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Level 3: Support — hold or move to where? ── */}
          {isMine && orderType === 'support-action' && supportTarget && (
            <div className="p-1.5">
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] text-green-400 uppercase tracking-wider">
                  Support {supportTarget.type === 'fleet' ? 'F' : 'A'} {formatPosition(supportTarget.position)}
                </span>
                <button onClick={() => { setSupportTarget(null); setOrderType('support-pick'); }}
                  className="text-gray-500 hover:text-gray-300 text-[10px]">← Back</button>
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {/* Support hold */}
                <button
                  onClick={() => issueOrder({
                    type: 'support', location: unit.position,
                    supportFrom: supportTarget.position, supportTo: supportTarget.position,
                    target: supportTarget.position, destination: supportTarget.position,
                  })}
                  className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-yellow-900/30 text-yellow-300 transition-colors">
                  ■ Support hold at {formatPosition(supportTarget.position)}
                </button>

                {/* Support move destinations */}
                {(() => {
                  const moveDests = getSupportMoveDests(supportTarget);
                  if (moveDests.length === 0) return null;
                  return (
                    <>
                      <div className="text-[10px] text-gray-500 px-2.5 pt-1.5 pb-0.5">Support move to:</div>
                      {moveDests.map(d => (
                        <button key={d}
                          onClick={() => issueOrder({
                            type: 'support', location: unit.position,
                            supportFrom: supportTarget.position, supportTo: d,
                            target: supportTarget.position, destination: d,
                          })}
                          className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-green-900/30 text-gray-300 transition-colors">
                          → {formatPosition(d)}
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Level 2: Convoy ── */}
          {isMine && orderType === 'convoy' && (
            <ConvoyPicker unit={unit} allUnits={allUnits} adjacencies={adjacencies}
              onOrder={issueOrder} onBack={resetDropdown} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── ConvoyPicker ────────────────────────────────────────────────────────────

function ConvoyPicker({ unit, allUnits, adjacencies, onOrder, onBack }) {
  const [convoyFrom, setConvoyFrom] = useState(null);
  const [epA, epB] = parseEdgeId(unit.position);
  const armies = allUnits.filter(u => u.type === 'army' && (u.position === epA || u.position === epB));

  if (!convoyFrom) {
    return (
      <div className="p-1.5">
        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-[10px] text-purple-400 uppercase tracking-wider">Convoy which army?</span>
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 text-[10px]">← Back</button>
        </div>
        {armies.length > 0 ? (
          <div className="space-y-0.5">
            {armies.map(a => (
              <button key={a.position} onClick={() => setConvoyFrom(a.position)}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-purple-900/30 text-gray-300 transition-colors">
                A {formatPosition(a.position)} ({FACTION_NAMES[a.faction]})
              </button>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-600 px-2.5 py-1 italic">No armies on endpoint planets</div>
        )}
      </div>
    );
  }

  const otherEp = convoyFrom === epA ? epB : epA;
  const convoyDests = [otherEp, ...(adjacencies[otherEp] || [])].filter(
    (d, i, arr) => isPlanetPosition(d) && arr.indexOf(d) === i && d !== convoyFrom
  );

  return (
    <div className="p-1.5">
      <div className="flex items-center justify-between px-2 mb-1">
        <span className="text-[10px] text-purple-400 uppercase tracking-wider">Convoy to</span>
        <button onClick={() => setConvoyFrom(null)} className="text-gray-500 hover:text-gray-300 text-[10px]">← Back</button>
      </div>
      <div className="space-y-0.5 max-h-32 overflow-y-auto">
        {convoyDests.map(d => (
          <button key={d}
            onClick={() => onOrder({ type: 'convoy', location: unit.position, convoyFrom, convoyTo: d })}
            className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-purple-900/30 text-gray-300 transition-colors">
            → {formatPosition(d)}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main OrderPanel ─────────────────────────────────────────────────────────

export default function OrderPanel({ gameState, myState, faction, disabled = false }) {
  const { pendingOrders, removeOrder, clearOrders, submitOrders, submitRetreats, submitBuilds, addOrder, selectUnit, selectedUnit } = useGameStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [factionFilter, setFactionFilter] = useState('mine');

  const myUnits = myState?.myUnits || [];
  const phase = gameState?.phase || 'orders';
  const submitted = gameState?.ordersSubmitted?.includes(faction);

  const adjacencies = useMemo(() => buildAdjacencies(), []);
  const { planetToEdges, edgeAdjacency } = useMemo(() => buildEdgeMaps(), []);
  const allUnits = useMemo(() => getAllUnits(gameState?.units), [gameState?.units]);

  // Sync: when the map selects a unit, expand it in the panel and switch to the right tab
  useEffect(() => {
    if (selectedUnit && selectedUnit !== expandedUnit) {
      setExpandedUnit(selectedUnit);
      // Auto-switch faction filter if needed
      const unitData = allUnits.find(u => u.position === selectedUnit);
      if (unitData) {
        if (unitData.faction === faction) {
          if (factionFilter !== 'mine' && factionFilter !== 'all') setFactionFilter('mine');
        } else if (factionFilter === 'mine') {
          setFactionFilter('all');
        }
      }
    } else if (!selectedUnit && expandedUnit) {
      setExpandedUnit(null);
    }
  }, [selectedUnit]);

  const unitsByFaction = useMemo(() => {
    const grouped = {};
    ALL_FACTIONS.forEach(f => { grouped[f] = []; });
    allUnits.forEach(u => { if (grouped[u.faction]) grouped[u.faction].push(u); });
    Object.values(grouped).forEach(arr =>
      arr.sort((a, b) => a.type !== b.type ? (a.type === 'army' ? -1 : 1) : a.position.localeCompare(b.position))
    );
    return grouped;
  }, [allUnits]);

  const visibleFactions = useMemo(() => {
    if (factionFilter === 'mine') return [faction];
    if (factionFilter === 'all') return ALL_FACTIONS.filter(f => unitsByFaction[f]?.length > 0);
    return [factionFilter];
  }, [factionFilter, faction, unitsByFaction]);

  const handleToggleUnit = (position) => {
    if (expandedUnit === position) {
      setExpandedUnit(null);
      selectUnit(null);
    } else {
      setExpandedUnit(position);
      selectUnit(position);
    }
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    let result;
    if (phase === 'retreats') result = await submitRetreats(pendingOrders);
    else if (phase === 'builds') result = await submitBuilds(pendingOrders);
    else result = await submitOrders();
    if (!result?.success && result?.error) alert(result.error);
  };

  const orderedCount = pendingOrders.length;
  const totalMyUnits = myUnits.length;

  return (
    <div className="order-panel flex flex-col h-full" data-testid="order-panel">
      {disabled && (
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center">
          <div className="bg-red-900 border-2 border-red-500 rounded-lg p-4 text-center">
            <div className="text-red-200 font-bold mb-2">Eliminated</div>
            <div className="text-sm text-red-300">Spectating Only</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lcars-orange font-bold text-sm tracking-wide">ORDERS</h2>
          <span className="text-[10px] text-gray-500">{gameState?.season?.toUpperCase()} {gameState?.year} · T{gameState?.turn}</span>
        </div>
        <div className="text-xs mt-0.5">
          Phase: <span className="text-lcars-blue uppercase font-semibold">{phase}</span>
          {phase === 'orders' && <span className="text-gray-500 ml-2">{orderedCount}/{totalMyUnits} ordered</span>}
        </div>
      </div>

      {/* ── Orders Phase ── */}
      {phase === 'orders' && (
        <>
          {/* Faction filter tabs */}
          <div className="px-2 py-1.5 border-b border-gray-700/50 flex gap-1 flex-wrap">
            <button onClick={() => setFactionFilter('mine')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                factionFilter === 'mine' ? 'text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={factionFilter === 'mine' ? { backgroundColor: FACTION_COLORS[faction] } : {}}>
              My Units
            </button>
            <button onClick={() => setFactionFilter('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                factionFilter === 'all' ? 'bg-lcars-orange text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              All
            </button>
            {ALL_FACTIONS.filter(f => f !== faction && unitsByFaction[f]?.length > 0).map(f => (
              <button key={f} onClick={() => setFactionFilter(f)}
                className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                  factionFilter === f ? 'text-black font-semibold' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                style={factionFilter === f
                  ? { backgroundColor: FACTION_COLORS[f], color: '#000' }
                  : { color: FACTION_COLORS[f] }}>
                {FACTION_NAMES[f]?.split(' ')[0] || f}
              </button>
            ))}
          </div>

          {/* Unit list */}
          <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-2">
            {visibleFactions.map(f => {
              const units = unitsByFaction[f] || [];
              if (units.length === 0) return null;
              const isMine = f === faction;
              return (
                <div key={f}>
                  {factionFilter !== 'mine' && (
                    <div className="flex items-center gap-1.5 px-1 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: FACTION_COLORS[f] }} />
                      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: FACTION_COLORS[f] }}>
                        {FACTION_NAMES[f]} ({units.length})
                      </span>
                      {isMine && <span className="text-[10px] text-gray-600">· You</span>}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {units.map(unit => (
                      <UnitOrderDropdown key={unit.position} unit={unit} isMine={isMine}
                        allUnits={allUnits} adjacencies={adjacencies} planetToEdges={planetToEdges}
                        edgeAdjacency={edgeAdjacency} pendingOrders={pendingOrders} addOrder={addOrder}
                        removeOrder={removeOrder} faction={faction} selectUnit={selectUnit}
                        expanded={expandedUnit === unit.position} onToggle={() => handleToggleUnit(unit.position)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions & submit */}
          {!submitted && (
            <div className="px-3 py-2 border-t border-gray-700/50 space-y-1.5">
              {orderedCount < totalMyUnits && (
                <button onClick={() => {
                  myUnits.forEach(u => {
                    if (!pendingOrders.some(o => o.location === u.position))
                      addOrder({ type: 'hold', location: u.position });
                  });
                }} className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors">
                  Hold remaining {totalMyUnits - orderedCount} unit(s)
                </button>
              )}
              {pendingOrders.length > 0 && (
                <button onClick={clearOrders} className="w-full py-1 text-red-400 hover:text-red-300 text-xs">
                  Clear all orders
                </button>
              )}
              <button onClick={() => setShowConfirm(true)}
                disabled={pendingOrders.length === 0 || disabled}
                className={`w-full py-2.5 rounded font-bold text-sm transition-colors ${
                  pendingOrders.length === 0 || disabled
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-lcars-orange hover:bg-lcars-tan text-black'
                }`}>
                Submit Orders ({pendingOrders.length})
              </button>
            </div>
          )}
          {submitted && (
            <div className="px-3 py-3 border-t border-gray-700/50 text-center">
              <div className="text-green-400 font-bold text-sm">✓ Orders Submitted</div>
              <div className="text-gray-500 text-xs mt-1">Waiting for other players…</div>
            </div>
          )}
        </>
      )}

      {/* ── Retreats Phase ── */}
      {phase === 'retreats' && myState?.myDislodged?.length > 0 && (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          <div className="text-yellow-400 text-xs font-bold uppercase tracking-wider">Units Dislodged — Must Retreat</div>
          {myState.myDislodged.map((unit, i) => (
            <div key={i} className="bg-red-900/20 border border-red-900/50 rounded p-2">
              <div className="text-sm mb-1.5 font-mono">{formatPosition(unit.position || unit.location)}</div>
              {unit.retreatOptions?.length > 0 ? (
                <div className="space-y-0.5">
                  {unit.retreatOptions.map(opt => (
                    <button key={opt}
                      onClick={() => addOrder({ type: 'retreat', location: unit.position || unit.location, destination: opt })}
                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-red-900/40 text-gray-300 transition-colors">
                      → Retreat to {formatPosition(opt)}
                    </button>
                  ))}
                  <button onClick={() => addOrder({ type: 'disband', location: unit.position || unit.location })}
                    className="w-full text-left px-2 py-1 rounded text-xs hover:bg-red-900/40 text-red-400 transition-colors">
                    ✕ Disband
                  </button>
                </div>
              ) : (
                <div className="text-xs text-red-400 italic">No retreat options — must disband</div>
              )}
            </div>
          ))}
          <button onClick={() => setShowConfirm(true)} disabled={pendingOrders.length === 0}
            className={`w-full py-2.5 rounded font-bold text-sm transition-colors ${
              pendingOrders.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-lcars-orange hover:bg-lcars-tan text-black'
            }`}>
            Submit Retreats
          </button>
        </div>
      )}

      {/* ── Builds Phase ── */}
      {phase === 'builds' && myState?.buildCount !== undefined && (
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          <div className="text-lcars-blue text-xs font-bold uppercase tracking-wider">
            {myState.buildCount > 0 ? `Build ${myState.buildCount} Unit(s)` :
             myState.buildCount < 0 ? `Disband ${Math.abs(myState.buildCount)} Unit(s)` : 'No builds needed'}
          </div>
          {myState.buildCount > 0 && (
            <>
              {(myState.buildLocations?.armies || []).map(loc => (
                <button key={`a-${loc}`}
                  onClick={() => addOrder({ type: 'build', location: loc, unitType: 'army' })}
                  className="w-full text-left px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors">
                  Build Army at {formatPosition(loc)}
                </button>
              ))}
              {(myState.buildLocations?.fleets || []).map(loc => (
                <button key={`f-${loc}`}
                  onClick={() => addOrder({ type: 'build', location: loc, unitType: 'fleet' })}
                  className="w-full text-left px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs transition-colors">
                  Build Fleet at {formatPosition(loc)}
                </button>
              ))}
            </>
          )}
          {myState.buildCount < 0 && myUnits.map(unit => (
            <button key={unit.position}
              onClick={() => addOrder({ type: 'disband', location: unit.position })}
              className="w-full text-left px-2.5 py-1.5 bg-gray-800 hover:bg-red-900/40 rounded text-xs text-red-300 transition-colors">
              Disband {unit.type === 'fleet' ? 'F' : 'A'} {formatPosition(unit.position)}
            </button>
          ))}
          {pendingOrders.length > 0 && (
            <div className="space-y-0.5 border-t border-gray-700/50 pt-2">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Queued</div>
              {pendingOrders.map((o, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-800 rounded px-2 py-1">
                  <span className="text-gray-300">
                    {o.type === 'build' ? `Build ${o.unitType} at ${formatPosition(o.location)}` : `Disband ${formatPosition(o.location)}`}
                  </span>
                  <button onClick={() => removeOrder(i)} className="text-red-400 hover:text-red-300">✕</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowConfirm(true)} disabled={pendingOrders.length === 0}
            className={`w-full py-2.5 rounded font-bold text-sm transition-colors ${
              pendingOrders.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-lcars-orange hover:bg-lcars-tan text-black'
            }`}>
            Submit Builds
          </button>
        </div>
      )}

      {/* Ferengi latinum */}
      {faction === 'ferengi' && myState?.myLatinum !== undefined && (
        <div className="px-3 py-2 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-lcars-tan">Latinum</span>
            <span className="font-bold" style={{ color: FACTION_COLORS.ferengi }}>{myState.myLatinum} bars</span>
          </div>
        </div>
      )}

      {/* Alliance */}
      {myState?.myAlliance && (
        <div className="px-3 py-2 border-t border-gray-700/50">
          <div className="text-xs text-lcars-tan">
            Allied with: <span className="text-lcars-blue font-semibold">
              {FACTION_NAMES[myState.myAlliance.members.find(m => m !== faction)] || '?'}
            </span>
          </div>
        </div>
      )}

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 border-2 border-lcars-orange rounded-lg p-5 max-w-sm w-full mx-4">
            <h3 className="text-lcars-orange text-base font-bold mb-3">Confirm Submission</h3>
            <div className="bg-gray-800 rounded p-3 max-h-48 overflow-y-auto space-y-1 mb-3">
              {pendingOrders.map((order, i) => (
                <div key={i} className="text-xs text-gray-300">
                  • {formatPosition(order.location)}
                  {order.type === 'hold' && ' — HOLD'}
                  {order.type === 'move' && ` → ${formatPosition(order.destination)}`}
                  {order.type === 'support' && ` SUP ${formatPosition(order.supportFrom || order.target)} → ${formatPosition(order.supportTo || order.destination)}`}
                  {order.type === 'convoy' && ` CONVOY ${formatPosition(order.convoyFrom)} → ${formatPosition(order.convoyTo)}`}
                  {order.type === 'build' && ` BUILD ${order.unitType}`}
                  {order.type === 'disband' && ' DISBAND'}
                  {order.type === 'retreat' && ` RETREAT → ${formatPosition(order.destination)}`}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded font-bold text-sm">Cancel</button>
              <button onClick={handleSubmit}
                className="flex-1 px-3 py-2 bg-lcars-orange hover:bg-lcars-tan text-black rounded font-bold text-sm">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
