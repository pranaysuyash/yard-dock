import { describe, it, expect } from 'vitest';
import {
  INITIAL_DOCK_DOORS,
  INITIAL_YARD_SPOTS,
  assignOptimalDockDoor,
  calculateDetentionClock,
  processGateCheckIn,
  createJockeyMoveOrder,
} from '../src/engine/yardEngine';
import {
  buildWarehouseInboundBridgeUrl,
  buildCarrierVettingBridgeUrl,
  buildCommandCenterYardBridgeUrl,
} from '../src/engine/bridges';
import { platformBus } from '../src/engine/platformBus';

describe('Product 07 — Yard & Dock Management Engine', () => {
  describe('Dock Door Optimization & Assignment', () => {
    it('accurately assigns the first available REEFER door for cold-chain freight', () => {
      const door = assignOptimalDockDoor(INITIAL_DOCK_DOORS, 'REEFER');
      expect(door).not.toBeNull();
      expect(door?.type).toBe('REEFER');
      expect(door?.doorNumber).toBe(2); // Door 1 is occupied, Door 2 is first available
    });

    it('accurately assigns the first available DRY_VAN door', () => {
      const door = assignOptimalDockDoor(INITIAL_DOCK_DOORS, 'DRY_VAN');
      expect(door).not.toBeNull();
      expect(door?.type).toBe('DRY_VAN');
      expect(door?.doorNumber).toBe(6); // Door 5 is occupied, Door 6 is first available
    });

    it('returns null when all doors of a specific commodity type are occupied or maintenance', () => {
      const fullDoors = INITIAL_DOCK_DOORS.map((d) => (d.type === 'FLATBED' ? { ...d, status: 'OCCUPIED' as const } : d));
      const door = assignOptimalDockDoor(fullDoors, 'FLATBED');
      expect(door).toBeNull();
    });
  });

  describe('Carrier Detention Clock & Free Time Calculations', () => {
    it('accurately calculates free time remaining when within 120-minute window', () => {
      const gateIn = new Date(Date.now() - 45 * 60 * 1000).toISOString(); // 45 mins ago
      const clock = calculateDetentionClock('TLR-1001', 'Test Logistics', gateIn, 120, 85.0);
      expect(clock.isDetained).toBe(false);
      expect(clock.elapsedMinutes).toBe(45);
      expect(clock.remainingMinutes).toBe(75);
      expect(clock.detentionChargeUsd).toBe(0);
    });

    it('flags carrier as detained and calculates 15-minute incremental penalty charges', () => {
      // 155 minutes elapsed (35 minutes over the 120-minute free time window)
      // 35 mins / 15 = 2.33 -> 3 increments of 15 min = 0.75 hours billed
      // 0.75 hours * $85.00/hr = $63.75
      const gateIn = new Date(Date.now() - 155 * 60 * 1000).toISOString();
      const clock = calculateDetentionClock('TLR-7701-RF', 'Polar Express', gateIn, 120, 85.0);
      expect(clock.isDetained).toBe(true);
      expect(clock.elapsedMinutes).toBe(155);
      expect(clock.remainingMinutes).toBe(0);
      expect(clock.detentionHoursBilled).toBe(0.75);
      expect(clock.detentionChargeUsd).toBe(63.75);
    });
  });

  describe('Gate Arrival & Check-In Processing', () => {
    it('creates structured check-in record and allocates dock door when available', () => {
      const result = processGateCheckIn(
        'CNF-55012',
        'Sarah Jenkins',
        '(555) 234-5678',
        'TX-9901-TR',
        'TLR-9901-RF',
        '3194012',
        'SEAL-998822',
        true,
        'REEFER',
        INITIAL_DOCK_DOORS,
        INITIAL_YARD_SPOTS
      );

      expect(result.record.confirmationNumber).toBe('CNF-55012');
      expect(result.record.driverName).toBe('Sarah Jenkins');
      expect(result.record.sealVerified).toBe(true);
      expect(result.record.assignedDestination.type).toBe('DOCK_DOOR');
      expect(result.allocatedDoor?.doorNumber).toBe(2);
    });

    it('allocates drop-lot spot when matching dock doors are unavailable', () => {
      const fullDoors = INITIAL_DOCK_DOORS.map((d) => ({ ...d, status: 'OCCUPIED' as const }));
      const result = processGateCheckIn(
        'CNF-55013',
        'John Doe',
        '(555) 111-2222',
        'OH-1234-TR',
        'TLR-4412-DV',
        '1849201',
        'SEAL-112233',
        true,
        'DRY_VAN',
        fullDoors,
        INITIAL_YARD_SPOTS
      );

      expect(result.record.assignedDestination.type).toBe('DROP_LOT');
      expect(result.allocatedSpot).toBeDefined();
    });
  });

  describe('Yard Jockey Move Work Orders', () => {
    it('creates pending move order with priority assignment', () => {
      const order = createJockeyMoveOrder('TLR-8842-DV', 'Drop Lot A-02', 'Dock Door #8', 'URGENT');
      expect(order.trailerNumber).toBe('TLR-8842-DV');
      expect(order.sourceLocation).toBe('Drop Lot A-02');
      expect(order.targetLocation).toBe('Dock Door #8');
      expect(order.priority).toBe('URGENT');
      expect(order.status).toBe('PENDING');
    });
  });

  describe('Cross-Project Integration Bridges', () => {
    it('constructs verified URL for Product 06 Warehouse Inbound Putaway bridge', () => {
      const record = {
        checkInId: 'CHK-99120',
        confirmationNumber: 'CNF-8812',
        driverName: 'Driver',
        driverPhone: '123',
        tractorPlate: 'PLATE',
        trailerNumber: 'TLR-5501-DV',
        carrierDot: '1849201',
        sealNumber: 'SEAL-OK',
        sealVerified: true,
        checkInTimestamp: new Date().toISOString(),
        assignedDestination: { type: 'DOCK_DOOR' as const, targetId: 'DOOR-06' },
      };
      const url = buildWarehouseInboundBridgeUrl(record, 6);
      expect(url).toContain('http://localhost:5178/?source=product-07-yard-dock');
      expect(url).toContain('trailerNumber=TLR-5501-DV');
      expect(url).toContain('doorNumber=6');
      expect(url).toContain('sealVerified=true');
    });

    it('constructs verified URL for Product 08 Carrier Trust pre-vetting', () => {
      const url = buildCarrierVettingBridgeUrl('3194012', 'Polar Express');
      expect(url).toContain('http://localhost:5180/?source=product-07-yard-dock');
      expect(url).toContain('dotNumber=3194012');
      expect(url).toContain('action=gate_pre_clearance');
    });

    it('constructs verified URL for Command Center Portal yard capacity telemetry', () => {
      const url = buildCommandCenterYardBridgeUrl(8, 12);
      expect(url).toContain('http://localhost:5170/?source=product-07-yard-dock');
      expect(url).toContain('doorsOccupied=8');
      expect(url).toContain('totalDoors=12');
      expect(url).toContain('dockUtilizationPct=67');
    });
  });

  describe('Platform Event Bus Integration', () => {
    it('publishes and receives TRAILER_GATED_IN events across the platform bus', () => {
      let receivedTrailer: string | null = null;
      const unsubscribe = platformBus.subscribe('TRAILER_GATED_IN', (payload) => {
        receivedTrailer = payload.trailerNumber;
      });

      platformBus.publish('TRAILER_GATED_IN', {
        checkInId: 'CHK-TEST-01',
        trailerNumber: 'TLR-BUS-TEST',
        carrierDot: '1849201',
        doorNumber: 4,
        timestamp: new Date().toISOString(),
      });

      expect(receivedTrailer).toBe('TLR-BUS-TEST');
      unsubscribe();
    });
  });
});
