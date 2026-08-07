import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import {
  Layers,
  QrCode,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  History,
  Sparkles,
  Camera,
  CameraOff,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { CONFIG } from '../../../../config';

interface FacilityZoneItem {
  id: string;
  zoneCode: string;
  zoneName: string;
  zoneType: string;
  capacity?: number;
}

interface SortingHistoryItem {
  id: string;
  packageCode: string;
  zoneCode: string;
  zoneName: string;
  toteCode?: string;
  sortedAt: string;
  status: string;
}

export const ZoneSortingTab: React.FC = () => {
  const [scanCode, setScanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannedPackageInfo, setScannedPackageInfo] = useState<any | null>(null);
  const [liveScannedInfo, setLiveScannedInfo] = useState<any | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [isEditingZone, setIsEditingZone] = useState<boolean>(false);
  const [toteCounters, setToteCounters] = useState<Record<string, number>>({
    'ZONE-W-REC': 1,
    'ZONE-W-LOCAL': 1,
    'ZONE-W-PROVINCE-DISPATCH': 1,
    'ZONE-W-RETURN': 1,
  });

  const getActiveToteCode = (zoneCode: string) => {
    const counter = toteCounters[zoneCode] || 1;
    const formattedNum = String(counter).padStart(3, '0');
    return `TOTE-${zoneCode}-${formattedNum}`;
  };

  const handleSealAndOpenNewTote = (zoneCode: string) => {
    const currentCode = getActiveToteCode(zoneCode);
    const nextCounter = (toteCounters[zoneCode] || 1) + 1;
    const nextCode = `TOTE-${zoneCode}-${String(nextCounter).padStart(3, '0')}`;
    setToteCounters((prev) => ({
      ...prev,
      [zoneCode]: nextCounter,
    }));
    setSuccessMsg(`🔒 Đã chốt niêm phong sọt [${currentCode}]! Đã tự động tạo Sọt mới [${nextCode}] sẵn sàng chứa hàng.`);
  };

  const [facilityZones, setFacilityZones] = useState<FacilityZoneItem[]>([
    { id: '1', zoneCode: 'ZONE-W-REC', zoneName: 'Khu Tiếp Nhận & Bàn Giao Hàng', zoneType: 'RECEIVING' },
    { id: '2', zoneCode: 'ZONE-W-LOCAL', zoneName: 'Khu Giao Hàng Nội Phường (Cùng Bưu Cục)', zoneType: 'SORTING' },
    { id: '3', zoneCode: 'ZONE-W-PROVINCE-DISPATCH', zoneName: 'Khu Xuất Hàng Đi Kho Tỉnh / TP', zoneType: 'SHIPPING' },
    { id: '4', zoneCode: 'ZONE-W-RETURN', zoneName: 'Khu Lưu Kho & Hàng Cho Chuyển Hoàn', zoneType: 'RETURN' },
  ]);

  const [sortingHistory, setSortingHistory] = useState<SortingHistoryItem[]>([]);

  const fetchSortingHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${CONFIG.API_BASE_URL}/orders/sorting-history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSortingHistory(data.data);
      }
    } catch (err) {
      console.log('Không thể tải lịch sử phân loại từ máy chủ.');
    }
  };

  useEffect(() => {
    fetchSortingHistory();
  }, []);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Stop Camera Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  // Start Camera Stream
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
      setError('Không thể truy cập camera máy tính/điện thoại. Vui lòng kiểm tra quyền camera!');
      stopCamera();
    }
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => { });
    }
  }, [isCameraActive]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Fetch Facility Zones for staff's assigned facility
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const staffRes = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const staffData = await staffRes.json();
        const facilityId = staffData?.data?.staff?.assignedFacilityId;

        if (facilityId) {
          const zonesRes = await fetch(`${CONFIG.API_BASE_URL}/facilities/${facilityId}/zones`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const zonesData = await zonesRes.json();
          if (zonesData.success && zonesData.data && zonesData.data.length > 0) {
            const uniqueZonesMap = new Map();
            (zonesData.data || []).forEach((z: any) => {
              if (!uniqueZonesMap.has(z.zoneCode)) {
                uniqueZonesMap.set(z.zoneCode, z);
              }
            });
            const uniqueZones = Array.from(uniqueZonesMap.values());
            setFacilityZones(uniqueZones as FacilityZoneItem[]);
            if (uniqueZones.length > 0) {
              setSelectedZoneId(uniqueZones[0].id);
            }
          }
        }
      } catch (err) {
        console.log('Sử dụng danh sách Zone mặc định của bưu cục.');
      }
    };
    fetchZones();
    fetchSortingHistory();
  }, []);

  const performLookup = async (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim();
    if (!cleanCode) {
      setError('Vui lòng nhập hoặc quét mã Bưu kiện / Mã đơn hàng');
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

      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${cleanCode}`, {
        headers,
      });

      const res = await response.json();

      if (response.ok && res.success) {
        const orderData = res.data;
        const isIntraWard = orderData.originFacilityId === orderData.destinationFacilityId;
        const isIntraProvince = orderData.originFacility?.provinceCode === orderData.destinationFacility?.provinceCode;
        const destFacility = orderData.destinationFacility;
        const destFacilityName = destFacility?.facilityName || 'Bưu cục đích';
        const destProvinceName = destFacility?.provinceName || 'Tỉnh / Thành phố đích';

        let suggestedZoneCode = 'ZONE-W-LOCAL';
        let suggestedZoneName = 'Khu A: Khu Giao Hàng Nội Phường (Giao Tại Chỗ)';
        let instructionText = `🟢 Bưu kiện giao cùng bưu cục! Giữ tại bưu cục và phân loại vào Khu A (Chờ Shipper xe máy giao đến ${destFacilityName}).`;

        if (!isIntraWard && isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-PROVINCE-DISPATCH';
          suggestedZoneName = `Khu B: Khu Xuất Hàng Đi Kho Tỉnh / TP (${destProvinceName})`;
          instructionText = `🟡 Bưu kiện giao khác phường, cùng tỉnh/TP! Phân loại vào Khu B (Chờ Xe Tải 3.5 Tấn chuyển sang ${destFacilityName}).`;
        } else if (!isIntraWard && !isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-SORTER-DISPATCH';
          suggestedZoneName = `Khu C: Khu Xuất Hàng Mega Sorter (Liên Miền - ${destProvinceName})`;
          instructionText = `🔴 Bưu kiện giao liên tỉnh / liên miền! Phân loại vào Khu C (Chờ Xe Tải Container 15 Tấn chở đi ${destProvinceName}).`;
        }

        const matchedZone = facilityZones.find((z) => z.zoneCode === suggestedZoneCode) || facilityZones[0];
        if (matchedZone) {
          setSelectedZoneId(matchedZone.id);
        }

        setIsEditingZone(false);
        setScannedPackageInfo({
          code: cleanCode,
          order: orderData,
          suggestedZoneCode,
          suggestedZoneName,
          instructionText,
        });

        setSuccessMsg(`ĐÃ TRA CỨU THÔNG TIN BƯU KIỆN ${cleanCode}! Vui lòng kiểm tra gợi ý và bấm "LƯU VÀO KHO".`);
      } else {
        throw new Error(res.message || 'Không tìm thấy thông tin đơn hàng / bưu kiện');
      }
    } catch (err: any) {
      console.error('Lỗi tra cứu bưu kiện phân loại:', err);
      setError(err.message || 'Không tìm thấy thông tin bưu kiện để phân loại');
    } finally {
      setLoading(false);
    }
  };

  // Automatic Continuous QR Code & Barcode Detector Engine
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
      try {
        if (!videoRef.current || videoRef.current.readyState < 2) return;

        const video = videoRef.current;
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height || width <= 0 || height <= 0) return;

        let detectedValue = '';

        // 1. Try jsQR first (Ultra fast, 100% reliable on phone screens & webcams)
        if (canvasCtx) {
          canvasElement.width = width;
          canvasElement.height = height;
          canvasCtx.drawImage(video, 0, 0, width, height);

          const imageData = canvasCtx.getImageData(0, 0, width, height);
          if (imageData && imageData.data && imageData.data.length > 0) {
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (qrCode && qrCode.data && qrCode.data.trim()) {
              detectedValue = qrCode.data.trim();
            }
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

        // 3. Auto Trigger Live Scan Handler
        if (detectedValue) {
          const now = Date.now();
          if (
            detectedValue !== lastScannedCodeRef.current ||
            now - lastScanTimeRef.current > 2500
          ) {
            console.log('🎉 LIVE SCANNER DECODED CODE:', detectedValue);
            lastScannedCodeRef.current = detectedValue;
            lastScanTimeRef.current = now;
            handleLiveCameraScan(detectedValue);
          }
        }
      } catch (frameErr) {
        // Silently swallow frame reading errors to prevent React white screen crash
      }
    };

    intervalId = setInterval(processFrame, 150);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCameraActive, facilityZones]);

  // Dedicated Live Camera Auto-Scan & Auto-Save Handler
  const handleLiveCameraScan = async (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim();
    if (!cleanCode) return;

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${cleanCode}`, { headers });
      const res = await response.json();

      if (response.ok && res.success) {
        const orderData = res.data;
        const isIntraWard = orderData.originFacilityId === orderData.destinationFacilityId;
        const isIntraProvince = orderData.originFacility?.provinceCode === orderData.destinationFacility?.provinceCode;
        const destFacility = orderData.destinationFacility;
        const destFacilityName = destFacility?.facilityName || 'Bưu cục đích';
        const destProvinceName = destFacility?.provinceName || 'Tỉnh / Thành phố đích';

        let suggestedZoneCode = 'ZONE-W-LOCAL';
        let suggestedZoneName = 'Khu A: Khu Giao Hàng Nội Phường (Giao Tại Chỗ)';
        let instructionText = `🟢 Bưu kiện giao cùng bưu cục! Giữ tại bưu cục và phân loại vào Khu A (Chờ Shipper xe máy giao đến ${destFacilityName}).`;

        if (!isIntraWard && isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-PROVINCE-DISPATCH';
          suggestedZoneName = `Khu B: Khu Xuất Hàng Đi Kho Tỉnh / TP (${destProvinceName})`;
          instructionText = `🟡 Bưu kiện giao khác phường, cùng tỉnh/TP! Phân loại vào Khu B (Chờ Xe Tải 3.5 Tấn chuyển sang ${destFacilityName}).`;
        } else if (!isIntraWard && !isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-SORTER-DISPATCH';
          suggestedZoneName = `Khu C: Khu Xuất Hàng Mega Sorter (Liên Miền - ${destProvinceName})`;
          instructionText = `🔴 Bưu kiện giao liên tỉnh / liên miền! Phân loại vào Khu C (Chờ Xe Tải Container 15 Tấn chở đi ${destProvinceName}).`;
        }

        const matchedZone = facilityZones.find((z) => z.zoneCode === suggestedZoneCode) || facilityZones[0];

        // 1. Update Top Right Live Board State
        setLiveScannedInfo({
          code: cleanCode,
          suggestedZoneCode,
          suggestedZoneName,
          instructionText,
        });

        // 2. Auto-save to DB & History immediately
        if (matchedZone) {
          const newItem: SortingHistoryItem = {
            id: Date.now().toString(),
            packageCode: cleanCode,
            zoneCode: matchedZone.zoneCode,
            zoneName: matchedZone.zoneName,
            sortedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            status: 'SUCCESS',
          };

          setSortingHistory((prev) => {
            const filtered = prev.filter((item) => item.packageCode !== cleanCode);
            return [newItem, ...filtered];
          });

          fetch(`${CONFIG.API_BASE_URL}/orders/${cleanCode}/sort-zone`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ zoneId: matchedZone.id }),
          })
            .then((r) => r.json())
            .then((saveRes) => {
              if (saveRes.success) {
                fetchSortingHistory();
              }
            })
            .catch(() => { });
        }
      }
    } catch (err) {
      console.log('Lỗi live camera scan:', err);
    }
  };

  const handleScanPackage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    performLookup(scanCode);
  };

  const handleConfirmSorting = async () => {
    if (!scannedPackageInfo) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('token');
      const selectedZone = facilityZones.find((z) => z.id === selectedZoneId) || facilityZones[0];

      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/${scannedPackageInfo.code}/sort-zone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          zoneId: selectedZone.id,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success) {
        setSuccessMsg(
          `🎉 ĐÃ CẬP NHẬT PHÂN KHU THÀNH CÔNG! Bưu kiện ${scannedPackageInfo.code} đã được đưa vào [${selectedZone.zoneName}]`
        );
        const newItem: SortingHistoryItem = {
          id: Date.now().toString(),
          packageCode: scannedPackageInfo.code,
          zoneCode: selectedZone.zoneCode,
          zoneName: selectedZone.zoneName,
          sortedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          status: 'SUCCESS',
        };
        setSortingHistory((prev) => {
          const filtered = prev.filter((item) => item.packageCode !== scannedPackageInfo.code);
          return [newItem, ...filtered];
        });
        fetchSortingHistory();
        setIsEditingZone(false);
      } else {
        throw new Error(res.message || 'Không thể xác nhận phân loại vào Phân Khu Kho');
      }
    } catch (err: any) {
      setError(err.message || 'Không thể xác nhận phân loại vào Zone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-amber-600/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Layers size={14} />
              Nghiệp Vụ Phân Loại Bưu Kiện Vào Phân Khu Kho (Facility Zone)
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">Phân Loại Hàng Vào Zone Kho</h2>
            <p className="text-slate-400 text-xs mt-1">
              Nhân viên kho quét mã bưu kiện ➔ Hệ thống tự động đề xuất **Khu Vực Phân Loại (Zone)** thích hợp ➔ Bấm xác nhận phân loại vào kệ/sọt kho.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => (isCameraActive ? stopCamera() : startCamera())}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 border shadow-sm ${isCameraActive
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-500'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400'
                }`}
            >
              {isCameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
              {isCameraActive ? 'Tắt Camera Quét' : 'Bật Camera Quét Live'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Camera & Realtime Sorting Dashboard (Split 50/50 Layout) */}
      {isCameraActive && (
        <div className="bg-slate-950 rounded-2xl p-6 border-2 border-amber-500/40 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wide">
              <Camera size={18} className="animate-pulse text-amber-400" />
              <span>SÀN KHAI THÁC KHO - CAMERA QUÉT MÃ & BẢNG CHỈ DẪN PHÂN LOẠI REALTIME</span>
            </div>
            <button
              onClick={stopCamera}
              className="px-3 py-1 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white rounded-lg text-xs font-bold border border-red-500/40 transition"
            >
              ✕ Đóng Camera
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Column (50%): Camera Viewfinder */}
            <div className="flex flex-col justify-between space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
              <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
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
                <div className="absolute inset-0 border-2 border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-36 border-2 border-dashed border-amber-400 rounded-lg animate-pulse flex items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded shadow">
                      Khung quét QR
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center font-medium">
                📸 Hướng tem mã vạch Bưu kiện vào khung nét đứt màu vàng để máy tự động bắn mã.
              </p>
            </div>

            {/* Right Column (50%): Giant Realtime Sorting Instruction Board */}
            {(() => {
              const activeDisplayInfo = liveScannedInfo || scannedPackageInfo;
              return (
                <div className="flex flex-col justify-between bg-slate-900/90 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={16} />
                      BẢNG HIỂN THỊ HƯỚNG PHÂN LOẠI HÀNG
                    </span>
                    {activeDisplayInfo && (
                      <span className="font-mono text-xs font-bold bg-slate-800 text-slate-200 px-2.5 py-1 rounded border border-slate-700">
                        {activeDisplayInfo.code}
                      </span>
                    )}
                  </div>

                  {activeDisplayInfo ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-center animate-fade-in">
                      {/* Giant Target Zone Display Box */}
                      <div
                        className={`p-5 rounded-2xl border text-center space-y-2 shadow-xl ${activeDisplayInfo.suggestedZoneCode === 'ZONE-W-LOCAL'
                          ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-100 ring-2 ring-emerald-500/30'
                          : activeDisplayInfo.suggestedZoneCode === 'ZONE-W-PROVINCE-DISPATCH'
                            ? 'bg-amber-950/80 border-amber-500/50 text-amber-100 ring-2 ring-amber-500/30'
                            : 'bg-rose-950/80 border-rose-500/50 text-rose-100 ring-2 ring-rose-500/30'
                          }`}
                      >
                        <span className="text-xs font-bold uppercase tracking-widest block opacity-80">
                          PHÂN KHU KHO ĐÍCH NÉM HÀNG VÀO:
                        </span>
                        <h3 className="text-2xl font-black tracking-tight font-mono">
                          {activeDisplayInfo.suggestedZoneCode}
                        </h3>
                        <div className="text-sm font-extrabold py-1 px-3 rounded-full bg-black/40 inline-block border border-white/10">
                          {activeDisplayInfo.suggestedZoneName}
                        </div>

                        {/* Giant Active Tote Instruction Badge */}
                        <div className="pt-2 border-t border-white/10 mt-2">
                          <span className="text-[11px] font-bold text-amber-300 uppercase block tracking-wider">
                            NÉM VÀO SỌT HÀNG MÃ SỐ:
                          </span>
                          <div className="text-xl font-mono font-black text-amber-400 bg-amber-950/90 px-4 py-1.5 rounded-xl border border-amber-500/50 inline-block shadow-inner mt-1">
                            {activeDisplayInfo.toteCode || getActiveToteCode(activeDisplayInfo.suggestedZoneCode)}
                          </div>
                        </div>
                      </div>

                      {/* Clear Action Recommendation */}
                      <p className="text-xs font-semibold text-slate-200 bg-slate-800/90 p-3.5 rounded-xl border border-slate-700 leading-relaxed text-center shadow">
                        {activeDisplayInfo.instructionText}
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-800 rounded-xl space-y-2">
                      <Package size={42} className="text-amber-500/60 animate-bounce" />
                      <h4 className="text-sm font-bold text-slate-300">Đang chờ quét bưu kiện...</h4>
                      <p className="text-xs text-slate-500 max-w-xs">
                        Hướng tem bưu kiện vào camera phía bên trái. Kết quả phân loại và vị trí ném sọt sẽ hiển thị to rõ tại đây!
                      </p>
                    </div>
                  )}

                  {/* Dynamic 4 Facility Zones Reference Footer with Active Tote & Chốt Sọt button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-slate-800 pt-3">
                    {facilityZones.map((z, idx) => {
                      const activeTote = getActiveToteCode(z.zoneCode);
                      const styles = [
                        'bg-emerald-950/60 text-emerald-300 border-emerald-500/40',
                        'bg-blue-950/60 text-blue-300 border-blue-500/40',
                        'bg-amber-950/60 text-amber-300 border-amber-500/40',
                        'bg-rose-950/60 text-rose-300 border-rose-500/40',
                      ];
                      return (
                        <div
                          key={z.id || idx}
                          className={`p-2.5 rounded-xl border font-sans font-semibold text-[11px] leading-tight flex flex-col justify-between ${styles[idx % styles.length]}`}
                        >
                          <div>
                            <span className="font-mono font-extrabold text-xs block opacity-90">{z.zoneCode}</span>
                            <span className="text-[10px] font-medium opacity-80 line-clamp-1">{z.zoneName}</span>
                          </div>
                          <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
                            <span className="font-mono font-bold text-[10px] bg-black/40 px-2 py-0.5 rounded border border-white/10">
                              {activeTote}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleSealAndOpenNewTote(z.zoneCode)}
                              className="text-[9px] font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-0.5 rounded transition shadow shrink-0"
                            >
                              🔒 Chốt Sọt
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & Zone Selector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
            {/* Input Form */}
            <form onSubmit={handleScanPackage} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Quét Barcode / Nhập Mã Bưu Kiện Cần Phân Loại:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Nhập mã đơn hàng VD: ORD-7802000053..."
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl font-mono font-bold text-sm text-slate-900 shadow-inner transition outline-none"
                    autoFocus
                  />
                  <div className="absolute left-3 text-slate-400">
                    <QrCode size={20} />
                  </div>
                </div>
              </div>

              {/* Dedicated 2-Button Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="submit"
                  disabled={loading || !scanCode.trim()}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold uppercase transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  TRA CỨU
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSorting}
                  disabled={loading || !scannedPackageInfo}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  LƯU
                </button>
              </div>
            </form>

            {/* Notifications */}
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

            {/* Scanned Package Details & Zone Assignment Panel */}
            {scannedPackageInfo && (
              <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-r from-slate-50 to-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                      <Package size={20} />
                    </div>
                    <div>
                      <h4 className="font-mono font-extrabold text-sm text-slate-900">
                        {scannedPackageInfo.code}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        Gửi từ: {scannedPackageInfo.order?.originFacility?.facilityName || 'Bưu cục gốc'} ➔ Đến: {scannedPackageInfo.order?.destinationFacility?.facilityName || 'Bưu cục đích'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingZone(!isEditingZone)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border shadow-sm ${isEditingZone
                      ? 'bg-slate-200 hover:bg-slate-300 text-slate-700 border-slate-300'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400'
                      }`}
                  >
                    <Edit3 size={14} />
                    {isEditingZone ? 'Hủy Chỉnh Sửa' : 'Thay Đổi Phân Khu'}
                  </button>
                </div>

                {/* Smart Recommendation Banner */}
                <div className="bg-slate-900 rounded-xl p-4 text-white space-y-2 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Gợi Ý Định Tuyến Phân Khu Kho
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                      {scannedPackageInfo.suggestedZoneCode}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {scannedPackageInfo.instructionText}
                  </p>
                </div>

                {/* Zone Cards: Read-only in View Mode / Clickable in Edit Mode */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      {isEditingZone ? 'Bấm chọn Phân Khu Kho mới:' : 'Phân Khu Kho Đã Được Ghi Nhận:'}
                    </label>
                    {!isEditingZone && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Bảng chỉ xem thông tin
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {facilityZones.map((zone) => {
                      const isSelected = selectedZoneId === zone.id;
                      return (
                        <button
                          type="button"
                          key={zone.id}
                          disabled={!isEditingZone}
                          onClick={() => {
                            if (isEditingZone) {
                              setSelectedZoneId(zone.id);
                            }
                          }}
                          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${isSelected
                            ? 'border-amber-500 bg-amber-50/90 ring-2 ring-amber-500/30 font-bold'
                            : isEditingZone
                              ? 'border-slate-200 bg-white hover:bg-slate-50 cursor-pointer'
                              : 'border-slate-200 bg-slate-50/50 opacity-60 cursor-default'
                            }`}
                        >
                          <div>
                            <span className="font-mono font-extrabold text-xs block text-slate-900">
                              {zone.zoneCode}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-600 line-clamp-1">
                              {zone.zoneName}
                            </span>
                          </div>
                          {isSelected && (
                            <ShieldCheck size={18} className="text-amber-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action Footer: Save Button in Edit Mode */}
                {isEditingZone && (
                  <button
                    onClick={handleConfirmSorting}
                    disabled={loading}
                    className="w-full py-3 bg-[#bc0100] hover:bg-red-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    XÁC NHẬN LƯU THAY ĐỔI PHÂN KHU KHO MỚI
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: History */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History size={16} className="text-amber-600" />
                Lịch Sử Phân Loại Vừa Thực Hiện
              </h3>
              <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {sortingHistory.length} đơn
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {sortingHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-extrabold text-xs text-slate-900">
                      {item.packageCode}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{item.sortedAt}</span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium line-clamp-1">{item.zoneName}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {item.zoneCode}
                    </span>
                    <span className="text-[10px] font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {item.toteCode || getActiveToteCode(item.zoneCode)}
                    </span>
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

export default ZoneSortingTab;
