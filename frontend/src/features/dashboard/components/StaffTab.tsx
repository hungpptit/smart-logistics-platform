import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { Search, RefreshCw, Plus, Edit2, Trash2, Shield, Mail, Phone, Calendar, Building, X, UserPlus, Eye, EyeOff } from 'lucide-react';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';

interface Facility {
  id: string;
  facilityCode: string;
  facilityName: string;
}

interface Staff {
  id: string;
  username: string;
  email: string;
  phone?: string;
  citizenId?: string | null;
  hireDate?: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'DISABLED';
  createdAt: string;
  assignedFacilityId?: string | null;
  assignedFacility?: Facility | null;
}

export const StaffTab: React.FC = () => {
  const { token } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1
  });
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<Staff | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    citizenId: '',
    hireDate: new Date().toISOString().split('T')[0],
    password: '',
    assignedFacilityId: '',
    status: 'ACTIVE' as 'ACTIVE' | 'LOCKED' | 'DISABLED'
  });

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

  const fetchStaff = async (page: number = 1) => {
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
      const response = await fetch(`${CONFIG.API_BASE_URL}/staff?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStaffList(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách nhân viên.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu nhân viên.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, [token]);

  useEffect(() => {
    fetchStaff(currentPage);
  }, [currentPage, facilityFilter, statusFilter, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStaff(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFacilityFilter('');
    setStatusFilter('');
    setCurrentPage(1);
    setTimeout(() => {
      fetchStaff(1);
    }, 50);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      citizenId: '',
      hireDate: new Date().toISOString().split('T')[0],
      password: '',
      assignedFacilityId: '',
      status: 'ACTIVE'
    });
    setShowPassword(false);
    setIsEditing(false);
    setEditingStaffId(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (staff: Staff) => {
    setFormData({
      fullName: '',
      username: staff.username,
      email: staff.email,
      phone: staff.phone || '',
      citizenId: staff.citizenId || '',
      hireDate: staff.hireDate ? new Date(staff.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      password: '', // Leave blank for edit
      assignedFacilityId: staff.assignedFacilityId || '',
      status: staff.status
    });
    setShowPassword(false);
    setIsEditing(true);
    setEditingStaffId(staff.id);
    setShowModal(true);
  };

  const handleOpenDetailModal = (staff: Staff) => {
    setSelectedStaffDetail(staff);
    setShowDetailModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!isEditing) {
      if (!formData.username) {
        alert('Tên đăng nhập là bắt buộc');
        return;
      }
      if (!formData.fullName) {
        alert('Họ và tên nhân viên là bắt buộc');
        return;
      }
    }
    if (!formData.email) {
      alert('Email là bắt buộc');
      return;
    }
    if (!formData.phone) {
      alert('Số điện thoại là bắt buộc');
      return;
    }
    if (!formData.citizenId) {
      alert('Số CCCD là bắt buộc');
      return;
    }

    setActionLoading(true);
    try {
      const url = isEditing
        ? `${CONFIG.API_BASE_URL}/staff/${editingStaffId}`
        : `${CONFIG.API_BASE_URL}/staff`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload: any = {
        email: formData.email,
        phone: formData.phone || null,
        citizenId: formData.citizenId || null,
        hireDate: formData.hireDate || null,
        assignedFacilityId: formData.assignedFacilityId || null,
        status: formData.status
      };

      if (!isEditing) {
        payload.username = formData.username;
        payload.fullName = formData.fullName;
      } else if (formData.password) {
        payload.password = formData.password;
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
        setShowModal(false);
        fetchStaff(currentPage);
      } else {
        alert(data.message || 'Lỗi khi lưu thông tin nhân viên.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản nhân viên "${name}"?`)) return;
    if (!token) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/staff/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchStaff(currentPage);
      } else {
        alert(data.message || 'Không thể xóa nhân viên.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  return (
    <div className="flex flex-col gap-6 font-montserrat">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1e293b] to-[#0f172a] text-white p-6 rounded-lg shadow-soft border border-[#1e293b]/50">
        <div>
          <h2 className="text-lg font-extrabold flex items-center gap-2 tracking-wide uppercase">
            <Shield className="text-[#bc0100]" size={22} />
            <span>Quản lý Nhân sự & Kho bãi (Staff)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Quản trị viên có quyền thêm nhân viên mới, phân công nhân viên chịu trách nhiệm quản lý hoặc làm việc theo từng kho hàng cụ thể trong hệ thống.
          </p>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col lg:flex-row gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative min-w-[260px] flex-1 sm:flex-initial">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên (Tên, email, sđt)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-[220px]">
              <SearchableSelect
                value={facilityFilter}
                onChange={(val) => { setFacilityFilter(val); setCurrentPage(1); }}
                options={[
                  { value: '', label: 'Tất cả kho bãi' },
                  { value: 'none', label: 'Chưa phân kho' },
                  ...facilities.map((fac) => ({
                    value: fac.id,
                    label: `${fac.facilityCode} - ${fac.facilityName}`
                  }))
                ]}
              />
            </div>

            <div className="w-[160px]">
              <SearchableSelect
                value={statusFilter}
                onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                options={[
                  { value: '', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Hoạt động' },
                  { value: 'DISABLED', label: 'Tạm khóa' }
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
            onClick={handleResetFilters}
            className="p-2 border border-[#e2e8f0] hover:bg-gray-50 rounded text-gray-500 cursor-pointer transition-all"
            title="Làm mới bộ lọc"
          >
            <RefreshCw size={14} />
          </button>
        </form>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white text-xs font-bold uppercase tracking-wider rounded shadow-md transition-colors cursor-pointer w-full lg:w-auto justify-center"
        >
          <Plus size={14} />
          <span>Thêm nhân viên</span>
        </button>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden">
        <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-[#fafafa]">
          <h3 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider">Danh sách nhân sự vận hành</h3>
          <span className="text-[10px] text-gray-500 font-bold">Tổng số: {pagination.total}</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              <RefreshCw className="animate-spin inline-block mr-2 text-[#bc0100]" size={16} />
              Đang tải dữ liệu nhân viên...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-500 text-xs font-semibold">
              {error}
            </div>
          ) : staffList.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              Không tìm thấy nhân viên nào phù hợp.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-3 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Tên tài khoản</th>
                  <th className="p-3 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Thông tin liên hệ</th>
                  <th className="p-3 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Kho được phân công</th>
                  <th className="p-3 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Trạng thái</th>
                  <th className="p-3 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Ngày tạo</th>
                  <th className="p-3 text-[10px] font-extrabold uppercase text-gray-400 tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-gray-800">{staff.username}</div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Mail size={10} />
                        {staff.email}
                      </div>
                      {staff.citizenId && (
                        <div className="text-[10px] text-[#bc0100] font-semibold mt-0.5">
                          CCCD: {staff.citizenId}
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      {staff.phone ? (
                        <span className="flex items-center gap-1 text-gray-600 font-medium">
                          <Phone size={10} />
                          {staff.phone}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Chưa cập nhật</span>
                      )}
                    </td>
                    <td className="p-3">
                      {staff.assignedFacility ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-semibold text-[10px] border border-blue-100">
                          <Building size={10} />
                          {staff.assignedFacility.facilityCode} - {staff.assignedFacility.facilityName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-semibold text-[10px] border border-amber-100">
                          Chưa phân kho
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        staff.status === 'ACTIVE'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {staff.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(staff.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenDetailModal(staff)}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded cursor-pointer transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(staff)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                          title="Sửa thông tin"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id, staff.username)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="Xóa nhân viên"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination bar */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 border-t border-[#e2e8f0] flex items-center justify-between bg-gray-50/50">
            <span className="text-[10px] text-gray-500">
              Trang {pagination.page} trên {pagination.totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-[#e2e8f0] rounded bg-white hover:bg-gray-50 disabled:opacity-50 text-[10px] font-bold cursor-pointer"
              >
                Trước
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-2.5 py-1 border rounded text-[10px] font-bold cursor-pointer ${
                    currentPage === p
                      ? 'bg-[#bc0100] text-white border-[#bc0100]'
                      : 'bg-white text-gray-600 border-[#e2e8f0] hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage === pagination.totalPages}
                className="px-2.5 py-1 border border-[#e2e8f0] rounded bg-white hover:bg-gray-50 disabled:opacity-50 text-[10px] font-bold cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-montserrat py-8 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl max-h-[85vh] flex flex-col my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-[#fafafa] flex items-center justify-between shrink-0">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <UserPlus size={16} className="text-[#bc0100]" />
                <span>{isEditing ? 'Sửa thông tin nhân viên' : 'Thêm tài khoản nhân viên mới'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveStaff} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto flex-1">
                {/* Full Name (Create mode) or Username (Edit mode) */}
                {!isEditing ? (
                  <>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">
                        Tên đăng nhập (Username) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="VD: nhanvien_kho01"
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Họ và tên nhân viên <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Tài khoản & mật khẩu sẽ được tự động tạo và gửi đến email của nhân viên.</span>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tên đăng nhập</label>
                    <input
                      type="text"
                      disabled
                      value={formData.username}
                      className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none disabled:bg-gray-100 disabled:text-gray-500 font-medium transition-all"
                    />
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Địa chỉ Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@velocity.vn"
                    className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                  />
                </div>

                {/* Citizen ID (CCCD) */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.citizenId}
                    onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                    placeholder="VD: 079123456789"
                    className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                  />
                </div>

                {/* Hire Date */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Ngày vào làm (Hire Date) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                  />
                </div>

                {/* Password (Edit mode only) */}
                {isEditing && (
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Nhập mật khẩu mới nếu muốn đổi"
                        className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded focus:border-[#bc0100] outline-none font-medium transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Assigned Facility */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Kho / Bưu cục phân công</label>
                  <SearchableSelect
                    value={formData.assignedFacilityId}
                    onChange={(val) => setFormData({ ...formData, assignedFacilityId: val })}
                    placeholder="Chưa phân công kho bãi"
                    options={[
                      { value: '', label: 'Chưa phân công kho bãi' },
                      ...facilities.map((fac) => ({
                        value: fac.id,
                        label: `${fac.facilityCode} - ${fac.facilityName}`
                      }))
                    ]}
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Nhân viên sẽ được gán làm việc trực tiếp tại kho bãi này.</span>
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Trạng thái tài khoản</label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                      <input
                        type="radio"
                        checked={formData.status === 'ACTIVE'}
                        onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                        className="accent-[#bc0100]"
                      />
                      <span>Đang hoạt động</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                      <input
                        type="radio"
                        checked={formData.status === 'DISABLED'}
                        onChange={() => setFormData({ ...formData, status: 'DISABLED' })}
                        className="accent-[#bc0100]"
                      />
                      <span>Tạm ngưng</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-100 text-gray-600 font-bold uppercase rounded tracking-wider transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#bc0100] hover:bg-[#a00100] disabled:bg-red-400 text-white font-bold uppercase rounded tracking-wider transition-colors shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <RefreshCw size={12} className="animate-spin" />}
                  <span>{isEditing ? 'Cập nhật' : 'Tạo mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Detail Staff Modal */}
      {showDetailModal && selectedStaffDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-montserrat animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-[#fafafa] flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-800 flex items-center gap-2">
                <Shield size={16} className="text-[#bc0100]" />
                <span>Chi tiết nhân viên</span>
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedStaffDetail(null);
                }}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs text-left">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-full bg-[#bc0100]/10 flex items-center justify-center text-[#bc0100] font-bold text-sm">
                  {selectedStaffDetail.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-800">{selectedStaffDetail.username}</h4>
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold mt-1 ${
                    selectedStaffDetail.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {selectedStaffDetail.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">Địa chỉ Email</span>
                  <span className="font-semibold text-gray-800 break-all">{selectedStaffDetail.email}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">Số điện thoại</span>
                  <span className="font-semibold text-gray-800">{selectedStaffDetail.phone || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">Số CCCD (Citizen ID)</span>
                  <span className="font-semibold text-[#bc0100]">{selectedStaffDetail.citizenId || 'Chưa cập nhật'}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">Ngày tạo tài khoản</span>
                  <span className="font-semibold text-gray-800">{new Date(selectedStaffDetail.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <div className="col-span-2">
                  <span className="block text-[9px] font-bold text-gray-400 uppercase">Kho hàng phân công</span>
                  {selectedStaffDetail.assignedFacility ? (
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-100 rounded text-blue-800 font-semibold">
                      {selectedStaffDetail.assignedFacility.facilityCode} - {selectedStaffDetail.assignedFacility.facilityName}
                    </div>
                  ) : (
                    <div className="mt-1 p-2 bg-amber-50 border border-amber-100 rounded text-amber-800 font-semibold">
                      Chưa được phân công kho bãi hoạt động
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex justify-end text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedStaffDetail(null);
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
