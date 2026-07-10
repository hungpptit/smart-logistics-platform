import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XCircle, MapPin } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { AddressFormFields } from '../../../../components/ui/AddressFormFields';
import { geocodeAddress } from '../../../../lib/geocoding';
import { Map, MapMarker, MarkerContent, MapControls } from '../../../../components/ui/map';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  addressFormData: {
    id: string;
    addressLine1: string;
    addressLine2: string;
    ward: string;
    province: string;
    country: string;
    latitude: number;
    longitude: number;
    addressType: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN';
    isDefault: boolean;
    wardCode?: string;
  };
  setAddressFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
}

export const AddressModal: React.FC<AddressModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  addressFormData,
  setAddressFormData,
  onSubmit,
  actionLoading
}) => {
  const { token } = useAuth();
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');

  const [mapCenter, setMapCenter] = useState<[number, number]>([105.8542, 21.0285]);
  const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  // Sync map center if coordinates exist on load
  useEffect(() => {
    if (isOpen) {
      if (addressFormData.latitude && addressFormData.longitude) {
        setMapCenter([addressFormData.longitude, addressFormData.latitude]);
      } else {
        setMapCenter([105.8542, 21.0285]); // Hanoi default
      }
      
      // Fix map container size in modal
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current.resize();
        }, 300);
      }
    } else {
      setSelectedProvinceCode('');
    }
  }, [isOpen]);

  const clickHandlerRef = useRef<any>(null);
  clickHandlerRef.current = (e: any) => {
    const { lng, lat } = e.lngLat;
    setAddressFormData((prev: any) => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    }));
  };

  const mapCallbackRef = useCallback((mapInstance: any) => {
    mapRef.current = mapInstance;
    if (!mapInstance) return;

    // Trigger map resize shortly after loading to ensure it sizes correctly in modal
    setTimeout(() => {
      mapInstance.resize();
    }, 300);

    mapInstance.on('click', (e: any) => {
      clickHandlerRef.current?.(e);
    });
  }, []);

  const handleMarkerDragEnd = (lngLat: { lng: number; lat: number }) => {
    setAddressFormData((prev: any) => ({
      ...prev,
      latitude: parseFloat(lngLat.lat.toFixed(6)),
      longitude: parseFloat(lngLat.lng.toFixed(6))
    }));
  };

  const handleLocateCallback = useCallback((coords: { longitude: number; latitude: number }) => {
    setAddressFormData((prev: any) => ({
      ...prev,
      latitude: parseFloat(coords.latitude.toFixed(6)),
      longitude: parseFloat(coords.longitude.toFixed(6))
    }));
  }, [setAddressFormData]);

  const handleAutoLocate = async () => {
    const provinceName = addressFormData.province || '';
    const wardName = addressFormData.ward || '';
    const line1 = addressFormData.addressLine1 || '';

    if (!provinceName && !wardName && !line1) return;

    setGeocodingLoading(true);
    const fullAddress = [line1, wardName, provinceName].filter(Boolean).join(', ');
    
    try {
      const coords = await geocodeAddress(fullAddress, token || '');
      if (coords) {
        setAddressFormData((prev: any) => ({
          ...prev,
          latitude: parseFloat(coords.latitude.toFixed(6)),
          longitude: parseFloat(coords.longitude.toFixed(6))
        }));
        setMapCenter([coords.longitude, coords.latitude]);
        mapRef.current?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: 15,
          duration: 1000
        });
      }
    } catch (err) {
      console.error('Error auto-locating address:', err);
    } finally {
      setGeocodingLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden">
        <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-wider">
            {isEditing ? 'Chỉnh sửa địa chỉ khách hàng' : 'Thêm địa chỉ mới vào sổ'}
          </h4>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <XCircle size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 flex flex-col gap-4 text-xs">
          <AddressFormFields
            token={token}
            provinceCode={selectedProvinceCode}
            provinceName={addressFormData.province}
            wardCode={addressFormData.wardCode || ''}
            addressLine1={addressFormData.addressLine1}
            onChange={({ province, provinceCode, ward, wardCode, addressLine1 }) => {
              setSelectedProvinceCode(provinceCode);
              setAddressFormData((prev: any) => ({
                ...prev,
                province,
                ward,
                wardCode,
                addressLine1
              }));
            }}
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 2 (Tên tòa nhà, Căn hộ - Tùy chọn)</label>
            <input
              type="text"
              placeholder="Ví dụ: Tòa nhà Bitexco, Tầng 15"
              value={addressFormData.addressLine2}
              onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, addressLine2: e.target.value }))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[9px]">
              <span>Bản đồ định vị</span>
              <button
                type="button"
                onClick={handleAutoLocate}
                disabled={geocodingLoading || !addressFormData.addressLine1}
                className="text-[#bc0100] hover:text-[#900000] font-bold lowercase tracking-normal text-[10px] flex items-center gap-1 disabled:opacity-50 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                {geocodingLoading ? 'Đang định vị...' : '🔍 [Nhấn để định vị tự động]'}
              </button>
            </div>
            
            <div className="w-full h-72 rounded-md border border-[#e2e8f0] overflow-hidden relative mt-0.5 bg-gray-50">
              <Map
                ref={mapCallbackRef}
                center={mapCenter}
                zoom={13}
                className="w-full h-full"
              >
                {addressFormData.latitude !== 0 && addressFormData.longitude !== 0 && (
                  <MapMarker
                    longitude={addressFormData.longitude}
                    latitude={addressFormData.latitude}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
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
                  onLocate={handleLocateCallback}
                  className="bottom-2 right-2" 
                />
              </Map>
              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded text-[8px] text-gray-500 shadow-xs pointer-events-none select-none">
                Kéo marker hoặc click bản đồ để chọn tọa độ
              </div>
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
                value={addressFormData.latitude || ''}
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
                value={addressFormData.longitude || ''}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại địa chỉ</label>
              <select
                value={addressFormData.addressType}
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, addressType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              >
                <option value="HOME">Nhà riêng (HOME)</option>
                <option value="OFFICE">Văn phòng (OFFICE)</option>
                <option value="WAREHOUSE">Kho hàng (WAREHOUSE)</option>
                <option value="RETURN">Nơi trả hàng (RETURN)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="isDefaultAddressCheckbox"
                checked={addressFormData.isDefault}
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, isDefault: e.target.checked }))}
                className="w-4 h-4 text-[#bc0100] border-gray-300 rounded focus:ring-[#bc0100] cursor-pointer"
              />
              <label htmlFor="isDefaultAddressCheckbox" className="font-bold text-gray-700 cursor-pointer select-none">Đặt làm mặc định</label>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded font-bold uppercase tracking-wider text-[10px]"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white rounded font-bold uppercase tracking-wider text-[10px] disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Đang lưu...' : 'Lưu địa chỉ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
