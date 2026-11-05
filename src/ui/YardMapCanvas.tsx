import { useState, useEffect, useMemo } from 'react';
import { DockDoor, YardSpot, JockeyWorkOrder, DetentionClock } from '../engine/types';
import {
  resolveLocationCoordinate,
  buildYardTrajectory,
  interpolateSpotterPosition,
  SpotterWaypoint,
} from '../engine/hostlerSimulation';

interface YardMapCanvasProps {
  doors: DockDoor[];
  spots: YardSpot[];
  jockeyTasks: JockeyWorkOrder[];
  detentionClocks: DetentionClock[];
  selectedDoorId: string | null;
  selectedSpotId: string | null;
  onSelectDoor: (door: DockDoor) => void;
  onSelectSpot: (spot: YardSpot) => void;
  onQuickMove?: (trailerNumber: string, fromLocation: string, toLocation: string) => void;
}

interface ActiveMovePreset {
  id: string;
  label: string;
  trailerNumber: string;
  sourceLocation: string;
  targetLocation: string;
}

const PRESET_MOVES: ActiveMovePreset[] = [
  {
    id: 'move-1',
    label: 'Spot A-1 ➔ Dock D-03',
    trailerNumber: 'TLR-9042',
    sourceLocation: 'Spot A-1',
    targetLocation: 'D-03',
  },
  {
    id: 'move-2',
    label: 'Dock D-08 ➔ Lot B-5',
    trailerNumber: 'TLR-8120',
    sourceLocation: 'D-08',
    targetLocation: 'B-5',
  },
  {
    id: 'move-3',
    label: 'Gate 1 ➔ Spot A-2',
    trailerNumber: 'TLR-5541',
    sourceLocation: 'Gate 1',
    targetLocation: 'Spot A-2',
  },
];

export function YardMapCanvas({
  doors,
  spots,
  jockeyTasks: _jockeyTasks,
  detentionClocks,
  selectedDoorId,
  selectedSpotId,
  onSelectDoor,
  onSelectSpot,
  onQuickMove,
}: YardMapCanvasProps) {
  const [filterMode, setFilterMode] = useState<'ALL' | 'REEFER' | 'DRY_VAN' | 'DETENTION'>('ALL');
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);

  // Hostler Spotter simulation state
  const [selectedMove, setSelectedMove] = useState<ActiveMovePreset>(PRESET_MOVES[0]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simProgress, setSimProgress] = useState<number>(0); // 0.0 to 1.0
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 4x

  // Build waypoints for current active move
  const waypoints: SpotterWaypoint[] = useMemo(() => {
    const startPos = { x: 460, y: 165 }; // Default hostler home base
    const sourcePos = resolveLocationCoordinate(selectedMove.sourceLocation);
    const targetPos = resolveLocationCoordinate(selectedMove.targetLocation);
    return buildYardTrajectory(startPos, sourcePos, targetPos);
  }, [selectedMove]);

  // Current interpolated kinematics
  const spotter = useMemo(() => {
    return interpolateSpotterPosition(waypoints, simProgress);
  }, [waypoints, simProgress]);

  // Animation frame loop
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const next = prev + 0.0035 * simSpeed;
        if (next >= 1.0) {
          setIsSimulating(false);
          onQuickMove?.(
            selectedMove.trailerNumber,
            selectedMove.sourceLocation,
            selectedMove.targetLocation
          );
          return 1.0;
        }
        return next;
      });
    }, 25);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, selectedMove, onQuickMove]);

  const handleStartMove = (preset: ActiveMovePreset) => {
    setSelectedMove(preset);
    setSimProgress(0);
    setIsSimulating(true);
  };

  const handleResetMove = () => {
    setIsSimulating(false);
    setSimProgress(0);
  };

  const etaSeconds = Math.max(0, Math.round((1 - simProgress) * 20 / simSpeed));

  // Helper to find detention info for a trailer
  const getDetention = (trailerId?: string) => {
    if (!trailerId) return undefined;
    return detentionClocks.find((c) => c.trailerNumber === trailerId);
  };

  return (
    <div className="yard-map-canvas-container" style={{ position: 'relative', width: '100%', borderRadius: '10px', overflow: 'hidden' }}>
      {/* Map Control Bar & Hostler Dispatch HUD */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '10px 16px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>VIEW FILTER:</span>
          {(['ALL', 'REEFER', 'DRY_VAN', 'DETENTION'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterMode === mode ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.12)',
                background: filterMode === mode ? 'rgba(6, 182, 212, 0.2)' : 'transparent',
                color: filterMode === mode ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '11px',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Spotter Dispatch Actions */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, color: '#38bdf8', fontSize: '11px' }}>🚜 SPOT-3 DISPATCH:</span>
          {PRESET_MOVES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleStartMove(preset)}
              style={{
                background: selectedMove.id === preset.id && isSimulating ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedMove.id === preset.id ? '#38bdf8' : '#94a3b8',
                border: selectedMove.id === preset.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                padding: '4px 8px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}

          {/* Play/Pause & Reset Controls */}
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            style={{
              background: isSimulating ? '#ef4444' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {isSimulating ? '⏸ Pause' : simProgress > 0 && simProgress < 1 ? '▶ Resume' : '▶ Start Move'}
          </button>

          <button
            onClick={handleResetMove}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>

          {/* Speed Dial */}
          <button
            onClick={() => setSimSpeed((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {simSpeed}x SPEED
          </button>
        </div>
      </div>

      {/* Main SVG Blueprint */}
      <svg
        viewBox="0 0 920 460"
        style={{
          width: '100%',
          height: 'auto',
          background: '#0a0f1d',
          display: 'block',
          userSelect: 'none',
        }}
        aria-label="Interactive Facility Yard & Dock Blueprint"
      >
        <defs>
          {/* Blueprint Grid Pattern */}
          <pattern id="yardGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
          <linearGradient id="warehouseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="gateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
          {/* Pulse marker for urgent tasks */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Blueprint background grid */}
        <rect width="920" height="460" fill="url(#yardGrid)" />

        {/* Facility Main Warehouse Building Footprint (Top) */}
        <rect x="20" y="16" width="880" height="100" rx="6" fill="url(#warehouseGrad)" stroke="#334155" strokeWidth="1.5" />
        <text x="36" y="44" fill="#94a3b8" fontSize="12" fontWeight="700" letterSpacing="1">
          NORTH LOGISTICS TERMINAL & CROSS-DOCK FACILITY
        </text>
        <text x="36" y="60" fill="#64748b" fontSize="10">
          Climate Zones: Cold-Chain Reefers (D1-D4) · Dry Freight (D5-D10) · Flatbed Deck (D11-D12)
        </text>

        {/* Dock Doors (1 to 12 along bottom wall of warehouse) */}
        {doors.map((door, idx) => {
          const doorX = 42 + idx * 71;
          const doorY = 78;
          const isSelected = selectedDoorId === door.doorId;
          const detention = getDetention(door.assignedTrailerId);
          const isDetained = detention?.isDetained;
          const isExpiringSoon = detention && !isDetained && detention.remainingMinutes <= 20;

          const isDimmed =
            (filterMode === 'REEFER' && door.type !== 'REEFER') ||
            (filterMode === 'DRY_VAN' && door.type !== 'DRY_VAN') ||
            (filterMode === 'DETENTION' && !isDetained);

          let strokeColor = '#3b82f6';
          let fillColor = 'rgba(59, 130, 246, 0.1)';
          if (door.status === 'AVAILABLE') {
            strokeColor = '#10b981';
            fillColor = 'rgba(16, 185, 129, 0.15)';
          } else if (door.status === 'OCCUPIED') {
            strokeColor = isDetained ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#06b6d4';
            fillColor = isDetained ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.18)';
          } else if (door.status === 'RESERVED') {
            strokeColor = '#f59e0b';
            fillColor = 'rgba(245, 158, 11, 0.12)';
          } else {
            strokeColor = '#64748b';
            fillColor = 'rgba(100, 116, 139, 0.1)';
          }

          return (
            <g
              key={door.doorId}
              onClick={() => onSelectDoor(door)}
              onMouseEnter={() => setHoveredElement(door.doorId)}
              onMouseLeave={() => setHoveredElement(null)}
              style={{ cursor: 'pointer', opacity: isDimmed ? 0.25 : 1, transition: 'all 0.2s' }}
            >
              {/* Door bay outline */}
              <rect
                x={doorX}
                y={doorY}
                width="62"
                height="68"
                rx="4"
                fill={fillColor}
                stroke={isSelected ? '#38bdf8' : hoveredElement === door.doorId ? '#7dd3fc' : strokeColor}
                strokeWidth={isSelected ? 2.5 : hoveredElement === door.doorId ? 2 : 1.5}
              />

              {/* Door header label */}
              <rect x={doorX} y={doorY} width="62" height="18" fill="rgba(0,0,0,0.4)" rx="3" />
              <text x={doorX + 31} y={doorY + 13} fill="#f1f5f9" fontSize="10" fontWeight="700" textAnchor="middle">
                D-{door.doorNumber}
              </text>

              {/* Door commodity icon / badge */}
              <text x={doorX + 31} y={doorY + 30} fill="#94a3b8" fontSize="8" textAnchor="middle">
                {door.type === 'REEFER' ? '❄️ REF' : door.type === 'FLATBED' ? '🚜 FLT' : '📦 DRY'}
              </text>

              {/* Occupied trailer silhouette */}
              {door.assignedTrailerId && (
                <g>
                  <rect
                    x={doorX + 6}
                    y={doorY + 35}
                    width="50"
                    height="26"
                    rx="2"
                    fill={isDetained ? '#7f1d1d' : '#1e3a5f'}
                    stroke={isDetained ? '#ef4444' : '#38bdf8'}
                    strokeWidth="1"
                  />
                  <text x={doorX + 31} y={doorY + 48} fill="#fff" fontSize="7.5" fontWeight="700" textAnchor="middle">
                    {door.assignedTrailerId.replace('TLR-', '')}
                  </text>
                  <text
                    x={doorX + 31}
                    y={doorY + 57}
                    fill={isDetained ? '#fca5a5' : '#7dd3fc'}
                    fontSize="6.5"
                    textAnchor="middle"
                  >
                    {isDetained ? `+$${detention?.detentionChargeUsd}` : `${door.currentPalletCount || 26} pal`}
                  </text>
                </g>
              )}

              {/* Detention Alert Ring if expiring soon or detained */}
              {(isDetained || isExpiringSoon) && (
                <circle
                  cx={doorX + 54}
                  cy={doorY + 8}
                  r="5"
                  fill={isDetained ? '#ef4444' : '#f59e0b'}
                  filter="url(#glow)"
                />
              )}
            </g>
          );
        })}

        {/* Central Yard Apron & Directional Drive Lanes */}
        <path
          d="M 60 165 L 860 165"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="2"
          strokeDasharray="8 6"
        />
        <text x="460" y="180" fill="rgba(255, 255, 255, 0.2)" fontSize="11" fontWeight="700" letterSpacing="4" textAnchor="middle">
          ◄ ONE-WAY YARD CIRCULATION APRON (MAX 10 MPH) ►
        </text>

        {/* Animated Spotter Waypoint Vector Guidance Path */}
        {waypoints.length > 1 && (
          <g>
            <polyline
              points={waypoints.map((w) => `${w.x},${w.y}`).join(' ')}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.85"
            />
            {/* Target waypoint beacon */}
            {waypoints.length > 0 && (
              <circle
                cx={waypoints[waypoints.length - 1].x}
                cy={waypoints[waypoints.length - 1].y}
                r="8"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                filter="url(#glow)"
              />
            )}
          </g>
        )}

        {/* Hostler Spotter Tractor (Ottawa T2) & Coupled Trailer */}
        <g transform={`translate(${spotter.x}, ${spotter.y}) rotate(${spotter.headingDeg})`}>
          {/* If fifth wheel is engaged, render the coupled trailer following the tractor */}
          {spotter.fifthWheelEngaged && (
            <g transform="translate(-46, 0)">
              {/* 53ft Trailer Chassis */}
              <rect
                x="-28"
                y="-10"
                width="56"
                height="20"
                rx="2"
                fill="#1e3a5f"
                stroke="#38bdf8"
                strokeWidth="1.2"
              />
              <text x="0" y="3" fill="#ffffff" fontSize="7" fontWeight="700" textAnchor="middle">
                {selectedMove.trailerNumber}
              </text>
              {/* Kingpin Link line */}
              <line x1="28" y1="0" x2="36" y2="0" stroke="#f59e0b" strokeWidth="2.5" />
              {/* Dual Tandem Tires */}
              <rect x="-24" y="-13" width="10" height="3" fill="#0f172a" rx="1" />
              <rect x="-24" y="10" width="10" height="3" fill="#0f172a" rx="1" />
            </g>
          )}

          {/* Ottawa T2 Spotter Tractor Body */}
          <rect
            x="-16"
            y="-9"
            width="32"
            height="18"
            rx="3"
            fill="#0891b2"
            stroke="#67e8f9"
            strokeWidth="1.5"
          />

          {/* Driver Cab */}
          <rect
            x="0"
            y="-7"
            width="12"
            height="14"
            rx="2"
            fill="#0284c7"
            stroke="#38bdf8"
            strokeWidth="1"
          />
          {/* Panoramic Windshield */}
          <rect
            x="5"
            y="-5"
            width="5"
            height="10"
            rx="1"
            fill="#bae6fd"
            opacity="0.85"
          />

          {/* Rotating Amber Beacon */}
          <circle
            cx="4"
            cy="0"
            r="3"
            fill={spotter.speedMph > 0 ? '#f59e0b' : '#64748b'}
            filter={spotter.speedMph > 0 ? 'url(#glow)' : undefined}
          />

          {/* Fifth-Wheel Plate */}
          <circle
            cx="-8"
            cy="0"
            r="4.5"
            fill={spotter.fifthWheelEngaged ? '#f59e0b' : '#1e293b'}
            stroke="#94a3b8"
            strokeWidth="1"
          />

          {/* SPOT-3 Badge Text */}
          <text
            x="-1"
            y="3"
            fill="#ffffff"
            fontSize="6"
            fontWeight="900"
            textAnchor="middle"
          >
            SPOT-3
          </text>
        </g>

        {/* DROP LOT A (Left Side) */}
        <g>
          <rect x="40" y="220" width="380" height="135" rx="6" fill="rgba(15, 23, 42, 0.6)" stroke="#334155" strokeWidth="1" />
          <text x="55" y="240" fill="#38bdf8" fontSize="11" fontWeight="700">
            DROP LOT A (STAGED INBOUND UNITS)
          </text>
          {spots.slice(0, 4).map((spot, idx) => {
            const spotX = 55 + idx * 88;
            const spotY = 252;
            const isSelected = selectedSpotId === spot.spotId;
            const detention = getDetention(spot.trailerId);

            return (
              <g
                key={spot.spotId}
                onClick={() => onSelectSpot(spot)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={spotX}
                  y={spotY}
                  width="78"
                  height="88"
                  rx="4"
                  fill={spot.status === 'OCCUPIED' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)'}
                  stroke={isSelected ? '#38bdf8' : spot.status === 'OCCUPIED' ? '#0284c7' : '#334155'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={spot.status === 'EMPTY' ? '4 3' : 'none'}
                />
                <text x={spotX + 10} y={spotY + 18} fill="#94a3b8" fontSize="10" fontWeight="600">
                  {spot.spotNumber}
                </text>
                {spot.trailerId ? (
                  <g>
                    <rect x={spotX + 8} y={spotY + 28} width="62" height="34" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                    <text x={spotX + 39} y={spotY + 44} fill="#fff" fontSize="8" fontWeight="700" textAnchor="middle">
                      {spot.trailerId}
                    </text>
                    <text x={spotX + 39} y={spotY + 54} fill="#94a3b8" fontSize="7" textAnchor="middle">
                      {detention?.isDetained ? '⚠️ DETENTION' : 'STAGED'}
                    </text>
                  </g>
                ) : (
                  <text x={spotX + 39} y={spotY + 52} fill="#475569" fontSize="9" textAnchor="middle">
                    OPEN
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* DROP LOT B & STAGING (Right Side) */}
        <g>
          <rect x="450" y="220" width="430" height="135" rx="6" fill="rgba(15, 23, 42, 0.6)" stroke="#334155" strokeWidth="1" />
          <text x="465" y="240" fill="#38bdf8" fontSize="11" fontWeight="700">
            DROP LOT B · OUTBOUND & INSPECTION LANES
          </text>
          {spots.slice(4, 8).map((spot, idx) => {
            const spotX = 465 + idx * 100;
            const spotY = 252;
            const isSelected = selectedSpotId === spot.spotId;

            return (
              <g
                key={spot.spotId}
                onClick={() => onSelectSpot(spot)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={spotX}
                  y={spotY}
                  width="88"
                  height="88"
                  rx="4"
                  fill={spot.status === 'OCCUPIED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)'}
                  stroke={isSelected ? '#38bdf8' : spot.status === 'OCCUPIED' ? '#059669' : '#334155'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeDasharray={spot.status === 'EMPTY' ? '4 3' : 'none'}
                />
                <text x={spotX + 10} y={spotY + 18} fill="#94a3b8" fontSize="10" fontWeight="600">
                  {spot.spotNumber}
                </text>
                {spot.trailerId ? (
                  <g>
                    <rect x={spotX + 10} y={spotY + 28} width="68" height="34" rx="3" fill="#1e293b" stroke="#10b981" strokeWidth="1" />
                    <text x={spotX + 44} y={spotY + 44} fill="#fff" fontSize="8" fontWeight="700" textAnchor="middle">
                      {spot.trailerId}
                    </text>
                    <text x={spotX + 44} y={spotY + 54} fill="#a7f3d0" fontSize="7" textAnchor="middle">
                      READY OUT
                    </text>
                  </g>
                ) : (
                  <text x={spotX + 44} y={spotY + 52} fill="#475569" fontSize="9" textAnchor="middle">
                    OPEN
                  </text>
                )}
              </g>
            );
          })}
        </g>

        {/* SECURITY GATE & GUARD SHACK (Bottom Center) */}
        <g>
          {/* Ingress Road */}
          <rect x="340" y="380" width="240" height="70" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />
          <line x1="460" y1="380" x2="460" y2="450" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" />

          {/* Guard Shack Building */}
          <rect x="430" y="390" width="60" height="42" rx="4" fill="url(#gateGrad)" stroke="#64748b" strokeWidth="1.5" />
          <text x="460" y="408" fill="#f8fafc" fontSize="8.5" fontWeight="800" textAnchor="middle">
            GATE 1
          </text>
          <text x="460" y="420" fill="#38bdf8" fontSize="7.5" textAnchor="middle">
            KIOSK / OCR
          </text>

          {/* Barrier Arms */}
          <line x1="390" y1="410" x2="430" y2="410" stroke="#ef4444" strokeWidth="3" />
          <line x1="490" y1="410" x2="530" y2="410" stroke="#10b981" strokeWidth="3" />

          <text x="380" y="440" fill="#94a3b8" fontSize="9" fontWeight="700" textAnchor="middle">
            ▲ INBOUND GATE
          </text>
          <text x="540" y="440" fill="#94a3b8" fontSize="9" fontWeight="700" textAnchor="middle">
            OUTBOUND GATE ▼
          </text>
        </g>
      </svg>

      {/* Spotter Live Telemetry Bar (Bottom HUD) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '8px 16px',
          background: 'rgba(10, 15, 29, 0.95)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#94a3b8',
        }}
      >
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            TRACTOR: <span style={{ color: '#38bdf8', fontWeight: 700 }}>SPOT-3 (Ottawa T2)</span>
          </div>
          <div>
            PHASE:{' '}
            <span
              style={{
                color: spotter.phase === 'HAULING' ? '#38bdf8' : spotter.phase === 'COUPLING' ? '#f59e0b' : '#10b981',
                fontWeight: 700,
              }}
            >
              {spotter.phase} ({spotter.speedMph.toFixed(1)} MPH)
            </span>
          </div>
          <div>
            5th WHEEL:{' '}
            <span style={{ color: spotter.fifthWheelEngaged ? '#10b981' : '#64748b' }}>
              {spotter.fifthWheelEngaged ? `LOCKED (${spotter.boomPressurePsi} PSI)` : 'DISENGAGED'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div>
            PROGRESS: <span style={{ color: '#fff', fontWeight: 700 }}>{Math.round(simProgress * 100)}%</span>
          </div>
          <div>
            ETA:{' '}
            <span style={{ color: isSimulating ? '#38bdf8' : '#94a3b8', fontWeight: 700 }}>
              {isSimulating ? `${etaSeconds}s remaining` : simProgress >= 1 ? 'ARRIVED' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
