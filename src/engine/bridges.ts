/**
 * Cross-Project Integration Bridges for Product 07: Yard & Dock Management System.
 */

import { GateCheckInRecord } from './types';

/**
 * Builds inbound warehouse putaway trigger URL for Product 06 (Warehouse Flow · Port 5178).
 */
export function buildWarehouseInboundBridgeUrl(record: GateCheckInRecord, doorNumber: number): string {
  const params = new URLSearchParams({
    source: 'product-07-yard-dock',
    trailerNumber: record.trailerNumber,
    doorNumber: String(doorNumber),
    carrierDot: record.carrierDot,
    sealVerified: String(record.sealVerified),
    checkInId: record.checkInId,
  });
  return `http://localhost:5178/?${params.toString()}`;
}

/**
 * Builds carrier safety vetting URL for Product 08 (Carrier Trust · Port 5180).
 */
export function buildCarrierVettingBridgeUrl(dotNumber: string, carrierName: string): string {
  const params = new URLSearchParams({
    source: 'product-07-yard-dock',
    dotNumber,
    carrierName,
    action: 'gate_pre_clearance',
  });
  return `http://localhost:5180/?${params.toString()}`;
}

/**
 * Builds Command Center Portal yard capacity telemetry bridge URL (Port 5170).
 */
export function buildCommandCenterYardBridgeUrl(doorsOccupied: number, totalDoors: number): string {
  const params = new URLSearchParams({
    source: 'product-07-yard-dock',
    doorsOccupied: String(doorsOccupied),
    totalDoors: String(totalDoors),
    dockUtilizationPct: String(Math.round((doorsOccupied / totalDoors) * 100)),
  });
  return `http://localhost:5170/?${params.toString()}`;
}
