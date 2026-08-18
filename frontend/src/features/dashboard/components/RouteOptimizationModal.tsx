import React, { useState } from 'react';
import { X, Cpu, Bot, Sliders, CheckCircle2, Loader2, Sparkles, MapPin, ChevronDown, ChevronUp, ShieldCheck, ArrowRight, RotateCcw, AlertTriangle, Eye } from 'lucide-react';
import { CONFIG } from '../../../config';

interface RouteOptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (routesData?: any) => void;
  token: string | null;
  facilityId?: string;
  facilities?: Array<{ id: string; facilityCode: string; facilityName: string }>;
  isAdmin?: boolean;
  initialRouteType?: 'ALL' | 'PICKUP' | 'DELIVERY';
}

export const RouteOptimizationModal: React.FC<RouteOptimizationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  token,
  facilityId = '',
  facilities = [],
  isAdmin = false,
  initialRouteType = 'DELIVERY',
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilityId);
  const [routeType, setRouteType] = useState<'ALL' | 'PICKUP' | 'DELIVERY'>(
    initialRouteType === 'ALL' ? 'DELIVERY' : initialRouteType
  );
  const [populationSize, setPopulationSize] = useState('100');
  const [generations, setGenerations] = useState('200');
  const [mutationRate, setMutationRate] = useState('0.15');
  const [crossoverRate, setCrossoverRate] = useState('0.80');
  const [clusterRadius, setClusterRadius] = useState('5000');
  const [maxStops, setMaxStops] = useState('45');
  const [showAdvancedParams, setShowAdvancedParams] = useState(isAdmin);

  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [expandedRouteIndex, setExpandedRouteIndex] = useState<number | null>(null);

  React.useEffect(() => {
    if (initialRouteType) {
      setRouteType(initialRouteType === 'ALL' ? 'DELIVERY' : initialRouteType);
    }
  }, [initialRouteType, isOpen]);

  React.useEffect(() => {
    if (facilityId) {
      setSelectedFacilityId(facilityId);
    } else if (facilities.length > 0 && !selectedFacilityId) {
      setSelectedFacilityId(facilities[0].id);
    }
  }, [facilityId, facilities]);

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setPreviewResult(null);
      setError(null);
      setExpandedRouteIndex(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Step 1: Calculate preview WITHOUT saving to DB
  const handleCalculatePreview = async () => {
    if (!selectedFacilityId) {
      setError('Vui lòng chọn Kho/Bưu cục cần kích hoạt tối ưu hóa!');
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/routes/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: selectedFacilityId,
          routeType,
          preview: true,
          ...(isAdmin ? {
            params: {
              populationSize: Number(populationSize),
              generations: Number(generations),
              mutationRate: Number(mutationRate),
              crossoverRate: Number(crossoverRate),
              clusterRadiusMeters: Number(clusterRadius),
              maxStopsPerRoute: Number(maxStops),
            }
          } : {})
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPreviewResult(data.data);
      } else {
        setError(data.message || 'Lỗi tính toán xem trước thuật toán AI Routing');
      }
    } catch (err) {
      console.error('Error calculating AI Routing preview:', err);
      setError('Không thể kết nối đến AI Service / Backend API server.');
    } finally {
      setCalculating(false);
    }
  };

  // Step 2: Confirm and Save to DB
  const handleConfirmAndSave = async () => {
    if (!selectedFacilityId) {
      setError('Vui lòng chọn Kho/Bưu cục cần kích hoạt tối ưu hóa!');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/routes/optimize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: selectedFacilityId,
          routeType,
          preview: false,
          ...(isAdmin ? {
            params: {
              populationSize: Number(populationSize),
              generations: Number(generations),
              mutationRate: Number(mutationRate),
              crossoverRate: Number(crossoverRate),
              clusterRadiusMeters: Number(clusterRadius),
              maxStopsPerRoute: Number(maxStops),
            }
          } : {})
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess(data.data);
        onClose();
      } else {
        setError(data.message || 'Lỗi lưu và phân tuyến AI');
      }
    } catch (err) {
      console.error('Error saving AI Routes:', err);
      setError('Không thể kết nối đến Backend API server để lưu lộ trình.');
    } finally {
      setSaving(false);
    }
  };

  const selectedFacility = facilities.find(f => f.id === selectedFacilityId);
  const previewRoutes = Array.isArray(previewResult)
    ? previewResult
    : (previewResult?.routes || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 bg-[#bc0100] text-white rounded-lg shadow-md flex items-center justify-center">
              <Bot size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Kích hoạt Động cơ AI Routing & Phân cụm Đơn hàng
                <span className="text-[10px] bg-red-500/30 text-red-200 border border-red-400/30 px-2 py-0.5 rounded font-mono font-normal">
                  VRP & K-Means Engine
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Tự động gom cụm địa chỉ đơn hàng (K-Means) và tối ưu hóa tuyến đường điều xe (Genetic Algorithm VRP).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-lg flex items-center justify-between">
              <span>❌ {error}</span>
              <button onClick={() => setError(null)} className="font-bold text-red-800 hover:underline text-[11px]">Đóng</button>
            </div>
          )}

          {/* 1. Select Facility */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={14} className="text-[#bc0100]" /> 1. Bưu cục / Kho thực hiện AI Gom cụm
            </label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              disabled={!isAdmin && Boolean(facilityId)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white font-semibold text-slate-800 focus:ring-2 focus:ring-[#bc0100] focus:outline-none disabled:bg-slate-100 disabled:text-slate-600 cursor-pointer"
            >
              <option value="">-- Chọn Bưu cục điều phối --</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.facilityName} ({f.facilityCode})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Select Route Type (Gom Lấy Hàng, Gom Giao Hàng) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Sliders size={14} className="text-[#bc0100]" /> 2. Chế độ Gom Cụm AI Phân Tuyến
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Giai đoạn sau: Cờ Kép (Tất cả) - Tạm thời ẩn theo yêu cầu */}
              {/*
              <button
                type="button"
                onClick={() => setRouteType('ALL')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${routeType === 'ALL'
                  ? 'border-indigo-600 bg-indigo-50/90 text-indigo-950 ring-2 ring-indigo-500/20 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-indigo-900">Cờ Kép (Tất cả)</span>
                  {routeType === 'ALL' && <CheckCircle2 size={16} className="text-indigo-600 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-1 leading-relaxed">
                  Gom cả đơn Lấy hàng tận nơi và đơn Giao hàng tại bưu cục.
                </p>
              </button>
              */}

              <button
                type="button"
                onClick={() => setRouteType('PICKUP')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${routeType === 'PICKUP'
                  ? 'border-amber-600 bg-amber-50/90 text-amber-950 ring-2 ring-amber-500/20 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-amber-900">Chỉ Gom Lấy Hàng</span>
                  {routeType === 'PICKUP' && <CheckCircle2 size={16} className="text-amber-600 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-1 leading-relaxed">
                  Chỉ gom các đơn Khách/Shop đã báo Sẵn sàng lấy hàng.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setRouteType('DELIVERY')}
                className={`p-3 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${routeType === 'DELIVERY'
                  ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 ring-2 ring-emerald-500/20 font-bold'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-extrabold text-emerald-900">Chỉ Gom Giao Hàng</span>
                  {routeType === 'DELIVERY' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-500 font-normal mt-1 leading-relaxed">
                  Chỉ gom các đơn bưu kiện hiện đã nhập về kho bưu cục.
                </p>
              </button>
            </div>
          </div>

          {/* Staff Info Banner vs Admin Param Controls */}
          {!isAdmin ? (
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Tham số Thuật toán AI Hệ thống (System Default)</span>
              </div>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Hệ thống tự động áp dụng bộ tham số AI tiêu chuẩn do Ban Quản Trị cấu hình (Quần thể GA: 100, Số thế hệ: 200, Bán kính K-Means: 5km, Max Stops: 45). Bạn chỉ cần chọn Bưu cục và bấm <strong>"Kích hoạt Tối ưu hóa ngay"</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                className="mt-2 text-[10px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                {showAdvancedParams ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                <span>{showAdvancedParams ? 'Ẩn chi tiết tham số GA' : 'Xem chi tiết tham số GA hệ thống'}</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Sliders size={14} className="text-[#bc0100]" /> 2. Tinh chỉnh Tham số AI GA & K-Means (Chỉ dành cho Admin)
              </h4>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Quyền Admin</span>
            </div>
          )}

          {/* GA & K-Means Parameters Config */}
          {showAdvancedParams && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-200 pt-4">
              {/* Population Size */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 hover:border-slate-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700">Kích thước Quần thể</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">POP_SIZE</span>
                </div>
                <input
                  type="number"
                  value={populationSize}
                  onChange={(e) => setPopulationSize(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 text-right focus:border-[#bc0100] focus:outline-none disabled:bg-slate-100"
                />
                <p className="text-[9px] text-slate-400">Kích thước quần thể (Default: 100)</p>
              </div>

              {/* Generations */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 hover:border-slate-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700">Số thế hệ Tiến hóa</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">GENERATIONS</span>
                </div>
                <input
                  type="number"
                  value={generations}
                  onChange={(e) => setGenerations(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 text-right focus:border-[#bc0100] focus:outline-none disabled:bg-slate-100"
                />
                <p className="text-[9px] text-slate-400">Vòng lặp tiến hóa GA (Default: 200)</p>
              </div>

              {/* Mutation Rate */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 hover:border-slate-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700">Tỷ lệ Đột biến</span>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">MUTATION</span>
                </div>
                <input
                  type="text"
                  value={mutationRate}
                  onChange={(e) => setMutationRate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 text-right focus:border-[#bc0100] focus:outline-none disabled:bg-slate-100"
                />
                <p className="text-[9px] text-slate-400">Tần suất đột biến (0.05 - 0.20)</p>
              </div>

              {/* Crossover Rate */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 hover:border-slate-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700">Tỷ lệ Lai ghép</span>
                  <span className="text-[10px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">CROSSOVER</span>
                </div>
                <input
                  type="text"
                  value={crossoverRate}
                  onChange={(e) => setCrossoverRate(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 text-right focus:border-[#bc0100] focus:outline-none disabled:bg-slate-100"
                />
                <p className="text-[9px] text-slate-400">Trao đổi chéo (0.7 - 0.9)</p>
              </div>

              {/* Cluster Radius */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 hover:border-slate-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700">Bán kính Gom K-Means</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">RADIUS (m)</span>
                </div>
                <input
                  type="number"
                  value={clusterRadius}
                  onChange={(e) => setClusterRadius(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 text-right focus:border-[#bc0100] focus:outline-none disabled:bg-slate-100"
                />
                <p className="text-[9px] text-slate-400">Bán kính gom đơn (mét)</p>
              </div>

              {/* Max Stops */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 hover:border-slate-400 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-700">Số Stops tối đa/Tuyến</span>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">MAX_STOPS</span>
                </div>
                <input
                  type="number"
                  value={maxStops}
                  onChange={(e) => setMaxStops(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-bold text-slate-900 text-right focus:border-[#bc0100] focus:outline-none disabled:bg-slate-100"
                />
                <p className="text-[9px] text-slate-400">Giới hạn điểm dừng cho 1 xe</p>
              </div>
            </div>
          )}

          {/* Preview Section if results are calculated */}
          {previewResult && (
            <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-5 space-y-4 animate-fade-in shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-indigo-100">
                <div>
                  <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-600 animate-pulse" /> 
                    Kết quả AI Đề xuất ({previewRoutes.length || 0} Lộ trình / {previewResult.totalOrders || previewRoutes.reduce((acc: number, r: any) => acc + (r.totalStops || 0), 0)} đơn hàng)
                  </h4>
                  <p className="text-[11px] text-amber-700 font-medium mt-0.5 flex items-center gap-1">
                    <AlertTriangle size={13} className="shrink-0" />
                    Bản xem trước mô phỏng — <strong>Chưa lưu vào DB</strong>. Hãy kiểm tra trước khi xác nhận.
                  </p>
                </div>
                <span className="text-[11px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-full font-mono">
                  ⏳ Chờ xác nhận lưu
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {previewRoutes.map((rt: any, idx: number) => {
                  const isExpanded = expandedRouteIndex === idx;
                  const driverName = rt.driver?.fullName || rt.driverVehicleAssignment?.driver?.user?.fullName || rt.driverVehicleAssignment?.driver?.fullName || 'Đã phân công';
                  const driverPhone = rt.driver?.phoneNumber;
                  const stopsCount = rt.totalStops || rt.stops?.length || rt.orders?.length || 0;
                  const distance = Number(rt.plannedDistanceKm || 0).toFixed(1);
                  const duration = rt.plannedDurationMin || 0;

                  return (
                    <div key={rt.id || idx} className="bg-white border border-indigo-200 rounded-lg p-3.5 text-xs space-y-2 shadow-sm hover:border-indigo-400 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-indigo-950 font-mono text-sm">{rt.routeCode || `AI-TUYẾN ${idx + 1}`}</span>
                        <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-0.5 rounded-full">
                          {stopsCount} điểm dừng
                        </span>
                      </div>

                      <div className="bg-slate-50 rounded p-2 text-[11px] space-y-0.5 border border-slate-100">
                        <p className="text-slate-700">
                          👤 Tài xế: <strong className="text-slate-900">{driverName}</strong>
                          {driverPhone && <span className="text-slate-500 text-[10px] ml-1">({driverPhone})</span>}
                        </p>
                        <div className="flex justify-between text-[10px] text-slate-500 pt-1 font-mono">
                          <span>📏 Quãng đường: <strong>{distance} km</strong></span>
                          <span>⏱️ Thời gian: <strong>{duration} phút</strong></span>
                        </div>
                      </div>

                      {/* Expandable Stops Preview */}
                      {rt.orders && rt.orders.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedRouteIndex(isExpanded ? null : idx)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer pt-1"
                          >
                            <Eye size={12} />
                            <span>{isExpanded ? 'Thu gọn danh sách đơn' : `Xem chi tiết ${rt.orders.length} điểm giao/nhận`}</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto border-t border-slate-100 pt-2">
                              {rt.orders.map((o: any, oIdx: number) => (
                                <div key={o.id || oIdx} className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[10px] space-y-0.5">
                                  <div className="flex justify-between items-center font-bold">
                                    <span className="text-slate-800">#{o.sequence || oIdx + 1}. {o.trackingNumber || o.orderCode}</span>
                                    <span className={`px-1 rounded text-[9px] ${o.type === 'PICKUP' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                      {o.type === 'PICKUP' ? 'LẤY HÀNG' : 'GIAO HÀNG'}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 truncate">
                                    {o.recipientName ? `Người nhận: ${o.recipientName}` : (o.senderName ? `Người gửi: ${o.senderName}` : '')}
                                  </p>
                                  <p className="text-slate-500 truncate" title={o.address}>
                                    📍 {o.address}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-100 border-t border-slate-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <Cpu size={14} className="text-slate-500" />
            <span>Bưu cục: <strong className="text-slate-900">{selectedFacility?.facilityName || 'Chưa chọn'}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              disabled={calculating || saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors uppercase tracking-wider disabled:opacity-50 cursor-pointer"
            >
              Hủy bỏ
            </button>

            {!previewResult ? (
              <button
                onClick={handleCalculatePreview}
                disabled={calculating}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {calculating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang tính toán AI & Phân cụm...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>1. Tính toán & Xem trước Đề xuất</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={handleCalculatePreview}
                  disabled={calculating || saving}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  title="Tính toán lại mô phỏng AI"
                >
                  <RotateCcw size={13} className={calculating ? 'animate-spin' : ''} />
                  <span>{calculating ? 'Đang tính...' : 'Tính lại'}</span>
                </button>

                <button
                  onClick={handleConfirmAndSave}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang lưu vào hệ thống...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>2. Xác nhận Áp dụng & Lưu vào DB</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
