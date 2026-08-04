import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Navigation, Smartphone, User, CheckCircle2, AlertOctagon, Package, Loader2, AlertTriangle } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardShell';
import type { MenuItem } from '../layouts/Sidebar';
import { useAuth } from '../../../../context/AuthContext';
import { CONFIG } from '../../../../config';
import { STOP_TYPE_MAP, ROUTE_STOP_STATUS_MAP } from '../../../../constants/enumLabels';

interface RouteStop {
  id: string;
  sequence: number;
  stopType: 'PICKUP' | 'HUB' | 'DELIVERY';
  status: 'PENDING' | 'ARRIVED' | 'DEPARTED' | 'SKIPPED' | 'FAILED';
  addressSnapshot?: string;
  addressText?: string;
  plannedArrivalTime?: string;
  shipment?: {
    shipmentPackages?: Array<{
      package?: {
        order?: {
          orderCode?: string;
          deliveryAddressText?: string;
          pickupAddressText?: string;
        };
      };
    }>;
  };
}

interface Route {
  id: string;
  routeCode?: string;
  status: 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  startFacility?: {
    facilityName: string;
    facilityCode: string;
  };
  vehicle?: {
    vehicleCode: string;
    licensePlate: string;
  };
  stops?: RouteStop[];
}

// Today's Route Tab for Shipper
const TodayRouteTab: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const employmentStatus = currentUser?.staffProfile?.employmentStatus;
  const isSuspended = employmentStatus === 'SUSPENDED' || currentUser?.status !== 'ACTIVE';

  useEffect(() => {
    fetchDriverRoutes();
  }, [token]);

  const fetchDriverRoutes = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/routes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setRoutes(resData.data || []);
      } else {
        setError(resData.message || 'Không thể tải thông tin lộ trình.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy danh sách lộ trình.');
    } finally {
      setLoading(false);
    }
  };

  const activeRoute = routes.length > 0 ? routes[0] : null;
  const stops = activeRoute?.stops || [];
  const completedStopsCount = stops.filter(s => s.status === 'DEPARTED' || s.status === 'ARRIVED').length;
  const totalStopsCount = stops.length;
  const progressPercent = totalStopsCount > 0 ? Math.round((completedStopsCount / totalStopsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Driver Status Warning Banner if Suspended */}
      {isSuspended && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded-r-lg shadow-sm animate-in fade-in duration-200">
          <div className="flex gap-3 items-start">
            <AlertOctagon className="text-red-600 shrink-0 mt-0.5" size={22} />
            <div>
              <h4 className="text-sm font-bold text-red-900 uppercase tracking-wider">
                CẢNH BÁO: TÀI KHOẢN TÀI XẾ ĐANG BỊ ĐÌNH CHỈ / KHÓA
              </h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed font-medium">
                Tài khoản của bạn hiện đang ở trạng thái <strong>ĐÌNH CHỈ CÔNG TÁC</strong> hoặc <strong>TẠM KHÓA</strong> trên hệ thống. 
                Bạn không thể nhận các lộ trình vận chuyển mới hoặc thực hiện quy trình giao nhận đơn hàng. 
                Vui lòng liên hệ trực tiếp Quản trị viên (Admin) hoặc Trưởng bưu cục để được kiểm tra và giải quyết.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile App Sync Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm">
        <div className="flex gap-3">
          <Smartphone className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">Yêu cầu đồng bộ Mobile App</h4>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              Trang Web chỉ hỗ trợ xem danh sách lộ trình. Để thực hiện quét mã vận đơn QR, ký nhận POD, và kích hoạt tính năng gửi vị trí GPS thời gian thực chạy ngầm phục vụ thuật toán tối ưu AI, bạn bắt buộc phải đăng nhập và chạy ca làm việc trên ứng dụng di động <strong>Velocity Driver (Flutter Mobile App)</strong>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Stops Checklist */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider flex items-center gap-2">
              <Navigation size={16} className="text-[#bc0100]" /> Danh sách điểm dừng hôm nay
            </h3>
            {activeRoute && (
              <span className="bg-[#bc0100]/10 text-[#bc0100] text-[10px] font-bold px-2 py-1 rounded">
                MÃ LỘ TRÌNH: {activeRoute.routeCode || activeRoute.id.substring(0, 8)}
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500 gap-2">
              <Loader2 size={24} className="animate-spin text-[#bc0100]" />
              <span className="text-xs font-semibold">Đang tải danh sách lộ trình...</span>
            </div>
          ) : stops.length > 0 ? (
            <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-6 py-2">
              {stops.map((stop) => {
                const isDone = stop.status === 'DEPARTED';
                const orderCode = stop.shipment?.shipmentPackages?.[0]?.package?.order?.orderCode;

                return (
                  <div key={stop.id} className="relative">
                    {/* Timeline Icon */}
                    <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      isDone ? 'border-emerald-500' :
                      stop.status === 'ARRIVED' ? 'border-amber-500' : 'border-gray-300'
                    }`}>
                      {isDone && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                      {stop.status === 'ARRIVED' && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />}
                    </div>

                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            stop.stopType === 'PICKUP' ? 'bg-blue-50 text-blue-600' :
                            stop.stopType === 'HUB' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'
                          }`}>
                            {STOP_TYPE_MAP[stop.stopType]?.label || stop.stopType}
                          </span>
                          {orderCode && <span className="text-xs text-gray-500 font-semibold">{orderCode}</span>}
                          {stop.plannedArrivalTime && (
                            <span className="text-xs text-gray-400 font-medium">
                              ({new Date(stop.plannedArrivalTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 font-medium mt-1.5 flex items-start gap-1">
                          <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                          {stop.addressSnapshot || stop.addressText || stop.shipment?.shipmentPackages?.[0]?.package?.order?.deliveryAddressText || 'Đang cập nhật địa chỉ...'}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                        isDone ? 'bg-emerald-50 text-emerald-700' :
                        stop.status === 'ARRIVED' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
                      }`}>
                        {isDone ? 'ĐÃ XONG' : ROUTE_STOP_STATUS_MAP[stop.status]?.label || stop.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3 text-gray-400">
                <Package size={24} />
              </div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                {error || 'Chưa có lộ trình phân công hôm nay'}
              </h4>
              <p className="text-[11px] text-gray-500 max-w-sm leading-relaxed">
                {error ? 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.' : 'Hiện tại hệ thống hoặc Trưởng bưu cục chưa phân công đơn hàng và lộ trình mới cho bạn. Vui lòng chờ thông báo điều phối mới từ hệ thống.'}
              </p>
            </div>
          )}
        </div>

        {/* Shift Summary / Vehicle Stats */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider mb-4 flex items-center gap-2">
              <Truck size={16} className="text-[#bc0100]" /> Thông tin ca làm việc
            </h3>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Phương tiện gán</span>
                <span className="text-xs text-gray-800 font-bold flex items-center gap-1.5 mt-0.5">
                  {activeRoute?.vehicle ? (
                    `${activeRoute.vehicle.vehicleCode || 'Xe'} • ${activeRoute.vehicle.licensePlate}`
                  ) : (
                    <span className="text-gray-400 italic font-normal">Chưa phân xe</span>
                  )}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Khu vực bàn giao / Bưu cục</span>
                <span className="text-xs text-gray-800 font-bold">
                  {activeRoute?.startFacility?.facilityName || currentUser?.staffProfile?.assignedFacility?.facilityName || 'Chưa gán bưu cục'}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Tiến độ giao nhận</span>
                <div className="flex items-center justify-between mt-1">
                  <div className="w-full bg-gray-100 rounded-full h-2 mr-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <span className="text-xs font-bold text-gray-700">{completedStopsCount}/{totalStopsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Driver Status Card */}
          {isSuspended ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-5">
              <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-red-600" /> Trạng thái: TÀI KHOẢN ĐÌNH CHỈ
              </h4>
              <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                Tài khoản của bạn đã bị ngưng quyền vận hành. Bạn không thể thực hiện các thao tác trên ứng dụng di động hoặc nhận lộ trình phân công.
              </p>
            </div>
          ) : activeRoute ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
              <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Trạng thái: ĐANG HOẠT ĐỘNG
              </h4>
              <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
                Bạn đang trực tuyến và đã nhận lộ trình phân công. Vui lòng mở ứng dụng <strong>Velocity Driver</strong> trên di động để quét mã và giao nhận.
              </p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 size={14} /> Trạng thái: CHỜ PHÂN CÔNG
              </h4>
              <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                Tài khoản hoạt động bình thường. Đang chờ hệ thống AI hoặc Bưu cục xếp đơn và lộ trình mới cho bạn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ShipperDashboard: React.FC<{ onBackToHome?: () => void }> = ({ onBackToHome }) => {
  const menuItems: MenuItem[] = [
    {
      id: 'routes',
      label: 'Lộ trình Hôm nay',
      icon: Navigation,
      component: TodayRouteTab,
      allowed: true,
    },
    {
      id: 'profile',
      label: 'Hồ sơ Tài xế',
      icon: User,
      component: null, // Automatically handled to render ProfileTab
      allowed: true,
    },
  ];

  return <DashboardShell menuItems={menuItems} onBackToHome={onBackToHome} />;
};

export default ShipperDashboard;
