import React from 'react';
import { Truck, MapPin, Navigation, Smartphone, User, CheckCircle2 } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardShell';
import type { MenuItem } from '../layouts/Sidebar';

// Today's Route Tab for Shipper
const TodayRouteTab: React.FC = () => {
  const stops = [
    { id: '1', code: 'TRK-10029381', address: '120 Lê Lợi, Phường Bến Thành, Quận 1, TP. HCM', type: 'PICKUP', status: 'COMPLETED', time: '08:30' },
    { id: '2', code: 'TRK-10029381', address: '350 Điện Biên Phủ, Phường 17, Bình Thạnh, TP. HCM', type: 'DELIVERY', status: 'IN_PROGRESS', time: '10:15' },
    { id: '3', code: 'TRK-10029382', address: '22 Bis Nguyễn Thị Minh Khai, Đa Kao, Quận 1, TP. HCM', type: 'PICKUP', status: 'PENDING', time: '11:00' },
    { id: '4', code: 'TRK-10029382', address: '15 Hoàng Hoa Thám, Phường 6, Bình Thạnh, TP. HCM', type: 'DELIVERY', status: 'PENDING', time: '11:45' },
  ];

  return (
    <div className="space-y-6">
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
            <span className="bg-[#bc0100]/10 text-[#bc0100] text-[10px] font-bold px-2 py-1 rounded">
              LỘ TRÌNH TỐI ƯU AI
            </span>
          </div>

          <div className="relative border-l border-gray-200 ml-3 pl-6 space-y-6 py-2">
            {stops.map((stop) => (
              <div key={stop.id} className="relative">
                {/* Timeline Icon */}
                <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                  stop.status === 'COMPLETED' ? 'border-emerald-500' :
                  stop.status === 'IN_PROGRESS' ? 'border-amber-500' : 'border-gray-300'
                }`}>
                  {stop.status === 'COMPLETED' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                  {stop.status === 'IN_PROGRESS' && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />}
                </div>

                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stop.type === 'PICKUP' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}>
                        {stop.type === 'PICKUP' ? 'LẤY HÀNG' : 'GIAO HÀNG'}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">{stop.code}</span>
                      <span className="text-xs text-gray-400 font-medium">({stop.time})</span>
                    </div>
                    <p className="text-xs text-gray-700 font-medium mt-1.5 flex items-start gap-1">
                      <MapPin size={12} className="text-gray-400 shrink-0 mt-0.5" />
                      {stop.address}
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded ${
                    stop.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                    stop.status === 'IN_PROGRESS' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {stop.status === 'COMPLETED' ? 'ĐÃ XONG' :
                     stop.status === 'IN_PROGRESS' ? 'ĐANG ĐI' : 'CHỜ'}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
                  Xe máy Honda Wave • 29A-999.99
                </span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Khu vực bàn giao</span>
                <span className="text-xs text-gray-800 font-bold">Tổng kho trung tâm Quận 1 (Depot #1)</span>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Tiến độ giao nhận</span>
                <div className="flex items-center justify-between mt-1">
                  <div className="w-full bg-gray-100 rounded-full h-2 mr-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <span className="text-xs font-bold text-gray-700">1/4</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-5">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Trạng thái tài xế
            </h4>
            <p className="text-[11px] text-emerald-700 leading-relaxed font-medium">
              Bạn đang trực tuyến và được kết nối. Hệ thống phân tích định tuyến AI sẽ liên tục cập nhật lộ trình nếu có đơn hàng khẩn cấp phát sinh.
            </p>
          </div>
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
