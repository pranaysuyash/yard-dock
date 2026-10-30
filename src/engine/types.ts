/**
 * Domain types for Product 07: Yard & Dock Management System (YMS).
 * Models carrier appointment scheduling, gate check-in & OCR, visual yard slots,
 * dock door assignments, yard jockey task dispatch, and automated detention clocks.
 */

export type DoorCommodityType = 'DRY_VAN' | 'REEFER' | 'FLATBED';
export type DoorStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';

export interface DockDoor {
  doorId: string;
  doorNumber: number;
  type: DoorCommodityType;
  status: DoorStatus;
  assignedTrailerId?: string;
  currentPalletCount?: number;
  estimatedClearMinutes?: number;
}

export type YardZone = 'DROP_LOT_A' | 'DROP_LOT_B' | 'STAGING' | 'INSPECTION' | 'OUTBOUND_READY';
export type SpotStatus = 'EMPTY' | 'OCCUPIED' | 'RESERVED';

export interface YardSpot {
  spotId: string;
  spotNumber: string;
  zone: YardZone;
  status: SpotStatus;
  trailerId?: string;
}

export type TrailerCargoStatus = 'LOADED_INBOUND' | 'UNLOADING' | 'EMPTY' | 'LOADING_OUTBOUND' | 'LOADED_OUTBOUND';

export interface TrailerAsset {
  trailerId: string;
  trailerNumber: string;
  carrierName: string;
  carrierDot: string;
  type: DoorCommodityType;
  cargoStatus: TrailerCargoStatus;
  sealNumber: string;
  isSealIntact: boolean;
  tempSetpointF?: number;
  currentTempF?: number;
  currentLocation: {
    type: 'GATE' | 'YARD_SPOT' | 'DOCK_DOOR';
    locationId: string;
  };
}

export type AppointmentStatus = 'SCHEDULED' | 'CHECKED_IN' | 'AT_DOCK' | 'COMPLETED' | 'MISSED' | 'CANCELLED';

export interface CarrierAppointment {
  appointmentId: string;
  confirmationNumber: string;
  carrierName: string;
  carrierDot: string;
  scheduledTime: string; // ISO 8601 string
  doorTypeRequired: DoorCommodityType;
  poNumbers: string[];
  palletCount: number;
  status: AppointmentStatus;
  assignedDoorNumber?: number;
}

export interface GateCheckInRecord {
  checkInId: string;
  confirmationNumber: string;
  driverName: string;
  driverPhone: string;
  tractorPlate: string;
  trailerNumber: string;
  carrierDot: string;
  sealNumber: string;
  sealVerified: boolean;
  checkInTimestamp: string;
  assignedDestination: {
    type: 'DOCK_DOOR' | 'DROP_LOT';
    targetId: string;
  };
}

export interface DetentionClock {
  trailerNumber: string;
  carrierName: string;
  gateInTimestamp: string;
  freeTimeMinutes: number; // typically 120 mins (2 hrs)
  elapsedMinutes: number;
  remainingMinutes: number;
  isDetained: boolean;
  detentionHoursBilled: number;
  hourlyRateUsd: number; // default $85.00/hr
  detentionChargeUsd: number;
}

export type JockeyTaskPriority = 'URGENT' | 'STANDARD' | 'LOW';
export type JockeyTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface JockeyWorkOrder {
  orderId: string;
  orderNumber: string;
  trailerNumber: string;
  sourceLocation: string;
  targetLocation: string;
  priority: JockeyTaskPriority;
  status: JockeyTaskStatus;
  assignedHostler?: string;
  createdAt: string;
  completedAt?: string;
}

export interface YardFacilityState {
  doors: DockDoor[];
  spots: YardSpot[];
  trailers: TrailerAsset[];
  appointments: CarrierAppointment[];
  gateQueue: GateCheckInRecord[];
  jockeyTasks: JockeyWorkOrder[];
}
