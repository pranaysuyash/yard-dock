import { describe, it, expect } from 'vitest';
import {
  processKioskCheckIn,
  KioskCheckInRequest,
  PRESEEDED_SCHEDULED_APPOINTMENTS,
} from '../src/engine/guardShackKiosk';

describe('Digital Guard Shack & Kiosk Check-In Engine', () => {
  it('has preseeded scheduled appointments for quick driver check-in', () => {
    expect(PRESEEDED_SCHEDULED_APPOINTMENTS.length).toBeGreaterThan(0);
    const apt = PRESEEDED_SCHEDULED_APPOINTMENTS[0];
    expect(apt.confirmationNumber).toBe('APT-9042-IL');
    expect(apt.equipmentType).toBe('REEFER');
  });

  it('successfully processes valid check-in and assigns an available dock door', () => {
    const req: KioskCheckInRequest = {
      confirmationNumber: 'APT-9042-IL',
      tractorPlate: 'IL-90210',
      trailerNumber: 'TLR-8819',
      carrierName: 'Summit Peak Logistics',
      carrierDot: '3819401',
      driverName: 'Dave Miller',
      driverPhone: '312-555-0199',
      sealNumber: 'SEAL-49102',
      isSealIntact: true,
      equipmentType: 'REEFER',
      isLoadedInbound: true,
    };

    const res = processKioskCheckIn(req);
    expect(res.success).toBe(true);
    expect(res.gatePass).toBeDefined();
    expect(res.gatePass?.assignedLocationType).toBe('DOCK_DOOR');
    expect(res.gatePass?.freeTimeMinutes).toBe(120);
    expect(res.gatePass?.detentionRatePerHour).toBe(85);
    expect(res.gatePass?.securityHash).toContain('SHA256:');
  });

  it('rejects check-in with broken seal on loaded inbound freight', () => {
    const badSealReq: KioskCheckInRequest = {
      confirmationNumber: 'APT-9042-IL',
      tractorPlate: 'IL-90210',
      trailerNumber: 'TLR-8819',
      carrierName: 'Summit Peak Logistics',
      carrierDot: '3819401',
      driverName: 'Dave Miller',
      driverPhone: '312-555-0199',
      sealNumber: 'SEAL-BROKEN-01',
      isSealIntact: false, // Compromised seal!
      equipmentType: 'REEFER',
      isLoadedInbound: true,
    };

    const res = processKioskCheckIn(badSealReq);
    expect(res.success).toBe(false);
    expect(res.rejectionReason).toContain('BROKEN SEAL ALERT');
  });

  it('rejects check-in with missing license plate', () => {
    const noPlateReq: KioskCheckInRequest = {
      confirmationNumber: 'APT-9042-IL',
      tractorPlate: '',
      trailerNumber: 'TLR-8819',
      carrierName: 'Summit Peak Logistics',
      carrierDot: '3819401',
      driverName: 'Dave Miller',
      driverPhone: '312-555-0199',
      sealNumber: 'SEAL-49102',
      isSealIntact: true,
      equipmentType: 'REEFER',
      isLoadedInbound: true,
    };

    const res = processKioskCheckIn(noPlateReq);
    expect(res.success).toBe(false);
    expect(res.rejectionReason).toContain('license plate is required');
  });
});
