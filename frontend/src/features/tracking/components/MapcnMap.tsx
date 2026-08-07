import React, { useEffect, useRef } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from '@/components/ui/map';
import { User, Building2, Store } from 'lucide-react';
import MapLibreGL from 'maplibre-gl';

// Vector SVG Xe Máy Chuẩn Silhouette Side-View
const MotorbikeIcon = ({ className = "w-6 h-6 text-white" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.44 9.25l-2.02-3.5A2 2 0 0015.69 4.7H13a1 1 0 000 2h2.69l1.45 2.5H12a1 1 0 00-.86.49l-2.5 4.33a4.5 4.5 0 101.73 1.01l1.76-3.03H16a4.5 4.5 0 103.44-2.75zM5.5 18a2.5 2.5 0 112.5-2.5A2.5 2.5 0 015.5 18zm13 0a2.5 2.5 0 112.5-2.5 2.5 2.5 0 01-2.5 2.5z" />
  </svg>
);

interface MapcnMapProps {
  route?: [number, number][]; // [lat, lng]
  currentPos: [number, number]; // Shipper GPS or Facility GPS [lat, lng]
  destination?: string;
  senderAddress?: string;
  senderPos?: [number, number]; // Sender GPS [lat, lng]
  receiverPos?: [number, number]; // Receiver GPS [lat, lng]
  facilityPos?: [number, number]; // Facility GPS [lat, lng]
  facilityName?: string;
  shipperName?: string;
  vehiclePlate?: string;
  status?: string;
  statusLabel?: string;
  isOutForDelivery?: boolean; // true if Shipper is delivering by motorbike
}

export const MapcnMap: React.FC<MapcnMapProps> = ({
  route = [],
  currentPos,
  destination = 'Địa chỉ người nhận',
  senderAddress = 'Địa chỉ người gửi',
  senderPos,
  receiverPos,
  facilityPos,
  facilityName = 'Bưu cục tiếp nhận',
  shipperName = 'Shipper SLP',
  vehiclePlate = 'Xe máy chuyên dụng',
  status = 'CREATED',
  statusLabel = 'Đang xử lý',
  isOutForDelivery = false,
}) => {
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  const formattedCurrentPos: [number, number] = [currentPos[1], currentPos[0]];
  const senderCoords: [number, number] | null = senderPos ? [senderPos[1], senderPos[0]] : null;
  const facilityCoords: [number, number] | null = facilityPos ? [facilityPos[1], facilityPos[0]] : null;
  const receiverCoords: [number, number] | null = receiverPos ? [receiverPos[1], receiverPos[0]] : null;

  const isBeforePickup = status === 'CREATED' || status === 'READY_FOR_PICKUP' || status === 'PENDING' || status === 'DRAFT';
  const isPickingUp = status === 'PICKING' || status === 'PICKUP_ASSIGNED';

  // All active points for auto-fit bounds
  const allPoints: [number, number][] = [];
  if (senderCoords) allPoints.push(senderCoords);
  if (facilityCoords) allPoints.push(facilityCoords);
  if (receiverCoords) allPoints.push(receiverCoords);
  if (allPoints.length === 0) allPoints.push(formattedCurrentPos);

  // Auto-fit bounds whenever position updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || allPoints.length === 0) return;

    const lons = allPoints.map((c) => c[0]);
    const lats = allPoints.map((c) => c[1]);

    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    map.fitBounds([minLon, minLat, maxLon, maxLat], {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      duration: 1000,
    });
  }, [currentPos, receiverPos, senderPos, facilityPos]);

  return (
    <div className="relative w-full h-full min-h-[470px] overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-slate-50">
      {/* Live Badge Banner overlay */}
      <div className="absolute top-3 left-3 z-10 bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 border border-slate-700 shadow-md">
        <div className={`w-2.5 h-2.5 rounded-full ${isOutForDelivery ? 'bg-red-500 animate-ping' : isPickingUp ? 'bg-amber-400 animate-ping' : isBeforePickup ? 'bg-amber-400 animate-ping' : 'bg-blue-400'}`}></div>
        <span className="font-bold text-[11px] uppercase tracking-wider text-white">
          {isOutForDelivery
            ? 'ĐỊNH VỊ REAL-TIME SHIPPER GIAO HÀNG 🏍️'
            : isPickingUp
            ? 'ĐỊNH VỊ SHIPPER ĐANG ĐẾN LẤY HÀNG 🏍️'
            : isBeforePickup
            ? 'ĐƠN HÀNG Ở ĐỊA CHỈ NGƯỜI GỬI (CHỜ TÀI XẾ LẤY) 📍'
            : 'ĐƠN HÀNG LƯU TẠI BƯU CỤC 🏢'}
        </span>
      </div>

      <Map
        ref={mapRef}
        center={isOutForDelivery ? formattedCurrentPos : (senderCoords || facilityCoords || formattedCurrentPos)}
        zoom={14}
        className="w-full h-full min-h-[470px]"
      >
        {/* 🏪 Sender Marker (Icon Cửa Hàng / Người gửi) */}
        {senderCoords && (
          <MapMarker longitude={senderCoords[0]} latitude={senderCoords[1]}>
            <MarkerContent>
              <div className="relative flex items-center justify-center cursor-pointer group">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-xl transition-transform duration-200 group-hover:scale-125 z-20">
                  <Store className="h-6 w-6 text-white" />
                </div>
                {isBeforePickup && <span className="absolute -inset-2 animate-ping rounded-full border-2 border-red-500/80 opacity-90 z-10"></span>}
              </div>
            </MarkerContent>
            <MarkerPopup closeButton={false}>
              <div className="p-1.5 font-sans text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-red-700 font-extrabold text-xs">
                  <Store className="h-4 w-4 text-red-600" />
                  <span>ĐIỂM LẤY HÀNG (NGƯỜI GỬI)</span>
                </div>
                <p className="text-slate-700 font-medium text-[11px] leading-snug">{senderAddress}</p>
                {isBeforePickup && <p className="text-amber-700 font-bold text-[10px]">Trạng thái: Đơn hàng đang ở điểm gửi</p>}
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* 👤 Receiver Marker (Icon Hình Người) */}
        {receiverCoords && (
          <MapMarker longitude={receiverCoords[0]} latitude={receiverCoords[1]}>
            <MarkerContent>
              <div className="relative flex items-center justify-center cursor-pointer group">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-emerald-600 shadow-xl transition-transform duration-200 group-hover:scale-125 z-20">
                  <User className="h-6 w-6 text-white" />
                </div>
                <span className="absolute -inset-2 animate-ping rounded-full border-2 border-emerald-500/80 opacity-90 z-10"></span>
              </div>
            </MarkerContent>
            <MarkerPopup closeButton={false}>
              <div className="p-1.5 font-sans text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
                  <User className="h-4 w-4 text-emerald-600" />
                  <span>NGƯỜI NHẬN HÀNG (ĐÍCH ĐẾN)</span>
                </div>
                <p className="text-slate-700 font-medium text-[11px] leading-snug">{destination}</p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* 🏢 Facility Marker (Bưu Cục) */}
        {facilityCoords && (
          <MapMarker longitude={facilityCoords[0]} latitude={facilityCoords[1]}>
            <MarkerContent>
              <div className="relative flex items-center justify-center cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-indigo-600 shadow-2xl transition-all duration-300 group-hover:scale-125 z-30">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </MarkerContent>
            <MarkerPopup closeButton={false}>
              <div className="p-1.5 font-sans text-xs space-y-1">
                <div className="flex items-center gap-1 text-indigo-700 font-extrabold text-xs">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <span>BƯU CỤC XỬ LÝ</span>
                </div>
                <p className="text-slate-800 font-bold">{facilityName}</p>
                <p className="text-slate-500 text-[10px]">Trạng thái: {statusLabel}</p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* 🏍️ IF Out for Delivery or Pickup -> Render Live Shipper Motorbike Marker */}
        {(isOutForDelivery || isPickingUp) && (
          <MapMarker longitude={formattedCurrentPos[0]} latitude={formattedCurrentPos[1]}>
            <MarkerContent>
              <div className="relative flex items-center justify-center cursor-pointer group">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#bc0100] shadow-2xl transition-all duration-300 group-hover:scale-125 z-30">
                  <MotorbikeIcon className="h-7 w-7 text-white" />
                </div>
                <span className="absolute -inset-2 animate-ping rounded-full border-2 border-[#bc0100]/80 opacity-90 z-20"></span>
              </div>
            </MarkerContent>
            <MarkerPopup closeButton={false}>
              <div className="p-1.5 font-sans text-xs space-y-1">
                <div className="flex items-center gap-1 text-[#bc0100] font-extrabold text-xs">
                  <MotorbikeIcon className="h-4 w-4 text-[#bc0100]" />
                  <span>SHIPPER XE MÁY ĐANG ĐẾN</span>
                </div>
                <p className="text-slate-800 font-bold">{shipperName} ({vehiclePlate})</p>
                <p className="text-slate-500 text-[10px]">Trạng thái: {statusLabel}</p>
                <p className="text-slate-400 font-mono text-[9px]">GPS: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}</p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Map Controls */}
        <MapControls showZoom showCompass showFullscreen className="bottom-4 right-4" />
      </Map>
    </div>
  );
};
