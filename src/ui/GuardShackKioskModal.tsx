import React, { useState } from 'react';
import {
  processKioskCheckIn,
  PRESEEDED_SCHEDULED_APPOINTMENTS,
  ScheduledAppointment,
  DigitalGatePass,
} from '../engine/guardShackKiosk';
import { DockDoor, YardSpot, DoorCommodityType } from '../engine/types';

interface GuardShackKioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDoors: DockDoor[];
  currentSpots: YardSpot[];
  onSuccessfulGateIn: (
    gatePass: DigitalGatePass,
    allocatedDoorId?: string,
    allocatedSpotId?: string
  ) => void;
}

export const GuardShackKioskModal: React.FC<GuardShackKioskModalProps> = ({
  isOpen,
  onClose,
  currentDoors,
  currentSpots,
  onSuccessfulGateIn,
}) => {
  const [selectedApt, setSelectedApt] = useState<ScheduledAppointment>(
    PRESEEDED_SCHEDULED_APPOINTMENTS[0]
  );
  const [tractorPlate, setTractorPlate] = useState('IL-8924-TR');
  const [trailerNumber, setTrailerNumber] = useState('TLR-3991-RF');
  const [driverName, setDriverName] = useState('Carlos Gomez');
  const [driverPhone, setDriverPhone] = useState('(312) 555-8910');
  const [sealNumber, setSealNumber] = useState('SEAL-448201');
  const [isSealIntact, setIsSealIntact] = useState(true);
  const [isLoadedInbound, setIsLoadedInbound] = useState(true);
  const [commodityType, setCommodityType] = useState<DoorCommodityType>('REEFER');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [issuedGatePass, setIssuedGatePass] = useState<DigitalGatePass | null>(null);

  const handleSelectAppointment = (apt: ScheduledAppointment) => {
    setSelectedApt(apt);
    setCommodityType(apt.equipmentType);
    setErrorMessage(null);
  };

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const res = processKioskCheckIn(
      {
        confirmationNumber: selectedApt.confirmationNumber,
        tractorPlate,
        trailerNumber,
        carrierName: selectedApt.carrierName,
        carrierDot: selectedApt.carrierDot,
        driverName,
        driverPhone,
        sealNumber,
        isSealIntact,
        equipmentType: commodityType,
        isLoadedInbound,
      },
      currentDoors,
      currentSpots
    );

    if (!res.success || !res.gatePass) {
      setErrorMessage(res.rejectionReason || 'Gate entry refused.');
      return;
    }

    setIssuedGatePass(res.gatePass);
    const allocatedDoorId =
      res.gatePass.assignedLocationType === 'DOCK_DOOR' ? res.gatePass.assignedLocationCode : undefined;
    const allocatedSpotId =
      res.gatePass.assignedLocationType === 'YARD_SPOT' ? res.gatePass.assignedLocationCode : undefined;

    onSuccessfulGateIn(res.gatePass, allocatedDoorId, allocatedSpotId);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kiosk-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          maxWidth: 680,
          background: '#0f172a',
          color: '#f8fafc',
          border: '1px solid #334155',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div
          className="modal-header"
          style={{
            background: '#1e293b',
            borderBottom: '1px solid #334155',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 id="kiosk-modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
              🛂 Driver Self-Service Check-In Kiosk &amp; Gate Pass
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
              Automated dock door &amp; drop lot allocation with bolt seal verification.
            </p>
          </div>
          <button
            onClick={onClose}
            className="modal-close"
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.25rem',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px 8px',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', maxHeight: '74vh', overflowY: 'auto' }}>
          {issuedGatePass ? (
            /* Issued Gate Pass View */
            <div
              style={{
                background: '#1e293b',
                border: '2px solid #22c55e',
                borderRadius: 8,
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '2.5rem' }}>🎫</span>
              <h3 style={{ margin: '8px 0 4px', color: '#4ade80' }}>
                DIGITAL GATE PASS ISSUED
              </h3>
              <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 16 }}>
                PASS ID: <strong>{issuedGatePass.gatePassId}</strong> · SECURITY PIN:{' '}
                <strong style={{ color: '#38bdf8' }}>{issuedGatePass.pinCode}</strong>
              </div>

              <div
                style={{
                  background: '#0f172a',
                  borderRadius: 6,
                  padding: '16px',
                  marginBottom: 16,
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                  ASSIGNED DESTINATION:
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', marginBottom: 12 }}>
                  📍 {issuedGatePass.assignedLocationName}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 8 }}>
                  <strong>Yard Directions:</strong> {issuedGatePass.yardDirections}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.75rem', color: '#94a3b8', marginTop: 12 }}>
                  <div>Carrier: <span style={{ color: '#f8fafc' }}>{issuedGatePass.carrierName}</span></div>
                  <div>Driver: <span style={{ color: '#f8fafc' }}>{issuedGatePass.driverName}</span></div>
                  <div>Tractor: <span style={{ color: '#f8fafc' }}>{issuedGatePass.tractorPlate}</span></div>
                  <div>Trailer: <span style={{ color: '#f8fafc' }}>{issuedGatePass.trailerNumber}</span></div>
                  <div>Free Time: <span style={{ color: '#22c55e' }}>{issuedGatePass.freeTimeMinutes} Minutes</span></div>
                  <div>Detention Rate: <span style={{ color: '#f59e0b' }}>${issuedGatePass.detentionRatePerHour}/hr after</span></div>
                </div>

                <div style={{ marginTop: 12, padding: '6px', background: '#1e293b', borderRadius: 4, fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace' }}>
                  {issuedGatePass.securityHash}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  background: '#22c55e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Open Gate &amp; Print Pass 🖨️
              </button>
            </div>
          ) : (
            /* Check-In Form */
            <form onSubmit={handleCheckInSubmit}>
              {/* Scheduled Appointment Selection */}
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
                Select Scheduled Carrier Appointment:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
                {PRESEEDED_SCHEDULED_APPOINTMENTS.map((apt) => {
                  const isSelected = selectedApt.confirmationNumber === apt.confirmationNumber;
                  return (
                    <div
                      key={apt.confirmationNumber}
                      onClick={() => handleSelectAppointment(apt)}
                      style={{
                        background: isSelected ? 'rgba(2, 132, 199, 0.2)' : '#1e293b',
                        border: `1px solid ${isSelected ? '#0284c7' : '#334155'}`,
                        borderRadius: 6,
                        padding: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      <strong style={{ fontSize: '0.8rem', color: isSelected ? '#38bdf8' : '#f8fafc', display: 'block' }}>
                        {apt.confirmationNumber}
                      </strong>
                      <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>{apt.carrierName}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 4 }}>
                        {apt.scheduledTimeWindow} · {apt.equipmentType}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    borderLeft: '4px solid #ef4444',
                    padding: '10px 14px',
                    borderRadius: 6,
                    marginBottom: 16,
                    color: '#fca5a5',
                    fontSize: '0.8rem',
                  }}
                >
                  <strong>🚫 Gate Rejection:</strong> {errorMessage}
                </div>
              )}

              {/* Form Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                    Driver Name:
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: 4, color: '#f8fafc', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                    Driver Mobile Phone:
                  </label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: 4, color: '#f8fafc', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                    Tractor License Plate:
                  </label>
                  <input
                    type="text"
                    value={tractorPlate}
                    onChange={(e) => setTractorPlate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: 4, color: '#f8fafc', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                    Trailer Unit Number:
                  </label>
                  <input
                    type="text"
                    value={trailerNumber}
                    onChange={(e) => setTrailerNumber(e.target.value)}
                    required
                    style={{ width: '100%', padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: 4, color: '#f8fafc', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4 }}>
                    Equipment Type:
                  </label>
                  <select
                    value={commodityType}
                    onChange={(e) => setCommodityType(e.target.value as DoorCommodityType)}
                    style={{ width: '100%', padding: '6px 10px', background: '#1e293b', border: '1px solid #475569', borderRadius: 4, color: '#f8fafc', fontSize: '0.8rem' }}
                  >
                    <option value="REEFER">Refrigerated (Reefer)</option>
                    <option value="DRY_VAN">Dry Van</option>
                    <option value="FLATBED">Flatbed / Stepdeck</option>
                  </select>
                </div>
              </div>

              {/* Seal Verification */}
              <div style={{ background: '#1e293b', padding: 12, borderRadius: 6, border: '1px solid #334155', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isLoadedInbound}
                      onChange={(e) => setIsLoadedInbound(e.target.checked)}
                    />
                    Loaded Inbound (Unload Required)
                  </label>
                  {isLoadedInbound && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: isSealIntact ? '#4ade80' : '#f87171', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isSealIntact}
                        onChange={(e) => setIsSealIntact(e.target.checked)}
                      />
                      Seal Intact &amp; Verified
                    </label>
                  )}
                </div>
                {isLoadedInbound && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4 }}>
                      High-Security Bolt Seal Number (ISO 17712):
                    </label>
                    <input
                      type="text"
                      value={sealNumber}
                      onChange={(e) => setSealNumber(e.target.value)}
                      required
                      placeholder="e.g. SEAL-884102"
                      style={{ width: '100%', padding: '6px 10px', background: '#0f172a', border: '1px solid #475569', borderRadius: 4, color: '#f8fafc', fontSize: '0.8rem' }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #475569',
                    background: '#1e293b',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#0284c7',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Authorize Gate Entry ➔
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
