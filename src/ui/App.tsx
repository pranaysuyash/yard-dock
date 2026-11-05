import { useState, useEffect } from 'react';
import { SuiteDock } from './SuiteDock';
import {
  INITIAL_DOCK_DOORS,
  INITIAL_YARD_SPOTS,
  INITIAL_JOCKEY_TASKS,
  calculateDetentionClock,
  createJockeyMoveOrder,
} from '../engine/yardEngine';
import { DockDoor, YardSpot, JockeyWorkOrder, DetentionClock } from '../engine/types';
import { buildWarehouseInboundBridgeUrl, buildCarrierVettingBridgeUrl } from '../engine/bridges';
import { platformBus } from '../engine/platformBus';
import { DockAllocationTask } from './DockAllocationTask';
import { YardMapCanvas } from './YardMapCanvas';
import { GuardShackKioskModal } from './GuardShackKioskModal';
import { DigitalGatePass } from '../engine/guardShackKiosk';

export function App() {
  const [doors, setDoors] = useState<DockDoor[]>(INITIAL_DOCK_DOORS);
  const [spots, setSpots] = useState<YardSpot[]>(INITIAL_YARD_SPOTS);
  const [jockeyTasks, setJockeyTasks] = useState<JockeyWorkOrder[]>(INITIAL_JOCKEY_TASKS);
  const [selectedDoorId, setSelectedDoorId] = useState<string | null>(INITIAL_DOCK_DOORS[0].doorId);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [yardViewMode, setYardViewMode] = useState<'BLUEPRINT' | 'GRID'>('BLUEPRINT');
  const selectedDoor = doors.find(door => door.doorId === selectedDoorId) ?? null;
  const selectedSpot = spots.find(spot => spot.spotId === selectedSpotId) ?? null;
  const setSelectedDoor = (door: DockDoor | null) => {
    setSelectedDoorId(door?.doorId ?? null);
    if (door) setSelectedSpotId(null);
  };
  const setSelectedSpot = (spot: YardSpot | null) => {
    setSelectedSpotId(spot?.spotId ?? null);
    if (spot) setSelectedDoorId(null);
  };

  // Gate Check-in Modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);

  // Active detention clocks (simulated for current trailers)
  const [detentionClocks, setDetentionClocks] = useState<DetentionClock[]>([
    calculateDetentionClock('TLR-7701-RF', 'Polar Express Logistics LLC', new Date(Date.now() - 135 * 60 * 1000).toISOString()),
    calculateDetentionClock('TLR-8842-DV', 'Keystone Logistics Transport Inc', new Date(Date.now() - 85 * 60 * 1000).toISOString()),
    calculateDetentionClock('TLR-6112-DV', 'Apex Freight Lines Corp', new Date(Date.now() - 30 * 60 * 1000).toISOString()),
  ]);

  // Update detention clocks every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setDetentionClocks((prev) =>
        prev.map((c) =>
          calculateDetentionClock(c.trailerNumber, c.carrierName, c.gateInTimestamp, c.freeTimeMinutes, c.hourlyRateUsd)
        )
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const occupiedDoors = doors.filter((d) => d.status === 'OCCUPIED').length;
  const availableDoors = doors.filter((d) => d.status === 'AVAILABLE').length;
  const occupiedSpots = spots.filter((s) => s.status === 'OCCUPIED').length;
  const detainedCount = detentionClocks.filter((c) => c.isDetained).length;

  const handleSuccessfulGateIn = (
    gatePass: DigitalGatePass,
    allocatedDoorId?: string,
    allocatedSpotId?: string
  ) => {
    if (allocatedDoorId) {
      setDoors((prev) =>
        prev.map((d) =>
          d.doorId === allocatedDoorId
            ? { ...d, status: 'OCCUPIED', assignedTrailerId: gatePass.trailerNumber, estimatedClearMinutes: 45 }
            : d
        )
      );
    }
    if (allocatedSpotId) {
      setSpots((prev) =>
        prev.map((s) =>
          s.spotId === allocatedSpotId
            ? { ...s, status: 'OCCUPIED', trailerId: gatePass.trailerNumber }
            : s
        )
      );
    }
    setDetentionClocks((prev) => [
      calculateDetentionClock(gatePass.trailerNumber, gatePass.carrierName, gatePass.issuedAt),
      ...prev,
    ]);
    platformBus.publish('TRAILER_GATED_IN', {
      checkInId: gatePass.gatePassId,
      trailerNumber: gatePass.trailerNumber,
      carrierDot: '3819401',
      doorNumber: allocatedDoorId ? parseInt(allocatedDoorId.replace(/\D/g, ''), 10) || undefined : undefined,
      spotNumber: allocatedSpotId,
      timestamp: gatePass.issuedAt,
    });
    setCheckInNotice(`Digital Gate Pass ${gatePass.gatePassId} issued! Assigned to ${gatePass.assignedLocationName}.`);
  };

  const handleCompleteJockeyTask = (orderId: string) => {
    setJockeyTasks((prev) =>
      prev.map((t) => (t.orderId === orderId ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString() } : t))
    );
  };

  const handleDispatchNewMove = () => {
    const newOrder = createJockeyMoveOrder('TLR-6112-DV', 'Drop Lot A-01', 'Dock Door #2', 'URGENT');
    setJockeyTasks((prev) => [newOrder, ...prev]);
  };

  return (
    <div className="yms-app-root">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <SuiteDock currentProductId="product-07-yard-dock" />

      {/* Top Header */}
      <header className="yms-header">
        <div className="header-left">
          <span className="platform-tag">TRUCKING PLATFORM · YMS</span>
          <h1 className="header-title">Product 07 — Yard & Dock Management System</h1>
          <p className="header-subtitle">Scenario Appointments · Manual Gate Kiosk · Interactive Yard Map · Detention Prevention</p>
        </div>

        <div className="header-bridges">
          <a href="http://localhost:5170" className="bridge-pill" target="_blank" rel="noopener noreferrer">
            <span className="dot dot-portal" /> Command Center (5170)
          </a>
          <a href="http://localhost:5178" className="bridge-pill" target="_blank" rel="noopener noreferrer">
            <span className="dot dot-wms" /> P06 Warehouse (5178)
          </a>
          <a href="http://localhost:5180" className="bridge-pill" target="_blank" rel="noopener noreferrer">
            <span className="dot dot-trust" /> P08 Carrier Trust (5180)
          </a>
          <button className="btn-primary" onClick={() => setShowCheckInModal(true)}>
            + Fast Gate Check-In Kiosk
          </button>
        </div>
      </header>

      {/* Check-In Success Notice */}
      {checkInNotice && (
        <div className="notice-banner">
          <span>{checkInNotice}</span>
          <button className="notice-close" onClick={() => setCheckInNotice(null)}>✕</button>
        </div>
      )}

      {/* KPI Stats Row & Main Yard Layout */}
      <main id="main-content" tabIndex={-1}>
        <DockAllocationTask doors={doors} selectedDoor={selectedDoor} onSelect={setSelectedDoor} />
        <h2 className="simulator-heading">Independent yard and gate simulator</h2>
        <div className="kpi-row">
        <div className="kpi-card">
          <div className="kpi-label">DOCK UTILIZATION</div>
          <div className="kpi-val">{occupiedDoors} / {doors.length} <span className="kpi-sub">Doors ({availableDoors} Open)</span></div>
          <div className="kpi-bar">
            <div className="kpi-bar-fill" style={{ width: `${(occupiedDoors / doors.length) * 100}%` }} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">DROP LOT OCCUPANCY</div>
          <div className="kpi-val">{occupiedSpots} / {spots.length} <span className="kpi-sub">Spots Active</span></div>
          <div className="kpi-bar">
            <div className="kpi-bar-fill bg-cyan" style={{ width: `${(occupiedSpots / spots.length) * 100}%` }} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">DETENTION CLOCK STATUS</div>
          <div className={`kpi-val ${detainedCount > 0 ? 'text-red' : 'text-emerald'}`}>
            {detainedCount > 0 ? `⚠️ ${detainedCount} TRUCKS OVERDUE` : '✅ 0 Trapped Trucks'}
          </div>
          <div className="kpi-note">{detainedCount > 0 ? 'Accruing $85/hr fees' : 'All within 2-hr free time window'}</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">YARD JOCKEY QUEUE</div>
          <div className="kpi-val">{jockeyTasks.filter((t) => t.status === 'PENDING').length} <span className="kpi-sub">Pending Moves</span></div>
          <button className="kpi-action-btn" onClick={handleDispatchNewMove}>+ Dispatch Spotter Move</button>
        </div>
      </div>

      {/* Main Grid: Yard Map (Left) + Detention & Work Orders (Right) */}
      <div className="main-grid">
        {/* Visual Yard & Dock Map */}
        <section className="card yard-map-card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3>Interactive Facility Dock & Yard Layout</h3>
              <p className="card-desc">Click any dock door or drop lot spot to inspect trailer assignment & thermal state.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  type="button"
                  onClick={() => setYardViewMode('BLUEPRINT')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: yardViewMode === 'BLUEPRINT' ? 'var(--accent-cyan)' : 'transparent',
                    color: yardViewMode === 'BLUEPRINT' ? '#000' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  🗺️ 2D Blueprint SVG
                </button>
                <button
                  type="button"
                  onClick={() => setYardViewMode('GRID')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: 'none',
                    background: yardViewMode === 'GRID' ? 'var(--accent-cyan)' : 'transparent',
                    color: yardViewMode === 'GRID' ? '#000' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  ▦ Modular Grid
                </button>
              </div>
              <div className="legend">
                <span className="legend-item"><span className="legend-dot bg-emerald" /> Available</span>
                <span className="legend-item"><span className="legend-dot bg-red" /> Occupied</span>
                <span className="legend-item"><span className="legend-dot bg-amber" /> Reserved</span>
                <span className="legend-item"><span className="legend-dot bg-gray" /> Maint</span>
              </div>
            </div>
          </div>

          {yardViewMode === 'BLUEPRINT' ? (
            <div style={{ padding: '8px 12px' }}>
              <YardMapCanvas
                doors={doors}
                spots={spots}
                jockeyTasks={jockeyTasks}
                detentionClocks={detentionClocks}
                selectedDoorId={selectedDoorId}
                selectedSpotId={selectedSpotId}
                onSelectDoor={(d) => setSelectedDoor(d)}
                onSelectSpot={(s) => setSelectedSpot(s)}
              />
            </div>
          ) : (
            <>
              <div className="dock-doors-section">
                <div className="section-title">NORTH LOADING DOCKS (DOORS 1 – 12)</div>
                <div className="dock-doors-grid">
                  {doors.map((d) => {
                    const isSelected = selectedDoor?.doorId === d.doorId;
                    const statusColor =
                      d.status === 'AVAILABLE'
                        ? 'border-emerald text-emerald'
                        : d.status === 'OCCUPIED'
                        ? 'border-red text-red'
                        : d.status === 'RESERVED'
                        ? 'border-amber text-amber'
                        : 'border-gray text-gray';

                    return (
                      <button
                        key={d.doorId}
                        className={`door-slot ${statusColor} ${isSelected ? 'selected-door' : ''}`}
                        onClick={() => setSelectedDoor(d)}
                      >
                        <div className="door-num">DOOR #{d.doorNumber}</div>
                        <div className="door-type">{d.type}</div>
                        <div className="door-status">{d.status}</div>
                        {d.assignedTrailerId && <div className="door-trailer">{d.assignedTrailerId}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Drop Lot & Staging Section */}
              <div className="drop-lot-section">
                <div className="section-title">SOUTH DROP LOT & STAGING BAYS</div>
                <div className="drop-lot-grid">
                  {spots.map((s) => {
                    const isSelected = selectedSpot?.spotId === s.spotId;
                    return (
                      <div
                        key={s.spotId}
                        className={`spot-slot ${s.status === 'OCCUPIED' ? 'spot-occupied' : 'spot-empty'} ${isSelected ? 'selected-door' : ''}`}
                        onClick={() => setSelectedSpot(s)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="spot-num">{s.spotNumber}</div>
                        <div className="spot-zone">{s.zone.replace('DROP_LOT_', 'LOT-')}</div>
                        <div className="spot-status">{s.status}</div>
                        {s.trailerId && <div className="spot-trailer">{s.trailerId}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Selected Spot Detail Drawer */}
          {selectedSpot && (
            <div className="door-detail-drawer" style={{ borderLeftColor: '#38bdf8' }}>
              <div className="drawer-header">
                <h4>Drop Lot Bay {selectedSpot.spotNumber} — Inspection Details</h4>
                <span className={`badge ${selectedSpot.status === 'EMPTY' ? 'badge-green' : 'badge-cyan'}`}>
                  {selectedSpot.status}
                </span>
              </div>
              <div className="drawer-body">
                <div><strong>Zone:</strong> {selectedSpot.zone}</div>
                <div><strong>Staged Trailer:</strong> {selectedSpot.trailerId || 'None (Open Bay)'}</div>
                <div><strong>Spot ID:</strong> {selectedSpot.spotId}</div>
              </div>
              {selectedSpot.trailerId && (
                <div className="drawer-actions">
                  <button
                    className="btn-primary"
                    style={{ fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => {
                      const availDoor = doors.find(d => d.status === 'AVAILABLE');
                      if (availDoor) {
                        const newOrder = createJockeyMoveOrder(selectedSpot.trailerId!, selectedSpot.spotNumber, `Dock Door #${availDoor.doorNumber}`, 'URGENT');
                        setJockeyTasks(prev => [newOrder, ...prev]);
                        setCheckInNotice(`🚜 Spotter Work Order WO-${newOrder.orderNumber} dispatched: Move ${selectedSpot.trailerId} to Door #${availDoor.doorNumber}`);
                      }
                    }}
                  >
                    🚜 Dispatch Spotter to Nearest Door
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Selected Door Detail Drawer */}
          {selectedDoor && (
            <div className="door-detail-drawer">
              <div className="drawer-header">
                <h4>Dock Door #{selectedDoor.doorNumber} — Inspection Details</h4>
                <span className={`badge ${selectedDoor.status === 'AVAILABLE' ? 'badge-green' : 'badge-red'}`}>
                  {selectedDoor.status}
                </span>
              </div>
              <div className="drawer-body">
                <div><strong>Commodity:</strong> {selectedDoor.type}</div>
                <div><strong>Assigned Trailer:</strong> {selectedDoor.assignedTrailerId || 'None (Open)'}</div>
                <div><strong>Current Pallet Load:</strong> {selectedDoor.currentPalletCount ? `${selectedDoor.currentPalletCount} GMA Pallets` : 'Empty'}</div>
                <div><strong>Est. Clear Time:</strong> {selectedDoor.estimatedClearMinutes} mins remaining</div>
              </div>
              {selectedDoor.assignedTrailerId && (
                <div className="drawer-actions">
                  <a
                    href={buildWarehouseInboundBridgeUrl(
                      {
                        checkInId: 'CHK-AUTO',
                        confirmationNumber: 'CNF-LIVE',
                        driverName: 'Assigned Driver',
                        driverPhone: 'N/A',
                        tractorPlate: 'LIVE',
                        trailerNumber: selectedDoor.assignedTrailerId,
                        carrierDot: '3194012',
                        sealNumber: 'SEAL-OK',
                        sealVerified: true,
                        checkInTimestamp: new Date().toISOString(),
                        assignedDestination: { type: 'DOCK_DOOR', targetId: selectedDoor.doorId },
                      },
                      selectedDoor.doorNumber
                    )}
                    className="btn-bridge"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📦 Bridge to P06 Inbound Putaway ↗
                  </a>
                  <a
                    href={buildCarrierVettingBridgeUrl('3194012', 'Polar Express Logistics LLC')}
                    className="btn-bridge"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🛡️ Audit Carrier in P08 ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Detention Clocks & Yard Jockey Dispatch */}
        <div className="right-col">
          {/* Live Detention Clocks */}
          <section className="card">
            <div className="card-header">
              <h3>Live Carrier Detention Radar</h3>
              <span className="badge badge-purple">2-Hr Free Time</span>
            </div>
            <div className="detention-list">
              {detentionClocks.map((c) => {
                const pct = Math.min(100, Math.round((c.elapsedMinutes / c.freeTimeMinutes) * 100));
                return (
                  <div key={c.trailerNumber} className={`detention-item ${c.isDetained ? 'detained-alert' : ''}`}>
                    <div className="detention-head">
                      <div>
                        <strong>{c.trailerNumber}</strong>
                        <div className="carrier-sub">{c.carrierName}</div>
                      </div>
                      <div className="detention-badge">
                        {c.isDetained ? (
                          <span className="badge badge-red">+${c.detentionChargeUsd} ({c.detentionHoursBilled}h)</span>
                        ) : (
                          <span className="badge badge-green">{c.remainingMinutes}m Free</span>
                        )}
                      </div>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${c.isDetained ? 'bg-red' : pct > 75 ? 'bg-amber' : 'bg-emerald'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="detention-foot">
                      <span>Elapsed: {c.elapsedMinutes} mins</span>
                      <span>Rate: ${c.hourlyRateUsd}/hr</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Yard Jockey Work Orders */}
          <section className="card">
            <div className="card-header">
              <h3>Yard Jockey Task Dispatcher</h3>
              <span className="badge badge-cyan">{jockeyTasks.filter((t) => t.status === 'PENDING').length} Pending</span>
            </div>
            <div className="jockey-list">
              {jockeyTasks.map((t) => (
                <div key={t.orderId} className={`jockey-item ${t.status === 'COMPLETED' ? 'task-done' : ''}`}>
                  <div className="jockey-head">
                    <span className="task-order">{t.orderNumber}</span>
                    <span className={`priority-tag priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  </div>
                  <div className="jockey-move">
                    <strong>{t.trailerNumber}</strong>
                    <div className="move-arrow">{t.sourceLocation} ➔ {t.targetLocation}</div>
                  </div>
                  <div className="jockey-actions">
                    <span className="task-status">Status: {t.status}</span>
                    {t.status !== 'COMPLETED' && (
                      <button className="btn-small" onClick={() => handleCompleteJockeyTask(t.orderId)}>
                        Mark Moved ✓
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
      </main>

      {/* Driver Fast Gate Check-In & Gate Pass Kiosk */}
      <GuardShackKioskModal
        isOpen={showCheckInModal}
        onClose={() => setShowCheckInModal(false)}
        currentDoors={doors}
        currentSpots={spots}
        onSuccessfulGateIn={handleSuccessfulGateIn}
      />
    </div>
  );
}
