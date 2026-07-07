import React from 'react';
import { XCircle } from 'lucide-react';

interface CargoZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  zoneFormData: {
    id: string;
    zoneCode: string;
    zoneName: string;
    zoneType: 'RECEIVING' | 'SORTING' | 'STORAGE' | 'DISPATCH' | 'RETURN' | 'QUARANTINE';
    capacity: number;
  };
  setZoneFormData: React.Dispatch<React.SetStateAction<{
    id: string;
    zoneCode: string;
    zoneName: string;
    zoneType: 'RECEIVING' | 'SORTING' | 'STORAGE' | 'DISPATCH' | 'RETURN' | 'QUARANTINE';
    capacity: number;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
}

export const CargoZoneModal: React.FC<CargoZoneModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  zoneFormData,
  setZoneFormData,
  onSubmit,
  actionLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden">
        <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-wider">
            {isEditing ? 'Chỉnh sửa phân khu hàng hóa' : 'Tạo mới phân khu trong kho'}
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
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Mã phân khu (Zone Code)</label>
              <input
                type="text"
                required
                disabled={isEditing}
                placeholder="Ví dụ: ZONE-A"
                value={zoneFormData.zoneCode}
                onChange={(e) => setZoneFormData(prev => ({ ...prev, zoneCode: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] disabled:bg-gray-100 disabled:text-gray-500 font-bold font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tên phân khu (Zone Name)</label>
              <input
                type="text"
                required
                placeholder="Khu vực lưu trữ hàng lạnh"
                value={zoneFormData.zoneName}
                onChange={(e) => setZoneFormData(prev => ({ ...prev, zoneName: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại phân khu</label>
              <select
                value={zoneFormData.zoneType}
                onChange={(e) => setZoneFormData(prev => ({ ...prev, zoneType: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              >
                <option value="RECEIVING">Nhập hàng (RECEIVING)</option>
                <option value="SORTING">Phân loại (SORTING)</option>
                <option value="STORAGE">Lưu trữ (STORAGE)</option>
                <option value="DISPATCH">Xuất hàng (DISPATCH)</option>
                <option value="RETURN">Trả hàng (RETURN)</option>
                <option value="QUARANTINE">Cách ly / Kiểm duyệt (QUARANTINE)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Sức chứa (Capacity - Kiện hàng)</label>
              <input
                type="number"
                required
                value={zoneFormData.capacity}
                onChange={(e) => setZoneFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
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
              {actionLoading ? 'Đang lưu...' : 'Lưu phân khu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
