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
import {
  PickupHandoverPanel,
  extractActivePickupRoutes,
  type PickupHandoverRouteItem,
  UNPICKED_BLOCKED_ORDER_STATUSES,
  PICKUP_WAITING_INITIAL_STATUSES,
} from './zone-sorting/PickupHandoverPanel';
import { resolveZoneClassification } from '../../../../constants/enumLabels';

/**
 * Dynamic Smart Zone Matching based on Administrative Relational Hierarchy:
 * addresses (ward_code) -> wards (province_code) -> provinces (administrative_region_id) -> administrative_regions
 * and Facility Tier (Cấp 3 - Bưu cục, Cấp 2 - Kho Tỉnh, Cấp 1 - Kho Miền).
 */
export const matchFacilityZoneByAdminHierarchy = (
  zones: FacilityZoneItem[],
  params: {
    originWardCode?: string;
    destWardCode?: string;
    originProvinceCode?: string;
    destProvinceCode?: string;
    destProvinceCodeName?: string;
    originRegionId?: number;
    destRegionId?: number;
    isIntraWard?: boolean;
    isIntraProvince?: boolean;
    destFacilityName?: string;
    destProvinceName?: string;
  }
): FacilityZoneItem | undefined => {
  const {
    destProvinceCode,
    destProvinceCodeName,
    destRegionId,
    isIntraWard,
    isIntraProvince,
  } = params;

  // 1. CẤP 2: Kho tổng Tỉnh / Thành phố (PROVINCIAL_HUB có INTRA-PROVINCE hoặc INTER-HUB)
  const isProvincialHub = zones.some((z) => z.zoneCode.includes('INTRA-PROVINCE') || z.zoneCode.includes('INTER-HUB'));
  if (isProvincialHub) {
    if (isIntraProvince && zones.some((z) => z.zoneCode.includes('INTRA-PROVINCE'))) {
      return zones.find((z) => z.zoneCode.includes('INTRA-PROVINCE'));
    }
    if (!isIntraProvince && zones.some((z) => z.zoneCode.includes('INTER-HUB'))) {
      return zones.find((z) => z.zoneCode.includes('INTER-HUB'));
    }
  }

  // 2. CẤP 3: Bưu cục phường / xã (WARD_STATION có LOCAL hoặc PROVINCE-DISPATCH)
  const isWardStation = zones.some((z) => z.zoneCode.includes('LOCAL') || z.zoneCode.includes('PROVINCE-DISPATCH'));
  if (isWardStation) {
    if (isIntraWard && zones.some((z) => z.zoneCode.includes('LOCAL'))) {
      return zones.find((z) => z.zoneCode.includes('LOCAL'));
    }
    if (zones.some((z) => z.zoneCode.includes('PROVINCE-DISPATCH'))) {
      return zones.find((z) => z.zoneCode.includes('PROVINCE-DISPATCH'));
    }
  }

  // 3. CẤP 1: Mega Sorter / Trung tâm phân loại miền (SORTING_CENTER)
  // Bước 3.1: Kiểm tra xuất hàng Tỉnh nội vùng (dựa vào provinceCode và codeName từ bảng provinces)
  if (destProvinceCode || destProvinceCodeName) {
    const pCode = (destProvinceCode || '').trim();
    const pCodeName = (destProvinceCodeName || '').replace(/_/g, '').toUpperCase();

    const provinceMatch = zones.find((z) => {
      const zCode = z.zoneCode.toUpperCase();
      // Mã tỉnh Tây Ninh (80) -> ZONE-S-DISPATCH-TAYNINH
      if (pCode === '80' && zCode.includes('TAYNINH')) return true;
      // Mã tỉnh TP.HCM (79) -> ZONE-S-DISPATCH-HCM
      if (pCode === '79' && (zCode.includes('DISPATCH-HCM') || zCode.includes('HCMC'))) return true;
      // Mã tỉnh Đồng Nai (75) -> ZONE-S-DISPATCH-DONGNAI
      if (pCode === '75' && zCode.includes('DONGNAI')) return true;
      // Mã tỉnh Bình Dương (74) -> ZONE-S-DISPATCH-BINHDUONG
      if (pCode === '74' && zCode.includes('BINHDUONG')) return true;
      // Mã tỉnh Bà Rịa - Vũng Tàu (77) -> ZONE-S-DISPATCH-VUNGTAU
      if (pCode === '77' && zCode.includes('VUNGTAU')) return true;
      // Mã tỉnh Hà Nội (01) -> ZONE-N-DISPATCH-HANOI / ZONE-S-NORTH-DISPATCH
      if (pCode === '01' && (zCode.includes('DISPATCH-HANOI') || zCode.includes('NORTH-DISPATCH'))) return true;
      // Mã tỉnh Hải Phòng (31) -> ZONE-N-DISPATCH-HAIPHONG
      if (pCode === '31' && zCode.includes('HAIPHONG')) return true;
      // Mã tỉnh Quảng Ninh (22) -> ZONE-N-DISPATCH-QUANGNINH
      if (pCode === '22' && zCode.includes('QUANGNINH')) return true;
      // Mã tỉnh Hải Dương (30) -> ZONE-N-DISPATCH-HAIDUONG
      if (pCode === '30' && zCode.includes('HAIDUONG')) return true;
      // Mã tỉnh Bắc Ninh (24) -> ZONE-N-DISPATCH-BACNINH
      if (pCode === '24' && zCode.includes('BACNINH')) return true;
      // Khớp theo codeName chuẩn của bảng provinces trong CSDL
      if (pCodeName && zCode.includes(pCodeName)) return true;
      return false;
    });

    if (provinceMatch) return provinceMatch;
  }

  // Bước 3.2: Phân loại theo Vùng Miền (dựa vào administrative_region_id: 1 đến 6)
  if (destRegionId) {
    const regionMatch = zones.find((z) => {
      const zCode = z.zoneCode.toUpperCase();
      // Region 1: Trung du & Miền núi phía Bắc
      if (destRegionId === 1 && (zCode.includes('REGION1') || zCode.includes('NORTH-WEST'))) return true;
      // Region 2: Đồng bằng sông Hồng (Hà Nội, Hải Phòng...)
      if (destRegionId === 2 && (zCode.includes('REGION2') || zCode.includes('NORTH-DISPATCH') || zCode.includes('NORTH'))) return true;
      // Region 3: Bắc Trung Bộ (Huế, Nghệ An, Thanh Hóa...)
      if (destRegionId === 3 && (zCode.includes('REGION3') || zCode.includes('NORTH-CENTRAL'))) return true;
      // Region 4: Nam Trung Bộ & Tây Nguyên (Đà Nẵng, Khánh Hòa, Gia Lai, Đắk Lắk...)
      if (destRegionId === 4 && (zCode.includes('REGION4') || zCode.includes('CENTRAL-DISPATCH') || zCode.includes('CENTRAL'))) return true;
      // Region 5: Đông Nam Bộ (TP.HCM, Đồng Nai, Tây Ninh, Bình Dương, BR-VT...)
      if (destRegionId === 5 && (zCode.includes('REGION5') || zCode.includes('SOUTH-DISPATCH') || zCode.includes('SOUTH'))) return true;
      // Region 6: Đồng bằng sông Cửu Long (Cần Thơ, An Giang, Cà Mau, Vĩnh Long...)
      if (destRegionId === 6 && (zCode.includes('REGION6') || zCode.includes('MEKONG'))) return true;
      return false;
    });

    if (regionMatch) return regionMatch;
  }

  return undefined;
};

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
  const [includeLoaded, setIncludeLoaded] = useState<boolean>(false);
  const [currentFacilityId, setCurrentFacilityId] = useState<string>('');
  const [currentFacility, setCurrentFacility] = useState<any | null>(null);

  // State đối soát bàn giao chuyến Lấy hàng (tách biệt với phân loại sọt/trung chuyển)
  const [pickupRoutes, setPickupRoutes] = useState<PickupHandoverRouteItem[]>([]);
  const [lockedHandoverRouteId, setLockedHandoverRouteId] = useState<string | null>(null);
  const [pickupRefreshKey, setPickupRefreshKey] = useState<number>(0);
  const pickupRoutesRef = useRef<PickupHandoverRouteItem[]>([]);
  const lockedHandoverRouteIdRef = useRef<string | null>(null);

  useEffect(() => {
    pickupRoutesRef.current = pickupRoutes;
    if (lockedHandoverRouteId && !pickupRoutes.some((r) => r.id === lockedHandoverRouteId)) {
      setLockedHandoverRouteId(null);
      lockedHandoverRouteIdRef.current = null;
    }
  }, [pickupRoutes, lockedHandoverRouteId]);

  const handleToggleLockHandoverRoute = (route: PickupHandoverRouteItem | null) => {
    const nextId = route?.id || null;
    setLockedHandoverRouteId(nextId);
    lockedHandoverRouteIdRef.current = nextId;
    if (route) {
      setError(null);
      setSuccessMsg(
        `Đã khóa đối soát riêng cho chuyến [${route.routeCode}] — Tài xế ${route.driverName} (${route.handedOverOrders.length}/${route.requiredOrders.length} kiện). Quét từng kiện hàng để kiểm đếm!`
      );
    } else {
      setError(null);
      setSuccessMsg(null);
      setScannedPackageInfo(null);
    }
  };

  const getActiveToteCode = (zoneCode: string) => {
    const zoneObj = zoneTotesData.find((z) => z.zoneCode === zoneCode);
    const openTote = zoneObj?.totes?.find((t: any) => t.status === 'OPEN');
    if (openTote) {
      return openTote.toteCode;
    }
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
    fetchZoneTotes(currentFacilityId);
  };

  const fetchZoneTotes = async (facilityId?: string, forceIncludeLoaded?: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const effectiveFacId = facilityId !== undefined ? facilityId : currentFacilityId;
      const isLoaded = forceIncludeLoaded !== undefined ? forceIncludeLoaded : includeLoaded;
      const url = `${CONFIG.API_BASE_URL}/orders/zone-totes?includeLoaded=${isLoaded}${effectiveFacId ? `&facilityId=${effectiveFacId}` : ''}`;
      const res = await fetch(url, {
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

  const fetchSortingHistory = async (facilityId?: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const url = facilityId ? `${CONFIG.API_BASE_URL}/orders/sorting-history?facilityId=${facilityId}` : `${CONFIG.API_BASE_URL}/orders/sorting-history`;
      const res = await fetch(url, {
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
    const initZoneSortingData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const staffRes = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const staffData = await staffRes.json();
        const facilityId = staffData?.data?.staff?.assignedFacilityId;

        if (facilityId) {
          setCurrentFacilityId(facilityId);
          try {
            const facRes = await fetch(`${CONFIG.API_BASE_URL}/facilities/${facilityId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const facData = await facRes.json();
            if (facData.success && facData.data) {
              setCurrentFacility(facData.data);
            }
          } catch (e) { }

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

        fetchSortingHistory(facilityId);
        fetchZoneTotes(facilityId);
      } catch (err) {
        console.log('Sử dụng danh sách Zone mặc định của bưu cục.');
        fetchSortingHistory();
        fetchZoneTotes();
      }
    };
    initZoneSortingData();
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

  // Xử lý khi quét mã QR chuyến Lấy hàng (RT-...) -> mở & khóa đúng danh sách đơn của shipper đó
  const handleRouteQrScan = async (routeCodeRaw: string) => {
    const upperRouteCode = routeCodeRaw.trim().toUpperCase();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${CONFIG.API_BASE_URL}/routes?status=IN_PROGRESS`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const activePickup = extractActivePickupRoutes(data.data);
        setPickupRoutes(activePickup);
        pickupRoutesRef.current = activePickup;

        const matched = activePickup.find((r) => r.routeCode.toUpperCase() === upperRouteCode);
        if (matched) {
          if (
            matched.startFacilityId &&
            currentFacilityId &&
            matched.startFacilityId !== currentFacilityId
          ) {
            setSuccessMsg(null);
            setError(
              `Cảnh báo sai bưu cục! Chuyến [${matched.routeCode}] của tài xế ${matched.driverName} KHÔNG thuộc bưu cục hiện tại.`
            );
            return;
          }
          setScannedPackageInfo(null);
          setScanCode('');
          handleToggleLockHandoverRoute(matched);
          setPickupRefreshKey((k) => k + 1);
          return;
        }
      }
      setSuccessMsg(null);
      setError(
        `Không tìm thấy chuyến lấy hàng [${upperRouteCode}] đang ở trạng thái bàn giao (IN_PROGRESS) tại bưu cục.`
      );
    } catch (err: any) {
      setError(err.message || `Lỗi khi tra cứu chuyến [${upperRouteCode}]`);
    }
  };

  // Kiểm tra bảo vệ chéo shipper / đơn chưa lấy trước khi cho phép nhập kho hoặc tự động lưu
  const getPickupHandoverGuardError = (orderData: any): string | null => {
    const orderStatus = String(orderData?.status || '').toUpperCase();
    const pickupType = String(orderData?.pickupType || '').toUpperCase();
    const orderId = String(orderData?.id || '');
    const orderCode = String(orderData?.orderCode || '');

    const matchingRoute = pickupRoutesRef.current.find((r) =>
      r.requiredOrders.some((o) => o.orderId === orderId || o.orderCode === orderCode) ||
      r.exemptOrders.some((o) => o.orderId === orderId || o.orderCode === orderCode)
    );

    const isUnpicked =
      UNPICKED_BLOCKED_ORDER_STATUSES.has(orderStatus) ||
      (pickupType === 'PICKUP' && PICKUP_WAITING_INITIAL_STATUSES.has(orderStatus));

    if (isUnpicked) {
      const routeDetail = matchingRoute
        ? ` thuộc chuyến [${matchingRoute.routeCode}] (${matchingRoute.driverName})`
        : '';
      return `Không thể nhập kho đơn [${orderCode}]${routeDetail} vì trạng thái hiện tại là [${orderStatus}] — chưa được shipper xác nhận đã lấy hàng!`;
    }

    if (
      matchingRoute &&
      matchingRoute.startFacilityId &&
      currentFacilityId &&
      matchingRoute.startFacilityId !== currentFacilityId
    ) {
      return `Cảnh báo sai bưu cục! Bưu kiện [${orderCode}] thuộc chuyến lấy hàng của bưu cục khác, KHÔNG thể quét nhập tại bưu cục hiện tại!`;
    }

    if (
      !matchingRoute &&
      currentFacilityId &&
      orderData?.originFacilityId &&
      orderData.originFacilityId !== currentFacilityId &&
      ['CREATED', 'READY_FOR_PICKUP', 'PICKED_UP'].includes(orderStatus)
    ) {
      return `Cảnh báo sai bưu cục! Đơn [${orderCode}] thuộc bưu cục gửi khác, không thể nhập kho ban đầu tại bưu cục hiện tại!`;
    }

    const lockedId = lockedHandoverRouteIdRef.current;
    if (lockedId) {
      const lockedRoute = pickupRoutesRef.current.find((r) => r.id === lockedId);
      if (lockedRoute) {
        const belongsToLocked = lockedRoute.allStopsRaw.some(
          (s: any) =>
            (s.order?.id && s.order.id === orderId) ||
            (s.orderId && s.orderId === orderId) ||
            (s.order?.orderCode && s.order.orderCode === orderCode)
        );
        if (!belongsToLocked) {
          if (matchingRoute && matchingRoute.id !== lockedRoute.id) {
            return `Cảnh báo nhầm shipper! Bưu kiện [${orderCode}] đang thuộc quyền quản lý của tài xế ${matchingRoute.driverName}, KHÔNG thuộc chuyến đang đối soát [${lockedRoute.routeCode}].`;
          }
          return `Bưu kiện [${orderCode}] không nằm trong chuyến [${lockedRoute.routeCode}] đang khóa đối soát. Hãy bấm "Đóng phiên đối soát" nếu muốn phân loại đơn khác.`;
        }
      }
    } else if (matchingRoute && orderStatus === 'PICKED_UP') {
      return `Bưu kiện [${orderCode}] đang thuộc quyền quản lý của tài xế ${matchingRoute.driverName}. Vui lòng quét mã QR chuyến trên app của tài xế khi về bưu cục để mở phiên bàn giao trước khi kiểm kiện!`;
    }

    return null;
  };

  // Live Camera Scan Auto-Save
  const handleLiveCameraScan = async (codeToLookup: string) => {
    const cleanCode = codeToLookup.trim();
    if (!cleanCode) return;

    if (cleanCode.toUpperCase().startsWith('RT-')) {
      await handleRouteQrScan(cleanCode);
      return;
    }

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
        const guardError = getPickupHandoverGuardError(orderData);
        if (guardError) {
          setSuccessMsg(null);
          setError(guardError);
          return;
        }
        const currentFac = currentFacility;
        const currentFacilityProvinceCode = currentFac?.provinceCode || currentFac?.province?.code || currentFac?.address?.wardRelation?.provinceCode || '';
        const currentFacilityWardCode = currentFac?.address?.wardCode || currentFac?.address?.wardRelation?.code || '';
        const currentFacilityIdVal = currentFac?.id || currentFacilityId;

        const destWardCode = orderData.deliveryAddress?.wardCode || orderData.deliveryAddress?.wardRelation?.code || orderData.destinationFacility?.address?.wardCode || orderData.destinationFacility?.address?.wardRelation?.code;
        const originWardCode = orderData.pickupAddress?.wardCode || orderData.pickupAddress?.wardRelation?.code || orderData.originFacility?.address?.wardCode || orderData.originFacility?.address?.wardRelation?.code;

        const destProvinceCode = orderData.deliveryAddress?.wardRelation?.provinceCode || orderData.destinationFacility?.provinceCode || orderData.destinationFacility?.province?.code || orderData.destinationFacility?.address?.wardRelation?.provinceCode;
        const originProvinceCode = orderData.pickupAddress?.wardRelation?.provinceCode || orderData.originFacility?.provinceCode || orderData.originFacility?.province?.code || orderData.originFacility?.address?.wardRelation?.provinceCode;

        const destProvinceCodeName = orderData.deliveryAddress?.wardRelation?.province?.codeName || orderData.destinationFacility?.province?.codeName || orderData.destinationFacility?.address?.wardRelation?.province?.codeName;
        const destRegionId = orderData.deliveryAddress?.wardRelation?.province?.administrativeRegionId || orderData.destinationFacility?.province?.administrativeRegionId || orderData.destinationFacility?.address?.wardRelation?.province?.administrativeRegionId;

        // Bưu kiện giao cùng bưu cục (cùng bưu cục đích hoặc cùng xã/phường)
        const isIntraWard = Boolean(
          (orderData.destinationFacilityId && currentFacilityIdVal && orderData.destinationFacilityId === currentFacilityIdVal) ||
          (currentFacilityWardCode && destWardCode && currentFacilityWardCode === destWardCode) ||
          (originWardCode && destWardCode && originWardCode === destWardCode)
        );

        // Bưu kiện giao cùng tỉnh / thành phố với kho hiện tại
        const isIntraProvince = Boolean(
          (currentFacilityProvinceCode && destProvinceCode && currentFacilityProvinceCode === destProvinceCode) ||
          (orderData.destinationFacility?.provinceCode && currentFacilityProvinceCode && orderData.destinationFacility.provinceCode === currentFacilityProvinceCode)
        );
        const destFacilityName = orderData.destinationFacility?.facilityName || 'Bưu cục đích';
        const destProvinceName = orderData.deliveryAddress?.wardRelation?.province?.name || orderData.destinationFacility?.province?.name || orderData.destinationFacility?.provinceName || 'Tỉnh / TP đích';

        // Domain Driven Matching using centralized resolveZoneClassification
        const { targetZoneType, suggestedZoneName, instructionText } = resolveZoneClassification(
          isIntraWard,
          isIntraProvince,
          destFacilityName,
          destProvinceName
        );

        // Dynamic smart zone matching based on administrative hierarchy & facility tier
        let matchedZone = matchFacilityZoneByAdminHierarchy(facilityZones, {
          originWardCode,
          destWardCode,
          originProvinceCode,
          destProvinceCode,
          destProvinceCodeName,
          destRegionId,
          isIntraWard,
          isIntraProvince,
          destFacilityName,
          destProvinceName,
        });

        if (!matchedZone) {
          matchedZone = facilityZones.find((z) => z.zoneType === targetZoneType)
            || facilityZones.find((z) => z.zoneType === 'SHIPPING' || z.zoneType === 'SORTING')
            || facilityZones[0];
        }

        const targetZoneCode = matchedZone?.zoneCode || (targetZoneType === 'SHIPPING' ? 'ZONE-W-PROVINCE-DISPATCH' : 'ZONE-W-LOCAL');
        const activeToteCode = getActiveToteCode(targetZoneCode);

        setLiveScannedInfo({
          code: cleanCode,
          order: orderData,
          suggestedZoneCode: targetZoneCode,
          suggestedZoneName: matchedZone?.zoneName || suggestedZoneName,
          instructionText,
          toteCode: activeToteCode,
        });

        if (matchedZone) {
          setSelectedZoneId(matchedZone.id);
          const assignRes = await fetch(`${CONFIG.API_BASE_URL}/orders/assign-zone`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              code: cleanCode,
              zoneId: matchedZone.id,
              toteCode: activeToteCode,
              ...(lockedHandoverRouteIdRef.current
                ? { expectedRouteId: lockedHandoverRouteIdRef.current }
                : {}),
            }),
          });
          const assignJson = await assignRes.json();

          if (!assignRes.ok || !assignJson.success) {
            setSuccessMsg(null);
            setError(assignJson.message || `Không thể nhập kho bưu kiện ${cleanCode}`);
            return;
          }

          setError(null);
          fetchSortingHistory();
          fetchZoneTotes();
          setPickupRefreshKey((k) => k + 1);

          const handoverInfo = assignJson.data?.pickupHandover;
          if (handoverInfo?.routeCompleted) {
            setLockedHandoverRouteId(null);
            lockedHandoverRouteIdRef.current = null;
            setSuccessMsg(
              `LIVE SCAN: Đã phân loại [${cleanCode}] vào ${targetZoneCode} (${activeToteCode}) và HOÀN TẤT BÀN GIAO đủ ${handoverInfo.handedOverCount}/${handoverInfo.requiredCount} kiện chuyến [${handoverInfo.routeCode}]!`
            );
            return;
          }
          if (handoverInfo) {
            setSuccessMsg(
              `LIVE SCAN: Đã nhập kho [${cleanCode}] vào ${targetZoneCode} (${activeToteCode}) — Tiến độ chuyến [${handoverInfo.routeCode}]: ${handoverInfo.handedOverCount}/${handoverInfo.requiredCount} kiện.`
            );
            return;
          }
        }

        setError(null);
        setSuccessMsg(`LIVE SCAN: ĐÃ TỰ ĐỘNG LƯU BƯU KIỆN ${cleanCode} VÀO ${targetZoneCode} (SỌT: ${activeToteCode})!`);
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

    if (cleanCode.toUpperCase().startsWith('RT-')) {
      setLoading(true);
      try {
        await handleRouteQrScan(cleanCode);
      } finally {
        setLoading(false);
      }
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
        const guardError = getPickupHandoverGuardError(orderData);
        if (guardError) {
          setScannedPackageInfo(null);
          throw new Error(guardError);
        }
        const currentFac = currentFacility;
        const currentFacilityProvinceCode = currentFac?.provinceCode || currentFac?.province?.code || currentFac?.address?.wardRelation?.provinceCode || '';
        const currentFacilityWardCode = currentFac?.address?.wardCode || currentFac?.address?.wardRelation?.code || '';
        const currentFacilityIdVal = currentFac?.id || currentFacilityId;

        const destWardCode = orderData.deliveryAddress?.wardCode || orderData.deliveryAddress?.wardRelation?.code || orderData.destinationFacility?.address?.wardCode || orderData.destinationFacility?.address?.wardRelation?.code;
        const originWardCode = orderData.pickupAddress?.wardCode || orderData.pickupAddress?.wardRelation?.code || orderData.originFacility?.address?.wardCode || orderData.originFacility?.address?.wardRelation?.code;

        const destProvinceCode = orderData.deliveryAddress?.wardRelation?.provinceCode || orderData.destinationFacility?.provinceCode || orderData.destinationFacility?.province?.code || orderData.destinationFacility?.address?.wardRelation?.provinceCode;
        const originProvinceCode = orderData.pickupAddress?.wardRelation?.provinceCode || orderData.originFacility?.provinceCode || orderData.originFacility?.province?.code || orderData.originFacility?.address?.wardRelation?.provinceCode;

        const destProvinceCodeName = orderData.deliveryAddress?.wardRelation?.province?.codeName || orderData.destinationFacility?.province?.codeName || orderData.destinationFacility?.address?.wardRelation?.province?.codeName;
        const destRegionId = orderData.deliveryAddress?.wardRelation?.province?.administrativeRegionId || orderData.destinationFacility?.province?.administrativeRegionId || orderData.destinationFacility?.address?.wardRelation?.province?.administrativeRegionId;

        // Bưu kiện giao cùng bưu cục (cùng bưu cục đích hoặc cùng xã/phường)
        const isIntraWard = Boolean(
          (orderData.destinationFacilityId && currentFacilityIdVal && orderData.destinationFacilityId === currentFacilityIdVal) ||
          (currentFacilityWardCode && destWardCode && currentFacilityWardCode === destWardCode) ||
          (originWardCode && destWardCode && originWardCode === destWardCode)
        );

        // Bưu kiện giao cùng tỉnh / thành phố với kho hiện tại
        const isIntraProvince = Boolean(
          (currentFacilityProvinceCode && destProvinceCode && currentFacilityProvinceCode === destProvinceCode) ||
          (orderData.destinationFacility?.provinceCode && currentFacilityProvinceCode && orderData.destinationFacility.provinceCode === currentFacilityProvinceCode)
        );
        const destFacilityName = orderData.destinationFacility?.facilityName || 'Bưu cục đích';
        const destProvinceName = orderData.deliveryAddress?.wardRelation?.province?.name || orderData.destinationFacility?.province?.name || orderData.destinationFacility?.provinceName || 'Tỉnh / TP đích';

        const { targetZoneType, suggestedZoneName, instructionText } = resolveZoneClassification(
          isIntraWard,
          isIntraProvince,
          destFacilityName,
          destProvinceName
        );

        let matchedZone = matchFacilityZoneByAdminHierarchy(facilityZones, {
          originWardCode,
          destWardCode,
          originProvinceCode,
          destProvinceCode,
          destProvinceCodeName,
          destRegionId,
          isIntraWard,
          isIntraProvince,
          destFacilityName,
          destProvinceName,
        });

        if (!matchedZone) {
          matchedZone = facilityZones.find((z) => z.zoneType === targetZoneType)
            || facilityZones.find((z) => z.zoneType === 'SHIPPING' || z.zoneType === 'SORTING')
            || facilityZones[0];
        }

        if (matchedZone) {
          setSelectedZoneId(matchedZone.id);
        }

        const targetZoneCode = matchedZone?.zoneCode || (targetZoneType === 'SHIPPING' ? 'ZONE-W-PROVINCE-DISPATCH' : 'ZONE-W-LOCAL');

        setIsEditingZone(false);
        setScannedPackageInfo({
          code: cleanCode,
          order: orderData,
          suggestedZoneCode: targetZoneCode,
          suggestedZoneName: matchedZone?.zoneName || suggestedZoneName,
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
          ...(lockedHandoverRouteIdRef.current
            ? { expectedRouteId: lockedHandoverRouteIdRef.current }
            : {}),
        }),
      });

      const res = await response.json();

      if (response.ok && res.success) {
        const handoverInfo = res.data?.pickupHandover;
        if (handoverInfo?.routeCompleted) {
          setLockedHandoverRouteId(null);
          lockedHandoverRouteIdRef.current = null;
          setSuccessMsg(
            `Đã lưu bưu kiện ${scannedPackageInfo.code} vào sọt [${activeToteCode}] và HOÀN TẤT BÀN GIAO đủ ${handoverInfo.handedOverCount}/${handoverInfo.requiredCount} kiện cho chuyến [${handoverInfo.routeCode}]!`
          );
        } else if (handoverInfo) {
          setSuccessMsg(
            `Đã nhập kho & phân loại ${scannedPackageInfo.code} vào sọt [${activeToteCode}] — Tiến độ chuyến [${handoverInfo.routeCode}]: ${handoverInfo.handedOverCount}/${handoverInfo.requiredCount} kiện.`
          );
        } else {
          setSuccessMsg(`THÀNH CÔNG: Bưu kiện ${scannedPackageInfo.code} đã được xếp vào sọt [${activeToteCode}]!`);
        }
        setScannedPackageInfo(null);
        setScanCode('');
        fetchSortingHistory();
        fetchZoneTotes();
        setPickupRefreshKey((k) => k + 1);
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
        fetchZoneTotes={() => fetchZoneTotes(currentFacilityId)}
        handleOpenToteDetailModal={handleOpenToteDetailModal}
        includeLoaded={includeLoaded}
        onToggleIncludeLoaded={(val) => {
          setIncludeLoaded(val);
          fetchZoneTotes(currentFacilityId, val);
        }}
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

      {/* Sub-component 3.5: Đối soát bàn giao chuyến Lấy hàng (chỉ hiển thị sau khi quét QR RT-... của Shipper) */}
      <PickupHandoverPanel
        refreshKey={pickupRefreshKey}
        lockedRouteId={lockedHandoverRouteId}
        onToggleLockRoute={handleToggleLockHandoverRoute}
        onRoutesLoaded={setPickupRoutes}
        onRouteCompletedSuccess={(msg) => {
          setError(null);
          setSuccessMsg(msg);
          fetchSortingHistory();
          fetchZoneTotes();
        }}
        onRouteActionError={(msg) => {
          setSuccessMsg(null);
          setError(msg);
        }}
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
                  placeholder="Quét/nhập mã kiện (ORD-...) hoặc mã QR chuyến của Shipper (RT-...)..."
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
