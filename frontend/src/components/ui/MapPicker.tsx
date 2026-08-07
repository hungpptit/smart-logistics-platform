import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { Map, MapMarker, MarkerContent, MapControls } from './map';
import { useMapConfirmation } from '../../hooks/useMapConfirmation';

interface MapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
  addressLine1?: string;
  ward?: string;
  province?: string;
  token?: string;
  className?: string;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  className = ''
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>([105.8542, 21.0285]);
  const mapRef = useRef<any>(null);

  const {
    tempLatitude,
    tempLongitude,
    onMapClick,
    onMarkerDragEnd,
    onLocate,
    handleCancel,
    handleConfirm,
    hasChanges
  } = useMapConfirmation({
    latitude,
    longitude,
    onChange,
    mapRef
  });

  // Sync map center if coordinates exist on load or change externally
  useEffect(() => {
    if (latitude && longitude && latitude !== 0 && longitude !== 0) {
      setMapCenter([longitude, latitude]);

      const moveMap = () => {
        if (mapRef.current) {
          try {
            mapRef.current.flyTo({
              center: [longitude, latitude],
              zoom: 15,
              duration: 1800,
              speed: 1.1,
              curve: 1.42,
              essential: true
            });
          } catch (e) {
            try {
              mapRef.current.setCenter([longitude, latitude]);
            } catch (err) {}
          }
          try {
            mapRef.current.resize();
          } catch (err) {}
        }
      };

      moveMap();
      const timer = setTimeout(moveMap, 200);
      return () => clearTimeout(timer);
    } else {
      setMapCenter([105.8542, 21.0285]); // Hanoi default
    }
  }, [latitude, longitude]);

  const mapCallbackRef = useCallback((mapInstance: any) => {
    mapRef.current = mapInstance;
    if (!mapInstance) return;

    setTimeout(() => {
      mapInstance.resize();
      if (latitude && longitude) {
        mapInstance.setCenter([longitude, latitude]);
      }
    }, 300);

    mapInstance.on('click', onMapClick);
  }, [onMapClick, latitude, longitude]);



  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[9px]">
          <span>Bản đồ định vị</span>
        </div>

        <div className="w-full h-72 rounded-md border border-[#e2e8f0] overflow-hidden relative mt-0.5 bg-gray-50">
          <Map
            ref={mapCallbackRef}
            center={mapCenter}
            zoom={13}
            className="w-full h-full"
          >
            {tempLatitude !== 0 && tempLongitude !== 0 && (
              <MapMarker
                longitude={tempLongitude}
                latitude={tempLatitude}
                draggable
                onDragEnd={onMarkerDragEnd}
              >
                <MarkerContent>
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white shadow-sm text-white transition-transform hover:scale-110"
                    style={{ backgroundColor: '#bc0100' }}
                  >
                    <MapPin className="h-3 w-3" />
                  </div>
                </MarkerContent>
              </MapMarker>
            )}
            <MapControls
              showZoom
              showLocate
              onLocate={onLocate}
              className="top-2 right-2"
            />
          </Map>

          {/* Accidental click protection / Confirmation Panel */}
          {hasChanges && (
            <div className="absolute inset-x-0 bottom-0 bg-[#161D25]/90 backdrop-blur-xs p-2 flex justify-between items-center text-[10px] text-white animate-fade-in shadow-lg z-10">
              <span className="font-medium text-gray-300">
                Vị trí thay đổi chưa lưu
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-white font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-2 py-1 bg-[#bc0100] hover:bg-[#a00100] rounded text-white font-bold transition-colors cursor-pointer"
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          )}

          {!hasChanges && (
            <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] text-gray-500 shadow-xs pointer-events-none select-none">
              Kéo marker hoặc click bản đồ để chọn tọa độ
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Vĩ độ (Latitude)</label>
          <input
            type="number"
            step="0.000001"
            required
            disabled
            value={latitude || ''}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Kinh độ (Longitude)</label>
          <input
            type="number"
            step="0.000001"
            required
            disabled
            value={longitude || ''}
            className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
          />
        </div>
      </div>
    </div>
  );
};
