import React, { useState } from 'react';
import {
  QrCode,
  Package,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  History,
  Truck,
  Sparkles,
} from 'lucide-react';
import { CONFIG } from '../../../../config';

interface ScanHistoryItem {
  id: string;
  code: string;
  type: 'SHIPMENT' | 'ORDER';
  status: string;
  orderCount?: number;
  scannedAt: string;
  message: string;
}

export const ToteScanTab: React.FC = () => {
  const [scanCode, setScanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'AT_HUB' | 'ARRIVED_DEST_FACILITY' | 'IN_TRANSIT'>('AT_HUB');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lastScannedResult, setLastScannedResult] = useState<any | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([
    {
      id: '1',
      code: 'SH-79257540',
      type: 'SHIPMENT',
      status: 'AT_HUB',
      orderCount: 1,
      scannedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      message: 'Nhập kho bưu cục Linh Trung thành công',
    },
  ]);

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = scanCode.trim();
    if (!cleanCode) {
      setError('Vui lòng nhập hoặc quét mã Sọt hàng / Mã đơn hàng');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Determine if code is a Shipment code (SH-, SHP-, RT-) or Order code (ORD-)
      const isOrder = cleanCode.toUpperCase().startsWith('ORD-');

      if (isOrder) {
        // Call Order update status API
        const targetStatus = activeTab === 'ARRIVED_DEST_FACILITY' ? 'ARRIVED_DEST_FACILITY' : 'ARRIVED_ORIGIN_FACILITY';
        const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${cleanCode}/status`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            status: targetStatus,
            reason: `Nhân viên quét mã bưu kiện xác nhận nhập kho thành công (${targetStatus})`,
          }),
        });

        const res = await response.json();

        if (response.ok && res.success) {
          setSuccessMsg(`✅ Đơn hàng ${cleanCode} đã cập nhật trạng thái kho sang ĐÃ LƯU KHO BƯU CỤC thành công!`);
          setLastScannedResult({
            code: cleanCode,
            type: 'ORDER',
            status: targetStatus,
            statusLabel: 'ĐÃ LƯU KHO BƯU CỤC',
            details: res.data,
          });

          setScanHistory((prev) => [
            {
              id: Date.now().toString(),
              code: cleanCode,
              type: 'ORDER',
              status: targetStatus,
              orderCount: 1,
              scannedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              message: `Cập nhật trạng thái đơn ${cleanCode} sang ĐÃ LƯU KHO BƯU CỤC`,
            },
            ...prev,
          ]);
          setScanCode('');
        } else {
          throw new Error(res.message || 'Cập nhật trạng thái đơn hàng không thành công');
        }
      } else {
        // Call Shipment update status API (BATCH UPDATE all orders inside tote!)
        const targetShipmentStatus = activeTab === 'ARRIVED_DEST_FACILITY' ? 'AT_HUB' : activeTab === 'IN_TRANSIT' ? 'IN_TRANSIT' : 'AT_HUB';
        const response = await fetch(`${CONFIG.API_BASE_URL}/shipments/${cleanCode}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: targetShipmentStatus,
            notes: `Nhân viên kho quét Sọt hàng ${cleanCode} xác nhận nhập kho`,
          }),
        });

        const res = await response.json();

        if (response.ok && res.success) {
          setSuccessMsg(`🎉 BẮN MÃ SỌT ${cleanCode} THÀNH CÔNG! Toàn bộ đơn hàng bên trong đã tự động chuyển sang trạng thái ĐÃ LƯU KHO BƯU CỤC!`);
          setLastScannedResult({
            code: cleanCode,
            type: 'SHIPMENT',
            status: targetShipmentStatus,
            statusLabel: 'ĐÃ LƯU KHO BƯU CỤC',
            details: res.data,
          });

          setScanHistory((prev) => [
            {
              id: Date.now().toString(),
              code: cleanCode,
              type: 'SHIPMENT',
              status: targetShipmentStatus,
              orderCount: res.data?.shipmentPackages?.length || 1,
              scannedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              message: `Đã nhập kho Sọt hàng ${cleanCode} & cập nhật đồng loạt các bưu kiện`,
            },
            ...prev,
          ]);
          setScanCode('');
        } else {
          throw new Error(res.message || 'Cập nhật trạng thái sọt hàng không thành công');
        }
      }
    } catch (err: any) {
      console.error('Lỗi quét mã nhập kho:', err);
      setError(err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái sọt hàng/đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-red-600/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-2">
              <QrCode size={14} />
              Quy Trình Quét Sọt & Nhập Kho Hàng Loạt (Batch Inbound)
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Quét Mã Sọt Hàng & Xác Nhận Cập Bưu Cục</h2>
            <p className="text-slate-400 text-xs mt-1">
              Nhân viên bưu cục bắn mã Sọt (Shipment/Tote) 1 lần ➔ Hệ thống tự động cập nhật trạng thái toàn bộ bưu kiện bên trong sang <strong className="text-emerald-400">ĐÃ LƯU KHO BƯU CỤC</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setScanCode('SH-79257540');
                setError(null);
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
            >
              <Sparkles size={14} className="text-amber-400" />
              Thử mã mẫu Sọt: SH-79257540
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scanner Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            {/* Stage Selector Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Chế độ Nhập Kho:</span>
              <button
                onClick={() => setActiveTab('AT_HUB')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'AT_HUB'
                    ? 'bg-red-50 text-[#bc0100] border border-red-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Building2 size={14} />
                Nhập Kho Bưu Cục Gốc (Origin Hub)
              </button>
              <button
                onClick={() => setActiveTab('ARRIVED_DEST_FACILITY')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'ARRIVED_DEST_FACILITY'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Layers size={14} />
                Nhập Kho Bưu Cục Phát (Destination Hub)
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Quét Barcode / Nhập Mã Sọt Hàng (Tote) hoặc Mã Đơn Hàng:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="VD: SH-79257540 hoặc ORD-7802000053..."
                    className="w-full pl-11 pr-32 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-[#bc0100] focus:bg-white rounded-xl font-mono font-bold text-sm text-slate-900 shadow-inner transition outline-none"
                    autoFocus
                  />
                  <div className="absolute left-3 text-slate-400">
                    <QrCode size={20} />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="absolute right-2 px-4 py-2 bg-[#bc0100] hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    XÁC NHẬN NHẬP KHO
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                  💡 <strong>Mẹo:</strong> Sử dụng súng quét mã USB hoặc camera máy tính để bắn mã liên tục mà không cần click chuột.
                </p>
              </div>
            </form>

            {/* Feedback Notifications */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
                <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Last Scanned Tote / Order Preview Card */}
            {lastScannedResult && (
              <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-r from-slate-50 to-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-100 rounded-lg text-[#bc0100]">
                      <Package size={18} />
                    </div>
                    <div>
                      <h4 className="font-mono font-extrabold text-sm text-slate-900">
                        {lastScannedResult.code}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        {lastScannedResult.type === 'SHIPMENT' ? 'Sọt hàng gom (Shipment Tote)' : 'Bưu kiện lẻ (Order)'}
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold border border-emerald-200">
                    ✅ {lastScannedResult.statusLabel}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 text-xs border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời gian nhập kho:</span>
                    <span className="font-semibold text-slate-700">{new Date().toLocaleString('vi-VN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Số lượng bưu kiện cập nhật:</span>
                    <span className="font-bold text-emerald-700">{lastScannedResult.details?.shipmentPackages?.length || 1} kiện</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Scan History */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History size={16} className="text-[#bc0100]" />
                Lịch Sử Quét Sọt Gần Đây
              </h3>
              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {scanHistory.length} sọt
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {scanHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-xs text-slate-900">{item.code}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{item.scannedAt}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{item.message}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Cập nhật: {item.orderCount} kiện
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToteScanTab;
