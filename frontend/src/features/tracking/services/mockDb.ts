import type { TrackingData } from '../types';

export const TRACKING_DATABASE: Record<string, TrackingData> = {
  'TRK-10029381': {
    code: 'TRK-10029381',
    status: 'IN_TRANSIT',
    statusLabel: 'IN TRANSIT',
    eta: '02 July 2026, 17:00',
    type: 'Express Air Delivery',
    destination: 'Quận 1, HCMC',
    route: [
      [10.8479, 106.7868], // Hub 1 (Quận 9)
      [10.7989, 106.7523], // Hub 2 (Quận 2)
      [10.7765, 106.7009], // Current Truck Position (Quận 1)
      [10.762622, 106.660172] // Destination (Quận 3)
    ],
    currentPos: [10.7765, 106.7009],
    timestamps: {
      created: '01 July 2026, 08:30',
      hub: '01 July 2026, 13:15',
      transit: '01 July 2026, 16:45',
      out: '-',
      delivered: '-'
    }
  },
  'TRK-20938472': {
    code: 'TRK-20938472',
    status: 'DELIVERED',
    statusLabel: 'DELIVERED',
    eta: 'Completed',
    type: 'Standard Logistics',
    destination: 'Thủ Đức, HCMC',
    route: [
      [10.8231, 106.6300], // Hub Tân Bình
      [10.8502, 106.7212], // Hub Bình Thạnh
      [10.8713, 106.7900]  // Delivered Destination (Thủ Đức)
    ],
    currentPos: [10.8713, 106.7900],
    timestamps: {
      created: '30 June 2026, 09:00',
      hub: '30 June 2026, 14:00',
      transit: '30 June 2026, 18:30',
      out: '01 July 2026, 08:00',
      delivered: '01 July 2026, 10:45'
    }
  }
};
