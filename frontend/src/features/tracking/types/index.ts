export type ShipmentStatus = 'CREATED' | 'PICKED_UP' | 'IN_TRANSIT' | 'OUT_FOR_DELIVERY' | 'DELIVERED';

export interface TrackingStep {
  title: string;
  desc: string;
  timestamp: string;
  completed: boolean;
  active: boolean;
}

export interface TrackingData {
  code: string;
  status: ShipmentStatus;
  statusLabel: string;
  eta: string;
  type: string;
  destination: string;
  route: [number, number][]; // [Latitude, Longitude] pairs for Leaflet map display
  currentPos: [number, number]; // [Latitude, Longitude] pair
  timestamps: {
    created: string;
    hub: string;
    transit: string;
    out: string;
    delivered: string;
  };
}

export interface DashboardShipment {
  code: string;
  type: string;
  destination: string;
  status: ShipmentStatus;
}
