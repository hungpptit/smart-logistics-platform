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
  Mail,
  Phone,
  Briefcase,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle,
  XCircle,
  Settings
} from 'lucide-react';

interface AddressItem {
  id: string;
  addressLine1: string;
  addressLine2?: string;
  ward: string;
  district: string;
  province: string;
  country: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  addressType: 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN';
  isDefault: boolean;
  formattedAddress?: string;
}

interface Customer {
  id: string;
  userId?: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS';
  companyName?: string;
  taxCode?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  note?: string;
  createdAt: string;
  user?: {
    username: string;
    email: string;
    phone?: string;
  };
  _count?: {
    orders: number;
  };
}

export const CustomerTab: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
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
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal / Drawer States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [addressesLoading, setAddressesLoading] = useState<boolean>(false);
  
  // CRUD States
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    userId: '',
    customerType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    companyName: '',
    taxCode: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'BLOCKED',
    note: ''
  });

  // Address CRUD States
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [addressFormData, setAddressFormData] = useState({
    id: '',
    addressLine1: '',
    addressLine2: '',
    ward: '',
    district: '',
    province: '',
    country: 'Vietnam',
    latitude: 10.7765,
    longitude: 106.7009,
    addressType: 'HOME' as 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN',
    isDefault: false
  });
  const [isEditingAddress, setIsEditingAddress] = useState<boolean>(false);

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const canManage = currentUser?.permissions.includes('CUSTOMER_MANAGE') || currentUser?.roles.includes('ADMIN');

  const fetchCustomers = async (page: number = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search: searchTerm,
        customerType: typeFilter,
        status: statusFilter
      });
      const response = await fetch(`${CONFIG.API_BASE_URL}/customers?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCustomers(data.data || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } else {
        setError(data.message || 'Không thể tải danh sách khách hàng.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Lỗi kết nối máy chủ khi lấy dữ liệu khách hàng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAddresses = async (customerId: string) => {
    if (!token) return;
    setAddressesLoading(true);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/customers/${customerId}/addresses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setAddresses(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
  }, [currentPage, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setTypeFilter('');
    setStatusFilter('');
    setCurrentPage(1);
    // Fetch immediately
    setTimeout(() => {
      fetchCustomers(1);
    }, 50);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      userId: '',
      customerType: 'INDIVIDUAL',
      companyName: '',
      taxCode: '',
      status: 'ACTIVE',
      note: ''
    });
    setIsEditing(false);
    setShowCustomerModal(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setFormData({
      userId: c.userId || '',
      customerType: c.customerType,
      companyName: c.companyName || '',
      taxCode: c.taxCode || '',
      status: c.status,
      note: c.note || ''
    });
    setSelectedCustomer(c);
    setIsEditing(true);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const url = isEditing 
        ? `${CONFIG.API_BASE_URL}/customers/${selectedCustomer?.id}`
        : `${CONFIG.API_BASE_URL}/customers`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload = { ...formData };
      if (!payload.userId) {
        delete (payload as any).userId;
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
        setShowCustomerModal(false);
        fetchCustomers(currentPage);
        if (isEditing && selectedCustomer) {
          // Update selected customer view if it is open
          setSelectedCustomer(data.data);
        }
      } else {
        alert(data.message || 'Lỗi khi lưu thông tin khách hàng.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) return;
    if (!token) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/customers/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSelectedCustomer(null);
        fetchCustomers(currentPage);
      } else {
        alert(data.message || 'Không thể xóa khách hàng.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  // Address book functions
  const handleOpenCreateAddress = () => {
    setAddressFormData({
      id: '',
      addressLine1: '',
      addressLine2: '',
      ward: '',
      district: '',
      province: '',
      country: 'Vietnam',
      latitude: 10.7765,
      longitude: 106.7009,
      addressType: 'HOME',
      isDefault: false
    });
    setIsEditingAddress(false);
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: AddressItem) => {
    setAddressFormData({
      id: addr.id,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      ward: addr.ward,
      district: addr.district,
      province: addr.province,
      country: addr.country,
      latitude: addr.latitude,
      longitude: addr.longitude,
      addressType: addr.addressType,
      isDefault: addr.isDefault
    });
    setIsEditingAddress(true);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCustomer) return;
    setActionLoading(true);
    try {
      const url = isEditingAddress
        ? `${CONFIG.API_BASE_URL}/customers/${selectedCustomer.id}/addresses/${addressFormData.id}`
        : `${CONFIG.API_BASE_URL}/customers/${selectedCustomer.id}/addresses`;
      const method = isEditingAddress ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(addressFormData)
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowAddressModal(false);
        fetchCustomerAddresses(selectedCustomer.id);
      } else {
        alert(data.message || 'Lỗi khi lưu địa chỉ.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    if (!token || !selectedCustomer) return;
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/customers/${selectedCustomer.id}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        fetchCustomerAddresses(selectedCustomer.id);
      } else {
        alert(data.message || 'Không thể xóa địa chỉ.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến máy chủ.');
    }
  };

  const handleViewDetails = (c: Customer) => {
    setSelectedCustomer(c);
    fetchCustomerAddresses(c.id);
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
              placeholder="Tìm kiếm công ty, mã số thuế..."
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
              <option value="">Tất cả loại KH</option>
              <option value="INDIVIDUAL">Cá nhân</option>
              <option value="BUSINESS">Doanh nghiệp</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="INACTIVE">Ngừng hoạt động</option>
              <option value="BLOCKED">Bị khóa</option>
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
            <span>Thêm khách hàng</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Customer List Table */}
        <div className={`bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden ${selectedCustomer ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-[#fafafa]">
            <h3 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider">Danh sách hồ sơ khách hàng</h3>
            <span className="text-[10px] text-gray-500 font-bold">Tổng số: {pagination.total}</span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center gap-2 text-gray-400">
              <RefreshCw size={30} className="animate-spin text-[#bc0100]" />
              <p className="text-[10px] font-bold uppercase tracking-wider mt-2">Đang tải danh sách khách hàng...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-red-500 flex flex-col items-center gap-2">
              <AlertTriangle size={36} />
              <p className="text-xs font-bold uppercase tracking-wider">{error}</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-3">
              <User size={40} className="text-gray-300" />
              <p className="text-xs font-semibold">Không tìm thấy hồ sơ khách hàng nào phù hợp</p>
            </div>
          ) : (
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
                              <Mail size={10} /> {c.user?.email || 'N/A'}
                            </span>
                            {c.user?.phone && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Phone size={10} /> {c.user.phone}
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
                              onClick={() => handleViewDetails(c)}
                              className="p-1.5 text-[#161D25] hover:bg-gray-100 rounded transition-colors cursor-pointer"
                              title="Xem chi tiết sổ địa chỉ"
                            >
                              <Eye size={14} />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(c)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                  title="Chỉnh sửa thông tin"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteCustomer(c.id)}
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
          )}
        </div>

        {/* Detailed Drawer (Right Side Panel) */}
        {selectedCustomer && (
          <div className="lg:col-span-5 bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#e2e8f0] bg-[#161D25] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[#bc0100]" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Thông tin & Sổ địa chỉ</span>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
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
                    {selectedCustomer.customerType === 'BUSINESS' ? 'Doanh Nghiệp' : 'Cá Nhân'}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider ${
                    selectedCustomer.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedCustomer.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-[10px]">Tài khoản</span>
                    <span className="font-bold text-[#161D25]">{selectedCustomer.user?.username || 'N/A'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-gray-400 text-[10px]">Số điện thoại</span>
                    <span className="font-bold text-[#161D25]">{selectedCustomer.user?.phone || 'N/A'}</span>
                  </div>
                  <div className="col-span-2 flex flex-col gap-0.5">
                    <span className="text-gray-400 text-[10px]">Email liên hệ</span>
                    <span className="font-bold text-[#161D25] truncate">{selectedCustomer.user?.email || 'N/A'}</span>
                  </div>
                  
                  {selectedCustomer.customerType === 'BUSINESS' && (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-[10px]">Tên Công ty</span>
                        <span className="font-bold text-[#161D25]">{selectedCustomer.companyName || 'N/A'}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-400 text-[10px]">Mã số thuế</span>
                        <span className="font-bold text-[#161D25] font-mono">{selectedCustomer.taxCode || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>

                {selectedCustomer.note && (
                  <div className="border-t border-gray-200 pt-2 mt-1">
                    <span className="text-gray-400 text-[10px] block mb-0.5">Ghi chú</span>
                    <p className="text-gray-600 italic bg-white p-2 rounded border border-gray-150 text-[11px] leading-relaxed">
                      {selectedCustomer.note}
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
                      onClick={handleOpenCreateAddress}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#161D25] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                    >
                      <Plus size={10} />
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
                                onClick={() => handleOpenEditAddress(addr)}
                                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-gray-50 rounded cursor-pointer"
                                title="Sửa địa chỉ"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(addr.id)}
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
                            {addr.ward}, {addr.district}, {addr.province}
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
        )}
      </div>

      {/* Customer Modal (Create / Edit) */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
              <h4 className="text-xs font-extrabold uppercase tracking-wider">
                {isEditing ? 'Chỉnh sửa hồ sơ khách hàng' : 'Tạo mới hồ sơ khách hàng'}
              </h4>
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <XCircle size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 flex flex-col gap-4 text-xs">
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
                  onClick={() => setShowCustomerModal(false)}
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

      {/* Address Modal (Create / Edit Address) */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] shadow-soft max-w-md w-full overflow-hidden">
            <div className="p-4 bg-[#161D25] text-white flex justify-between items-center">
              <h4 className="text-xs font-extrabold uppercase tracking-wider">
                {isEditingAddress ? 'Chỉnh sửa địa chỉ khách hàng' : 'Thêm địa chỉ mới vào sổ'}
              </h4>
              <button 
                onClick={() => setShowAddressModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <XCircle size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="p-5 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 1 (Số nhà, Tên đường)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 123 Nguyễn Huệ"
                  value={addressFormData.addressLine1}
                  onChange={(e) => setAddressFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Địa chỉ dòng 2 (Tên tòa nhà, Căn hộ - Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tòa nhà Bitexco, Tầng 15"
                  value={addressFormData.addressLine2}
                  onChange={(e) => setAddressFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Phường / Xã</label>
                  <input
                    type="text"
                    required
                    placeholder="Bến Nghé"
                    value={addressFormData.ward}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, ward: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Quận / Huyện</label>
                  <input
                    type="text"
                    required
                    placeholder="Quận 1"
                    value={addressFormData.district}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, district: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Tỉnh / Thành phố</label>
                  <input
                    type="text"
                    required
                    placeholder="Hồ Chí Minh"
                    value={addressFormData.province}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, province: e.target.value }))}
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
                    value={addressFormData.latitude}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={addressFormData.longitude}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Loại địa chỉ</label>
                  <select
                    value={addressFormData.addressType}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, addressType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-[#e2e8f0] rounded-md outline-none focus:border-[#bc0100]"
                  >
                    <option value="HOME">Nhà riêng (HOME)</option>
                    <option value="OFFICE">Văn phòng (OFFICE)</option>
                    <option value="WAREHOUSE">Kho hàng (WAREHOUSE)</option>
                    <option value="RETURN">Nơi trả hàng (RETURN)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="isDefaultCheckbox"
                    checked={addressFormData.isDefault}
                    onChange={(e) => setAddressFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                    className="w-4 h-4 text-[#bc0100] border-gray-300 rounded focus:ring-[#bc0100] cursor-pointer"
                  />
                  <label htmlFor="isDefaultCheckbox" className="font-bold text-gray-700 cursor-pointer select-none">Đặt làm mặc định</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded font-bold uppercase tracking-wider text-[10px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-[#bc0100] hover:bg-[#a00100] text-white rounded font-bold uppercase tracking-wider text-[10px] disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Đang lưu...' : 'Lưu địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
