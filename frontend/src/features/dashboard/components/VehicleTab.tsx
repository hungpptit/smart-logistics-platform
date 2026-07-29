import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { 
  Truck, Search, Plus, RefreshCw, ShieldAlert, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  ChevronLeft, ChevronRight, X, Loader2, Compass, UserMinus, UserPlus
} from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

interface Facility {
  id: string;
  facilityCode: string;
  facilityName: string;
}

interface VehicleType {
  id: string;
  typeCode: string;
  typeName: string;
  maxDefaultWeight?: number;
  description?: string;
}

interface Vehicle {
  id: string;
  vehicleCode: string;
  licensePlate: string;
  vehicleTypeId: string;
  homeFacilityId?: string | null;
  maxWeight: number;
  maxVolume: number;
  maxLength?: number | null;
  refrigerationSupported: boolean;
  gpsDeviceId?: string | null;
  operatingStatus: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
  vehicleType: VehicleType;
  homeFacility?: {
    id: string;
    facilityCode: string;
    facilityName: string;
  } | null;
}

interface Driver {
  id: string;
  employeeCode: string;
  fullName: string;
  phone: string;
  driverLicenseClass: string;
  employmentStatus: 'ACTIVE' | 'OFFLINE' | 'SUSPENDED';
  homeFacilityId?: string | null;
}

interface ActiveAssignment {
  id: string;
  driverId: string;
  vehicleId: string;
  isActive: boolean;
  driver: {
    id: string;
    employeeCode: string;
    fullName: string;
    phone: string;
    driverLicenseClass: string;
  };
  vehicle: {
    id: string;
    vehicleCode: string;
    licensePlate: string;
  };
}

export const VehicleTab: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<ActiveAssignment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal States
  const [showVehicleModal, setShowVehicleModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedVehicleForAssign, setSelectedVehicleForAssign] = useState<Vehicle | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Custom Confirm/Alert Dialog State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'confirm' | 'alert';
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    onConfirm: () => {}
  });

  // Form States (Vehicle)
  const [formData, setFormData] = useState({
    vehicleCode: '',
    licensePlate: '',
    vehicleTypeId: '',
    homeFacilityId: '',
    maxWeight: 1000,
    maxVolume: 5,
    maxLength: 3,
    refrigerationSupported: false,
    gpsDeviceId: '',
    operatingStatus: 'ACTIVE' as 'ACTIVE' | 'MAINTENANCE' | 'RETIRED'
  });

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const canManage = currentUser?.roles.includes('ADMIN') || currentUser?.permissions.includes('VEHICLE_MANAGE');

  useEffect(() => {
    fetchInitialData();
  }, [token]);

  useEffect(() => {
    fetchVehicles(currentPage);
  }, [currentPage, facilityFilter, statusFilter, typeFilter]);

  const fetchInitialData = async () => {
    if (!token) return;
    try {
      // Fetch Vehicle Types
      const typeRes = await fetch(`${CONFIG.API_BASE_URL}/vehicles/types`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const typeData = await typeRes.json();
      if (typeRes.ok && typeData.success) {
        setVehicleTypes(typeData.data || []);
      }

      // Fetch Facilities
      const facRes = await fetch(`${CONFIG.API_BASE_URL}/facilities?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const facData = await facRes.json();
      if (facRes.ok && facData.success) {
        setFacilities(facData.data || []);
      }

      // Fetch Active Assignments
      fetchAssignments();
    } catch (err) {
      console.error('Error fetching initial lookups:', err);
    }
  };

  const fetchAssignments = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/drivers/assignments/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveAssignments(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching assignments:', err);
    }
  };

  const fetchVehicles = async (page: number = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        facilityId: facilityFilter,
        status: statusFilter,
        typeId: typeFilter
      });
      const response = await fetch(`${CONFIG.API_BASE_URL}/vehicles?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setVehicles(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách phương tiện.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu xe.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchVehicles(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFacilityFilter('');
    setStatusFilter('');
    setTypeFilter('');
    setCurrentPage(1);
    fetchVehicles(1);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedVehicleId(null);
    const firstNonMotorbike = vehicleTypes.find((type) => {
      const code = type.typeCode.toUpperCase();
      return code !== 'MOTO' && code !== 'MOTORCYCLE' && code !== 'MOTORBIKE';
    });
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    
    setFormData({
      vehicleCode: `VEH-${yy}${mm}${dd}-${hh}${min}${ss}`,
      licensePlate: '',
      vehicleTypeId: firstNonMotorbike?.id || '',
      homeFacilityId: '',
      maxWeight: 1000,
      maxVolume: 5,
      maxLength: 3,
      refrigerationSupported: false,
      gpsDeviceId: '',
      operatingStatus: 'ACTIVE'
    });
    setActionError(null);
    setShowVehicleModal(true);
  };

  const handleOpenEditModal = (vehicle: Vehicle) => {
    setIsEditing(true);
    setSelectedVehicleId(vehicle.id);
    setFormData({
      vehicleCode: vehicle.vehicleCode,
      licensePlate: vehicle.licensePlate,
      vehicleTypeId: vehicle.vehicleTypeId,
      homeFacilityId: vehicle.homeFacilityId || '',
      maxWeight: vehicle.maxWeight,
      maxVolume: vehicle.maxVolume,
      maxLength: vehicle.maxLength || 0,
      refrigerationSupported: vehicle.refrigerationSupported,
      gpsDeviceId: vehicle.gpsDeviceId || '',
      operatingStatus: vehicle.operatingStatus
    });
    setActionError(null);
    setShowVehicleModal(true);
  };

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setActionLoading(true);
    setActionError(null);

    const selectedType = vehicleTypes.find((t) => t.id === formData.vehicleTypeId);
    if (selectedType && selectedType.maxDefaultWeight && Number(formData.maxWeight) > selectedType.maxDefaultWeight) {
      setActionError(`Tải trọng tối đa (${Number(formData.maxWeight).toLocaleString('vi-VN')} kg) không được vượt quá giới hạn tải trọng của loại xe này (${selectedType.maxDefaultWeight.toLocaleString('vi-VN')} kg).`);
      setActionLoading(false);
      return;
    }

    const payload = {
      ...formData,
      homeFacilityId: formData.homeFacilityId === '' ? undefined : formData.homeFacilityId,
      maxLength: formData.maxLength ? Number(formData.maxLength) : undefined,
      maxWeight: Number(formData.maxWeight),
      maxVolume: Number(formData.maxVolume),
      gpsDeviceId: formData.gpsDeviceId === '' ? undefined : formData.gpsDeviceId
    };

    try {
      const url = isEditing 
        ? `${CONFIG.API_BASE_URL}/vehicles/${selectedVehicleId}` 
        : `${CONFIG.API_BASE_URL}/vehicles`;
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
        setShowVehicleModal(false);
        fetchVehicles(currentPage);
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

  // Helper: show custom alert modal instead of window.alert
  const showErrorAlert = (title: string, message: string) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      type: 'alert',
      onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false }))
    });
  };

  const handleDeleteVehicle = (id: string, code: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Xóa phương tiện',
      message: `Bạn có chắc chắn muốn xóa phương tiện "${code}"?`,
      type: 'confirm',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        if (!token) return;

        try {
          const response = await fetch(`${CONFIG.API_BASE_URL}/vehicles/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (response.ok && data.success) {
            fetchVehicles(currentPage);
          } else {
            showErrorAlert('Không thể xóa', data.message || 'Không thể xóa phương tiện này.');
          }
        } catch (err) {
          console.error(err);
          showErrorAlert('Lỗi kết nối', 'Lỗi kết nối khi xóa phương tiện.');
        }
      }
    });
  };

  // Driver Assignment Operations
  const handleOpenAssignModal = async (vehicle: Vehicle) => {
    if (!token) return;
    setSelectedVehicleForAssign(vehicle);
    setSelectedDriverId('');
    setShowAssignModal(true);
    setActionError(null);

    // Fetch active drivers to populate selection
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/drivers?limit=100&status=ACTIVE`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setDrivers(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching drivers for assignment:', err);
    }
  };

  const handleAssignDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedVehicleForAssign || !selectedDriverId) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/drivers/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          driverId: selectedDriverId,
          vehicleId: selectedVehicleForAssign.id
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowAssignModal(false);
        fetchAssignments();
        fetchVehicles(currentPage);
      } else {
        setActionError(data.message || 'Lỗi khi thực hiện phân công xe.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateAssignment = (driverId: string, driverName: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Thu hồi phương tiện',
      message: `Bạn có chắc chắn muốn thu hồi xe của tài xế "${driverName}"?`,
      type: 'confirm',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        if (!token) return;

        try {
          const response = await fetch(`${CONFIG.API_BASE_URL}/drivers/assignments/terminate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ driverId })
          });

          const data = await response.json();
          if (response.ok && data.success) {
            fetchAssignments();
            fetchVehicles(currentPage);
          } else {
            showErrorAlert('Không thể thu hồi', data.message || 'Không thể thu hồi xe.');
          }
        } catch (err) {
          console.error(err);
          showErrorAlert('Lỗi kết nối', 'Lỗi kết nối máy chủ.');
        }
      }
    });
  };

  // Helper: check driver license compatibility with vehicle type code
  const isLicenseCompatible = (driverClass: string, vehicleTypeCode: string) => {
    const licenseHierarchy: Record<string, number> = {
      'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C': 5, 'D': 6, 'E': 7, 'FC': 8, 'FE': 9
    };
    
    const driverRank = licenseHierarchy[driverClass.toUpperCase()] || 0;
    const code = vehicleTypeCode.toUpperCase();

    if (code === 'VAN' || code === 'TRUCK_1T5') {
      return driverRank >= licenseHierarchy['B2'];
    } else if (code === 'REFRIGERATED_TRUCK') {
      return driverRank >= licenseHierarchy['C'];
    } else if (code === 'CONTAINER') {
      return driverRank >= licenseHierarchy['FC'];
    } else if (code === 'MOTO' || code === 'MOTORCYCLE' || code === 'MOTORBIKE') {
      return driverRank >= licenseHierarchy['A1'];
    }
    return true; // default compatible if unknown type
  };

  const selectedVehicleType = vehicleTypes.find((t) => t.id === formData.vehicleTypeId);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col lg:flex-row gap-4 lg:items-start justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Search Box */}
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm biển số, mã phương tiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Facility filter */}
            <select
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none bg-white min-w-[180px]"
            >
              <option value="">Tất cả kho bãi</option>
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.facilityName} ({fac.facilityCode})
                </option>
              ))}
            </select>

            {/* Vehicle Type filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none bg-white"
            >
              <option value="">Tất cả loại xe</option>
              {vehicleTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.typeName}
                </option>
              ))}
            </select>

            {/* Operating Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="MAINTENANCE">Bảo dưỡng</option>
              <option value="RETIRED">Đã thanh lý</option>
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
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white text-xs font-bold uppercase tracking-wider rounded shadow-md transition-colors cursor-pointer w-full lg:w-auto justify-center whitespace-nowrap shrink-0"
          >
            <Plus size={14} />
            <span>Thêm phương tiện</span>
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-2 text-gray-400">
            <Loader2 size={30} className="animate-spin text-[#bc0100]" />
            <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Đang tải danh sách phương tiện...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 flex flex-col items-center gap-2">
            <AlertTriangle size={36} />
            <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
            <Compass size={40} className="text-gray-300" />
            <p className="text-xs font-semibold">Không tìm thấy phương tiện nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-gray-50 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">
                  <th className="p-4">Mã số / Biển số xe</th>
                  <th className="p-4">Phân loại loại xe</th>
                  <th className="p-4">Tài xế phân công</th>
                  <th className="p-4">Kho trực thuộc</th>
                  <th className="p-4">Khả năng tải</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] text-xs">
                {vehicles.map((vh) => {
                  // Find assignment
                  const activeAssign = activeAssignments.find((a) => a.vehicleId === vh.id);
                  const isMotorcycle = vh.vehicleType.typeCode.toUpperCase() === 'MOTO' || vh.vehicleType.typeCode.toUpperCase() === 'MOTORCYCLE' || vh.vehicleType.typeCode.toUpperCase() === 'MOTORBIKE';

                  return (
                    <tr key={vh.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Code & Plate */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[#161D25]">{vh.licensePlate}</span>
                          <span className="text-[10px] font-mono text-gray-500">{vh.vehicleCode}</span>
                          {vh.gpsDeviceId && (
                            <span className="text-[9px] text-gray-400 font-mono mt-0.5">
                              GPS: {vh.gpsDeviceId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vehicle Type */}
                      <td className="p-4 text-gray-700 font-medium">
                        <div className="flex flex-col">
                          <span>{vh.vehicleType.typeName}</span>
                          <span className="text-[9px] font-mono text-gray-400 uppercase">Code: {vh.vehicleType.typeCode}</span>
                        </div>
                      </td>

                      {/* Assigned Driver */}
                      <td className="p-4">
                        {activeAssign ? (
                          <div className="flex flex-col gap-0.5 bg-green-50/30 border border-green-100 rounded p-1.5 max-w-[180px]">
                            <span className="font-bold text-gray-800 flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-green-600" />
                              {activeAssign.driver.fullName}
                            </span>
                            <span className="text-[9px] text-gray-500 font-mono">{activeAssign.driver.employeeCode}</span>
                            <span className="text-[9px] text-[#bc0100] font-bold">Bằng: {activeAssign.driver.driverLicenseClass}</span>
                            {canManage && !isMotorcycle && (
                              <button
                                type="button"
                                onClick={() => handleTerminateAssignment(activeAssign.driverId, activeAssign.driver.fullName)}
                                className="mt-1 flex items-center gap-1 text-[8px] font-extrabold uppercase text-red-600 hover:text-red-800 bg-white border border-red-200 rounded px-1 py-0.5 self-start cursor-pointer transition-colors"
                              >
                                <UserMinus size={8} /> Thu hồi xe
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-gray-400 italic">
                              {isMotorcycle ? 'Xe cá nhân (Tự quản lý)' : 'Chưa phân công tài xế'}
                            </span>
                            {canManage && vh.operatingStatus === 'ACTIVE' && !isMotorcycle && (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(vh)}
                                className="flex items-center gap-1 text-[8px] font-extrabold uppercase text-[#bc0100] hover:text-[#900000] bg-[#bc0100]/5 border border-[#bc0100]/10 rounded px-1.5 py-0.5 self-start cursor-pointer transition-all"
                              >
                                <UserPlus size={8} /> Phân công
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Home Facility */}
                      <td className="p-4">
                        {vh.homeFacility ? (
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-700">{vh.homeFacility.facilityName}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{vh.homeFacility.facilityCode}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa gán kho bãi</span>
                        )}
                      </td>

                      {/* Capacities */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5 text-gray-600 font-mono text-[11px]">
                          <span>⚖️ {vh.maxWeight.toLocaleString('vi-VN')} kg</span>
                          <span>📦 {vh.maxVolume.toLocaleString('vi-VN')} m³</span>
                          {vh.maxLength && <span>📏 Dài: {vh.maxLength}m</span>}
                          {vh.refrigerationSupported && (
                            <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded self-start mt-0.5 uppercase">
                              ❄️ Bảo quản lạnh
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${
                          vh.operatingStatus === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : vh.operatingStatus === 'MAINTENANCE'
                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {vh.operatingStatus === 'ACTIVE' ? 'Đang hoạt động' : vh.operatingStatus === 'MAINTENANCE' ? 'Bảo dưỡng' : 'Thanh lý'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleOpenEditModal(vh)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                title="Sửa thông tin xe"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteVehicle(vh.id, vh.vehicleCode)}
                                disabled={!!activeAssign}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                                title="Xóa phương tiện"
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

            {/* Pagination controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
                <span>Trang {pagination.page} / {pagination.totalPages} (Tổng số: {pagination.total} phương tiện)</span>
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

      {/* Vehicle Add / Edit Modal */}
      {showVehicleModal && (
        <div className="fixed inset-0 bg-[#161D25]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider">
                {isEditing ? 'Cập nhật thông tin phương tiện' : 'Thêm phương tiện vận chuyển mới'}
              </h3>
              <button
                onClick={() => setShowVehicleModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVehicleSubmit} className="p-6 flex-1 overflow-y-auto space-y-4">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-xs flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span className="font-semibold">{actionError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Vehicle code */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Mã phương tiện *</label>
                  <input
                    type="text"
                    required
                    disabled
                    value={formData.vehicleCode}
                    onChange={(e) => setFormData({ ...formData, vehicleCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100] disabled:bg-gray-100 disabled:text-gray-500 font-semibold cursor-not-allowed"
                    placeholder="Mã định danh duy nhất (VD: VEH-0001)"
                  />
                </div>

                {/* License plate */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Biển kiểm soát *</label>
                  <input
                    type="text"
                    required
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="VD: 29C-12345"
                  />
                </div>

                {/* Vehicle Type */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Loại phương tiện *</label>
                  <SearchableSelect
                    required
                    value={formData.vehicleTypeId}
                    onChange={(selectedId) => {
                      const selectedType = vehicleTypes.find((t) => t.id === selectedId);
                      setFormData({
                        ...formData,
                        vehicleTypeId: selectedId,
                        maxWeight: selectedType?.maxDefaultWeight || formData.maxWeight
                      });
                    }}
                    placeholder="-- Chọn loại phương tiện --"
                    options={vehicleTypes
                      .filter((type) => {
                        const code = type.typeCode.toUpperCase();
                        return code !== 'MOTO' && code !== 'MOTORCYCLE' && code !== 'MOTORBIKE';
                      })
                      .map((type) => ({
                        value: type.id,
                        label: `${type.typeName} (${type.typeCode})`
                      }))}
                  />
                </div>

                {/* Home Facility */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Kho trực thuộc</label>
                  <SearchableSelect
                    value={formData.homeFacilityId}
                    onChange={(val) => setFormData({ ...formData, homeFacilityId: val })}
                    placeholder="-- Không trực thuộc (Chạy liên tỉnh / Hub Pooling) --"
                    options={[
                      { value: '', label: '-- Không trực thuộc (Chạy liên tỉnh / Hub Pooling) --' },
                      ...facilities.map((fac) => ({
                        value: fac.id,
                        label: `${fac.facilityName} (${fac.facilityCode})`
                      }))
                    ]}
                  />
                </div>

                {/* Operating Status */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Trạng thái hoạt động</label>
                  <SearchableSelect
                    value={formData.operatingStatus}
                    onChange={(val) => setFormData({ ...formData, operatingStatus: val as any })}
                    options={[
                      { value: 'ACTIVE', label: 'Đang hoạt động tốt (ACTIVE)' },
                      { value: 'MAINTENANCE', label: 'Đang bảo dưỡng định kỳ (MAINTENANCE)' },
                      { value: 'RETIRED', label: 'Đã thanh lý / Ngừng sử dụng (RETIRED)' }
                    ]}
                  />
                </div>

                {/* GPS device ID */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GPS Device ID</label>
                  <input
                    type="text"
                    value={formData.gpsDeviceId}
                    onChange={(e) => setFormData({ ...formData, gpsDeviceId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Mã thiết bị định vị gắn trên xe"
                  />
                </div>

                {/* Capacities */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tải trọng tối đa (kg) *</label>
                  <input
                    type="number"
                    required
                    value={formData.maxWeight}
                    onChange={(e) => setFormData({ ...formData, maxWeight: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Khả năng tải (VD: 1500)"
                  />
                  {selectedVehicleType && selectedVehicleType.maxDefaultWeight && (
                    <p className="text-[9px] text-[#bc0100] mt-1 font-medium italic">
                      * Giới hạn cho phép: tối đa {selectedVehicleType.maxDefaultWeight.toLocaleString('vi-VN')} kg
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Thể tích tối đa (m³) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formData.maxVolume}
                    onChange={(e) => setFormData({ ...formData, maxVolume: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Thể tích thùng xe (VD: 8.5)"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Chiều dài lòng thùng (m)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.maxLength || ''}
                    onChange={(e) => setFormData({ ...formData, maxLength: e.target.value ? Number(e.target.value) : 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#bc0100] focus:border-[#bc0100]"
                    placeholder="Chiều dài (VD: 3.2)"
                  />
                </div>

                {/* Refrigeration support */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="refrigCheckbox"
                    checked={formData.refrigerationSupported}
                    onChange={(e) => setFormData({ ...formData, refrigerationSupported: e.target.checked })}
                    className="w-4 h-4 text-[#bc0100] border-gray-300 rounded focus:ring-[#bc0100] cursor-pointer"
                  />
                  <label htmlFor="refrigCheckbox" className="font-bold text-gray-700 cursor-pointer select-none text-[10px] uppercase">
                    Hỗ trợ bảo quản lạnh (Refrigerated)
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e2e8f0] flex justify-end gap-2 bg-gray-50 -mx-6 -mb-6 p-4">
                <button
                  type="button"
                  onClick={() => setShowVehicleModal(false)}
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

      {/* Driver Assignment Modal */}
      {showAssignModal && selectedVehicleForAssign && (
        <div className="fixed inset-0 bg-[#161D25]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider flex items-center gap-2">
                <Truck size={16} className="text-[#bc0100]" />
                <span>Phân công tài xế điều khiển xe</span>
              </h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignDriver} className="p-6 flex-1 overflow-y-auto space-y-4 flex flex-col">
              {actionError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
                  <ShieldAlert size={16} />
                  <span className="font-semibold">{actionError}</span>
                </div>
              )}

              {/* Vehicle info recap */}
              <div className="bg-[#bc0100]/5 border border-[#bc0100]/15 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Phương tiện:</span>
                  <span className="font-bold text-[#161D25] text-sm">{selectedVehicleForAssign.licensePlate} <span className="text-xs font-normal text-gray-500">({selectedVehicleForAssign.vehicleCode})</span></span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Loại phương tiện:</span>
                  <span className="font-semibold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">{selectedVehicleForAssign.vehicleType.typeName}</span>
                </div>
                {selectedVehicleForAssign.homeFacility && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-bold uppercase text-[10px]">Trực thuộc bưu cục:</span>
                    <span className="font-bold text-[#bc0100]">{selectedVehicleForAssign.homeFacility.facilityName}</span>
                  </div>
                )}
              </div>

              {/* Driver Select Filtered by Facility & Compatible License */}
              {(() => {
                const vehicleFacilityId = selectedVehicleForAssign.homeFacilityId;
                
                // Only drivers belonging to the SAME facility (or unassigned), and with compatible license class
                const availableDrivers = drivers.filter((drv) => {
                  if (vehicleFacilityId && drv.homeFacilityId && drv.homeFacilityId !== vehicleFacilityId) {
                    return false;
                  }
                  const isCompatible = isLicenseCompatible(drv.driverLicenseClass, selectedVehicleForAssign.vehicleType.typeCode);
                  return isCompatible;
                });

                const selectOptions = availableDrivers.map((drv) => {
                  const isAssigned = activeAssignments.some((a) => a.driverId === drv.id);
                  let label = `${drv.fullName} (${drv.employeeCode}) - Bằng ${drv.driverLicenseClass}`;
                  if (isAssigned) {
                    const prevAssign = activeAssignments.find((a) => a.driverId === drv.id);
                    label += ` [Đang gán xe ${prevAssign?.vehicle.licensePlate}]`;
                  }
                  return {
                    value: drv.id,
                    label: label
                  };
                });

                return (
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">
                      Chọn tài xế trực thuộc bưu cục (Bằng hợp lệ) *
                    </label>

                    {selectOptions.length > 0 ? (
                      <SearchableSelect
                        required
                        value={selectedDriverId}
                        onChange={(val) => setSelectedDriverId(val)}
                        placeholder="-- Chọn tài xế điều khiển --"
                        options={selectOptions}
                      />
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">
                        ⚠️ Không tìm thấy tài xế nào có bằng lái hợp lệ thuộc <strong>{selectedVehicleForAssign.homeFacility?.facilityName || 'bưu cục này'}</strong>. Vui lòng thêm tài xế mới hoặc đổi bưu cục trực thuộc.
                      </div>
                    )}

                    <p className="text-[10px] text-gray-400 italic mt-2">
                      * Hệ thống tự động lọc danh sách tài xế trực thuộc đúng bưu cục của xe và kiểm tra hạng bằng lái phù hợp.
                    </p>
                  </div>
                );
              })()}

              <div className="pt-4 border-t border-[#e2e8f0] flex justify-end gap-2 bg-gray-50 -mx-6 -mb-6 p-4 mt-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !selectedDriverId}
                  className="px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {actionLoading && <Loader2 size={12} className="animate-spin" />}
                  Xác nhận phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Popup Dialog */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 bg-[#161D25]/50 backdrop-blur-xs flex items-center justify-center p-4 z-[200] animate-fade-in">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle size={24} className="shrink-0" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800">
                {confirmConfig.title}
              </h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed font-semibold">
              {confirmConfig.message}
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              {confirmConfig.type === 'alert' ? (
                <button
                  type="button"
                  onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-1.5 bg-[#bc0100] hover:bg-[#a00100] text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                    className="px-3.5 py-1.5 border border-gray-300 hover:bg-gray-50 rounded text-[10px] font-bold uppercase tracking-wider text-gray-700 transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={confirmConfig.onConfirm}
                    className="px-3.5 py-1.5 bg-[#bc0100] hover:bg-[#a00100] text-white rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Xác nhận
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
