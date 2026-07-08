import React, { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { CONFIG } from '../../../../config';

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
  const [provinces, setProvinces] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<string>('');
  const [loadingProvinces, setLoadingProvinces] = useState<boolean>(false);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);

  // Fetch provinces when modal opens
  useEffect(() => {
    if (isOpen && token) {
      const fetchProvinces = async () => {
        setLoadingProvinces(true);
        try {
          const res = await fetch(`${CONFIG.API_BASE_URL}/locations/provinces`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setProvinces(data.data || []);
            
            // If editing, try to find matching province and load its wards
            const existingProvince = addressFormData.province;
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
  }, [isOpen, token, addressFormData.province]);

  // Fetch wards when province code changes
  useEffect(() => {
    if (selectedProvinceCode && token) {
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
  }, [selectedProvinceCode, token]);

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedProvinceCode(code);
    const matched = provinces.find(p => p.code === code);
    setAddressFormData((prev: any) => ({
      ...prev,
      province: matched ? matched.fullName : '',
      ward: '',
      wardCode: ''
    }));
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    const matched = wards.find(w => w.code === code);
    setAddressFormData((prev: any) => ({
      ...prev,
      ward: matched ? (matched.fullName || matched.name) : '',
      wardCode: code
    }));
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tỉnh / Thành phố</label>
              <select
                required
                value={selectedProvinceCode}
                onChange={handleProvinceChange}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] bg-white"
                disabled={loadingProvinces}
              >
                <option value="">{loadingProvinces ? 'Đang tải...' : '-- Chọn Tỉnh/TP --'}</option>
                {provinces.map(p => (
                  <option key={p.code} value={p.code}>{p.fullName || p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Phường / Xã</label>
              <select
                required
                disabled={!selectedProvinceCode || loadingWards}
                value={addressFormData.wardCode || ''}
                onChange={handleWardChange}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] bg-white disabled:bg-gray-100"
              >
                <option value="">{loadingWards ? 'Đang tải...' : '-- Chọn Phường/Xã --'}</option>
                {wards.map(w => (
                  <option key={w.code} value={w.code}>{w.fullName || w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 1 (Số nhà, Tên đường)</label>
            <input
              type="text"
              required
              placeholder="Ví dụ: 123 Nguyễn Huệ"
              value={addressFormData.addressLine1}
              onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, addressLine1: e.target.value }))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
            />
          </div>

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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Vĩ độ (Latitude)</label>
              <input
                type="number"
                step="0.000001"
                required
                value={addressFormData.latitude}
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, latitude: parseFloat(e.target.value) || 0 }))}
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
                onChange={(e) => setAddressFormData((prev: any) => ({ ...prev, longitude: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
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
