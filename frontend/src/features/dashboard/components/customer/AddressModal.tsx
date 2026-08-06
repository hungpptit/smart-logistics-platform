import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { AddressFormFields } from '../../../../components/ui/AddressFormFields';
import { MapPicker } from '../../../../components/ui/MapPicker';

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
    provinceCode?: string;
    wardCode?: string;
    contactName?: string;
    contactPhone?: string;
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

  // Sync selectedProvinceCode when modal opens or addressFormData changes
  useEffect(() => {
    if (isOpen) {
      if (addressFormData.provinceCode) {
        setSelectedProvinceCode(addressFormData.provinceCode);
      }
    } else {
      setSelectedProvinceCode('');
    }
  }, [isOpen, addressFormData.provinceCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[88vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="px-4 py-3 bg-[#161D25] text-white flex justify-between items-center shrink-0 border-b border-gray-800">
          <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
            <span>{isEditing ? 'Chỉnh sửa địa chỉ' : '➕ Thêm địa chỉ mới vào sổ'}</span>
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-5 flex flex-col gap-4 text-xs overflow-y-auto flex-1">
          <AddressFormFields
            token={token}
            provinceCode={selectedProvinceCode}
            provinceName={addressFormData.province}
            wardCode={addressFormData.wardCode || ''}
            wardName={addressFormData.ward}
            addressLine1={addressFormData.addressLine1}
            onChange={({ province, provinceCode, ward, wardCode, addressLine1, latitude, longitude }) => {
              setSelectedProvinceCode(provinceCode);
              setAddressFormData((prev: any) => {
                const updates: any = {
                  province,
                  provinceCode,
                  ward,
                  wardCode,
                  addressLine1
                };
                if (latitude !== undefined && longitude !== undefined) {
                  updates.latitude = latitude;
                  updates.longitude = longitude;
                }
                return {
                  ...prev,
                  ...updates
                };
              });
            }}
            required
          />

          <MapPicker
            latitude={addressFormData.latitude}
            longitude={addressFormData.longitude}
            onChange={(lat, lng) => setAddressFormData((prev: any) => ({
              ...prev,
              latitude: lat,
              longitude: lng
            }))}
            addressLine1={addressFormData.addressLine1}
            ward={addressFormData.ward}
            province={addressFormData.province}
            token={token || ''}
          />

          {/* Tên người liên hệ & Số điện thoại liên hệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Tên người liên hệ (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: Anh Nam / Bách Hóa Xanh"
                value={addressFormData.contactName || ''}
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, contactName: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Số điện thoại liên hệ (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: 0903000001"
                value={addressFormData.contactPhone || ''}
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, contactPhone: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 font-bold uppercase tracking-wider text-[9px]">Loại địa chỉ</label>
              <select
                value={addressFormData.addressType}
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, addressType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] transition-colors"
              >
                <option value="HOME">Nhà riêng (HOME)</option>
                <option value="OFFICE">Văn phòng (OFFICE)</option>
                <option value="WAREHOUSE">Kho hàng (WAREHOUSE)</option>
                <option value="RETURN">Nơi trả hàng (RETURN)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-5">
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

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2 sticky bottom-0 bg-white z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded font-bold uppercase tracking-wider text-[10px] cursor-pointer transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white rounded font-bold uppercase tracking-wider text-[10px] disabled:opacity-50 cursor-pointer transition-colors shadow-sm"
            >
              {actionLoading ? 'Đang lưu...' : 'Lưu địa chỉ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
