import { describe, it, expect } from 'vitest';
import {
  resolveLocationCoordinate,
  buildYardTrajectory,
  interpolateSpotterPosition,
} from '../src/engine/hostlerSimulation';

describe('Hostler Spotter Truck Simulation Engine', () => {
  describe('Location Resolution', () => {
    it('resolves dock doors D-1 through D-12 to warehouse apron coordinates', () => {
      const d1 = resolveLocationCoordinate('D-1');
      expect(d1.x).toBe(73); // 42 + 0*71 + 31
      expect(d1.y).toBe(135);

      const d3 = resolveLocationCoordinate('D-03');
      expect(d3.x).toBe(73 + 2 * 71); // 215
      expect(d3.y).toBe(135);

      const d12 = resolveLocationCoordinate('Door 12');
      expect(d12.x).toBe(73 + 11 * 71); // 854
      expect(d12.y).toBe(135);
    });

    it('resolves Drop Lot A and Lot B spots to yard slot coordinates', () => {
      const spotA1 = resolveLocationCoordinate('Spot A-1');
      expect(spotA1.x).toBe(94); // 55 + 0*88 + 39
      expect(spotA1.y).toBe(280);

      const spotB5 = resolveLocationCoordinate('Lot B-5');
      expect(spotB5.x).toBe(509); // 465 + 0*100 + 44
      expect(spotB5.y).toBe(280);
    });

    it('resolves Gate Kiosk coordinates', () => {
      const gate = resolveLocationCoordinate('Gate 1');
      expect(gate.x).toBe(460);
      expect(gate.y).toBe(395);
    });
  });

  describe('Yard Trajectory Generation', () => {
    it('creates realistic multi-segment circulation waypoints', () => {
      const start = { x: 460, y: 165 };
      const source = resolveLocationCoordinate('Spot A-1');
      const target = resolveLocationCoordinate('D-03');

      const waypoints = buildYardTrajectory(start, source, target);

      expect(waypoints.length).toBeGreaterThanOrEqual(6);
      expect(waypoints[0].x).toBe(start.x);
      expect(waypoints[waypoints.length - 1].x).toBe(target.x);

      // Verify coupling action exists at source
      const coupleWp = waypoints.find((w) => w.action === 'COUPLE');
      expect(coupleWp).toBeDefined();
      expect(coupleWp?.x).toBe(source.x);
      expect(coupleWp?.y).toBe(source.y);

      // Verify uncoupling action exists at target
      const uncoupleWp = waypoints.find((w) => w.action === 'UNCOUPLE');
      expect(uncoupleWp).toBeDefined();
      expect(uncoupleWp?.x).toBe(target.x);
    });
  });

  describe('Kinematics & Fifth-Wheel Interpolation', () => {
    const start = { x: 460, y: 165 };
    const source = resolveLocationCoordinate('Spot A-1');
    const target = resolveLocationCoordinate('D-03');
    const waypoints = buildYardTrajectory(start, source, target);

    it('initializes in transit mode at progress 0 with fifth-wheel disengaged', () => {
      const state = interpolateSpotterPosition(waypoints, 0);
      expect(state.phase).toBe('TRANSIT_TO_SOURCE');
      expect(state.fifthWheelEngaged).toBe(false);
      expect(state.boomPressurePsi).toBe(0);
      expect(state.x).toBe(start.x);
    });

    it('engages fifth-wheel and raises boom pressure during hauling phase', () => {
      // 60% progress is along the central apron towards target
      const state = interpolateSpotterPosition(waypoints, 0.65);
      expect(state.phase).toBe('HAULING');
      expect(state.fifthWheelEngaged).toBe(true);
      expect(state.boomPressurePsi).toBe(2600);
      expect(state.speedMph).toBeGreaterThan(0);
    });

    it('marks completion and lowers boom pressure at progress 1.0', () => {
      const state = interpolateSpotterPosition(waypoints, 1.0);
      expect(state.phase).toBe('COMPLETED');
      expect(state.speedMph).toBe(0);
      expect(state.fifthWheelEngaged).toBe(false);
      expect(state.x).toBe(target.x);
    });
  });
});
