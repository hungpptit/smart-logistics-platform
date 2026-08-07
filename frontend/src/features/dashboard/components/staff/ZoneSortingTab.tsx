import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import {
  Layers,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Camera,
  CameraOff,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { CONFIG } from '../../../../config';
import { ZoneToteExplorer } from './zone-sorting/ZoneToteExplorer';
import type { FacilityZoneItem } from './zone-sorting/ZoneToteExplorer';
import { TotePackageDetailModal } from './zone-sorting/TotePackageDetailModal';
import { LiveCameraSortingBoard } from './zone-sorting/LiveCameraSortingBoard';
import { SortingHistoryPanel } from './zone-sorting/SortingHistoryPanel';
import type { SortingHistoryItem } from './zone-sorting/SortingHistoryPanel';

export const ZoneSortingTab: React.FC = () => {
  const [scanCode, setScanCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [scannedPackageInfo, setScannedPackageInfo] = useState<any | null>(null);
  const [liveScannedInfo, setLiveScannedInfo] = useState<any | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [isEditingZone, setIsEditingZone] = useState<boolean>(false);

  // Tote Counters State
  const [toteCounters, setToteCounters] = useState<Record<string, number>>({
    'ZONE-W-REC': 1,
    'ZONE-W-LOCAL': 1,
    'ZONE-W-PROVINCE-DISPATCH': 1,
    'ZONE-W-RETURN': 1,
  });

  // State for Zone Explorer & Tote Popup Modal
  const [activeExplorerZone, setActiveExplorerZone] = useState<string>('ZONE-W-PROVINCE-DISPATCH');
  const [zoneTotesData, setZoneTotesData] = useState<any[]>([]);
  const [selectedToteModal, setSelectedToteModal] = useState<any | null>(null);
  const [toteModalLoading, setToteModalLoading] = useState<boolean>(false);

  const getActiveToteCode = (zoneCode: string) => {
    const counter = toteCounters[zoneCode] || 1;
    const formattedNum = String(counter).padStart(3, '0');
    return `TOTE-${zoneCode}-${formattedNum}`;
  };

  const handleSealAndOpenNewTote = async (zoneCode: string) => {
    const currentCode = getActiveToteCode(zoneCode);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${CONFIG.API_BASE_URL}/orders/seal-tote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ toteCode: currentCode }),
      });
    } catch (e) { }

    setSelectedToteModal((prev) => (prev ? { ...prev, status: 'SEALED' } : null));

    const nextCounter = (toteCounters[zoneCode] || 1) + 1;
    const nextCode = `TOTE-${zoneCode}-${String(nextCounter).padStart(3, '0')}`;
    setToteCounters((prev) => ({
      ...prev,
      [zoneCode]: nextCounter,
    }));
    setSuccessMsg(`Đã chốt niêm phong sọt [${currentCode}]! Đã tự động tạo Sọt mới [${nextCode}] sẵn sàng chứa hàng.`);
    fetchZoneTotes();
  };

  const fetchZoneTotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${CONFIG.API_BASE_URL}/orders/zone-totes`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setZoneTotesData(data.data);

        setToteCounters((prev) => {
          const updatedCounters: Record<string, number> = { ...prev };

          data.data.forEach((group: any) => {
            const zCode = group.zoneCode;
            const totes = group.totes || [];

            let maxOpenCounter = 1;
            let maxSealedCounter = 0;

            totes.forEach((t: any) => {
              const parts = t.toteCode.split('-');
              const num = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(num)) {
                if (t.status === 'OPEN' && num > maxOpenCounter) {
                  maxOpenCounter = num;
                }
                if ((t.status === 'SEALED' || t.status === 'LOADED') && num > maxSealedCounter) {
                  maxSealedCounter = num;
                }
              }
            });

            const activeCounter = Math.max(maxOpenCounter, maxSealedCounter > 0 ? maxSealedCounter + 1 : 1);
            updatedCounters[zCode] = activeCounter;
          });

          return updatedCounters;
        });
      }
    } catch (err) {
      console.log('Lỗi tải danh sách sọt hàng:', err);
    }
  };

  const handleOpenToteDetailModal = async (toteCode: string) => {
    setToteModalLoading(true);
    setSelectedToteModal(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${CONFIG.API_BASE_URL}/orders/tote/${encodeURIComponent(toteCode)}/packages`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedToteModal(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải chi tiết sọt hàng:', err);
    } finally {
      setToteModalLoading(false);
    }
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

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const startCamera = async () => {
    try {
      setError(null);
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
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

  // Fetch Facility Zones
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
    fetchZoneTotes();
  }, []);

  // Continuous Camera Frame Decoder
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

        if (!detectedValue && detector) {
          try {
            const barcodes = await detector.detect(video).catch(() => []);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              detectedValue = barcodes[0].rawValue.trim();
            }
          } catch (e) { }
        }

        if (detectedValue) {
          const now = Date.now();
          if (detectedValue !== lastScannedCodeRef.current || now - lastScanTimeRef.current > 2500) {
            console.log('🎉 LIVE SCANNER DECODED CODE:', detectedValue);
            lastScannedCodeRef.current = detectedValue;
            lastScanTimeRef.current = now;
            handleLiveCameraScan(detectedValue);
          }
        }
      } catch (frameErr) { }
    };

    intervalId = setInterval(processFrame, 150);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isCameraActive, facilityZones]);

  // Live Camera Scan Auto-Save
  const handleLiveCameraScan = async (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim();
    if (!cleanCode) return;

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/by-code/${encodeURIComponent(cleanCode)}`, { headers });
      const res = await response.json();

      if (response.ok && res.success) {
        const orderData = res.data;
        const isIntraWard = orderData.originFacilityId === orderData.destinationFacilityId;
        const isIntraProvince = orderData.originFacility?.provinceCode === orderData.destinationFacility?.provinceCode;
        const destFacilityName = orderData.destinationFacility?.facilityName || 'Bưu cục đích';
        const destProvinceName = orderData.destinationFacility?.provinceName || 'Tỉnh / TP đích';

        let suggestedZoneCode = 'ZONE-W-LOCAL';
        let suggestedZoneName = 'Khu A: Khu Giao Hàng Nội Phường (Giao Tại Chỗ)';
        let instructionText = `🟢 Bưu kiện giao cùng bưu cục! Giữ tại bưu cục và ném vào Khu A (Xe máy giao ${destFacilityName}).`;

        if (!isIntraWard && isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-PROVINCE-DISPATCH';
          suggestedZoneName = `Khu B: Khu Xuất Hàng Đi Kho Tỉnh / TP (${destProvinceName})`;
          instructionText = `🟡 Bưu kiện giao cùng tỉnh/TP! Ném vào Khu B (Xe Tải 3.5 Tấn đi ${destFacilityName}).`;
        } else if (!isIntraWard && !isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-SORTER-DISPATCH';
          suggestedZoneName = `Khu C: Khu Xuất Hàng Mega Sorter (Liên Miền - ${destProvinceName})`;
          instructionText = `🔴 Bưu kiện giao liên tỉnh! Ném vào Khu C (Container 15 Tấn đi ${destProvinceName}).`;
        }

        const matchedZone = facilityZones.find((z) => z.zoneCode === suggestedZoneCode) || facilityZones[0];
        const activeToteCode = getActiveToteCode(suggestedZoneCode);

        setLiveScannedInfo({
          code: cleanCode,
          order: orderData,
          suggestedZoneCode,
          suggestedZoneName,
          instructionText,
          toteCode: activeToteCode,
        });

        if (matchedZone) {
          await fetch(`${CONFIG.API_BASE_URL}/orders/assign-zone`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              code: cleanCode,
              zoneId: matchedZone.id,
              toteCode: activeToteCode,
            }),
          });

          fetchSortingHistory();
          fetchZoneTotes();
        }

        setSuccessMsg(`LIVE SCAN: ĐÃ TỰ ĐỘNG LƯU BƯU KIỆN ${cleanCode} VÀO ${suggestedZoneCode} (SỌT: ${activeToteCode})!`);
      }
    } catch (err: any) {
      console.error('Lỗi live scan:', err);
    }
  };

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

      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/by-code/${encodeURIComponent(cleanCode)}`, { headers });
      const res = await response.json();

      if (response.ok && res.success) {
        const orderData = res.data;
        const isIntraWard = orderData.originFacilityId === orderData.destinationFacilityId;
        const isIntraProvince = orderData.originFacility?.provinceCode === orderData.destinationFacility?.provinceCode;
        const destFacilityName = orderData.destinationFacility?.facilityName || 'Bưu cục đích';
        const destProvinceName = orderData.destinationFacility?.provinceName || 'Tỉnh / TP đích';

        let suggestedZoneCode = 'ZONE-W-LOCAL';
        let suggestedZoneName = 'Khu A: Khu Giao Hàng Nội Phường (Giao Tại Chỗ)';
        let instructionText = `🟢 Bưu kiện giao cùng bưu cục! Giữ tại bưu cục và ném vào Khu A (Xe máy giao ${destFacilityName}).`;

        if (!isIntraWard && isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-PROVINCE-DISPATCH';
          suggestedZoneName = `Khu B: Khu Xuất Hàng Đi Kho Tỉnh / TP (${destProvinceName})`;
          instructionText = `🟡 Bưu kiện giao cùng tỉnh/TP! Ném vào Khu B (Xe Tải 3.5 Tấn đi ${destFacilityName}).`;
        } else if (!isIntraWard && !isIntraProvince) {
          suggestedZoneCode = 'ZONE-W-SORTER-DISPATCH';
          suggestedZoneName = `Khu C: Khu Xuất Hàng Mega Sorter (Liên Miền - ${destProvinceName})`;
          instructionText = `🔴 Bưu kiện giao liên tỉnh! Ném vào Khu C (Container 15 Tấn đi ${destProvinceName}).`;
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

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(scanCode);
  };

  const handleConfirmAssign = async () => {
    if (!scannedPackageInfo || !selectedZoneId) {
      setError('Vui lòng chọn Zone kho để lưu bưu kiện');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const token = localStorage.getItem('token');
      const targetZoneObj = facilityZones.find((z) => z.id === selectedZoneId);
      const activeToteCode = targetZoneObj ? getActiveToteCode(targetZoneObj.zoneCode) : getActiveToteCode('ZONE-W-LOCAL');

      const response = await fetch(`${CONFIG.API_BASE_URL}/orders/assign-zone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: scannedPackageInfo.code,
          zoneId: selectedZoneId,
          toteCode: activeToteCode,
        }),
      });

      const res = await response.json();

      if (response.ok && res.success) {
        setSuccessMsg(`✅ THÀNH CÔNG: Bưu kiện ${scannedPackageInfo.code} đã được ném vào sọt [${activeToteCode}]!`);
        setScannedPackageInfo(null);
        setScanCode('');
        fetchSortingHistory();
        fetchZoneTotes();
      } else {
        throw new Error(res.message || 'Không thể xác nhận phân loại vào Zone');
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

      {/* Sub-component 1: 4 Zone Cards & Active Tote Explorer */}
      <ZoneToteExplorer
        facilityZones={facilityZones}
        activeExplorerZone={activeExplorerZone}
        setActiveExplorerZone={setActiveExplorerZone}
        zoneTotesData={zoneTotesData}
        getActiveToteCode={getActiveToteCode}
        fetchZoneTotes={fetchZoneTotes}
        handleOpenToteDetailModal={handleOpenToteDetailModal}
      />

      {/* Sub-component 2: Scrollable Popup Modal for Tote Packages */}
      <TotePackageDetailModal
        selectedToteModal={selectedToteModal}
        toteModalLoading={toteModalLoading}
        onClose={() => setSelectedToteModal(null)}
        onSealTote={handleSealAndOpenNewTote}
      />

      {/* Sub-component 3: Live Camera & Realtime Direction Board */}
      <LiveCameraSortingBoard
        isCameraActive={isCameraActive}
        stopCamera={stopCamera}
        videoRef={videoRef}
        streamRef={streamRef}
        liveScannedInfo={liveScannedInfo}
        scannedPackageInfo={scannedPackageInfo}
        facilityZones={facilityZones}
        getActiveToteCode={getActiveToteCode}
        handleSealAndOpenNewTote={handleSealAndOpenNewTote}
      />

      {/* Alert Notification System */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 font-bold">
            ✕
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Manual Desk Search & History Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Manual Barcode Search Form (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <QrCode size={18} className="text-amber-600" />
              Quét Barcode / Nhập Mã Bưu Kiện Cần Phân Loại:
            </h3>

            <form onSubmit={handleManualSearch} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <QrCode size={20} />
                </div>
                <input
                  type="text"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  placeholder="Nhập mã đơn hàng VD: ORD-7802000053..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition font-bold"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading || !scanCode.trim()}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <QrCode size={16} />}
                  <span>TRA CỨU</span>
                </button>

                {scannedPackageInfo && (
                  <button
                    type="button"
                    onClick={handleConfirmAssign}
                    disabled={loading}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    <span>LƯU</span>
                  </button>
                )}
              </div>
            </form>

            {/* Manual Lookup Suggestion Result Box */}
            {scannedPackageInfo && (
              <div className="mt-4 p-5 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={16} />
                    KẾT QUẢ GỢI Ý PHÂN LOẠI BAN ĐẦU
                  </span>
                  <span className="font-mono text-xs font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded border border-slate-700">
                    {scannedPackageInfo.code}
                  </span>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    GỢI Ý ZONE KHO:
                  </span>
                  <h4 className="text-lg font-black text-amber-400 font-mono">
                    {scannedPackageInfo.suggestedZoneCode} - {scannedPackageInfo.suggestedZoneName}
                  </h4>
                  <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {scannedPackageInfo.instructionText}
                  </p>
                </div>

                {/* Target Zone Selection & Active Tote Display */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">XÁC NHẬN / ĐỔI ZONE LƯU KHO:</label>
                    <button
                      type="button"
                      onClick={() => setIsEditingZone(!isEditingZone)}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-bold"
                    >
                      <Edit3 size={13} />
                      {isEditingZone ? 'Khóa chọn Zone' : 'Tùy chỉnh chọn Zone khác'}
                    </button>
                  </div>

                  {isEditingZone ? (
                    <select
                      value={selectedZoneId}
                      onChange={(e) => setSelectedZoneId(e.target.value)}
                      className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      {facilityZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.zoneCode} - {zone.zoneName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-300">
                        {facilityZones.find((z) => z.id === selectedZoneId)?.zoneCode || 'ZONE-W-LOCAL'}
                      </span>
                      <span className="text-[11px] font-mono font-extrabold text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded border border-blue-500/40">
                        🎒 Sọt: {getActiveToteCode(facilityZones.find((z) => z.id === selectedZoneId)?.zoneCode || 'ZONE-W-LOCAL')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sub-component 4: Sorting History Panel (Right col) */}
        <SortingHistoryPanel
          sortingHistory={sortingHistory}
          getActiveToteCode={getActiveToteCode}
        />
      </div>
    </div>
  );
};

export default ZoneSortingTab;
