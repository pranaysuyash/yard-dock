/**
 * Hostler Spotter Truck Simulation Engine for Yard & Dock (P07).
 * Computes realistic waypoints, yard circulation kinematics,
 * heading angles, fifth-wheel coupling, and ETA countdowns for
 * Ottawa T2 terminal tractors moving trailers across the facility.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface SpotterWaypoint extends Point2D {
  label: string;
  speedLimitMph: number;
  action?: 'CRUISE' | 'COUPLE' | 'UNCOUPLE' | 'TURN';
}

export type SpotterPhase =
  | 'IDLE'
  | 'TRANSIT_TO_SOURCE'
  | 'COUPLING'
  | 'HAULING'
  | 'UNCOUPLING'
  | 'COMPLETED';

export interface SpotterTelemetry {
  tractorId: string;
  activeTaskId: string | null;
  trailerId: string | null;
  sourceLocation: string;
  targetLocation: string;
  phase: SpotterPhase;
  x: number;
  y: number;
  headingDeg: number;
  speedMph: number;
  progressPercent: number; // 0 to 100
  etaSeconds: number;
  fifthWheelEngaged: boolean;
  boomPressurePsi: number;
  beaconActive: boolean;
}

/**
 * Resolves semantic location strings (e.g. "D-1", "D-03", "Spot A-1", "Gate 1")
 * into exact (x, y) coordinates on the 920x460 yard blueprint canvas.
 */
export function resolveLocationCoordinate(locationName: string): Point2D {
  const normalized = locationName.trim().toUpperCase();

  // Dock doors D-1 through D-12
  const doorMatch = normalized.match(/D[-_ ]?0?(\d+)/i) || normalized.match(/DOOR[-_ ]?0?(\d+)/i);
  if (doorMatch) {
    const doorNum = parseInt(doorMatch[1], 10);
    const clampedDoor = Math.max(1, Math.min(12, doorNum));
    const idx = clampedDoor - 1;
    const doorX = 42 + idx * 71;
    return { x: doorX + 31, y: 135 }; // Apron in front of door
  }

  // Drop Lot A (Spots A1 - A4 or Spot 1 - 4)
  const lotAMatch = normalized.match(/A[-_ ]?0?(\d+)/i) || normalized.match(/LOT[-_ ]?A[-_ ]?0?(\d+)/i);
  if (lotAMatch) {
    const spotNum = parseInt(lotAMatch[1], 10);
    const idx = Math.max(0, Math.min(3, spotNum - 1));
    const spotX = 55 + idx * 88;
    return { x: spotX + 39, y: 280 };
  }

  // Drop Lot B (Spots B5 - B8 or Spot 5 - 8)
  const lotBMatch = normalized.match(/B[-_ ]?0?(\d+)/i) || normalized.match(/LOT[-_ ]?B[-_ ]?0?(\d+)/i);
  if (lotBMatch) {
    const spotNum = parseInt(lotBMatch[1], 10);
    const idx = Math.max(0, Math.min(3, spotNum - 5 >= 0 ? spotNum - 5 : spotNum - 1));
    const spotX = 465 + idx * 100;
    return { x: spotX + 44, y: 280 };
  }

  // Gate / Security Kiosk
  if (normalized.includes('GATE') || normalized.includes('KIOSK')) {
    return { x: 460, y: 395 };
  }

  // Default Staging / Center Apron
  return { x: 460, y: 165 };
}

/**
 * Builds an authentic vehicle trajectory through the yard circulation apron.
 * Vehicles do not drive diagonally through buildings or drop rows; they follow
 * designated circulation lanes (y = 165 for main apron, vertical connector lanes).
 */
export function buildYardTrajectory(
  startPos: Point2D,
  sourcePos: Point2D,
  targetPos: Point2D
): SpotterWaypoint[] {
  const waypoints: SpotterWaypoint[] = [];

  // 1. Current position
  waypoints.push({ ...startPos, label: 'Start Position', speedLimitMph: 5 });

  // 2. Travel to source ingress apron lane (y = 165 or y = 200)
  const sourceApronY = sourcePos.y > 200 ? 200 : 165;
  waypoints.push({
    x: startPos.x,
    y: 165,
    label: 'Enter Circulation Apron',
    speedLimitMph: 10,
    action: 'TURN',
  });

  waypoints.push({
    x: sourcePos.x,
    y: sourceApronY,
    label: 'Approach Source Bay',
    speedLimitMph: 8,
  });

  // 3. Reverse/Back up to source position for coupling
  waypoints.push({
    ...sourcePos,
    label: 'Couple Trailer & Air Lines',
    speedLimitMph: 3,
    action: 'COUPLE',
  });

  // 4. Pull out into main apron
  waypoints.push({
    x: sourcePos.x,
    y: 165,
    label: 'Pull Out into Apron',
    speedLimitMph: 6,
  });

  // 5. Cruise along central circulation apron to target column
  waypoints.push({
    x: targetPos.x,
    y: 165,
    label: 'Transit Yard Lane',
    speedLimitMph: 10,
  });

  // 6. Enter target bay
  const targetApronY = targetPos.y > 200 ? 200 : 155;
  waypoints.push({
    x: targetPos.x,
    y: targetApronY,
    label: 'Approach Target Bay',
    speedLimitMph: 6,
  });

  // 7. Final destination
  waypoints.push({
    ...targetPos,
    label: 'Uncouple & Lower Landing Gear',
    speedLimitMph: 2,
    action: 'UNCOUPLE',
  });

  return waypoints;
}

/**
 * Interpolates vehicle position, heading, and phase along a waypoint polyline given progress (0.0 to 1.0).
 */
export function interpolateSpotterPosition(
  waypoints: SpotterWaypoint[],
  progress: number
): {
  x: number;
  y: number;
  headingDeg: number;
  phase: SpotterPhase;
  speedMph: number;
  fifthWheelEngaged: boolean;
  boomPressurePsi: number;
} {
  if (waypoints.length === 0) {
    return {
      x: 460,
      y: 165,
      headingDeg: 90,
      phase: 'IDLE',
      speedMph: 0,
      fifthWheelEngaged: false,
      boomPressurePsi: 0,
    };
  }

  if (progress <= 0) {
    const first = waypoints[0];
    const second = waypoints[1] || first;
    const angle = (Math.atan2(second.y - first.y, second.x - first.x) * 180) / Math.PI;
    return {
      x: first.x,
      y: first.y,
      headingDeg: angle,
      phase: 'TRANSIT_TO_SOURCE',
      speedMph: 0,
      fifthWheelEngaged: false,
      boomPressurePsi: 0,
    };
  }

  if (progress >= 1.0) {
    const last = waypoints[waypoints.length - 1];
    const prev = waypoints[waypoints.length - 2] || last;
    const angle = (Math.atan2(last.y - prev.y, last.x - prev.x) * 180) / Math.PI;
    return {
      x: last.x,
      y: last.y,
      headingDeg: angle,
      phase: 'COMPLETED',
      speedMph: 0,
      fifthWheelEngaged: false,
      boomPressurePsi: 0,
    };
  }

  // Calculate cumulative segment lengths
  const segmentLengths: number[] = [];
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const dx = waypoints[i + 1].x - waypoints[i].x;
    const dy = waypoints[i + 1].y - waypoints[i].y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(dist);
    totalDistance += dist;
  }

  const targetDist = progress * totalDistance;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= targetDist || i === segmentLengths.length - 1) {
      const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];

      const x = p1.x + (p2.x - p1.x) * segProgress;
      const y = p1.y + (p2.y - p1.y) * segProgress;
      const headingDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;

      // Determine phase from progress and waypoint indexing
      // Coupling happens around the source waypoint (typically index 3 of 7 ~ 30-45% progress)
      const isPastCoupling = i >= 3;
      const isAtEnd = i >= segmentLengths.length - 1 && segProgress > 0.85;

      let phase: SpotterPhase = 'TRANSIT_TO_SOURCE';
      let fifthWheelEngaged = false;
      let boomPressurePsi = 0;
      let speedMph = p1.speedLimitMph;

      if (isAtEnd) {
        phase = 'UNCOUPLING';
        fifthWheelEngaged = false;
        boomPressurePsi = 400;
        speedMph = 1.5;
      } else if (isPastCoupling) {
        phase = 'HAULING';
        fifthWheelEngaged = true;
        boomPressurePsi = 2600;
        speedMph = p1.speedLimitMph;
      } else if (i === 2) {
        phase = 'COUPLING';
        fifthWheelEngaged = true;
        boomPressurePsi = 1800;
        speedMph = 2.5;
      }

      return {
        x,
        y,
        headingDeg,
        phase,
        speedMph,
        fifthWheelEngaged,
        boomPressurePsi,
      };
    }
    accumulated += segLen;
  }

  const fallback = waypoints[waypoints.length - 1];
  return {
    x: fallback.x,
    y: fallback.y,
    headingDeg: 0,
    phase: 'COMPLETED',
    speedMph: 0,
    fifthWheelEngaged: false,
    boomPressurePsi: 0,
  };
}
