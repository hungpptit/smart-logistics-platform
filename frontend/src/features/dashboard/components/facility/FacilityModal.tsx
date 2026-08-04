import React, { useState, useEffect } from 'react';
import { XCircle, MapPin } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { AddressFormFields } from '../../../../components/ui/AddressFormFields';
import { MapPicker } from '../../../../components/ui/MapPicker';

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
  facilityType?: FacilityType;
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
  facilities?: Facility[];
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
}) => {
  const { token } = useAuth();
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');

  // Sync state on open/close
  useEffect(() => {
    if (!isOpen) {
      setSelectedProvinceCode('');
    }
  }, [isOpen]);

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
                disabled={!isEditing}
                value={formData.facilityTypeId}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, facilityTypeId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] disabled:bg-gray-100 font-semibold text-[#161D25]"
              >
                {(!isEditing
                  ? facilityTypes.filter(t => ['WARD_STATION', 'LAST_MILE_STATION', 'MICRO_HUB'].includes(t.typeCode.toUpperCase()))
                  : facilityTypes
                ).map(t => (
                  <option key={t.id} value={t.id}>{t.typeName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

              <AddressFormFields
                token={token}
                provinceCode={selectedProvinceCode}
                wardCode={formData.address.wardCode || ''}
                addressLine1={formData.address.addressLine1}
                onChange={({ province, provinceCode, ward, wardCode, addressLine1, latitude, longitude }) => {
                  setSelectedProvinceCode(provinceCode);
                  setFormData((prev: any) => {
                    const newAddress = {
                      ...prev.address,
                      province,
                      ward,
                      wardCode,
                      addressLine1
                    };
                    if (latitude !== undefined && longitude !== undefined) {
                      newAddress.latitude = latitude;
                      newAddress.longitude = longitude;
                    }
                    return {
                      ...prev,
                      address: newAddress
                    };
                  });
                }}
                required
              />

              <MapPicker
                latitude={formData.address.latitude}
                longitude={formData.address.longitude}
                onChange={(lat, lng) => setFormData((prev: any) => ({
                  ...prev,
                  address: { ...prev.address, latitude: lat, longitude: lng }
                }))}
                addressLine1={formData.address.addressLine1}
                ward={formData.address.ward}
                province={formData.address.province}
                token={token || ''}
              />
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
