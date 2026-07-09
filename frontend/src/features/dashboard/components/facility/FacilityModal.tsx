import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XCircle, MapPin } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { CONFIG } from '../../../../config';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { geocodeAddress } from '../../../../lib/geocoding';
import { Map, MapMarker, MarkerContent, MapControls } from '../../../../components/ui/map';

interface FacilityType {
  id: string;
  typeCode: string;
  typeName: string;
  description?: string;
}

interface Facility {
  id: string;
  facilityCode: string;
  facilityName: string;
  facilityTypeId: string;
  parentFacilityId?: string;
  managerUserId?: string;
  operatingStatus: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
  openedAt: string;
  closedAt?: string;
  note?: string;
}

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: {
    facilityName: string;
    facilityTypeId: string;
    parentFacilityId: string;
    managerUserId: string;
    operatingStatus: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED';
    openedAt: string;
    closedAt: string;
    note: string;
    address: {
      addressLine1: string;
      addressLine2: string;
      ward: string;
      province: string;
      country: string;
      latitude: number;
      longitude: number;
      addressType: string;
      wardCode?: string;
    };
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
  facilityTypes: FacilityType[];
  facilities: Facility[];
}

export const FacilityModal: React.FC<FacilityModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  actionLoading,
  facilityTypes,
  facilities
}) => {
  const { token } = useAuth();
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>([105.8542, 21.0285]);
  const [geocodingLoading, setGeocodingLoading] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  // Sync map center if coordinates exist on load
  useEffect(() => {
    if (isOpen) {
      if (formData.address?.latitude && formData.address?.longitude) {
        setMapCenter([formData.address.longitude, formData.address.latitude]);
      } else {
        setMapCenter([105.8542, 21.0285]); // Hanoi default
      }
      
      // Fix map container size in modal
      if (mapRef.current) {
        setTimeout(() => {
          mapRef.current.resize();
        }, 300);
      }
    }
  }, [isOpen]);

  const clickHandlerRef = useRef<any>(null);
  clickHandlerRef.current = (e: any) => {
    const { lng, lat } = e.lngLat;
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        latitude: parseFloat(lat.toFixed(6)),
        longitude: parseFloat(lng.toFixed(6))
      }
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
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        latitude: parseFloat(lngLat.lat.toFixed(6)),
        longitude: parseFloat(lngLat.lng.toFixed(6))
      }
    }));
  };

  const handleLocateCallback = useCallback((coords: { longitude: number; latitude: number }) => {
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        latitude: parseFloat(coords.latitude.toFixed(6)),
        longitude: parseFloat(coords.longitude.toFixed(6))
      }
    }));
  }, [setFormData]);

  const handleAutoLocate = async () => {
    const provinceObj = provinces.find(p => p.code === selectedProvinceCode);
    const wardObj = wards.find(w => w.code === formData.address.wardCode);
    
    const provinceName = provinceObj ? provinceObj.fullName : '';
    const wardName = wardObj ? (wardObj.fullName || wardObj.name) : '';
    const line1 = formData.address.addressLine1 || '';

    if (!provinceName && !wardName && !line1) return;

    setGeocodingLoading(true);
    const fullAddress = [line1, wardName, provinceName].filter(Boolean).join(', ');
    
    try {
      const coords = await geocodeAddress(fullAddress, token);
      if (coords) {
        setFormData((prev: any) => ({
          ...prev,
          address: {
            ...prev.address,
            latitude: parseFloat(coords.latitude.toFixed(6)),
            longitude: parseFloat(coords.longitude.toFixed(6))
          }
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

  // Fetch provinces when modal opens
  useEffect(() => {
    if (isOpen && token && !isEditing) {
      const fetchProvinces = async () => {
        setLoadingProvinces(true);
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/locations/provinces`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setProvinces(data.data || []);
            
            // If there's an existing province, try to select it
            const existingProvince = formData.address.province;
            if (existingProvince) {
              const matched = (data.data || []).find((p: any) => 
                p.fullName.toLowerCase() === existingProvince.toLowerCase() || 
                p.name.toLowerCase() === existingProvince.toLowerCase()
              );
              if (matched) {
                setSelectedProvinceCode(matched.code);
              }
            }
          }
        } catch (err) {
          console.error('Error fetching provinces:', err);
        } finally {
          setLoadingProvinces(false);
        }
      };
      fetchProvinces();
    } else if (!isOpen) {
      setProvinces([]);
      setWards([]);
      setSelectedProvinceCode('');
    }
  }, [isOpen, token, isEditing, formData.address.province]);

  // Fetch wards when province code changes
  useEffect(() => {
    if (selectedProvinceCode && token && !isEditing) {
      const fetchWards = async () => {
        setLoadingWards(true);
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/locations/provinces/${selectedProvinceCode}/wards`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setWards(data.data || []);
          }
        } catch (err) {
          console.error('Error fetching wards:', err);
        } finally {
          setLoadingWards(false);
        }
      };
      fetchWards();
    } else {
      setWards([]);
    }
  }, [selectedProvinceCode, token, isEditing]);

  const handleProvinceChange = (code: string) => {
    setSelectedProvinceCode(code);
    const matched = provinces.find(p => p.code === code);
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        province: matched ? matched.fullName : '',
        ward: '',
        wardCode: ''
      }
    }));
  };

  const handleWardChange = (code: string) => {
    const matched = wards.find(w => w.code === code);
    setFormData((prev: any) => ({
      ...prev,
      address: {
        ...prev.address,
        ward: matched ? (matched.fullName || matched.name) : '',
        wardCode: code
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-lg w-full overflow-hidden">
        <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-wider">
            {isEditing ? 'Chỉnh sửa kho bãi' : 'Tạo mới kho bãi trong mạng lưới'}
          </h4>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white cursor-pointer"
          >
            <XCircle size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 flex flex-col gap-4 text-xs max-h-[500px] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tên kho bãi / Trạm</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Hub Thủ Đức"
                value={formData.facilityName}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, facilityName: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại kho bãi</label>
              <select
                value={formData.facilityTypeId}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, facilityTypeId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              >
                {facilityTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.typeName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Kho bãi cấp cha (Tùy chọn)</label>
              <select
                value={formData.parentFacilityId}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, parentFacilityId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              >
                <option value="">Không có (Là kho gốc)</option>
                {facilities.map(f => (
                  <option key={f.id} value={f.id}>{f.facilityName} ({f.facilityCode})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">ID Người quản lý (UUID - Tùy chọn)</label>
              <input
                type="text"
                placeholder="Nhập ID User quản lý kho"
                value={formData.managerUserId}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, managerUserId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái hoạt động</label>
              <select
                value={formData.operatingStatus}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, operatingStatus: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              >
                <option value="ACTIVE">Đang hoạt động (ACTIVE)</option>
                <option value="INACTIVE">Tạm ngưng hoạt động (INACTIVE)</option>
                <option value="MAINTENANCE">Bảo trì kỹ thuật (MAINTENANCE)</option>
                <option value="CLOSED">Đã đóng cửa (CLOSED)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                {isEditing ? 'Ngày đóng cửa (Nếu có)' : 'Ngày mở cửa'}
              </label>
              <input
                type="date"
                required={!isEditing}
                value={isEditing ? formData.closedAt : formData.openedAt}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, [isEditing ? 'closedAt' : 'openedAt']: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>
          </div>

          {/* Physical Address Fields - Only on Creation */}
          {!isEditing && (
            <div className="border-t border-gray-150 pt-4 mt-1 flex flex-col gap-3">
              <h5 className="font-bold text-[#161D25] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <MapPin size={12} className="text-[#bc0100]" />
                Định vị & Địa chỉ kho bãi
              </h5>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tỉnh / Thành phố</label>
                  <SearchableSelect
                    options={provinces.map(p => ({ value: p.code, label: p.fullName || p.name }))}
                    value={selectedProvinceCode}
                    onChange={handleProvinceChange}
                    placeholder="-- Chọn Tỉnh/TP --"
                    loading={loadingProvinces}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Phường / Xã</label>
                  <SearchableSelect
                    options={wards.map(w => ({ value: w.code, label: w.fullName || w.name }))}
                    value={formData.address.wardCode || ''}
                    onChange={handleWardChange}
                    placeholder="-- Chọn Phường/Xã --"
                    disabled={!selectedProvinceCode}
                    loading={loadingWards}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 1 (Số nhà, Tên đường)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 88 Song Hành"
                  value={formData.address.addressLine1}
                  onChange={(e) => setFormData((prev: any) => ({
                    ...prev,
                    address: { ...prev.address, addressLine1: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-gray-400 font-bold uppercase tracking-wider text-[9px]">
                  <span>Bản đồ định vị</span>
                  <button
                    type="button"
                    onClick={handleAutoLocate}
                    disabled={geocodingLoading || !formData.address.addressLine1}
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
                    {formData.address.latitude !== 0 && formData.address.longitude !== 0 && (
                      <MapMarker
                        longitude={formData.address.longitude}
                        latitude={formData.address.latitude}
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
                    value={formData.address.latitude || ''}
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
                    value={formData.address.longitude || ''}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none bg-gray-100 text-gray-500 cursor-not-allowed font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Ghi chú / Mô tả</label>
            <textarea
              rows={2}
              placeholder="Ghi chú về năng lực chứa hàng, luồng vận hành..."
              value={formData.note}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, note: e.target.value }))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
            />
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
              {actionLoading ? 'Đang lưu...' : 'Lưu thông tin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
