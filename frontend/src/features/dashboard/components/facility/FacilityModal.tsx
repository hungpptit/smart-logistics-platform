import React from 'react';
import { XCircle, MapPin } from 'lucide-react';

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
      district: string;
      province: string;
      country: string;
      latitude: number;
      longitude: number;
      addressType: string;
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
                onChange={(e) => setFormData(prev => ({ ...prev, facilityName: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>

            <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại kho bãi</label>
              <select
                value={formData.facilityTypeId}
                onChange={(e) => setFormData(prev => ({ ...prev, facilityTypeId: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, parentFacilityId: e.target.value }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, managerUserId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái hoạt động</label>
              <select
                value={formData.operatingStatus}
                onChange={(e) => setFormData(prev => ({ ...prev, operatingStatus: e.target.value as any }))}
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
                onChange={(e) => setFormData(prev => ({ ...prev, [isEditing ? 'closedAt' : 'openedAt']: e.target.value }))}
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

              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 1 (Số nhà, Tên đường)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 88 Song Hành"
                  value={formData.address.addressLine1}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, addressLine1: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Phường / Xã</label>
                  <input
                    type="text"
                    required
                    placeholder="An Phú"
                    value={formData.address.ward}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, ward: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Quận / Huyện</label>
                  <input
                    type="text"
                    required
                    placeholder="Quận 2"
                    value={formData.address.district}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, district: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tỉnh / Thành phố</label>
                  <input
                    type="text"
                    required
                    placeholder="Hồ Chí Minh"
                    value={formData.address.province}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, province: e.target.value }
                    }))}
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
                    value={formData.address.latitude}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, latitude: parseFloat(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={formData.address.longitude}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, longitude: parseFloat(e.target.value) }
                    }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
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
              onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
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
