import { describe, it, expect } from 'vitest';
import {
  INITIAL_DOCK_DOORS,
  INITIAL_YARD_SPOTS,
  calculateDetentionClock,
} from '../src/engine/yardEngine';

describe('Yard & Dock Blueprint Map Data Structure', () => {
  it('initializes 12 loading dock doors covering all required commodity types', () => {
    expect(INITIAL_DOCK_DOORS.length).toBe(12);
    const reeferDoors = INITIAL_DOCK_DOORS.filter((d) => d.type === 'REEFER');
    const dryVanDoors = INITIAL_DOCK_DOORS.filter((d) => d.type === 'DRY_VAN');
    const flatbedDoors = INITIAL_DOCK_DOORS.filter((d) => d.type === 'FLATBED');

    expect(reeferDoors.length).toBe(4);
    expect(dryVanDoors.length).toBe(6);
    expect(flatbedDoors.length).toBe(2);
  });

  it('correctly tracks drop lot spots and staged assets', () => {
    expect(INITIAL_YARD_SPOTS.length).toBe(12);
    const occupied = INITIAL_YARD_SPOTS.filter((s) => s.status === 'OCCUPIED');
    expect(occupied.length).toBeGreaterThan(0);
    occupied.forEach((s) => {
      expect(s.trailerId).toBeDefined();
    });
  });

  it('detects trailers approaching detention threshold within 20 minutes', () => {
    // 105 minutes elapsed out of 120 minutes free time = 15 minutes remaining
    const clock = calculateDetentionClock(
      'TLR-TEST-01',
      'Acme Carrier',
      new Date(Date.now() - 105 * 60 * 1000).toISOString(),
      120
    );
    expect(clock.isDetained).toBe(false);
    expect(clock.remainingMinutes).toBeLessThanOrEqual(20);
    expect(clock.remainingMinutes).toBeGreaterThan(0);
  });

  it('calculates overtime detention surcharge accurately for detained trailers', () => {
    // 150 minutes elapsed out of 120 free time = 30 minutes overtime (2 x 15-min increments = 0.5 hours @ $85/hr = $42.50)
    const clock = calculateDetentionClock(
      'TLR-TEST-OVERTIME',
      'Overtime Express',
      new Date(Date.now() - 150 * 60 * 1000).toISOString(),
      120,
      85.0
    );
    expect(clock.isDetained).toBe(true);
    expect(clock.detentionHoursBilled).toBe(0.5);
    expect(clock.detentionChargeUsd).toBe(42.5);
  });
});
