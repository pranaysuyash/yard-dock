/**
 * Core Logic Engine for Product 07: Yard & Dock Management System (YMS).
 */

import {
  DockDoor,
  YardSpot,
  TrailerAsset,
  CarrierAppointment,
  GateCheckInRecord,
  DetentionClock,
  JockeyWorkOrder,
  DoorCommodityType,
} from './types';

export const INITIAL_DOCK_DOORS: DockDoor[] = [
  { doorId: 'DOOR-01', doorNumber: 1, type: 'REEFER', status: 'OCCUPIED', assignedTrailerId: 'TR-7701', currentPalletCount: 26, estimatedClearMinutes: 25 },
  { doorId: 'DOOR-02', doorNumber: 2, type: 'REEFER', status: 'AVAILABLE', estimatedClearMinutes: 0 },
  { doorId: 'DOOR-03', doorNumber: 3, type: 'REEFER', status: 'RESERVED', estimatedClearMinutes: 45 },
  { doorId: 'DOOR-04', doorNumber: 4, type: 'REEFER', status: 'AVAILABLE', estimatedClearMinutes: 0 },
  { doorId: 'DOOR-05', doorNumber: 5, type: 'DRY_VAN', status: 'OCCUPIED', assignedTrailerId: 'TR-8842', currentPalletCount: 30, estimatedClearMinutes: 15 },
  { doorId: 'DOOR-06', doorNumber: 6, type: 'DRY_VAN', status: 'AVAILABLE', estimatedClearMinutes: 0 },
  { doorId: 'DOOR-07', doorNumber: 7, type: 'DRY_VAN', status: 'OCCUPIED', assignedTrailerId: 'TR-9104', currentPalletCount: 24, estimatedClearMinutes: 40 },
  { doorId: 'DOOR-08', doorNumber: 8, type: 'DRY_VAN', status: 'AVAILABLE', estimatedClearMinutes: 0 },
  { doorId: 'DOOR-09', doorNumber: 9, type: 'DRY_VAN', status: 'AVAILABLE', estimatedClearMinutes: 0 },
  { doorId: 'DOOR-10', doorNumber: 10, type: 'DRY_VAN', status: 'MAINTENANCE', estimatedClearMinutes: 180 },
  { doorId: 'DOOR-11', doorNumber: 11, type: 'FLATBED', status: 'AVAILABLE', estimatedClearMinutes: 0 },
  { doorId: 'DOOR-12', doorNumber: 12, type: 'FLATBED', status: 'OCCUPIED', assignedTrailerId: 'TR-4409', currentPalletCount: 18, estimatedClearMinutes: 30 },
];

export const INITIAL_YARD_SPOTS: YardSpot[] = [
  { spotId: 'SPOT-A01', spotNumber: 'A-01', zone: 'DROP_LOT_A', status: 'OCCUPIED', trailerId: 'TR-6112' },
  { spotId: 'SPOT-A02', spotNumber: 'A-02', zone: 'DROP_LOT_A', status: 'EMPTY' },
  { spotId: 'SPOT-A03', spotNumber: 'A-03', zone: 'DROP_LOT_A', status: 'EMPTY' },
  { spotId: 'SPOT-A04', spotNumber: 'A-04', zone: 'DROP_LOT_A', status: 'OCCUPIED', trailerId: 'TR-5531' },
  { spotId: 'SPOT-B01', spotNumber: 'B-01', zone: 'DROP_LOT_B', status: 'EMPTY' },
  { spotId: 'SPOT-B02', spotNumber: 'B-02', zone: 'DROP_LOT_B', status: 'EMPTY' },
  { spotId: 'SPOT-B03', spotNumber: 'B-03', zone: 'DROP_LOT_B', status: 'OCCUPIED', trailerId: 'TR-7720' },
  { spotId: 'SPOT-B04', spotNumber: 'B-04', zone: 'DROP_LOT_B', status: 'EMPTY' },
  { spotId: 'SPOT-S01', spotNumber: 'STG-1', zone: 'STAGING', status: 'EMPTY' },
  { spotId: 'SPOT-S02', spotNumber: 'STG-2', zone: 'STAGING', status: 'OCCUPIED', trailerId: 'TR-9903' },
  { spotId: 'SPOT-INS', spotNumber: 'INSP-1', zone: 'INSPECTION', status: 'EMPTY' },
  { spotId: 'SPOT-OUT', spotNumber: 'OUT-01', zone: 'OUTBOUND_READY', status: 'OCCUPIED', trailerId: 'TR-1029' },
];

export const INITIAL_TRAILERS: TrailerAsset[] = [
  {
    trailerId: 'TR-7701',
    trailerNumber: 'TLR-7701-RF',
    carrierName: 'Polar Express Logistics LLC',
    carrierDot: '3194012',
    type: 'REEFER',
    cargoStatus: 'UNLOADING',
    sealNumber: 'SEAL-994182',
    isSealIntact: true,
    tempSetpointF: -10,
    currentTempF: -9.8,
    currentLocation: { type: 'DOCK_DOOR', locationId: 'DOOR-01' },
  },
  {
    trailerId: 'TR-8842',
    trailerNumber: 'TLR-8842-DV',
    carrierName: 'Keystone Logistics Transport Inc',
    carrierDot: '2981440',
    type: 'DRY_VAN',
    cargoStatus: 'UNLOADING',
    sealNumber: 'SEAL-710245',
    isSealIntact: true,
    currentLocation: { type: 'DOCK_DOOR', locationId: 'DOOR-05' },
  },
  {
    trailerId: 'TR-6112',
    trailerNumber: 'TLR-6112-DV',
    carrierName: 'Apex Freight Lines Corp',
    carrierDot: '1849201',
    type: 'DRY_VAN',
    cargoStatus: 'LOADED_INBOUND',
    sealNumber: 'SEAL-883011',
    isSealIntact: true,
    currentLocation: { type: 'YARD_SPOT', locationId: 'SPOT-A01' },
  },
];

export const INITIAL_APPOINTMENTS: CarrierAppointment[] = [
  {
    appointmentId: 'APT-1001',
    confirmationNumber: 'CNF-89021',
    carrierName: 'Apex Freight Lines Corp',
    carrierDot: '1849201',
    scheduledTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    doorTypeRequired: 'DRY_VAN',
    poNumbers: ['PO-88201', 'PO-88202'],
    palletCount: 26,
    status: 'CHECKED_IN',
    assignedDoorNumber: 6,
  },
  {
    appointmentId: 'APT-1002',
    confirmationNumber: 'CNF-91044',
    carrierName: 'Polar Express Logistics LLC',
    carrierDot: '3194012',
    scheduledTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
    doorTypeRequired: 'REEFER',
    poNumbers: ['PO-90411'],
    palletCount: 24,
    status: 'SCHEDULED',
    assignedDoorNumber: 2,
  },
  {
    appointmentId: 'APT-1003',
    confirmationNumber: 'CNF-77409',
    carrierName: 'Horizon Transport Services',
    carrierDot: '3419082',
    scheduledTime: new Date(Date.now() + 120 * 60 * 1000).toISOString(),
    doorTypeRequired: 'DRY_VAN',
    poNumbers: ['PO-99120'],
    palletCount: 28,
    status: 'SCHEDULED',
  },
];

export const INITIAL_JOCKEY_TASKS: JockeyWorkOrder[] = [
  {
    orderId: 'JCK-201',
    orderNumber: 'WO-801',
    trailerNumber: 'TLR-6112-DV',
    sourceLocation: 'Drop Lot A-01',
    targetLocation: 'Dock Door #6',
    priority: 'URGENT',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    orderId: 'JCK-202',
    orderNumber: 'WO-802',
    trailerNumber: 'TLR-1029-DV',
    sourceLocation: 'Dock Door #9',
    targetLocation: 'Outbound Ready 01',
    priority: 'STANDARD',
    status: 'IN_PROGRESS',
    assignedHostler: 'Hostler Unit 03 (Mike R.)',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
];

/**
 * Assigns optimal available dock door matching the trailer commodity type.
 */
export function assignOptimalDockDoor(doors: DockDoor[], commodityType: DoorCommodityType): DockDoor | null {
  const matchingAvailable = doors.filter((d) => d.type === commodityType && d.status === 'AVAILABLE');
  if (matchingAvailable.length === 0) return null;
  return matchingAvailable.sort((a, b) => a.doorNumber - b.doorNumber)[0];
}

/**
 * Calculates real-time detention clock parameters based on gate-in timestamp.
 */
export function calculateDetentionClock(
  trailerNumber: string,
  carrierName: string,
  gateInTimestamp: string,
  freeTimeMinutes = 120,
  hourlyRateUsd = 85.0,
  currentTimeMs: number = Date.now()
): DetentionClock {
  const gateInMs = new Date(gateInTimestamp).getTime();
  const elapsedMs = Math.max(0, currentTimeMs - gateInMs);
  const elapsedMinutes = Math.floor(elapsedMs / (60 * 1000));
  const remainingMinutes = Math.max(0, freeTimeMinutes - elapsedMinutes);
  const isDetained = elapsedMinutes > freeTimeMinutes;

  let detentionHoursBilled = 0;
  let detentionChargeUsd = 0;

  if (isDetained) {
    const overtimeMinutes = elapsedMinutes - freeTimeMinutes;
    // Billed in 15-minute increments (0.25 hours) rounded up
    const increments = Math.ceil(overtimeMinutes / 15);
    detentionHoursBilled = increments * 0.25;
    detentionChargeUsd = Math.round(detentionHoursBilled * hourlyRateUsd * 100) / 100;
  }

  return {
    trailerNumber,
    carrierName,
    gateInTimestamp,
    freeTimeMinutes,
    elapsedMinutes,
    remainingMinutes,
    isDetained,
    detentionHoursBilled,
    hourlyRateUsd,
    detentionChargeUsd,
  };
}

/**
 * Generates a gate check-in record and destination allocation.
 */
export function processGateCheckIn(
  confirmationNumber: string,
  driverName: string,
  driverPhone: string,
  tractorPlate: string,
  trailerNumber: string,
  carrierDot: string,
  sealNumber: string,
  sealVerified: boolean,
  commodityType: DoorCommodityType,
  doors: DockDoor[],
  spots: YardSpot[]
): {
  record: GateCheckInRecord;
  allocatedDoor?: DockDoor;
  allocatedSpot?: YardSpot;
} {
  const availableDoor = assignOptimalDockDoor(doors, commodityType);

  let targetDestination: { type: 'DOCK_DOOR' | 'DROP_LOT'; targetId: string };
  let allocatedDoor: DockDoor | undefined;
  let allocatedSpot: YardSpot | undefined;

  if (availableDoor) {
    targetDestination = { type: 'DOCK_DOOR', targetId: availableDoor.doorId };
    allocatedDoor = availableDoor;
  } else {
    const emptySpot = spots.find((s) => s.status === 'EMPTY');
    if (!emptySpot) throw new Error('Yard capacity exhausted. Hold at gate and request an authorized alternative.');
    targetDestination = { type: 'DROP_LOT', targetId: emptySpot.spotId };
    allocatedSpot = emptySpot;
  }

  const record: GateCheckInRecord = {
    checkInId: `CHK-${Date.now().toString().slice(-6)}`,
    confirmationNumber,
    driverName,
    driverPhone,
    tractorPlate,
    trailerNumber,
    carrierDot,
    sealNumber,
    sealVerified,
    checkInTimestamp: new Date().toISOString(),
    assignedDestination: targetDestination,
  };

  return { record, allocatedDoor, allocatedSpot };
}

/**
 * Creates a new Yard Jockey Move Work Order.
 */
export function createJockeyMoveOrder(
  trailerNumber: string,
  sourceLocation: string,
  targetLocation: string,
  priority: 'URGENT' | 'STANDARD' | 'LOW' = 'STANDARD'
): JockeyWorkOrder {
  return {
    orderId: `JCK-${Date.now().toString().slice(-6)}`,
    orderNumber: `WO-${Math.floor(100 + Math.random() * 900)}`,
    trailerNumber,
    sourceLocation,
    targetLocation,
    priority,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };
}
