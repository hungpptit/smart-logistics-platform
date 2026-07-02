# 🗺️ HƯỚNG DẪN KẾT NỐI GOONG MAP VỚI THƯ VIỆN MAPCN

Tài liệu này hướng dẫn cách thay đổi nguồn bản đồ mặc định của component `MapcnMap` sang dịch vụ bản đồ Việt Nam **Goong Map** sử dụng chuẩn hiển thị vector tốc độ cao.

---

## 1. So sánh nhanh CARTO (Mặc định) vs Goong Map

* **CARTO Basemaps (Mặc định hiện tại):**
  * Tông màu tối giản (Minimalist), rất đẹp mắt cho Dashboard giám sát.
  * Hoàn toàn miễn phí, không giới hạn lượt truy vấn, không cần đăng ký API Key.
  * Nhược điểm: Dữ liệu hẻm ngỏ nhỏ tại Việt Nam cập nhật chậm.
* **Goong Map:**
  * Dữ liệu ngõ ngách, số nhà và hệ thống đường đi tại Việt Nam rất chính xác (được Be, Grab tin dùng).
  * Hỗ trợ tìm kiếm địa chỉ tiếng Việt tốt hơn rất nhiều.
  * Nhược điểm: Phải đăng ký tài khoản và có phí (có gói Free Tier giới hạn).

---

## 2. Các bước tích hợp Goong Map vào `mapcn`

### Bước 2.1: Đăng ký Key từ Goong
1. Truy cập [account.goong.io](https://account.goong.io) và đăng ký tài khoản.
2. Tạo dự án mới để nhận **Map Key** (Phím Bản đồ - chuỗi kí tự bắt đầu bằng chữ thường).
   > **Lưu ý:** Goong cung cấp 2 loại key: *API Key* (dùng cho backend định vị, tính toán định tuyến) và *Map Key* (dùng cho frontend hiển thị bản đồ). Bạn phải dùng **Map Key** ở bước này.

### Bước 2.2: Tạo cấu hình Biến môi trường
Mở file `.env` của frontend (`frontend/.env`) và cấu hình:
```env
VITE_GOONG_MAP_KEY=điền_map_key_của_bạn_vào_đây
```

### Bước 2.3: Cấu hình component React
Mở file `frontend/src/features/tracking/components/MapcnMap.tsx` và cấu hình thuộc tính `styles` cho `<Map>` như sau:

```tsx
import React, { useEffect, useRef } from 'react';
import { Map, MapControls, MapMarker, MarkerContent, MapRoute, MarkerPopup } from '@/components/ui/map';
import { MapPin, Truck } from 'lucide-react';
import MapLibreGL from 'maplibre-gl';

// 1. Lấy Key từ biến môi trường
const GOONG_MAP_KEY = import.meta.env.VITE_GOONG_MAP_KEY || "YOUR_GOONG_MAP_KEY";

interface MapcnMapProps {
  route: [number, number][]; // [lat, lng]
  currentPos: [number, number]; // [lat, lng]
  destination: string;
}

export const MapcnMap: React.FC<MapcnMapProps> = ({ route, currentPos, destination }) => {
  const mapRef = useRef<MapLibreGL.Map | null>(null);

  // 2. Chuyển đổi hệ tọa độ từ [lat, lng] của Leaflet/DB sang [lng, lat] của MapLibre GL
  const formattedRoute = route.map((coord) => [coord[1], coord[0]] as [number, number]);
  const formattedCurrentPos = [currentPos[1], currentPos[0]] as [number, number];
  const destCoords = formattedRoute[formattedRoute.length - 1];

  useEffect(() => {
    const map = mapRef.current;
    if (!map || formattedRoute.length === 0) return;

    const lons = formattedRoute.map((c) => c[0]);
    const lats = formattedRoute.map((c) => c[1]);

    map.fitBounds([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], {
      padding: { top: 60, bottom: 60, left: 60, right: 60 },
      duration: 1200,
    });
  }, [route]);

  const centerCoord = formattedRoute.length > 0 ? formattedCurrentPos : [106.660172, 10.762622] as [number, number];

  return (
    <div className="relative w-full h-full min-h-[450px]">
      <Map
        ref={mapRef}
        center={centerCoord}
        zoom={12}
        // 3. Truyền style của Goong Map vào đây
        styles={{
          light: `https://tiles.goong.io/assets/navigation_day.json?api_key=${GOONG_MAP_KEY}`,
          dark: `https://tiles.goong.io/assets/navigation_night.json?api_key=${GOONG_MAP_KEY}`
        }}
        className="w-full h-full min-h-[450px]"
      >
        {/* Vẽ tuyến đường */}
        {formattedRoute.length >= 2 && (
          <MapRoute coordinates={formattedRoute} color="#bc0100" width={4} opacity={0.9} dashArray={[2, 2]} />
        )}

        {/* Điểm đến */}
        {destCoords && (
          <MapMarker longitude={destCoords[0]} latitude={destCoords[1]}>
            <MarkerContent>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-red-600 shadow-md">
                <MapPin className="h-5 w-5 text-white" />
              </div>
            </MarkerContent>
            <MarkerPopup closeButton={false}>
              <div className="p-1 font-sans text-xs">
                <h4 className="font-bold text-slate-800 text-sm">Điểm Đến</h4>
                <p className="text-slate-600 mt-0.5">{destination}</p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Vị trí Xe tải */}
        <MapMarker longitude={formattedCurrentPos[0]} latitude={formattedCurrentPos[1]}>
          <MarkerContent>
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-600 bg-slate-900 shadow-lg">
              <Truck className="h-5 w-5 text-white" />
              <span className="absolute -inset-1 animate-ping rounded-full border-2 border-red-500/40 opacity-75"></span>
            </div>
          </MarkerContent>
          <MarkerPopup closeButton={false}>
            <div className="p-1 font-sans text-xs">
              <h4 className="font-bold text-slate-800 text-sm">Tài xế</h4>
              <p className="text-slate-600 mt-0.5">Tọa độ: {currentPos[0]}, {currentPos[1]}</p>
            </div>
          </MarkerPopup>
        </MapMarker>

        {/* Bảng điều khiển bản đồ */}
        <MapControls showZoom showCompass showFullscreen className="bottom-4 right-4" />
      </Map>
    </div>
  );
};
```

---

## 3. Lưu ý quan trọng về hệ tọa độ
* **Leaflet & Database (WGS84 chuẩn):** Thường lưu dạng `[Latitude, Longitude]` (Vĩ độ trước, Kinh độ sau).
* **Mapbox, MapLibre & GeoJSON:** Luôn luôn quy định `[Longitude, Latitude]` (Kinh độ trước, Vĩ độ sau).
* **Do đó:** Khi vẽ đường đi (`MapRoute`) hoặc đánh dấu (`MapMarker`), bắt buộc phải hoán đổi vị trí tọa độ như đã làm trong hàm `formattedRoute` và `formattedCurrentPos`.
