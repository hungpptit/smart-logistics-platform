import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { CustomerTable } from './customer/CustomerTable';
import { CustomerDetailPanel } from './customer/CustomerDetailPanel';
import { CustomerModal } from './customer/CustomerModal';
import { AddressModal } from './customer/AddressModal';

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
  wardCode?: string;
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
  
  // Customer Form States
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    customerType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'BUSINESS',
    companyName: '',
    taxCode: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DISABLED' | string,
    note: ''
  });

  // Address Form States
  const [showAddressModal, setShowAddressModal] = useState<boolean>(false);
  const [addressFormData, setAddressFormData] = useState({
    id: '',
    addressLine1: '',
    addressLine2: '',
    ward: '',
    province: '',
    country: 'Vietnam',
    latitude: 10.7765,
    longitude: 106.7009,
    addressType: 'HOME' as 'HOME' | 'OFFICE' | 'WAREHOUSE' | 'RETURN',
    isDefault: false,
    wardCode: ''
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
        const flattened = (data.data || []).map((item: any) => ({
          id: item.id,
          addressLine1: item.address?.addressLine1 || '',
          addressLine2: item.address?.addressLine2 || '',
          ward: item.address?.ward || '',
          province: item.address?.province || '',
          country: item.address?.country || 'Vietnam',
          postalCode: item.address?.postalCode || '',
          latitude: item.address?.latitude ?? 0,
          longitude: item.address?.longitude ?? 0,
          addressType: item.addressType,
          isDefault: item.isDefault,
          wardCode: item.address?.wardCode || ''
        }));
        setAddresses(flattened);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setAddressesLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(currentPage);
  }, [currentPage, typeFilter, statusFilter, token]);

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
    setTimeout(() => {
      fetchCustomers(1);
    }, 50);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '',
      customerType: 'INDIVIDUAL',
      companyName: '',
      taxCode: '',
      status: 'ACTIVE',
      note: ''
    });
    setEditingCustomerId(null);
    setIsEditing(false);
    setShowCustomerModal(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setFormData({
      username: c.user?.username || '',
      fullName: c.fullName || c.user?.username || '',
      email: c.email || '',
      phone: c.phone || '',
      customerType: c.customerType,
      companyName: c.companyName || '',
      taxCode: c.taxCode || '',
      status: c.status,
      note: c.note || ''
    });
    setEditingCustomerId(c.id);
    setIsEditing(true);
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setActionLoading(true);
    try {
      const url = isEditing 
        ? `${CONFIG.API_BASE_URL}/customers/${editingCustomerId}`
        : `${CONFIG.API_BASE_URL}/customers`;
      const method = isEditing ? 'PUT' : 'POST';

      const payload = isEditing 
        ? {
            customerType: formData.customerType,
            companyName: formData.companyName,
            taxCode: formData.taxCode,
            status: formData.status,
            note: formData.note
          }
        : {
            username: formData.username,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            customerType: formData.customerType,
            companyName: formData.companyName,
            taxCode: formData.taxCode,
            note: formData.note
          };

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
        setEditingCustomerId(null);
        fetchCustomers(currentPage);
        if (isEditing && selectedCustomer && selectedCustomer.id === editingCustomerId) {
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

  // Address Book Management
  const handleOpenCreateAddress = () => {
    setAddressFormData({
      id: '',
      addressLine1: '',
      addressLine2: '',
      ward: '',
      province: '',
      country: 'Vietnam',
      latitude: 10.7765,
      longitude: 106.7009,
      addressType: 'HOME',
      isDefault: false,
      wardCode: ''
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
      province: addr.province,
      country: addr.country,
      latitude: addr.latitude,
      longitude: addr.longitude,
      addressType: addr.addressType,
      isDefault: addr.isDefault,
      wardCode: addr.wardCode || ''
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
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-[#e2e8f0] rounded-md text-xs focus:border-[#bc0100] outline-none"
            >
              <option value="">Tất cả loại KH</option>
              <option value="INDIVIDUAL">Cá nhân</option>
              <option value="BUSINESS">Doanh nghiệp</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
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
        {/* Customer Table Column */}
        <div className={`bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden ${selectedCustomer ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="p-4 border-b border-[#e2e8f0] flex justify-between items-center bg-[#fafafa]">
            <h3 className="text-xs font-extrabold text-[#161D25] uppercase tracking-wider">Danh sách hồ sơ khách hàng</h3>
            <span className="text-[10px] text-gray-500 font-bold">Tổng số: {pagination.total}</span>
          </div>

          <CustomerTable
            customers={customers}
            loading={loading}
            error={error}
            selectedCustomer={selectedCustomer}
            pagination={pagination}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onViewDetails={handleViewDetails}
            onEdit={handleOpenEditModal}
            onDelete={handleDeleteCustomer}
            canManage={canManage || false}
          />
        </div>

        {/* Selected Customer details panel */}
        {selectedCustomer && (
          <CustomerDetailPanel
            customer={selectedCustomer}
            addresses={addresses}
            addressesLoading={addressesLoading}
            onClose={() => setSelectedCustomer(null)}
            onAddAddress={handleOpenCreateAddress}
            onEditAddress={handleOpenEditAddress}
            onDeleteAddress={handleDeleteAddress}
            canManage={canManage || false}
          />
        )}
      </div>

      {/* Customer Create/Edit Modal */}
      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => { setShowCustomerModal(false); setEditingCustomerId(null); }}
        isEditing={isEditing}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSaveCustomer}
        actionLoading={actionLoading}
      />

      {/* Address Book Create/Edit Modal */}
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        isEditing={isEditingAddress}
        addressFormData={addressFormData}
        setAddressFormData={setAddressFormData}
        onSubmit={handleSaveAddress}
        actionLoading={actionLoading}
      />
    </div>
  );
};
