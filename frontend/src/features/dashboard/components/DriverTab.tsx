import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { 
  Search, RefreshCw, Plus, Edit2, Trash2, ShieldAlert, AlertTriangle, 
  Phone, ChevronLeft, ChevronRight, X, Loader2, Compass, Eye 
} from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

interface Facility {
  id: string;
  facilityCode: string;
  facilityName: string;
}

interface Driver {
  id: string;
  userId?: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  email?: string;
  citizenId?: string | null;
  driverLicenseNumber: string;
  driverLicenseClass: string;
  driverType?: 'HUB_DELIVERY' | 'LINEHAUL_TRANSFER' | 'ON_DEMAND';
  hireDate: string;
  employmentStatus: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED';
  homeFacilityId?: string;
  assignedFacilityId?: string;
  createdAt: string;
  assignedFacility?: {
    id: string;
    facilityCode: string;
    facilityName: string;
  };
  homeFacility?: {
    id: string;
    facilityCode: string;
    facilityName: string;
  };
  user?: {
    id: string;
    username: string;
    email?: string;
    status: string;
  };
}

export const DriverTab: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const userAssignedFacilityId = currentUser?.staffProfile?.assignedFacilityId;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [facilityFilter, setFacilityFilter] = useState<string>(userAssignedFacilityId || '');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (userAssignedFacilityId && !facilityFilter) {
      setFacilityFilter(userAssignedFacilityId);
    }
  }, [userAssignedFacilityId]);

  // Modal states
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedDriverDetail, setSelectedDriverDetail] = useState<Driver | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    userId: '',
    fullName: '',
    phone: '',
    citizenId: '',
    driverLicenseNumber: '',
    driverLicenseClass: '',
    hireDate: new Date().toISOString().split('T')[0],
    driverType: 'HUB_DELIVERY' as 'HUB_DELIVERY' | 'LINEHAUL_TRANSFER' | 'ON_DEMAND',
    employmentStatus: 'ACTIVE' as 'ACTIVE' | 'OFFLINE' | 'SUSPENDED',
    homeFacilityId: '',
    createUser: false,
    email: '',
    username: ''
  });

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = currentUser?.roles.includes('ADMIN') || currentUser?.roles.includes('STAFF') || currentUser?.permissions.includes('DRIVER_MANAGE');

  useEffect(() => {
    fetchDrivers(currentPage);
  }, [currentPage, facilityFilter, statusFilter]);

  useEffect(() => {
    fetchFacilities();
  }, [token]);

  const fetchDrivers = async (page: number = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        facilityId: facilityFilter,
        status: statusFilter
      });
      const response = await fetch(`${CONFIG.API_BASE_URL}/drivers?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDrivers(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách tài xế.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu tài xế.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilities = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/facilities?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setFacilities(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching facilities:', err);
    }
  };



  // Pre-fill facilities for main dashboard filter as well
  useEffect(() => {
    fetchFacilities();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDrivers(1);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedDriverId(null);
    setFormData({
      userId: '',
      fullName: '',
      phone: '',
      citizenId: '',
      driverLicenseNumber: '',
      driverLicenseClass: '',
      hireDate: new Date().toISOString().split('T')[0],
      driverType: 'HUB_DELIVERY',
      employmentStatus: 'ACTIVE',
      homeFacilityId: '',
      createUser: false,
      email: '',
      username: ''
    });
    setActionError(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (driver: Driver) => {
    setIsEditing(true);
    setSelectedDriverId(driver.id);
    setFormData({
      userId: driver.userId || '',
      fullName: driver.fullName,
      phone: driver.phone,
      citizenId: driver.citizenId || '',
      driverLicenseNumber: driver.driverLicenseNumber,
      driverLicenseClass: driver.driverLicenseClass,
      hireDate: driver.hireDate ? driver.hireDate.split('T')[0] : '',
      driverType: driver.driverType || 'HUB_DELIVERY',
      employmentStatus: driver.employmentStatus,
      homeFacilityId: driver.assignedFacilityId || driver.homeFacilityId || driver.assignedFacility?.id || driver.homeFacility?.id || '',
      createUser: false,
      email: driver.email || driver.user?.email || '',
      username: driver.user?.username || ''
    });
    setActionError(null);
    setShowModal(true);
  };

  const handleOpenDetailModal = (driver: Driver) => {
    setSelectedDriverDetail(driver);
    setShowDetailModal(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setActionLoading(true);
    setActionError(null);

    const payload = {
      ...formData,
      homeFacilityId: formData.homeFacilityId === '' ? undefined : formData.homeFacilityId,
      username: isEditing ? undefined : formData.username,
      email: isEditing ? undefined : formData.email,
    };

    try {
      const url = isEditing 
        ? `${CONFIG.API_BASE_URL}/drivers/${selectedDriverId}` 
        : `${CONFIG.API_BASE_URL}/drivers`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowModal(false);
        fetchDrivers(currentPage);
      } else {
        setActionError(data.message || 'Có lỗi xảy ra trong quá trình xử lý.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Lỗi máy chủ, vui lòng thử lại sau.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa hồ sơ tài xế "${name}"?`)) return;
    if (!token) return;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/drivers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchDrivers(currentPage);
      } else {
        alert(data.message || 'Không thể xóa tài xế này.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi xóa tài xế.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filter Card */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col lg:flex-row gap-4 lg:items-start justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm mã, tên, số điện thoại..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Warehouse Filter */}
            <div className="w-[220px]">
              <SearchableSelect
                value={facilityFilter}
                onChange={(val) => setFacilityFilter(val)}
                options={[
                  { value: '', label: 'Tất cả kho hoạt động' },
                  ...facilities.map((fac) => ({
                    value: fac.id,
                    label: `${fac.facilityName} (${fac.facilityCode})`
                  }))
                ]}
              />
            </div>

            {/* Status Filter */}
            <div className="w-[160px]">
              <SearchableSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Đang hoạt động' },
                  { value: 'OFFLINE', label: 'Ngoại tuyến' },
                  { value: 'SUSPENDED', label: 'Bị đình chỉ' }
                ]}
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-[#161D25] hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
          >
            Lọc
          </button>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFacilityFilter('');
              setStatusFilter('');
              setCurrentPage(1);
              fetchDrivers();
            }}
            className="p-2 border border-[#e2e8f0] hover:bg-gray-50 rounded text-gray-500 cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={14} />
          </button>
        </form>

        {canManage && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white text-xs font-bold uppercase tracking-wider rounded shadow-md transition-colors cursor-pointer w-full lg:w-auto justify-center whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span>Thêm tài xế mới</span>
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-2 text-gray-400">
            <Loader2 size={30} className="animate-spin text-[#bc0100]" />
            <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Đang tải danh sách tài xế...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 flex flex-col items-center gap-2">
            <AlertTriangle size={36} />
            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <Compass size={40} className="text-gray-300" />
            <p className="text-xs font-semibold">Không tìm thấy tài xế nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-gray-50 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Tài xế / Mã số</th>
                  <th className="p-4">Kho hoạt động</th>
                  <th className="p-4">Bằng lái xe</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Ngày ký HĐ</th>
                  <th className="p-4 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-xs">
                {drivers.map((drv) => (
                  <tr key={drv.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-[#161D25]">{drv.fullName}</span>
                        <span className="text-[10px] font-mono text-gray-500">{drv.employeeCode}</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Phone size={10} /> {drv.phone}
                        </span>
                        {drv.user && (
                          <span className="text-[9px] text-[#bc0100] bg-[#bc0100]/5 px-1.5 py-0.5 rounded self-start mt-1">
                            L.kết tài khoản: {drv.user.username}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {(() => {
                        const fac = drv.assignedFacility || drv.homeFacility;
                        if (fac) {
                          return (
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-700">{fac.facilityName}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{fac.facilityCode}</span>
                            </div>
                          );
                        }
                        return <span className="text-gray-400 italic">Chưa phân kho</span>;
                      })()}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700">Hạng: {drv.driverLicenseClass}</span>
                        <span className="text-[10px] text-gray-400 font-mono">Số: {drv.driverLicenseNumber}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                        drv.employmentStatus === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : drv.employmentStatus === 'SUSPENDED'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {drv.employmentStatus === 'ACTIVE' ? '🟢 Trực tuyến' : drv.employmentStatus === 'SUSPENDED' ? '🔴 Bị đình chỉ' : '⚪ Ngoại tuyến'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-mono">
                      {drv.hireDate ? new Date(drv.hireDate).toLocaleDateString('vi-VN') : 'N/A'}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenDetailModal(drv)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(drv)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDriver(drv.id, drv.fullName)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Xóa hồ sơ"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                <span>Trang {pagination.page} / {pagination.totalPages} (Tổng số: {pagination.total} tài xế)</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-1.5 border border-[#e2e8f0] rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                    className="p-1.5 border border-[#e2e8f0] rounded hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer bg-white"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Driver Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#161D25]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider">
                {isEditing ? 'Cập nhật thông tin tài xế' : 'Thêm hồ sơ tài xế mới'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-xs flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span className="font-semibold">{actionError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Full name */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Nguyễn Văn A"
                  />
                </div>

                {/* Phone number */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="09XXXXXXXX"
                  />
                </div>

                {/* Citizen ID (CCCD) */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.citizenId}
                    onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Số CCCD tài xế"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Trạng thái hoạt động</label>
                  <SearchableSelect
                    value={formData.employmentStatus}
                    onChange={(val) => setFormData({ ...formData, employmentStatus: val as any })}
                    options={[
                      { value: 'ACTIVE', label: 'Đang hoạt động' },
                      { value: 'OFFLINE', label: 'Ngoại tuyến' },
                      { value: 'SUSPENDED', label: 'Bị đình chỉ' }
                    ]}
                  />
                </div>

                {/* Driver Type */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Loại tài xế <span className="text-[#bc0100]">*</span>
                  </label>
                  <SearchableSelect
                    required
                    value={formData.driverType}
                    onChange={(val) => setFormData({ ...formData, driverType: val as any })}
                    options={[
                      { value: 'HUB_DELIVERY', label: 'Tài xế Bưu cục chặng cuối (Hub Courier)' },
                      { value: 'LINEHAUL_TRANSFER', label: 'Tài xế Trung chuyển Liên Bưu cục / Kho tổng (Linehaul Transfer)' },
                      { value: 'ON_DEMAND', label: 'Tài xế giao tức thì (On-Demand Express)' }
                    ]}
                  />
                </div>

                {/* Home Facility (Warehouse) */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kho / Bưu cục trực thuộc *</label>
                  <SearchableSelect
                    required
                    value={formData.homeFacilityId}
                    onChange={(val) => setFormData({ ...formData, homeFacilityId: val })}
                    placeholder="-- Chọn kho bãi hoạt động --"
                    options={facilities.map((fac) => ({
                      value: fac.id,
                      label: `${fac.facilityName} (${fac.facilityCode})`
                    }))}
                  />
                </div>

                {/* License class */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Hạng bằng lái *</label>
                  <SearchableSelect
                    required
                    value={formData.driverLicenseClass}
                    onChange={(val) => setFormData({ ...formData, driverLicenseClass: val })}
                    placeholder="-- Chọn hạng bằng lái --"
                    options={[
                      { value: 'A1', label: 'A1 (Xe máy dưới 175cc)' },
                      { value: 'A2', label: 'A2 (Xe mô tô trên 175cc)' },
                      { value: 'B1', label: 'B1 (Ô tô số tự động dưới 9 chỗ, bán tải)' },
                      { value: 'B2', label: 'B2 (Xe tải/Van số sàn dưới 3.5 Tấn)' },
                      { value: 'C', label: 'C (Xe tải trên 3.5 Tấn & xe đông lạnh)' },
                      { value: 'D', label: 'D (Xe khách dưới 30 chỗ)' },
                      { value: 'E', label: 'E (Xe khách trên 30 chỗ)' },
                      { value: 'FC', label: 'FC (Xe đầu kéo Container)' }
                    ]}
                  />
                </div>

                {/* License number */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Số bằng lái *</label>
                  <input
                    type="text"
                    required
                    value={formData.driverLicenseNumber}
                    onChange={(e) => setFormData({ ...formData, driverLicenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Số thẻ bằng lái"
                  />
                </div>

                {/* User Credentials Account Creation */}
                <div className="col-span-2">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2 pb-1 border-b border-gray-100">
                    Thông tin tài khoản đăng nhập (Shipper)
                  </h4>
                  {isEditing ? (
                    <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
                      <div>
                        <span className="block text-[9px] font-bold text-gray-500 uppercase">Tên đăng nhập</span>
                        <span className="font-semibold text-gray-800">{formData.username || 'Chưa liên kết'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-gray-500 uppercase">Email liên kết</span>
                        <span className="font-semibold text-gray-800">{formData.email || 'Chưa liên kết'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50/20 border border-red-100/50 rounded flex flex-col gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                          Tên đăng nhập (Username) <span className="text-[#bc0100]">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100] bg-white"
                          placeholder="VD: taixe_01"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">
                          Email đăng ký tài khoản <span className="text-[#bc0100]">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100] bg-white"
                          placeholder="taixe@gmail.com"
                        />
                      </div>
                      <p className="text-[9px] text-gray-500 italic">
                        * Hệ thống sẽ cấp tài khoản đăng nhập với Tên đăng nhập trên, tạo mật khẩu bảo mật ngẫu nhiên và gửi thông tin qua Email này.
                      </p>
                    </div>
                  )}
                </div>

                {/* Hire date */}
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                    Ngày vào làm (Hire Date) <span className="text-[#bc0100]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e8f0] flex justify-end gap-2 bg-gray-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-xs font-semibold hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  {isEditing ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail Driver Modal */}
      {showDetailModal && selectedDriverDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-montserrat animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-[#fafafa] flex items-center justify-between shrink-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <Compass size={16} className="text-[#bc0100]" />
                <span>Chi tiết hồ sơ tài xế</span>
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDriverDetail(null);
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto text-xs text-left">
              {/* Header profile info */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-12 h-12 rounded-full bg-[#bc0100]/10 flex items-center justify-center text-[#bc0100] font-bold text-base">
                  {selectedDriverDetail.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">{selectedDriverDetail.fullName}</h4>
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">Mã số: {selectedDriverDetail.employeeCode}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold mt-1.5 uppercase ${
                    selectedDriverDetail.employmentStatus === 'ACTIVE'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : selectedDriverDetail.employmentStatus === 'SUSPENDED'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {selectedDriverDetail.employmentStatus === 'ACTIVE'
                      ? 'Đang hoạt động'
                      : selectedDriverDetail.employmentStatus === 'SUSPENDED'
                      ? 'Đình chỉ'
                      : 'Ngoại tuyến'}
                  </span>
                </div>
              </div>

              {/* Grid 1: Personal Info */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Thông tin cá nhân</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded border border-gray-100">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Số điện thoại</span>
                    <span className="font-semibold text-gray-800">{selectedDriverDetail.phone}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Số CCCD (Citizen ID)</span>
                    <span className="font-semibold text-[#bc0100]">{selectedDriverDetail.citizenId || 'Chưa cập nhật'}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Hạng bằng lái</span>
                    <span className="font-semibold text-gray-800">{selectedDriverDetail.driverLicenseClass}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Số bằng lái</span>
                    <span className="font-semibold text-gray-800">{selectedDriverDetail.driverLicenseNumber}</span>
                  </div>
                </div>
              </div>

              {/* Grid 2: Work & Location */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Hợp đồng & Nơi làm việc</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded border border-gray-100">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Ngày ký hợp đồng</span>
                    <span className="font-semibold text-gray-800">
                      {selectedDriverDetail.hireDate ? new Date(selectedDriverDetail.hireDate).toLocaleDateString('vi-VN') : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Ngày tạo hồ sơ</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(selectedDriverDetail.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Kho bãi trực thuộc</span>
                    {(() => {
                      const fac = selectedDriverDetail.assignedFacility || selectedDriverDetail.homeFacility;
                      if (fac) {
                        return (
                          <span className="block font-semibold text-gray-800 mt-1">
                            {fac.facilityName} ({fac.facilityCode})
                          </span>
                        );
                      }
                      return <span className="block text-gray-400 italic mt-1">Chưa phân kho</span>;
                    })()}
                  </div>
                </div>
              </div>

              {/* Grid 3: Account Credentials */}
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider">Tài khoản đăng nhập</h4>
                <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded border border-gray-100">
                  {selectedDriverDetail.user ? (
                    <>
                      <div>
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Tên đăng nhập</span>
                        <span className="font-semibold text-gray-800">{selectedDriverDetail.user.username}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Email</span>
                        <span className="font-semibold text-gray-800 break-all">
                          {selectedDriverDetail.email || selectedDriverDetail.user?.email || 'Chưa liên kết'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-gray-400 uppercase">Trạng thái tài khoản</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold mt-1 uppercase ${
                          selectedDriverDetail.user.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {selectedDriverDetail.user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa / Vô hiệu hóa'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-gray-400 italic">Tài xế này chưa liên kết tài khoản ứng dụng (shipper app)</div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end text-xs shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedDriverDetail(null);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-black text-white font-bold uppercase rounded tracking-wider transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
