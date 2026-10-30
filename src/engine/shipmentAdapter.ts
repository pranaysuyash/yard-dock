import { INITIAL_DOCK_DOORS } from './yardEngine';
import type { DockDoor, DoorCommodityType } from './types';
import type { FlowResources, Shipment, ShipmentAdapter, StageResult } from '../suite/types';

export function requiredDoorType(shipment: Shipment): DoorCommodityType | null {
  const asset = shipment.results.asset;
  if (asset && (!asset.ok || asset.inputRevision !== shipment.inputRevision || asset.details.equipmentId !== shipment.input.equipmentId)) return null;
  const native = asset?.details.nativeVehicle as { id?: string; subtype?: string } | undefined;
  if (asset && Object.hasOwn(asset.details, 'nativeVehicle') && (!native || typeof native !== 'object')) return null;
  // Native specifications own equipment identity. Step deck and other subtypes
  // have no declared facility-door policy and cannot borrow dry-van eligibility.
  const type: DoorCommodityType | null = native
    ? native.id === shipment.input.equipmentId ? ({ dry_van_53: 'DRY_VAN', reefer_53: 'REEFER', flatbed_48: 'FLATBED' } as Record<string, DoorCommodityType>)[native.subtype ?? ''] ?? null : null
    : ({ 'dry-van-53': 'DRY_VAN', 'reefer-53': 'REEFER', 'flatbed-48': 'FLATBED' } as Record<string, DoorCommodityType>)[shipment.input.equipmentId] ?? null;
  if (shipment.input.units.some(unit => unit.temperatureClass !== 'ambient') && type !== 'REEFER') return null;
  return type;
}

export function doorEligibility(shipment: Shipment, door: DockDoor, resources: FlowResources | null): string {
  if (!resources) return 'Shared reservations are unavailable. Refresh the shipment connection.';
  const required = requiredDoorType(shipment);
  if (!required) return 'Equipment has no supported declared dock compatibility. Review the current Asset Studio specification and facility policy.';
  if (door.type !== required) return `Requires ${required} compatibility.`;
  if (door.status !== 'AVAILABLE') return `Native facility status is ${door.status.toLowerCase()}.`;
  if (resources.yardDoorIds.includes(door.doorId)) return 'Reserved by another shipment.';
  return '';
}

export function resultForDoorSelection(shipment: Shipment, doors: DockDoor[], selectedDoorId: string, resources: FlowResources | null): StageResult {
  if (!shipment.results.warehouse?.ok || shipment.results.warehouse.inputRevision !== shipment.inputRevision) throw new Error('Publish current receiving locations in Warehouse first.');
  const selected = doors.find(door => door.doorId === selectedDoorId);
  if (!selected) throw new Error('Select a native dock door to review.');
  const reason = doorEligibility(shipment, selected, resources);
  if (reason) throw new Error(reason);
  return {
    ok: true,
    summary: `Reviewed scenario dock ${selected.doorNumber} allocated to ${shipment.input.trailerId}. Gate and seal evidence remain undeclared.`,
    details: { doorId: selected.doorId, doorNumber: selected.doorNumber, doorType: selected.type, requiredDoorType: requiredDoorType(shipment), doorSnapshot: structuredClone(selected), trailerId: shipment.input.trailerId, available: true, facilityId: 'LOCAL-ORIGIN-01', warehouseRecordedAt: shipment.results.warehouse.recordedAt, reviewedRecordRevision: shipment.revision, reservationSnapshot: structuredClone(resources), source: 'reviewed_native_local_scenario' },
  };
}

export const shipmentAdapter: ShipmentAdapter = {
  stage: 'yard',
  evaluate(shipment, resources) {
    const selected = INITIAL_DOCK_DOORS.find(door => !doorEligibility(shipment, door, resources));
    if (!selected) return { ok: false, summary: 'No compatible dock is available; dispatch stays blocked.', details: { facilityId: 'LOCAL-ORIGIN-01', trailerId: shipment.input.trailerId, available: false } };
    return resultForDoorSelection(shipment, INITIAL_DOCK_DOORS, selected.doorId, resources);
  },
};
