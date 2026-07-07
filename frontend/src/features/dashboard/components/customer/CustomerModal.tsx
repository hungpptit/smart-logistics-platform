import React from 'react';
import { XCircle } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEditing: boolean;
  formData: {
    userId: string;
    customerType: 'INDIVIDUAL' | 'BUSINESS';
    companyName: string;
    taxCode: string;
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    note: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    userId: string;
    customerType: 'INDIVIDUAL' | 'BUSINESS';
    companyName: string;
    taxCode: string;
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    note: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  isEditing,
  formData,
  setFormData,
  onSubmit,
  actionLoading
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden">
        <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
          <h4 className="text-xs font-extrabold uppercase tracking-wider">
            {isEditing ? 'Chỉnh sửa hồ sơ khách hàng' : 'Tạo mới hồ sơ khách hàng'}
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
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại khách hàng</label>
            <select
              value={formData.customerType}
              onChange={(e) => setFormData(prev => ({ ...prev, customerType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
            >
              <option value="INDIVIDUAL">Cá nhân (Individual)</option>
              <option value="BUSINESS">Doanh nghiệp (Business)</option>
            </select>
          </div>

          {!isEditing && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">ID Người dùng liên kết (UUID - Tùy chọn)</label>
              <input
                type="text"
                placeholder="Nhập User ID nếu đã tạo tài khoản trước"
                value={formData.userId}
                onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              />
            </div>
          )}

          {formData.customerType === 'BUSINESS' && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tên Công ty / Tổ chức</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập tên doanh nghiệp đầy đủ"
                  value={formData.companyName}
                  onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Mã số thuế</label>
                <input
                  type="text"
                  required
                  placeholder="Mã số thuế doanh nghiệp"
                  value={formData.taxCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, taxCode: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
                />
              </div>
            </>
          )}

          {isEditing && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Trạng thái hoạt động</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
              >
                <option value="ACTIVE">Hoạt động (Active)</option>
                <option value="INACTIVE">Ngừng hoạt động (Inactive)</option>
                <option value="BLOCKED">Khóa (Blocked)</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Ghi chú thông tin</label>
            <textarea
              rows={3}
              placeholder="Ghi chú về khách hàng, ưu đãi..."
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
