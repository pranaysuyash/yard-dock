/**
 * Cross-Tab Platform Event Bus for Product 07: Yard & Dock Management System.
 */

export const PLATFORM_CHANNEL_NAME = 'trucking-platform-mesh-v1';

export interface PlatformEventPayloads {
  ORDER_SELECTED: any;
  VEHICLE_CHANGED: any;
  CARGO_LOAD_UPDATED: any;
  PRICING_UPDATED: any;
  HOS_SCHEDULE_UPDATED: any;
  TELEMATICS_STREAM: any;
  REEFER_ALARM: any;
  INBOUND_MANIFEST_SCANNED: any;
  PUTAWAY_CONFIRMED: any;
  CARRIER_VETTED: any;
  TRAILER_GATED_IN: {
    checkInId: string;
    trailerNumber: string;
    carrierDot: string;
    doorNumber?: number;
    spotNumber?: string;
    timestamp: string;
  };
  DOCK_DOOR_SPOTTED: {
    doorNumber: number;
    trailerNumber: string;
    commodityType: string;
    timestamp: string;
  };
  DETENTION_WARNING: {
    trailerNumber: string;
    carrierName: string;
    elapsedMinutes: number;
    remainingMinutes: number;
    timestamp: string;
  };
}

export type PlatformEventType = keyof PlatformEventPayloads;

export interface PlatformEnvelope<T extends PlatformEventType = PlatformEventType> {
  type: T;
  payload: PlatformEventPayloads[T];
  source: string;
  timestamp: string;
}

type EventCallback<T extends PlatformEventType> = (payload: PlatformEventPayloads[T], envelope: PlatformEnvelope<T>) => void;

class PlatformBus {
  private channel: BroadcastChannel | null = null;
  private inMemoryListeners = new Map<PlatformEventType, Set<EventCallback<any>>>();

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(PLATFORM_CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent<PlatformEnvelope>) => {
          this.dispatchLocal(event.data);
        };
      } catch {
        this.channel = null;
      }
    }
  }

  public publish<T extends PlatformEventType>(type: T, payload: PlatformEventPayloads[T], source = 'product-07-yard-dock'): void {
    const envelope: PlatformEnvelope<T> = {
      type,
      payload,
      source,
      timestamp: new Date().toISOString(),
    };

    if (this.channel) {
      try {
        this.channel.postMessage(envelope);
      } catch {
        // Broadcast failed fallback
      }
    }

    this.dispatchLocal(envelope);
  }

  public subscribe<T extends PlatformEventType>(type: T, callback: EventCallback<T>): () => void {
    if (!this.inMemoryListeners.has(type)) {
      this.inMemoryListeners.set(type, new Set());
    }
    const set = this.inMemoryListeners.get(type)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  private dispatchLocal<T extends PlatformEventType>(envelope: PlatformEnvelope<T>): void {
    const set = this.inMemoryListeners.get(envelope.type);
    if (set) {
      for (const listener of set) {
        try {
          listener(envelope.payload, envelope);
        } catch {
          // ignore
        }
      }
    }
  }
}

export const platformBus = new PlatformBus();
