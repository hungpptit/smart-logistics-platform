import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import {
  Search,
  Filter,
  RefreshCw,
  Plus,
  Eye,
  Edit2,
  Trash2,
  MapPin,
  Warehouse,
  User,
  Calendar,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight
} from 'lucide-react';

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

interface CargoZone {
  id: string;
  facilityId: string;
  zoneCode: string;
  zoneName: string;
  zoneType: 'RECEIVING' | 'SORTING' | 'STORAGE' | 'DISPATCH' | 'RETURN' | 'QUARANTINE';
  capacity?: number;
  createdAt: string;
}

export const FacilityTab: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<FacilityType[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Detail & Zone States
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [zones, setZones] = useState<CargoZone[]>([]);
  const [zonesLoading, setZonesLoading] = useState<boolean>(false);

  // Facility Form States
  const [showFacilityModal, setShowFacilityModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    facilityName: '',
    facilityTypeId: '',
    parentFacilityId: '',
    managerUserId: '',
    operatingStatus: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'CLOSED',
    openedAt: new Date().toISOString().split('T')[0],
    closedAt: '',
    note: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      ward: '',
      district: '',
      province: '',
      country: 'Vietnam',
      latitude: 10.7765,
      longitude: 106.7009,
      addressType: 'MAIN'
    }
  });

  // Zone Form States
  const [showZoneModal, setShowZoneModal] = useState<boolean>(false);
  const [zoneFormData, setZoneFormData] = useState({
    id: '',
    zoneCode: '',
    zoneName: '',
    zoneType: 'STORAGE' as 'RECEIVING' | 'SORTING' | 'STORAGE' | 'DISPATCH' | 'RETURN' | 'QUARANTINE',
    capacity: 1000
  });
  const [isEditingZone, setIsEditingZone] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const canManage = currentUser?.roles.includes('ADMIN') || currentUser?.roles.includes('STAFF');

  const fetchFacilityTypes = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities/types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFacilityTypes(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching facility types:', err);
    }
  };

  const fetchFacilities = async (page: number = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        typeId: typeFilter,
        status: statusFilter
      });
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFacilities(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách kho bãi.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu kho bãi.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilityZones = async (facilityId: string) => {
    if (!token) return;
    setZonesLoading(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities/${facilityId}/zones`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setZones(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching zones:', err);
    } finally {
      setZonesLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilityTypes();
    fetchFacilities(currentPage);
  }, [currentPage, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchFacilities(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
    setTimeout(() => {
      fetchFacilities(1);
    }, 50);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      facilityName: '',
      facilityTypeId: facilityTypes[0]?.id || '',
      parentFacilityId: '',
      managerUserId: '',
      operatingStatus: 'ACTIVE',
      openedAt: new Date().toISOString().split('T')[0],
      closedAt: '',
      note: '',
      address: {
        addressLine1: '',
        addressLine2: '',
        ward: '',
        district: '',
        province: '',
        country: 'Vietnam',
        latitude: 10.7765,
        longitude: 106.7009,
        addressType: 'MAIN'
      }
    });
    setIsEditing(false);
    setShowFacilityModal(true);
  };

  const handleOpenEditModal = (f: Facility) => {
    setFormData({
      facilityName: f.facilityName,
      facilityTypeId: f.facilityTypeId,
      parentFacilityId: f.parentFacilityId || '',
      managerUserId: f.managerUserId || '',
      operatingStatus: f.operatingStatus,
      openedAt: f.openedAt ? f.openedAt.split('T')[0] : '',
      closedAt: f.closedAt ? f.closedAt.split('T')[0] : '',
      note: f.note || '',
      // When editing, address properties are omitted since address isn't directly updated in this dto structure, 
      // but we satisfy the typescript structure.
      address: {
        addressLine1: '',
        addressLine2: '',
        ward: '',
        district: '',
        province: '',
        country: 'Vietnam',
        latitude: 10.7765,
        longitude: 106.7009,
        addressType: 'MAIN'
      }
    });
    setSelectedFacility(f);
    setIsEditing(true);
    setShowFacilityModal(true);
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const url = isEditing
        ? `${CONFIG.API_BASE_URL}/facilities/${selectedFacility?.id}`
        : `${CONFIG.API_BASE_URL}/facilities`;
      const method = isEditing ? 'PUT' : 'POST';

      // Build payload matching Dto schema requirements
      const payload: any = {
        facilityName: formData.facilityName,
        facilityTypeId: formData.facilityTypeId,
        operatingStatus: formData.operatingStatus,
        note: formData.note || undefined
      };

      if (formData.parentFacilityId) payload.parentFacilityId = formData.parentFacilityId;
      if (formData.managerUserId) payload.managerUserId = formData.managerUserId;

      if (isEditing) {
        if (formData.closedAt) payload.closedAt = new Date(formData.closedAt).toISOString();
      } else {
        payload.openedAt = new Date(formData.openedAt).toISOString();
        payload.address = {
          ...formData.address,
          latitude: Number(formData.address.latitude),
          longitude: Number(formData.address.longitude)
        };
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowFacilityModal(false);
        fetchFacilities(currentPage);
        if (isEditing && selectedFacility) {
          // Refresh detail view
          const detailsResponse = await fetch(`${CONFIG.API_BASE_URL}/facilities/${selectedFacility.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const detailsData = await detailsResponse.json();
          if (detailsResponse.ok && detailsData.success) {
            setSelectedFacility(detailsData.data);
          }
        }
      } else {
        alert(data.message || 'Lỗi khi lưu thông tin kho bãi.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFacility = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kho bãi này? Hủy bỏ liên kết?')) return;
    if (!token) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedFacility(null);
        fetchFacilities(currentPage);
      } else {
        alert(data.message || 'Không thể xóa kho bãi.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  // Cargo Zone Management functions
  const handleOpenCreateZone = () => {
    setZoneFormData({
      id: '',
      zoneCode: '',
      zoneName: '',
      zoneType: 'STORAGE',
      capacity: 1000
    });
    setIsEditingZone(false);
    setShowZoneModal(true);
  };

  const handleOpenEditZone = (z: CargoZone) => {
    setZoneFormData({
      id: z.id,
      zoneCode: z.zoneCode,
      zoneName: z.zoneName,
      zoneType: z.zoneType,
      capacity: z.capacity || 1000
    });
    setIsEditingZone(true);
    setShowZoneModal(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFacility) return;
    setActionLoading(true);
    try {
      const url = isEditingZone
        ? `${CONFIG.API_BASE_URL}/facilities/${selectedFacility.id}/zones/${zoneFormData.id}`
        : `${CONFIG.API_BASE_URL}/facilities/${selectedFacility.id}/zones`;
      const method = isEditingZone ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          zoneCode: zoneFormData.zoneCode,
          zoneName: zoneFormData.zoneName,
          zoneType: zoneFormData.zoneType,
          capacity: Number(zoneFormData.capacity)
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowZoneModal(false);
        fetchFacilityZones(selectedFacility.id);
      } else {
        alert(data.message || 'Lỗi khi lưu phân khu.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phân khu này?')) return;
    if (!token || !selectedFacility) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities/${selectedFacility.id}/zones/${zoneId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchFacilityZones(selectedFacility.id);
      } else {
        alert(data.message || 'Không thể xóa phân khu.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleViewDetails = (f: Facility) => {
    setSelectedFacility(f);
    fetchFacilityZones(f.id);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col lg:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm kho bãi, mã bưu cục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none"
            >
              <option value="">Tất cả loại kho bãi</option>
              {facilityTypes.map(t => (
                <option key={t.id} value={t.id}>{t.typeName}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
              <option value="MAINTENANCE">Bảo trì</option>
              <option value="CLOSED">Đã đóng cửa</option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#161D25] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            Lọc
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="p-2 border border-[#e2e8f0] hover:bg-gray-50 rounded text-gray-500 cursor-pointer"
            title="Làm mới bộ lọc"
          >
            <RefreshCw size={14} />
          </button>
        </form>

        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white text-xs font-bold uppercase tracking-wider rounded shadow-md transition-colors cursor-pointer w-full lg:w-auto justify-center"
          >
            <Plus size={14} />
            <span>Thêm kho bãi</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Facility Table */}
        <div className={`bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden ${selectedFacility ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-[#fafafa]">
            <h3 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider">Mạng lưới kho bãi & bưu cục</h3>
            <span className="text-[10px] text-gray-500 font-bold">Tổng số: {pagination.total}</span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-2 text-gray-400">
              <RefreshCw size={30} className="animate-spin text-[#bc0100]" />
              <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Đang tải dữ liệu mạng lưới...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 flex flex-col items-center gap-2">
              <AlertTriangle size={36} />
              <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
            </div>
          ) : facilities.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
              <Warehouse size={40} className="text-gray-300" />
              <p className="text-xs font-semibold">Không tìm thấy thông tin kho bãi nào</p>
            </div>
          ) : (
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
                              onClick={() => handleViewDetails(f)}
                              className="p-1.5 text-[#161D25] hover:bg-gray-100 rounded transition-colors cursor-pointer"
                              title="Xem chi tiết & Cargo Zones"
                            >
                              <Eye size={14} />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(f)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="Chỉnh sửa kho bãi"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteFacility(f.id)}
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
          )}
        </div>

        {/* Detailed Drawer (Right Side Panel for Facility & Cargo Zones) */}
        {selectedFacility && (
          <div className="lg:col-span-5 bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#e2e8f0] bg-[#161D25] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Warehouse size={16} className="text-[#bc0100]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Thông tin chi tiết & Phân khu</span>
              </div>
              <button 
                onClick={() => setSelectedFacility(null)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <XCircle size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[600px]">
              {/* Facility Info Card */}
              <div className="bg-gray-50 p-4 rounded-md border border-gray-150 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                  <span className="font-extrabold text-[#161D25] uppercase tracking-wider">
                    {selectedFacility.facilityType?.typeName || 'N/A'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-gray-500">{selectedFacility.facilityCode}</span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                  <div className="flex flex-col gap-0.5 col-span-2">
                    <span className="text-gray-400 text-[10px]">Tên kho bãi</span>
                    <span className="font-bold text-[#161D25] text-sm">{selectedFacility.facilityName}</span>
                  </div>
                  
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-[10px] flex items-center gap-1"><Calendar size={10} /> Ngày mở cửa</span>
                    <span className="font-bold text-[#161D25]">{selectedFacility.openedAt ? new Date(selectedFacility.openedAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-[10px] flex items-center gap-1"><User size={10} /> Quản lý</span>
                    <span className="font-bold text-[#161D25]">{selectedFacility.manager?.username || 'Chưa chỉ định'}</span>
                  </div>

                  {selectedFacility.facilityAddresses?.[0]?.address && (
                    <div className="flex flex-col gap-0.5 col-span-2 border-t border-gray-200 pt-2 mt-1">
                      <span className="text-gray-400 text-[10px] flex items-center gap-1"><MapPin size={10} /> Địa chỉ vật lý</span>
                      <span className="font-medium text-gray-700 leading-relaxed">
                        {selectedFacility.facilityAddresses[0].address.formattedAddress}
                      </span>
                      <span className="text-[9px] font-mono text-gray-400">
                        GPS: {selectedFacility.facilityAddresses[0].address.latitude.toFixed(6)}, {selectedFacility.facilityAddresses[0].address.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                </div>

                {selectedFacility.note && (
                  <div className="border-t border-gray-200 pt-2 mt-1">
                    <span className="text-gray-400 text-[10px] block mb-0.5">Ghi chú vận hành</span>
                    <p className="text-gray-600 italic bg-white p-2 rounded border border-gray-150 text-[11px] leading-relaxed">
                      {selectedFacility.note}
                    </p>
                  </div>
                )}
              </div>

              {/* Cargo Zones Book Area */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-[#e2e8f0] pb-2">
                  <h4 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers size={14} className="text-[#bc0100]" />
                    Phân Khu Lưu Kho ({zones.length})
                  </h4>
                  {canManage && (
                    <button
                      onClick={handleOpenCreateZone}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#161D25] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                    >
                      <Plus size={10} />
                      <span>Thêm phân khu</span>
                    </button>
                  )}
                </div>

                {zonesLoading ? (
                  <div className="py-8 text-center text-gray-400 text-xs">Đang tải phân khu...</div>
                ) : zones.length === 0 ? (
                  <div className="py-12 border border-dashed border-gray-200 rounded text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                    <Layers size={24} className="text-gray-300 animate-pulse" />
                    <span>Chưa có phân khu hàng hóa nào</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {zones.map((zone) => (
                      <div 
                        key={zone.id}
                        className="p-3 rounded border border-gray-200 bg-white text-xs flex flex-col gap-2 transition-all hover:shadow-soft"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-gray-800">{zone.zoneName}</span>
                            <span className="px-2 py-0.5 rounded-[3px] text-[8px] font-extrabold bg-[#bc0100]/10 text-[#bc0100] border border-[#bc0100]/20 tracking-wider">
                              {zone.zoneCode}
                            </span>
                          </div>

                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleOpenEditZone(zone)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded cursor-pointer"
                                title="Sửa phân khu"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteZone(zone.id)}
                                className="p-1 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded cursor-pointer"
                                title="Xóa phân khu"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-gray-500 border-t border-gray-100 pt-2 mt-1">
                          <span>Loại phân khu: <strong className="text-gray-700">{zone.zoneType}</strong></span>
                          <span>Sức chứa: <strong className="text-gray-700">{zone.capacity || 'N/A'}</strong> kiện</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Facility Modal (Create / Edit) */}
      {showFacilityModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
              <h4 className="text-xs font-extrabold uppercase tracking-wider">
                {isEditing ? 'Chỉnh sửa kho bãi' : 'Tạo mới kho bãi trong mạng lưới'}
              </h4>
              <button 
                onClick={() => setShowFacilityModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <XCircle size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="p-5 flex flex-col gap-4 text-xs max-h-[500px] overflow-y-auto">
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
                    {facilities.filter(f => f.id !== selectedFacility?.id).map(f => (
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
                  onClick={() => setShowFacilityModal(false)}
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
      )}

      {/* Cargo Zone Modal (Create / Edit Cargo Zone) */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
              <h4 className="text-xs font-extrabold uppercase tracking-wider">
                {isEditingZone ? 'Chỉnh sửa phân khu hàng hóa' : 'Tạo mới phân khu trong kho'}
              </h4>
              <button 
                onClick={() => setShowZoneModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <XCircle size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="p-5 flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Mã phân khu (Zone Code)</label>
                  <input
                    type="text"
                    required
                    disabled={isEditingZone}
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
                  onClick={() => setShowZoneModal(false)}
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
      )}
    </div>
  );
};
