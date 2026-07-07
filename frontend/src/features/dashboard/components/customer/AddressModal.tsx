import React from 'react';
import { XCircle } from 'lucide-react';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  addressFormData: {
    id: string;
    addressLine1: string;
    addressLine2: string;
    ward: string;
    district: string;
    province: string;
    country: string;
    latitude: number;
    longitude: number;
    addressType: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN';
    isDefault: boolean;
  };
  setAddressFormData: React.Dispatch<React.SetStateAction<{
    id: string;
    addressLine1: string;
    addressLine2: string;
    ward: string;
    district: string;
    province: string;
    country: string;
    latitude: number;
    longitude: number;
    addressType: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN';
    isDefault: boolean;
  }>>;
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
          <div className="flex flex-col gap-1">
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 1 (Số nhà, Tên đường)</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: 123 Nguyễn Huệ"
              value={addressFormData.addressLine1}
              onChange={(e) => setAddressFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 2 (Tên tòa nhà, Căn hộ - Tùy chọn)</label>
            <input
              type="text"
              placeholder="Ví dụ: Tòa nhà Bitexco, Tầng 15"
              value={addressFormData.addressLine2}
              onChange={(e) => setAddressFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Phường / Xã</label>
              <input
                type="text"
                required
                placeholder="Bến Nghé"
                value={addressFormData.ward}
                onChange={(e) => setAddressFormData(prev => ({ ...prev, ward: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Quận / Huyện</label>
              <input
                type="text"
                required
                placeholder="Quận 1"
                value={addressFormData.district}
                onChange={(e) => setAddressFormData(prev => ({ ...prev, district: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tỉnh / Thành phố</label>
              <input
                type="text"
                required
                placeholder="Hồ Chí Minh"
                value={addressFormData.province}
                onChange={(e) => setAddressFormData(prev => ({ ...prev, province: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Vĩ độ (Latitude)</label>
              <input
                type="number"
                step="0.000001"
                required
                value={addressFormData.latitude}
                onChange={(e) => setAddressFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Kinh độ (Longitude)</label>
              <input
                type="number"
                step="0.000001"
                required
                value={addressFormData.longitude}
                onChange={(e) => setAddressFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại địa chỉ</label>
              <select
                value={addressFormData.addressType}
                onChange={(e) => setAddressFormData(prev => ({ ...prev, addressType: e.target.value as any }))}
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
                onChange={(e) => setAddressFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
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
