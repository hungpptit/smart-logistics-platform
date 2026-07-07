import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { FacilityTable } from './facility/FacilityTable';
import { FacilityDetailPanel } from './facility/FacilityDetailPanel';
import { FacilityModal } from './facility/FacilityModal';
import { CargoZoneModal } from './facility/CargoZoneModal';

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

  // Cargo Zone Management
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

          <FacilityTable
            facilities={facilities}
            loading={loading}
            error={error}
            selectedFacility={selectedFacility}
            pagination={pagination}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onViewDetails={handleViewDetails}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteFacility}
            canManage={canManage}
          />
        </div>

        {/* Detailed Drawer (Right Side Panel for Facility & Cargo Zones) */}
        {selectedFacility && (
          <FacilityDetailPanel
            facility={selectedFacility}
            zones={zones}
            zonesLoading={zonesLoading}
            onClose={() => setSelectedFacility(null)}
            onAddZone={handleOpenCreateZone}
            onEditZone={handleOpenEditZone}
            onDeleteZone={handleDeleteZone}
            canManage={canManage}
          />
        )}
      </div>

      {/* Facility Modal (Create / Edit) */}
      <FacilityModal
        isOpen={showFacilityModal}
        onClose={() => setShowFacilityModal(false)}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSaveFacility}
        actionLoading={actionLoading}
        facilityTypes={facilityTypes}
        facilities={facilities}
      />

      {/* Cargo Zone Modal (Create / Edit Cargo Zone) */}
      <CargoZoneModal
        isOpen={showZoneModal}
        onClose={() => setShowZoneModal(false)}
        isEditing={isEditingZone}
        zoneFormData={zoneFormData}
        setZoneFormData={setZoneFormData}
        onSubmit={handleSaveZone}
        actionLoading={actionLoading}
      />
    </div>
  );
};
