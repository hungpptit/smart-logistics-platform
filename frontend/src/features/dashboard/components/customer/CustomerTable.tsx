import React from 'react';
import { Mail, Phone, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, User } from 'lucide-react';

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

interface CustomerTableProps {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  selectedCustomer: Customer | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  onViewDetails: (c: Customer) => void;
  onEdit: (c: Customer) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  loading,
  error,
  selectedCustomer,
  pagination,
  currentPage,
  setCurrentPage,
  onViewDetails,
  onEdit,
  onDelete,
  canManage
}) => {
  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-2 text-gray-400">
        <RefreshCw size={30} className="animate-spin text-[#bc0100]" />
        <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Đang tải danh sách khách hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center text-red-500 flex flex-col items-center gap-2">
        <AlertTriangle size={36} />
        <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
        <User size={40} className="text-gray-300" />
        <p className="text-xs font-semibold">Không tìm thấy hồ sơ khách hàng nào phù hợp</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#e2e8f0] bg-gray-50 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
            <th className="p-4">Khách hàng / Liên hệ</th>
            <th className="p-4">Phân loại</th>
            <th className="p-4">Doanh nghiệp / MST</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e8f0] text-xs">
          {customers.map((c) => {
            const isSelected = selectedCustomer?.id === c.id;
            return (
              <tr 
                key={c.id} 
                className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-[#bc0100]/5 border-l-4 border-l-[#bc0100]' : ''}`}
              >
                <td className="p-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[#161D25]">{c.user?.username || 'Khách hàng ẩn'}</span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Mail size={10} /> {c.email || 'N/A'}
                    </span>
                    {c.phone && (
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Phone size={10} /> {c.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider ${
                    c.customerType === 'BUSINESS'
                      ? 'bg-purple-50 text-purple-600 border border-purple-200'
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    {c.customerType === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân'}
                  </span>
                </td>
                <td className="p-4 text-gray-600">
                  {c.customerType === 'BUSINESS' ? (
                    <div className="flex flex-col">
                      <span className="font-bold">{c.companyName || 'Chưa cập nhật tên'}</span>
                      <span className="text-[10px] text-gray-400 font-mono">MST: {c.taxCode || 'Chưa khai báo'}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">N/A</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    c.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700'
                      : c.status === 'BLOCKED'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status === 'ACTIVE' ? 'Hoạt động' : c.status === 'BLOCKED' ? 'Bị khóa' : 'Tạm ngưng'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onViewDetails(c)}
                      className="p-1.5 text-[#161D25] hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      title="Xem chi tiết sổ địa chỉ"
                    >
                      <Eye size={14} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => onEdit(c)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(c.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Xóa khách hàng"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-gray-500">
          <span>Trang {pagination.page} / {pagination.totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 border border-[#e2e8f0] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={currentPage === pagination.totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
              className="p-1.5 border border-[#e2e8f0] rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
