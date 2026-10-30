import { describe, expect, it } from 'vitest';
import { INITIAL_DOCK_DOORS, INITIAL_YARD_SPOTS, processGateCheckIn } from '../src/engine/yardEngine';

describe('Exhausted yard capacity', () => {
  it('refuses entry when every door and yard spot is occupied', () => {
    const doors = INITIAL_DOCK_DOORS.map(d => ({ ...d, status: 'OCCUPIED' as const }));
    const spots = INITIAL_YARD_SPOTS.map(s => ({ ...s, status: 'OCCUPIED' as const, trailerId: 'EXISTING' }));
    expect(() => processGateCheckIn('TEST', 'Driver', '555', 'TEST', 'NEW', '000', 'SEAL', true, 'REEFER', doors, spots)).toThrow(/capacity/i);
    expect(spots.every(s => s.trailerId === 'EXISTING')).toBe(true);
  });

  it('refuses entry when no yard locations are configured', () => {
    expect(() => processGateCheckIn('TEST', 'Driver', '555', 'TEST', 'NEW', '000', 'SEAL', true, 'REEFER', [], [])).toThrow(/capacity/i);
  });
});
