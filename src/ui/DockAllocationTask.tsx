import { useMemo, useState } from 'react';
import type { DockDoor } from '../engine/types';
import { doorEligibility, requiredDoorType, resultForDoorSelection } from '../engine/shipmentAdapter';
import { useShipmentSession } from '../suite/ShipmentSession';
import { useShipmentDraft } from '../suite/useShipmentDraft';

export function DockAllocationTask({ doors, selectedDoor, onSelect }: { doors: DockDoor[]; selectedDoor: DockDoor | null; onSelect: (door: DockDoor | null) => void }) {
  const session = useShipmentSession();
  const [notice, setNotice] = useState('');
  const draft = useShipmentDraft({
    value: selectedDoor?.doorId ?? '',
    importValue: shipment => String(shipment.results.yard?.details.doorId ?? doors.find(door => !doorEligibility(shipment, door, session?.resources ?? null))?.doorId ?? ''),
    applyValue: id => onSelect(doors.find(door => door.doorId === id) ?? null),
  });
  const review = useMemo(() => {
    if (!session?.shipment) return { error: '', result: null };
    try { return { error: '', result: resultForDoorSelection(session.shipment, doors, selectedDoor?.doorId ?? '', session.resources) }; }
    catch (error) { return { result: null, error: error instanceof Error ? error.message : 'Door cannot be allocated.' }; }
  }, [session?.shipment, session?.resources, doors, selectedDoor]);
  if (!session?.selectedId) return draft.detached ? <p className="execution-task-note">Detached dock selection retained for independent facility inspection.</p> : null;
  const shipment = session.shipment;
  if (!shipment) return <section className="execution-task"><h2>Shipment dock allocation</h2><p>Loading the selected shipment.</p></section>;
  return <section className="execution-task" aria-labelledby="dock-task-title">
    <div className="execution-task-heading"><div><span className="execution-eyebrow">SHIPMENT PLANNING · LOCAL ORIGIN FACILITY</span><h2 id="dock-task-title">Review dock allocation</h2></div><button onClick={() => session.inspect('stage:yard')}>Inspect saved dock allocation</button></div>
    <p><strong>{shipment.input.trailerId}</strong> · required door type <strong>{requiredDoorType(shipment) ?? 'Unresolved: equipment/facility policy required'}</strong> · {shipment.input.units.length} identified units</p>
    <p className="execution-task-note">Choose a compatible available door below or on the native facility map. Publishing saves this reviewed selection against current shared reservations. Gate check-in, seal verification and detention remain independent scenario tools.</p>
    {draft.incoming && <p role="status">Shared planning changed. Your door selection is retained. <button onClick={draft.loadCurrent}>Load current shipment</button></p>}
    <label className="execution-field">Shipment dock door<select value={selectedDoor?.doorId ?? ''} onChange={event => { onSelect(doors.find(door => door.doorId === event.target.value) ?? null); setNotice(''); }}><option value="">Select a door</option>{doors.map(door => { const reason = doorEligibility(shipment, door, session.resources); return <option key={door.doorId} value={door.doorId}>Door {door.doorNumber} · {door.type} · {reason || 'available'}</option>; })}</select></label>
    {selectedDoor && <details><summary>Selected door capacity and source</summary><dl><dt>Door identifier</dt><dd>{selectedDoor.doorId}</dd><dt>Native status</dt><dd>{selectedDoor.status}</dd><dt>Current assigned trailer</dt><dd>{selectedDoor.assignedTrailerId ?? 'None declared'}</dd><dt>Capacity basis</dt><dd>Declared local facility door type and current shipment-service reservations; no physical gate or door observation.</dd></dl></details>}
    {(review.error || draft.error) && <p role="status">{review.error || draft.error}</p>}
    {shipment.status !== 'draft' && <p>Planning is locked after dispatch. The saved allocation remains inspectable.</p>}
    <div className="execution-actions"><button disabled={!draft.canPublish || !review.result || shipment.status !== 'draft'} onClick={async () => { if (!review.result || !draft.basis) return; const next = await session.submit('evaluate', { stage: 'yard', result: review.result }, draft.basis.revision); if (next) { draft.acknowledge(next, selectedDoor?.doorId ?? ''); setNotice(`Saved ${selectedDoor?.doorId} for ${shipment.input.trailerId}.`); } }}>Publish reviewed dock allocation</button><a href={session.productUrl('product-06-warehouse-space-flow')}>Review receiving locations</a><a href={session.productUrl('command-center-portal')}>Review dispatch readiness</a></div>
    {notice && <p role="status">{notice}</p>}
  </section>;
}
