import React from 'react';
import { BookOpen, XCircle, MapPin, Edit2, Trash2 } from 'lucide-react';

interface AddressItem {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  province: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  addressType: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN';
  isDefault: boolean;
}

interface Customer {
  id: string;
  userId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  companyName?: string;
  taxCode?: string;
  status: string;
  note?: string;
  createdAt: string;
  user?: {
    username: string;
    email?: string;
    phone?: string;
  };
}

interface CustomerDetailPanelProps {
  customer: Customer;
  addresses: AddressItem[];
  addressesLoading: boolean;
  onClose: () => void;
  onAddAddress: () => void;
  onEditAddress: (addr: AddressItem) => void;
  onDeleteAddress: (addressId: string) => void;
  canManage: boolean;
}

export const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({
  customer,
  addresses,
  addressesLoading,
  onClose,
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
  canManage
}) => {
  return (
    <div className="lg:col-span-5 bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[#e2e8f0] bg-[#161D25] text-white flex justify-between items-center">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[#bc0100]" />
          <span className="text-xs font-extrabold uppercase tracking-wider">Thông tin & Sổ địa chỉ</span>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <XCircle size={16} />
        </button>
      </div>

      <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[600px]">
        {/* Customer Info Card */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-150 flex flex-col gap-3 text-xs">
          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
            <span className="font-extrabold text-[#161D25] uppercase tracking-wider">
              {customer.customerType === 'BUSINESS' ? 'Doanh Nghiệp' : 'Cá Nhân'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
              customer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {customer.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-y-3 gap-x-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px]">Tài khoản</span>
              <span className="font-bold text-[#161D25]">{customer.user?.username || 'N/A'}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px]">Số điện thoại</span>
              <span className="font-bold text-[#161D25]">{customer.phone || 'N/A'}</span>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
              <span className="text-gray-400 text-[10px]">Email liên hệ</span>
              <span className="font-bold text-[#161D25] truncate">{customer.email || 'N/A'}</span>
            </div>
            
            {customer.customerType === 'BUSINESS' && (
              <>
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-400 text-[10px]">Tên Công ty</span>
                  <span className="font-bold text-[#161D25]">{customer.companyName || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-gray-400 text-[10px]">Mã số thuế</span>
                  <span className="font-bold text-[#161D25] font-mono">{customer.taxCode || 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          {customer.note && (
            <div className="border-t border-gray-200 pt-2 mt-1">
              <span className="text-gray-400 text-[10px] block mb-0.5">Ghi chú</span>
              <p className="text-gray-600 italic bg-white p-2 rounded border border-gray-150 text-[11px] leading-relaxed">
                {customer.note}
              </p>
            </div>
          )}
        </div>

        {/* Address Book Area */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-2">
            <h4 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider flex items-center gap-1.5">
              <MapPin size={14} className="text-[#bc0100]" />
              Sổ Địa Chỉ ({addresses.length})
            </h4>
            {canManage && (
              <button
                onClick={onAddAddress}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#161D25] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                <span>Thêm địa chỉ</span>
              </button>
            )}
          </div>

          {addressesLoading ? (
            <div className="py-8 text-center text-gray-400 text-xs">Đang tải địa chỉ...</div>
          ) : addresses.length === 0 ? (
            <div className="py-12 border border-dashed border-gray-200 rounded text-center text-gray-400 text-xs flex flex-col items-center gap-2">
              <MapPin size={24} className="text-gray-300" />
              <span>Chưa có địa chỉ nào được lưu</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {addresses.map((addr) => (
                <div 
                  key={addr.id}
                  className={`p-3 rounded border text-xs flex flex-col gap-2 transition-all hover:shadow-soft ${
                    addr.isDefault 
                      ? 'border-[#bc0100]/30 bg-[#bc0100]/2' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-[3px] text-[8px] font-extrabold uppercase tracking-widest ${
                        addr.addressType === 'WAREHOUSE'
                          ? 'bg-purple-100 text-purple-700'
                          : addr.addressType === 'OFFICE'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {addr.addressType}
                      </span>
                      {addr.isDefault && (
                        <span className="bg-red-100 text-[#bc0100] border border-red-200 px-1.5 py-0.5 rounded-[3px] text-[8px] font-extrabold uppercase tracking-widest">
                          Mặc định
                        </span>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditAddress(addr)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded cursor-pointer"
                          title="Sửa địa chỉ"
                        >
                          <Edit2 size={11} />
                        </button>
                        <button
                          onClick={() => onDeleteAddress(addr.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded cursor-pointer"
                          title="Xóa địa chỉ"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-gray-800">{addr.addressLine1}</p>
                    {addr.addressLine2 && <p className="text-gray-500 text-[11px]">{addr.addressLine2}</p>}
                    <p className="text-gray-500 mt-0.5">
                      {addr.ward}, {addr.province}
                    </p>
                    <p className="text-gray-400 font-mono text-[9px] mt-1">
                      GPS: {addr.latitude.toFixed(6)}, {addr.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
