import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
import {
  QrCode,
  Package,
  CheckCircle2,
  AlertCircle,
  Building2,
  Layers,
  RefreshCw,
  History,
  Truck,
  Sparkles,
  Camera,
  CameraOff,
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
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [currentFacility, setCurrentFacility] = useState<any | null>(null);

  useEffect(() => {
    const fetchStaffFacility = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data?.staff?.assignedFacility) {
          setCurrentFacility(data.data.staff.assignedFacility);
        }
      } catch (err) { }
    };
    fetchStaffFacility();
  }, []);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCameraActive(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => { });
      }
    } catch (err: any) {
      console.error('Không thể bật camera:', err);
      setError('Không thể truy cập camera máy tính/điện thoại. Vui lòng cấp quyền truy cập camera!');
      stopCamera();
    }
  };

  // Cleanup camera stream whenever component unmounts (e.g. switching tabs)
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const fetchScanHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${CONFIG.API_BASE_URL}/orders/sorting-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setScanHistory(data.data);
      }
    } catch (err) {
      console.log('Không thể tải lịch sử quét từ máy chủ.');
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, []);

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { });
    }
  }, [isCameraActive]);

  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);
  const lastSubmittedCodeRef = useRef<string>('');
  const lastSubmittedTimeRef = useRef<number>(0);

  const performScanSubmission = async (codeToSubmit: string) => {
    const cleanCode = codeToSubmit.trim();
    if (!cleanCode) {
      setError('Vui lòng nhập hoặc quét mã Sọt hàng / Mã đơn hàng');
      return;
    }

    const now = Date.now();
    if (cleanCode === lastSubmittedCodeRef.current && (now - lastSubmittedTimeRef.current < 6000)) {
      console.warn(`[ToteScanTab] Blocked duplicate scan submission for code: ${cleanCode}`);
      return;
    }
    lastSubmittedCodeRef.current = cleanCode;
    lastSubmittedTimeRef.current = now;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const isOrder = cleanCode.toUpperCase().startsWith('ORD-');

      if (isOrder) {
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
          setSuccessMsg(`🎯 MÁY QUÉT ĐÃ BẮN MÃ ${cleanCode}! Trạng thái kho cập nhật sang ĐÃ LƯU KHO BƯU CỤC!`);
          setLastScannedResult({
            code: cleanCode,
            type: 'ORDER',
            status: targetStatus,
            statusLabel: 'ĐÃ LƯU KHO BƯU CỤC',
            details: res.data,
          });

          setScanHistory((prev) => {
            if (prev.length > 0 && prev[0].code === cleanCode) return prev;
            return [
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
            ];
          });
          setScanCode('');
          fetchScanHistory();
        } else {
          throw new Error(res.message || 'Cập nhật trạng thái đơn hàng không thành công');
        }
      } else {
        const targetShipmentStatus = activeTab === 'ARRIVED_DEST_FACILITY' ? 'AT_HUB' : activeTab === 'IN_TRANSIT' ? 'IN_TRANSIT' : 'AT_HUB';
        const response = await fetch(`${CONFIG.API_BASE_URL}/shipments/${cleanCode}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: targetShipmentStatus,
            notes: `Nhân viên kho quét Sọt hàng ${cleanCode} xác nhận ${activeTab === 'IN_TRANSIT' ? 'xuất kho' : 'nhập kho'}`,
          }),
        });

        const res = await response.json();

        if (response.ok && res.success) {
          setSuccessMsg(`🎯 MÁY QUÉT ĐÃ BẮN MÃ SỌT ${cleanCode}! Toàn bộ đơn hàng bên trong đã tự động cập nhật!`);
          setLastScannedResult({
            code: cleanCode,
            type: 'SHIPMENT',
            status: targetShipmentStatus,
            statusLabel: activeTab === 'IN_TRANSIT' ? 'ĐANG TRUNG CHUYỂN GIỮA KHO' : 'ĐÃ LƯU KHO BƯU CỤC',
            details: res.data,
          });

          setScanHistory((prev) => {
            if (prev.length > 0 && prev[0].code === cleanCode) return prev;
            return [
              {
                id: Date.now().toString(),
                code: cleanCode,
                type: 'SHIPMENT',
                status: targetShipmentStatus,
                orderCount: res.data?.shipmentPackages?.length || 1,
                scannedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                message: `Xác nhận ${activeTab === 'IN_TRANSIT' ? 'Xuất kho' : 'Nhập kho'} Sọt hàng ${cleanCode}`,
              },
              ...prev,
            ];
          });
          setScanCode('');
          fetchScanHistory();
        } else {
          throw new Error(res.message || 'Cập nhật trạng thái sọt hàng không thành công');
        }
      }
    } catch (err: any) {
      console.error('Lỗi quét mã nhập/xuất kho:', err);
      setError(err.response?.data?.message || err.message || 'Không thể cập nhật trạng thái sọt hàng/đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  // Automatic Continuous Camera Barcode & QR Detector Engine (jsQR + BarcodeDetector)
  useEffect(() => {
    if (!isCameraActive) return;

    let intervalId: any;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'upc_a', 'data_matrix', 'pdf417'],
        });
      } catch (e) {
        console.log('BarcodeDetector format error:', e);
      }
    }

    const canvasElement = document.createElement('canvas');
    const canvasCtx = canvasElement.getContext('2d', { willReadFrequently: true });

    const processFrame = async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      const video = videoRef.current;
      let detectedValue = '';

      // 1. Try jsQR first (Ultra fast, 100% reliable on phone screens & webcams)
      if (canvasCtx) {
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvasElement.width = width;
        canvasElement.height = height;
        canvasCtx.drawImage(video, 0, 0, width, height);

        const imageData = canvasCtx.getImageData(0, 0, width, height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (qrCode && qrCode.data && qrCode.data.trim()) {
          detectedValue = qrCode.data.trim();
        }
      }

      // 2. Secondary fallback: BarcodeDetector for 1D barcodes
      if (!detectedValue && detector) {
        try {
          const barcodes = await detector.detect(video).catch(() => []);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedValue = barcodes[0].rawValue.trim();
          }
        } catch (e) {
          // ignore
        }
      }

      // 3. Auto Trigger Scan Submission (With Smart Deduplication & 10s Cooldown for exact same barcode)
      if (detectedValue) {
        const now = Date.now();
        const isSameCode = detectedValue === lastScannedCodeRef.current;
        const cooldownMs = isSameCode ? 10000 : 1200; // 10s cooldown for same code, 1.2s for new code

        if (now - lastScanTimeRef.current > cooldownMs) {
          console.log('🎉 TOTE SCANNER DECODED CODE:', detectedValue);
          lastScannedCodeRef.current = detectedValue;
          lastScanTimeRef.current = now;
          setScanCode(detectedValue);
          performScanSubmission(detectedValue);
        }
      }
    };

    intervalId = setInterval(processFrame, 150);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCameraActive, activeTab]);

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performScanSubmission(scanCode);
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
              Quy Trình Quét Mã Sọt & Kiện Hàng (Batch Inbound / Outbound)
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Quét Nhập / Xuất Kho Bưu Cục</h2>
            <p className="text-slate-400 text-xs mt-1">
              Nhân viên bưu cục dùng camera hoặc súng quét mã bắn mã Sọt 1 lần ➔ Hệ thống tự động cập nhật đồng loạt trạng thái bưu kiện bên trong.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => (isCameraActive ? stopCamera() : startCamera())}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-sm ${isCameraActive
                  ? 'bg-red-600 hover:bg-red-700 text-white border-red-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                }`}
            >
              {isCameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
              {isCameraActive ? 'Tắt Camera Quét' : 'Bật Camera Quét Live'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      {isCameraActive && (
        <div className="bg-slate-950 rounded-2xl p-5 border-2 border-red-500/40 shadow-2xl relative space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase">
              <Camera size={16} className="animate-pulse" />
              Camera Live Viewfinder Scanner
            </div>
            <button
              onClick={stopCamera}
              className="text-slate-400 hover:text-white text-xs font-bold underline"
            >
              Đóng Camera
            </button>
          </div>
          <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && streamRef.current && el.srcObject !== streamRef.current) {
                  el.srcObject = streamRef.current;
                  el.play().catch(() => { });
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-2 border-red-500/60 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="w-48 h-32 border-2 border-dashed border-red-400 rounded-lg animate-pulse"></div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Hướng ống kính camera về mã vạch / QR Code trên Sọt hàng hoặc Đơn hàng để quét.
          </p>
        </div>
      )}

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scanner Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            {/* Stage Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Chế độ Quét Kho:</span>
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
                onClick={() => setActiveTab('IN_TRANSIT')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'IN_TRANSIT'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Truck size={14} />
                Xuất Kho Trung Chuyển (In Transit)
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

                {/* Smart Facility Zone Sorting Recommendation Banner */}
                {(() => {
                  const facCode = currentFacility?.facilityCode?.toUpperCase() || '';
                  const isProvincialHub = currentFacility?.facilityType === 'PROVINCIAL_HUB' ||
                    facCode.includes('HUB') ||
                    facCode === 'FAC-HUB-HCM' ||
                    facCode === 'FAC_HUB_HCM';
                  const receivingZoneCode = isProvincialHub ? 'ZONE-P-INBOUND' : 'ZONE-W-REC';
                  const receivingZoneName = isProvincialHub ? 'Bãi Nhập Hàng Xe Tải Bưu Cục Phường' : 'Khu Tiếp Nhận & Bàn Giao Hàng';
                  const facCodeClean = facCode ? facCode.replace(/[^a-zA-Z0-9]/g, '_') : 'FAC_HUB_HCM';
                  const receivingToteCode = `TOTE-${facCodeClean}-${receivingZoneCode}-001`;

                  return (
                    <div className="mt-3 bg-slate-900 rounded-xl p-4 text-white space-y-2.5 border border-slate-800 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={14} />
                          Phân Khu Lưu Kho Nhập Hàng (Assigned Receiving Zone)
                        </span>
                        <span className="px-3 py-1 rounded text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                          {receivingZoneCode}
                        </span>
                      </div>

                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-300">📍 Phân khu tiếp nhận:</span>
                          <span className="font-bold text-emerald-400">{receivingZoneName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-300">📦 Sọt tập kết nhận đơn:</span>
                          <span className="font-mono font-bold text-amber-400">[{receivingToteCode}]</span>
                        </div>
                        <p className="text-[11px] text-slate-300 pt-1.5 border-t border-slate-700/80 mt-1">
                          👉 <em>Bưu kiện đã được lưu kho thành công tại <strong>{receivingZoneName}</strong>. Chuyển sang tab <strong>"Phân Loại Hàng Vào Zone Kho"</strong> khi chia bưu kiện sang sọt mới.</em>
                        </p>
                      </div>
                    </div>
                  );
                })()}
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
