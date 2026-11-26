import { OrderStatus } from '@prisma/client';

/**
 * Shared constants and pure helpers for Last-Mile PICKUP warehouse handover reconciliation.
 * Explicitly isolated from DELIVERY and LINEHAUL (facilityId != null) routes.
 */
export const PICKUP_HANDED_OVER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.ARRIVED_ORIGIN_FACILITY,
  OrderStatus.AT_HUB,
  OrderStatus.READY_FOR_DISPATCH,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
];

export const PICKUP_EXEMPT_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PICK_FAILED,
  OrderStatus.CANCELLED,
];

export const UNPICKED_BLOCKED_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PICKUP_ASSIGNED,
  OrderStatus.PICKING,
  OrderStatus.PICK_FAILED,
  OrderStatus.CANCELLED,
];

export const PICKUP_WAITING_INITIAL_STATUSES: readonly OrderStatus[] = [
  OrderStatus.CREATED,
  OrderStatus.READY_FOR_PICKUP,
];

export interface PickupStopSnapshot {
  id: string;
  stopType: string;
  orderId: string | null;
  facilityId: string | null;
  order?: {
    id: string;
    orderCode: string;
    status: OrderStatus;
  } | null;
}

export function isLastMilePickupStop(stop: {
  stopType: string;
  orderId?: string | null;
  facilityId?: string | null;
}): boolean {
  return stop.stopType === 'PICKUP' && Boolean(stop.orderId) && !stop.facilityId;
}

export function isOrderHandedOverToWarehouse(status?: OrderStatus | string | null): boolean {
  if (!status) return false;
  return (PICKUP_HANDED_OVER_STATUSES as readonly string[]).includes(status);
}

export function evaluatePickupRouteHandover(stops: PickupStopSnapshot[]) {
  const pickupStops = stops.filter(isLastMilePickupStop);
  const requiredStops = pickupStops.filter(
    (s) => !s.order || !(PICKUP_EXEMPT_STATUSES as readonly string[]).includes(s.order.status)
  );
  const handedOverStops = requiredStops.filter((s) =>
    isOrderHandedOverToWarehouse(s.order?.status)
  );
  const missingOrderCodes = requiredStops
    .filter((s) => !isOrderHandedOverToWarehouse(s.order?.status))
    .map((s) => s.order?.orderCode || s.orderId || s.id);

  return {
    pickupStops,
    requiredStops,
    handedOverStops,
    missingOrderCodes,
    allHandedOver: pickupStops.length > 0 && missingOrderCodes.length === 0,
  };
}
