import React, { useState } from 'react';
import {
  BarChart3, DollarSign, PackageCheck, Truck, Clock,
  ArrowUpRight, Award, PieChart, LineChart, Sparkles
} from 'lucide-react';

export const AnalyticsTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'year'>('30d');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');

  // Mock analytics data for interactive charts
  const revenueData = [
    { label: 'Thứ 2', revenue: 142.5, cost: 42.0, orders: 420 },
    { label: 'Thứ 3', revenue: 168.0, cost: 48.5, orders: 510 },
    { label: 'Thứ 4', revenue: 195.2, cost: 52.0, orders: 630 },
    { label: 'Thứ 5', revenue: 210.8, cost: 58.0, orders: 710 },
    { label: 'Thứ 6', revenue: 245.0, cost: 65.0, orders: 850 },
    { label: 'Thứ 7', revenue: 280.4, cost: 72.0, orders: 940 },
    { label: 'Chủ Nhật', revenue: 185.0, cost: 49.0, orders: 580 },
  ];

  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));

  const vrptwHourlyData = [
    { hour: '07:00 - 09:00', onTime: 98.4, total: 320 },
    { hour: '09:00 - 11:00', onTime: 96.2, total: 450 },
    { hour: '11:00 - 13:00', onTime: 94.8, total: 380 },
    { hour: '13:00 - 15:00', onTime: 97.5, total: 490 },
    { hour: '15:00 - 17:00', onTime: 95.1, total: 530 },
    { hour: '17:00 - 19:00', onTime: 93.6, total: 410 },
  ];

  const topDrivers = [
    { rank: 1, name: 'Nguyễn Văn Mạnh', code: 'DRV_1001', completed: 342, distance: '640 km', rating: 4.95, onTime: '99.1%' },
    { rank: 2, name: 'Trần Quốc Bảo', code: 'DRV_1002', completed: 318, distance: '590 km', rating: 4.92, onTime: '98.5%' },
    { rank: 3, name: 'Lê Hoàng Nam', code: 'DRV_1003', completed: 295, distance: '540 km', rating: 4.88, onTime: '97.8%' },
    { rank: 4, name: 'Phạm Minh Tuấn', code: 'DRV_1004', completed: 276, distance: '510 km', rating: 4.85, onTime: '96.9%' },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-[#161D25] uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={20} className="text-[#bc0100]" /> Thống kê Báo cáo (Analytics Dashboard)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi hiệu suất vận hành AI Routing, tỷ lệ hoàn thành VRPTW, doanh thu và năng suất tài xế real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Time Range Filter */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center gap-1 text-xs font-semibold">
            {(['7d', '30d', '90d', 'year'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${timeRange === range
                    ? 'bg-white text-[#bc0100] shadow-sm font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                {range === '7d' ? '7 Ngày' : range === '30d' ? '30 Ngày' : range === '90d' ? 'Quý này' : 'Năm nay'}
              </button>
            ))}
          </div>

          {/* Facility Filter */}
          <select
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#bc0100]"
          >
            <option value="ALL">Tất cả Kho/Bưu cục</option>
            <option value="FAC_101">Kho Bưu cục Velocity 1 (Hà Nội)</option>
            <option value="FAC_102">Kho Bưu cục Velocity 2 (TP.HCM)</option>
            <option value="FAC_103">Kho Bưu cục Velocity 3 (Đà Nẵng)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl p-5 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Tổng doanh thu vận chuyển</span>
            <div className="p-2 bg-red-600/20 text-red-400 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black tracking-tight text-white">1,425.80 Tr.đ</h3>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-400 font-semibold">
              <ArrowUpRight size={14} />
              <span>+18.4% so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Completed Orders Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Đơn hàng hoàn thành</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <PackageCheck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">8,420 Đơn</h3>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-semibold">
              <span>✓ Tỷ lệ giao thành công: <strong>98.2%</strong></span>
            </div>
          </div>
        </div>

        {/* Distance Travelled Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tổng quãng đường tài xế</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Truck size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">14,850 KM</h3>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-600 font-semibold">
              <Sparkles size={12} />
              <span>Tiết kiệm <strong>+15.8%</strong> nhờ AI GA</span>
            </div>
          </div>
        </div>

        {/* VRPTW On-Time Rate Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Tỷ lệ VRPTW Đúng Hạn</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">96.8%</h3>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-semibold">
              <ArrowUpRight size={14} />
              <span>Đạt chuẩn khung giờ hẹn (Time-Window)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Cost Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <LineChart size={16} className="text-[#bc0100]" /> Biểu đồ Doanh thu & Chi phí vận hành AI (Triệu VNĐ)
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">So sánh doanh thu thu được từ cước phí vận chuyển và chi phí nhiên liệu di chuyển</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-[#bc0100] rounded-sm"></span> Doanh thu</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-300 rounded-sm"></span> Chi phí</span>
            </div>
          </div>

          {/* SVG/HTML Bar Chart Representation */}
          <div className="h-64 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-gray-100">
            {revenueData.map((d, i) => {
              const revHeight = (d.revenue / maxRevenue) * 100;
              const costHeight = (d.cost / maxRevenue) * 100;

              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex justify-center items-end gap-1.5 h-full relative">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-lg">
                      <div>{d.label}: {d.revenue} Tr.đ</div>
                      <div className="text-gray-300">Đơn hàng: {d.orders}</div>
                    </div>

                    {/* Revenue Bar */}
                    <div
                      style={{ height: `${revHeight}%` }}
                      className="w-1/2 bg-gradient-to-t from-[#bc0100] to-red-500 rounded-t-md transition-all group-hover:brightness-110 shadow-sm"
                    ></div>

                    {/* Cost Bar */}
                    <div
                      style={{ height: `${costHeight}%` }}
                      className="w-1/2 bg-slate-300 rounded-t-md transition-all group-hover:bg-slate-400"
                    ></div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 font-mono mt-1">{d.label}</span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center text-[11px] text-gray-400 font-mono pt-1">
            <span>Trung bình: 204 Tr.đ/ngày</span>
            <span>Tổng tuần: 1,429.9 Tr.đ</span>
          </div>
        </div>

        {/* Order Completion Rate Donut & Progress (1 col) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <PieChart size={16} className="text-[#bc0100]" /> Tỉ lệ Hoàn thành Đơn hàng
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Phân bổ trạng thái xử lý trên toàn mạng lưới</p>
          </div>

          <div className="space-y-4">
            {/* Donut Progress Ring Simulation */}
            <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.8"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray="82, 100"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-amber-500"
                  strokeDasharray="12, 100"
                  strokeDashoffset="-82"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-red-500"
                  strokeDasharray="6, 100"
                  strokeDashoffset="-94"
                  strokeWidth="3.8"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-800">98.2%</span>
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Thành công</span>
              </div>
            </div>

            {/* Progress breakdown list */}
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> Giao thành công
                </span>
                <span className="font-bold text-slate-800">8,268 (82%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span> Đang xử lý / Giao lại
                </span>
                <span className="font-bold text-slate-800">1,210 (12%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span> Giao thất bại / Hủy
                </span>
                <span className="font-bold text-slate-800">605 (6%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Section: VRPTW Hourly Delivery Rate & Top Performing Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VRPTW Delivery Rate by Time-Window */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-[#bc0100]" /> Tỉ lệ Giao hàng Đúng Hạn VRPTW Theo Khung Giờ
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Đánh giá mức độ đáp ứng ràng buộc mốc giờ (Time Window Constraints)</p>
          </div>

          <div className="space-y-3">
            {vrptwHourlyData.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Khung giờ: {item.hour}</span>
                  <span className="text-[#bc0100] font-bold">{item.onTime}% ({item.total} đơn)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.onTime}%` }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full"
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Drivers Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Award size={16} className="text-amber-500" /> Bảng Xếp Hạng Năng Suất Tài Xế Xuất Sắc
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Dựa trên số đơn giao thành công & tỷ lệ VRPTW đúng hạn</p>
            </div>
            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded uppercase">Top Performers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-2">Hạng</th>
                  <th className="py-2">Tài xế</th>
                  <th className="py-2 text-center">Đơn thành công</th>
                  <th className="py-2 text-center">Đúng hạn</th>
                  <th className="py-2 text-right">Đánh giá</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topDrivers.map((driver) => (
                  <tr key={driver.rank} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 font-bold">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${driver.rank === 1 ? 'bg-amber-500 text-white font-black shadow-sm' :
                          driver.rank === 2 ? 'bg-slate-300 text-slate-800 font-bold' :
                            driver.rank === 3 ? 'bg-amber-700 text-white font-bold' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {driver.rank}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <div className="font-bold text-slate-800">{driver.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{driver.code} • {driver.distance}</div>
                    </td>
                    <td className="py-2.5 text-center font-bold text-slate-800">{driver.completed} đơn</td>
                    <td className="py-2.5 text-center font-bold text-emerald-600">{driver.onTime}</td>
                    <td className="py-2.5 text-right font-bold text-amber-600">⭐ {driver.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsTab;
