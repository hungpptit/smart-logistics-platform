import React from 'react';
import { Eye, Edit2, Trash2, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Warehouse } from 'lucide-react';

interface FacilityType {
  id: string;
  typeCode: string;
  typeName: string;
  description?: string;
}

interface FacilityAddress {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  district: string;
  province: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress?: string;
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
  facilityAddresses?: Array<{
    address: FacilityAddress;
    addressType: string;
  }>;
  manager?: {
    username: string;
    email: string;
    phone?: string;
  };
}

interface FacilityTableProps {
  facilities: Facility[];
  loading: boolean;
  error: string | null;
  selectedFacility: Facility | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  onViewDetails: (f: Facility) => void;
  onEdit: (f: Facility) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}

export const FacilityTable: React.FC<FacilityTableProps> = ({
  facilities,
  loading,
  error,
  selectedFacility,
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
        <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Đang tải dữ liệu mạng lưới...</p>
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

  if (facilities.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
        <Warehouse size={40} className="text-gray-300" />
        <p className="text-xs font-semibold">Không tìm thấy thông tin kho bãi nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#e2e8f0] bg-gray-50 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
            <th className="p-4">Mã / Tên kho bãi</th>
            <th className="p-4">Phân loại</th>
            <th className="p-4">Địa điểm</th>
            <th className="p-4">Trạng thái</th>
            <th className="p-4 text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e2e8f0] text-xs">
          {facilities.map((f) => {
            const isSelected = selectedFacility?.id === f.id;
            const primaryAddress = f.facilityAddresses?.[0]?.address;
            return (
              <tr 
                key={f.id} 
                className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-[#bc0100]/5 border-l-4 border-l-[#bc0100]' : ''}`}
              >
                <td className="p-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-[#161D25]">{f.facilityName}</span>
                    <span className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">{f.facilityCode}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex px-2 py-0.5 rounded-[4px] text-[9px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                    {f.facilityType?.typeName || 'Chưa phân loại'}
                  </span>
                </td>
                <td className="p-4 text-gray-600 max-w-[200px] truncate">
                  {primaryAddress ? (
                    <span title={primaryAddress.formattedAddress}>{primaryAddress.formattedAddress}</span>
                  ) : (
                    <span className="text-gray-400 italic">Chưa xác định tọa độ</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                    f.operatingStatus === 'ACTIVE'
                      ? 'bg-green-50 text-green-700'
                      : f.operatingStatus === 'MAINTENANCE'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {f.operatingStatus === 'ACTIVE'
                      ? 'Hoạt động'
                      : f.operatingStatus === 'MAINTENANCE'
                      ? 'Bảo trì'
                      : f.operatingStatus === 'CLOSED'
                      ? 'Đã đóng'
                      : 'Tạm dừng'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onViewDetails(f)}
                      className="p-1.5 text-[#161D25] hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      title="Xem chi tiết & Cargo Zones"
                    >
                      <Eye size={14} />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => onEdit(f)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Chỉnh sửa kho bãi"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(f.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Xóa kho bãi"
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
