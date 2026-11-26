import React, { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Unlock,
  RefreshCw,
  QrCode,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CONFIG } from '../../../../../config';

export const HANDED_OVER_ORDER_STATUSES = new Set<string>([
  'ARRIVED_ORIGIN_FACILITY',
  'AT_HUB',
  'READY_FOR_DISPATCH',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'COMPLETED',
]);

export const EXEMPT_PICKUP_ORDER_STATUSES = new Set<string>([
  'PICK_FAILED',
  'CANCELLED',
]);

export const UNPICKED_BLOCKED_ORDER_STATUSES = new Set<string>([
  'PICKUP_ASSIGNED',
  'PICKING',
  'PICK_FAILED',
  'CANCELLED',
]);

export const PICKUP_WAITING_INITIAL_STATUSES = new Set<string>([
  'CREATED',
  'READY_FOR_PICKUP',
]);

export interface PickupHandoverOrderItem {
  stopId: string;
  orderId: string;
  orderCode: string;
  status: string;
  receiverName?: string;
}

export interface PickupHandoverRouteItem {
  id: string;
  routeCode: string;
  status: string;
  startFacilityId?: string;
  driverName: string;
  driverEmployeeCode?: string;
  requiredOrders: PickupHandoverOrderItem[];
  handedOverOrders: PickupHandoverOrderItem[];
  pendingOrders: PickupHandoverOrderItem[];
  exemptOrders: PickupHandoverOrderItem[];
  allStopsRaw: any[];
}

export function isLastMilePickupStop(stop: any): boolean {
  return stop?.stopType === 'PICKUP' && Boolean(stop?.orderId) && !stop?.facilityId;
}

export function extractActivePickupRoutes(rawRoutes: any[]): PickupHandoverRouteItem[] {
  if (!Array.isArray(rawRoutes)) return [];

  return rawRoutes
    .filter((route) => {
      const routeStatus = String(route?.status || '').toUpperCase();
      if (routeStatus !== 'IN_PROGRESS') return false;
      const stops = Array.isArray(route?.stops) ? route.stops : [];
      return stops.some(isLastMilePickupStop);
    })
    .map((route) => {
      const stops = Array.isArray(route?.stops) ? route.stops : [];
      const pickupStops = stops.filter(isLastMilePickupStop);

      const items: PickupHandoverOrderItem[] = pickupStops.map((stop: any) => ({
        stopId: String(stop.id || ''),
        orderId: String(stop.order?.id || stop.orderId || ''),
        orderCode: String(stop.order?.orderCode || stop.orderId || ''),
        status: String(stop.order?.status || 'UNKNOWN').toUpperCase(),
        receiverName: stop.order?.receiverName || undefined,
      }));

      const exemptOrders = items.filter((item) => EXEMPT_PICKUP_ORDER_STATUSES.has(item.status));
      const requiredOrders = items.filter((item) => !EXEMPT_PICKUP_ORDER_STATUSES.has(item.status));
      const handedOverOrders = requiredOrders.filter((item) => HANDED_OVER_ORDER_STATUSES.has(item.status));
      const pendingOrders = requiredOrders.filter((item) => !HANDED_OVER_ORDER_STATUSES.has(item.status));

      const driver = route?.driverVehicleAssignment?.driver;
      return {
        id: String(route.id),
        routeCode: String(route.routeCode || route.id),
        status: String(route.status || 'IN_PROGRESS'),
        startFacilityId: route.startFacilityId ? String(route.startFacilityId) : undefined,
        driverName: String(driver?.fullName || 'Tài xế lấy hàng'),
        driverEmployeeCode: driver?.employeeCode ? String(driver.employeeCode) : undefined,
        requiredOrders,
        handedOverOrders,
        pendingOrders,
        exemptOrders,
        allStopsRaw: pickupStops,
      };
    });
}

interface PickupHandoverPanelProps {
  refreshKey: number;
  lockedRouteId: string | null;
  onToggleLockRoute: (route: PickupHandoverRouteItem | null) => void;
  onRoutesLoaded: (routes: PickupHandoverRouteItem[]) => void;
  onRouteCompletedSuccess?: (message: string) => void;
  onRouteActionError?: (message: string) => void;
}

function maskPendingOrderCode(orderCode: string): string {
  const trimmed = orderCode.trim();
  if (trimmed.length <= 4) return '****';
  return `***-${trimmed.slice(-4)}`;
}

export const PickupHandoverPanel: React.FC<PickupHandoverPanelProps> = ({
  refreshKey,
  lockedRouteId,
  onToggleLockRoute,
  onRoutesLoaded,
  onRouteCompletedSuccess,
  onRouteActionError,
}) => {
  const [routes, setRoutes] = useState<PickupHandoverRouteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [completingRouteId, setCompletingRouteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchPickupRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${CONFIG.API_BASE_URL}/routes?status=IN_PROGRESS`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const parsed = extractActivePickupRoutes(data.data);
        setRoutes(parsed);
        onRoutesLoaded(parsed);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách chuyến lấy hàng chờ bàn giao:', err);
    } finally {
      setLoading(false);
    }
  }, [onRoutesLoaded]);

  useEffect(() => {
    fetchPickupRoutes();
  }, [fetchPickupRoutes, refreshKey]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const socketBaseUrl = CONFIG.API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    let socket: Socket | null = null;

    try {
      socket = io(socketBaseUrl, {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
      });
      socket.on('routes_updated', () => {
        fetchPickupRoutes();
      });
    } catch (err) {
      console.error('Không thể kết nối Socket bàn giao kho:', err);
    }

    const fallbackInterval = setInterval(fetchPickupRoutes, 15000);
    return () => {
      clearInterval(fallbackInterval);
      if (socket) {
        socket.off('routes_updated');
        socket.disconnect();
      }
    };
  }, [fetchPickupRoutes]);

  const handleManualCompleteRoute = async (route: PickupHandoverRouteItem) => {
    try {
      setCompletingRouteId(route.id);
      const token = localStorage.getItem('token');
      const res = await fetch(`${CONFIG.API_BASE_URL}/routes/${route.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        onRouteActionError?.(data.message || `Không thể chốt hoàn thành chuyến ${route.routeCode}`);
        return;
      }

      if (lockedRouteId === route.id) {
        onToggleLockRoute(null);
      }
      onRouteCompletedSuccess?.(
        `Đã hoàn tất bàn giao chuyến [${route.routeCode}] của ${route.driverName} và giải phóng tài xế!`
      );
      await fetchPickupRoutes();
    } catch (err: any) {
      onRouteActionError?.(err.message || 'Lỗi kết nối khi chốt hoàn thành chuyến');
    } finally {
      setCompletingRouteId(null);
    }
  };

  const lockedRoute = lockedRouteId
    ? routes.find((r) => r.id === lockedRouteId) || null
    : null;

  // Chỉ hiển thị bảng đối soát SAU KHI nhân viên kho quét mã QR chuyến (RT-...) của Shipper về bàn giao
  if (!lockedRoute) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 to-slate-900 px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            <Truck size={18} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">
              Đối Soát Bàn Giao Chuyến {lockedRoute.routeCode}
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Chỉ các kiện đã lấy (<span className="font-mono text-indigo-300">PICKED_UP</span>) thuộc quyền quản lý của tài xế{' '}
              <span className="font-bold text-white">{lockedRoute.driverName}</span> mới được phép kiểm đếm & nhập kho.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchPickupRoutes}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
            title={collapsed ? 'Mở rộng bảng đối soát' : 'Thu gọn bảng đối soát'}
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* Active Lock Banner */}
      <div className="bg-indigo-50 border-b border-indigo-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-indigo-950 text-xs font-bold">
          <Lock size={15} className="text-indigo-600 shrink-0" />
          <span>
            Đang khóa đối soát riêng cho chuyến{' '}
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-700">
              {lockedRoute.routeCode}
            </span>{' '}
            — Tài xế <span className="text-indigo-700">{lockedRoute.driverName}</span>
            {lockedRoute.driverEmployeeCode ? ` (${lockedRoute.driverEmployeeCode})` : ''}. Mọi kiện của shipper khác sẽ bị chặn!
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleLockRoute(null)}
          className="px-3 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Unlock size={13} />
          Đóng phiên đối soát
        </button>
      </div>

      {/* Scanned Shipper Route Card */}
      {!collapsed && (() => {
        const route = lockedRoute;
        const totalReq = route.requiredOrders.length;
        const doneCount = route.handedOverOrders.length;
        const pct = totalReq > 0 ? Math.round((doneCount / totalReq) * 100) : 100;
        const readyToComplete = totalReq === 0 || doneCount >= totalReq;

        return (
          <div className="p-4 bg-slate-50/70">
            <div className="rounded-xl border border-indigo-500 ring-2 ring-indigo-500/20 p-4 bg-white space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-extrabold px-2.5 py-1 rounded-lg bg-slate-900 text-white">
                    <QrCode size={13} className="text-amber-400" />
                    {route.routeCode}
                  </span>
                  <span className="text-xs font-bold text-slate-800">{route.driverName}</span>
                  {route.driverEmployeeCode && (
                    <span className="text-[11px] font-mono text-slate-500">({route.driverEmployeeCode})</span>
                  )}
                </div>

                <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 bg-indigo-600 text-white">
                  <Lock size={12} />
                  Đang đối soát
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600 flex items-center gap-1">
                    <PackageCheck size={13} className="text-indigo-600" />
                    Kiểm đếm nhập kho:
                  </span>
                  <span className={readyToComplete ? 'text-emerald-700' : 'text-indigo-700'}>
                    {doneCount} / {totalReq} kiện ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      readyToComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Order Checklist */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {route.requiredOrders.map((order, idx) => {
                  const isDone = HANDED_OVER_ORDER_STATUSES.has(order.status);
                  const isPickedUpReady = order.status === 'PICKED_UP';
                  return (
                    <div
                      key={order.stopId || order.orderCode}
                      className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
                        isDone
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : isPickedUpReady
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950 select-none'
                            : 'bg-slate-50 border-slate-200 text-slate-600 select-none'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isDone ? (
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        ) : isPickedUpReady ? (
                          <Clock size={14} className="text-amber-600 shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-slate-400 shrink-0" />
                        )}
                        <span className="font-mono font-bold truncate">
                          {isDone
                            ? order.orderCode
                            : `Kiện #${idx + 1} (Đuôi ${maskPendingOrderCode(order.orderCode)})`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold">
                          {isDone
                            ? 'Đã nhập kho'
                            : isPickedUpReady
                              ? 'Quét QR trên kiện hàng'
                              : `Chưa lấy (${order.status})`}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {route.exemptOrders.map((order, idx) => (
                  <div
                    key={order.stopId || order.orderCode}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-xs select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <XCircle size={14} className="text-slate-400 shrink-0" />
                      <span className="font-mono line-through truncate">
                        Kiện miễn kiểm #{idx + 1} (Đuôi {maskPendingOrderCode(order.orderCode)})
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold">
                      {order.status === 'PICK_FAILED' ? 'Lấy thất bại' : 'Đã hủy'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Manual completion button */}
              {readyToComplete && (
                <button
                  type="button"
                  onClick={() => handleManualCompleteRoute(route)}
                  disabled={completingRouteId === route.id}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition"
                >
                  {completingRouteId === route.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Chốt hoàn thành & giải phóng tài xế
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
