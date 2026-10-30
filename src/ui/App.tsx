import React, { useState, useEffect } from 'react';
import { SuiteDock } from './SuiteDock';
import {
  INITIAL_DOCK_DOORS,
  INITIAL_YARD_SPOTS,
  INITIAL_JOCKEY_TASKS,
  calculateDetentionClock,
  processGateCheckIn,
  createJockeyMoveOrder,
} from '../engine/yardEngine';
import { DockDoor, YardSpot, JockeyWorkOrder, DetentionClock, DoorCommodityType } from '../engine/types';
import { buildWarehouseInboundBridgeUrl, buildCarrierVettingBridgeUrl } from '../engine/bridges';
import { platformBus } from '../engine/platformBus';
import { DockAllocationTask } from './DockAllocationTask';
import { YardMapCanvas } from './YardMapCanvas';

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

  // Gate Check-in Modal Form state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [driverName, setDriverName] = useState('Carlos Gomez');
  const [driverPhone, setDriverPhone] = useState('(312) 555-8910');
  const [tractorPlate, setTractorPlate] = useState('IL-8924-TR');
  const [trailerNumber, setTrailerNumber] = useState('TLR-3991-RF');
  const [carrierDot, setCarrierDot] = useState('3194012');
  const [carrierName, setCarrierName] = useState('Polar Express Logistics LLC');
  const [sealNumber, setSealNumber] = useState('SEAL-448201');
  const [commodityType, setCommodityType] = useState<DoorCommodityType>('REEFER');
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

  const handleGateCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    try {
    const { record, allocatedDoor, allocatedSpot } = processGateCheckIn(
      `CNF-${Math.floor(10000 + Math.random() * 90000)}`,
      driverName,
      driverPhone,
      tractorPlate,
      trailerNumber,
      carrierDot,
      sealNumber,
      false,
      commodityType,
      doors,
      spots
    );

    if (allocatedDoor) {
      setDoors((prev) =>
        prev.map((d) =>
          d.doorId === allocatedDoor.doorId
            ? { ...d, status: 'OCCUPIED', assignedTrailerId: trailerNumber, currentPalletCount: 26, estimatedClearMinutes: 60 }
            : d
        )
      );
      setCheckInNotice(`✅ Check-In Approved! Assigned to DOCK DOOR #${allocatedDoor.doorNumber} (${allocatedDoor.type})`);
      platformBus.publish('DOCK_DOOR_SPOTTED', {
        doorNumber: allocatedDoor.doorNumber,
        trailerNumber,
        commodityType,
        timestamp: new Date().toISOString(),
      });
    } else if (allocatedSpot) {
      setSpots((prev) =>
        prev.map((s) => (s.spotId === allocatedSpot.spotId ? { ...s, status: 'OCCUPIED', trailerId: trailerNumber } : s))
      );
      setCheckInNotice(`⚠️ All ${commodityType} Doors Full. Staged to DROP LOT ${allocatedSpot.spotNumber}`);
    }

    // Add new detention clock
    setDetentionClocks((prev) => [
      calculateDetentionClock(trailerNumber, carrierName, record.checkInTimestamp),
      ...prev,
    ]);

    platformBus.publish('TRAILER_GATED_IN', {
      checkInId: record.checkInId,
      trailerNumber,
      carrierDot,
      doorNumber: allocatedDoor?.doorNumber,
      spotNumber: allocatedSpot?.spotNumber,
      timestamp: record.checkInTimestamp,
    });

    setShowCheckInModal(false);
    } catch (error) {
      setCheckInNotice(error instanceof Error ? error.message : 'Gate check-in failed. Please retry.');
    }
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

      {/* Gate Check-In Modal */}
      {showCheckInModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Scenario Driver Gate Arrival & Manual Check-In</h3>
              <button className="modal-close" onClick={() => setShowCheckInModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGateCheckIn} className="modal-form">
              <div className="form-row">
                <label>
                  Driver Full Name:
                  <input type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} required />
                </label>
                <label>
                  Driver Cell Phone:
                  <input type="text" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Tractor Plate (manual):
                  <input type="text" value={tractorPlate} onChange={(e) => setTractorPlate(e.target.value)} required />
                </label>
                <label>
                  Trailer Unit Number:
                  <input type="text" value={trailerNumber} onChange={(e) => setTrailerNumber(e.target.value)} required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Carrier DOT:
                  <input type="text" value={carrierDot} onChange={(e) => setCarrierDot(e.target.value)} required />
                </label>
                <label>
                  Carrier Name:
                  <input type="text" value={carrierName} onChange={(e) => setCarrierName(e.target.value)} required />
                </label>
              </div>

              <div className="form-row">
                <label>
                  Commodity Classification:
                  <select value={commodityType} onChange={(e) => setCommodityType(e.target.value as DoorCommodityType)}>
                    <option value="REEFER">Refrigerated / Cold-Chain (-10°F to 34°F)</option>
                    <option value="DRY_VAN">Standard Dry Van Freight</option>
                    <option value="FLATBED">Flatbed / Specialized Unload</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Security Seal Number:
                  <input type="text" value={sealNumber} onChange={(e) => setSealNumber(e.target.value)} required />
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCheckInModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Record Scenario Gate-In ➔</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
