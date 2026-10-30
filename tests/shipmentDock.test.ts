import { describe, expect, it } from 'vitest';
import { doorEligibility, requiredDoorType, resultForDoorSelection } from '../src/engine/shipmentAdapter';
import { INITIAL_DOCK_DOORS } from '../src/engine/yardEngine';
import type { Shipment } from '../src/suite/types';

const resources = { warehouseSlotIds: [] as string[], yardDoorIds: [] as string[] };
function fixture(): Shipment {
  return { revision: 7, inputRevision: 2, input: { units: [{ temperatureClass: 'ambient' }], equipmentId: 'dry-van-53', trailerId: 'TRAILER-A' }, results: { warehouse: { ok: true, inputRevision: 2, recordedAt: '2026-10-22T17:00:00.000Z' } } } as Shipment;
}

describe('Reviewed native door selection', () => {
  it('publishes the exact selected compatible door, receiving dependency and reservation snapshot', () => {
    const shipment = fixture();
    const doors = structuredClone(INITIAL_DOCK_DOORS);
    const available = doors.filter(door => !doorEligibility(shipment, door, resources));
    const selected = available.at(-1)!;
    expect(selected).toBeDefined();
    const result = resultForDoorSelection(shipment, doors, selected.doorId, resources);
    expect(result.ok).toBe(true);
    expect(result.details.doorSnapshot).toEqual(selected);
    expect(result.details.doorId).toBe(selected.doorId);
    expect(result.details.trailerId).toBe('TRAILER-A');
    expect(result.details.warehouseRecordedAt).toBe(shipment.results.warehouse!.recordedAt);
    expect(result.details.reservationSnapshot).toEqual(resources);
    expect(result.details.reviewedRecordRevision).toBe(7);
  });
  it('rejects unknown reservations and an externally reserved selected door', () => {
    const shipment = fixture();
    const door = INITIAL_DOCK_DOORS.find(item => !doorEligibility(shipment, item, resources))!;
    expect(() => resultForDoorSelection(shipment, INITIAL_DOCK_DOORS, door.doorId, null)).toThrow(/reservations/);
    expect(() => resultForDoorSelection(shipment, INITIAL_DOCK_DOORS, door.doorId, { ...resources, yardDoorIds: [door.doorId] })).toThrow(/another shipment/);
  });
  it('rejects occupied or incompatible native doors and unknown selections', () => {
    const shipment = fixture();
    const door = INITIAL_DOCK_DOORS.find(item => !doorEligibility(shipment, item, resources))!;
    expect(() => resultForDoorSelection(shipment, [{ ...door, status: 'OCCUPIED' }], door.doorId, resources)).toThrow(/status/);
    expect(() => resultForDoorSelection(shipment, [{ ...door, type: 'REEFER' }], door.doorId, resources)).toThrow(/DRY_VAN/);
    expect(() => resultForDoorSelection(shipment, INITIAL_DOCK_DOORS, 'UNDECLARED', resources)).toThrow(/Select a native/);
  });
  it('binds allocation to the current receiving plan', () => {
    const shipment = fixture();
    shipment.results.warehouse!.inputRevision--;
    expect(() => resultForDoorSelection(shipment, INITIAL_DOCK_DOORS, 'any', resources)).toThrow(/Warehouse first/);
  });
  it('uses declared equipment and thermal requirements for compatibility', () => {
    const shipment = fixture();
    expect(requiredDoorType(shipment)).toBe('DRY_VAN');
    shipment.input.equipmentId = 'flatbed-48';
    expect(requiredDoorType(shipment)).toBe('FLATBED');
    shipment.input.units[0].temperatureClass = 'chilled';
    expect(requiredDoorType(shipment)).toBeNull();
    shipment.input.equipmentId = 'reefer-53';
    expect(requiredDoorType(shipment)).toBe('REEFER');
  });
  it('uses the exact reviewed subtype for an ambient reefer and an operator-authored flatbed', () => {
    const shipment = fixture();
    shipment.input.equipmentId = 'reefer-53';
    expect(requiredDoorType(shipment)).toBe('REEFER');
    shipment.input.equipmentId = 'custom-carrier-trailer';
    shipment.results.asset = { ok: true, summary: 'Declared custom flatbed fixture', inputRevision: 2, recordedAt: '2026-10-22T17:00:00.000Z', productId: 'product-04-asset-studio', details: { equipmentId: shipment.input.equipmentId, nativeVehicle: { id: shipment.input.equipmentId, subtype: 'flatbed_48' } } };
    expect(requiredDoorType(shipment)).toBe('FLATBED');
    const reeferDoor = INITIAL_DOCK_DOORS.find(door => door.type === 'REEFER')!;
    expect(doorEligibility(shipment, reeferDoor, resources)).toMatch(/FLATBED/);
  });
  it('abstains on step deck, unknown IDs, stale or mismatched equipment rather than inferring a dry van', () => {
    const shipment = fixture();
    for (const id of ['step-deck-48', 'custom-flatbed-unknown', 'unknown']) {
      shipment.input.equipmentId = id;
      expect(requiredDoorType(shipment)).toBeNull();
      expect(doorEligibility(shipment, INITIAL_DOCK_DOORS[0], resources)).toMatch(/facility policy/);
    }
    shipment.input.equipmentId = 'dry-van-53';
    shipment.results.asset = { ok: true, summary: 'Stale equipment fixture', inputRevision: 1, recordedAt: '2026-10-22T17:00:00.000Z', productId: 'product-04-asset-studio', details: { equipmentId: 'dry-van-53' } };
    expect(requiredDoorType(shipment)).toBeNull();
    shipment.results.asset!.inputRevision = 2;
    shipment.results.asset!.details.nativeVehicle = { id: 'other', subtype: 'dry_van_53' };
    expect(requiredDoorType(shipment)).toBeNull();
    shipment.results.asset!.details.nativeVehicle = null;
    expect(requiredDoorType(shipment)).toBeNull();
  });
});
