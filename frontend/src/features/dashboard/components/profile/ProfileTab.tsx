import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Modal } from '../../../../components/ui/Modal';
import { KeyRound, Eye, EyeOff, MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { CONFIG } from '../../../../config';
import { AddressModal } from '../customer/AddressModal';

export const ProfileTab: React.FC = () => {
  const { user, changePassword } = useAuth();

  // Modal Open State (Password)
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Addresses State for Customer
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const initialAddressForm = {
    id: '',
    addressLine1: '',
    addressLine2: '',
    ward: '',
    province: '',
    provinceCode: '',
    country: 'Vietnam',
    latitude: 10.8231,
    longitude: 106.6297,
    addressType: 'HOME' as const,
    isDefault: false,
    wardCode: '',
    contactName: '',
    contactPhone: '',
  };

  const [addressFormData, setAddressFormData] = useState(initialAddressForm);

  const fetchAddresses = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoadingAddresses(true);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/customers/me/addresses`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setCustomerAddresses(data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải sổ địa chỉ khách hàng:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user?.customerProfile?.addresses && user.customerProfile.addresses.length > 0) {
      setCustomerAddresses(user.customerProfile.addresses);
    }
    fetchAddresses();
  }, [user]);

  if (!user) {
    return <div className="p-6 text-gray-400">Không tìm thấy thông tin tài khoản.</div>;
  }

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setPasswordAlert(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordAlert({ message: 'Vui lòng nhập đầy đủ thông tin mật khẩu', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordAlert({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordAlert({ message: 'Mật khẩu xác nhận không trùng khớp', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result.success) {
        setPasswordAlert({ message: 'Đổi mật khẩu thành công!', type: 'success' });
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      } else {
        setPasswordAlert({ message: result.message, type: 'error' });
      }
    } catch (err) {
      setPasswordAlert({ message: 'Có lỗi kết nối xảy ra. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddAddress = () => {
    setIsEditingAddress(false);
    setAddressFormData({
      ...initialAddressForm,
      contactName: (user as any).fullName || user.customerProfile?.fullName || user.username || '',
      contactPhone: user.phone || user.customerProfile?.phone || '',
    });
    setShowAddressModal(true);
  };

  const cleanStreetAddress = (rawAddress: string, wardName?: string, provinceName?: string) => {
    if (!rawAddress) return '';
    let cleaned = rawAddress;
    
    if (wardName) {
      const escapedWard = wardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`,\\s*${escapedWard}`, 'gi'), '');
      const shortWard = wardName.replace(/^(Phường|Xã|Thị trấn)\s+/i, '').trim();
      if (shortWard) {
        cleaned = cleaned.replace(new RegExp(`,\\s*(Phường|Xã|Thị trấn)?\\s*${shortWard}`, 'gi'), '');
      }
    }

    if (provinceName) {
      const escapedProv = provinceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`,\\s*${escapedProv}`, 'gi'), '');
      const shortProv = provinceName.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();
      if (shortProv) {
        cleaned = cleaned.replace(new RegExp(`,\\s*(Thành phố|Tỉnh)?\\s*${shortProv}`, 'gi'), '');
      }
    }

    return cleaned.trim();
  };

  const handleOpenEditAddress = (item: any) => {
    const addr = item.address || item;
    const wardCode = addr.wardCode || addr.wardRelation?.code || '';
    const provinceCode = addr.wardRelation?.provinceCode || addr.wardRelation?.province?.code || addr.provinceCode || '';
    const wardName = addr.wardRelation?.fullName || addr.wardRelation?.name || addr.wardName || '';
    const provinceName = addr.wardRelation?.province?.fullName || addr.wardRelation?.province?.name || addr.provinceName || '';

    const cleanedAddressLine1 = cleanStreetAddress(addr.addressLine1 || '', wardName, provinceName);

    setIsEditingAddress(true);
    setAddressFormData({
      id: item.addressId || addr.id || item.id,
      addressLine1: cleanedAddressLine1,
      addressLine2: addr.addressLine2 || '',
      ward: wardName,
      province: provinceName,
      provinceCode: provinceCode,
      wardCode: wardCode,
      country: addr.country || 'Vietnam',
      latitude: addr.latitude || 10.8231,
      longitude: addr.longitude || 106.6297,
      addressType: item.addressType || 'HOME',
      isDefault: item.isDefault || false,
      contactName: item.contactName || '',
      contactPhone: item.contactPhone || '',
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    const customerId = user.customerProfile?.id;

    setActionLoading(true);
    try {
      let url = `${CONFIG.API_BASE_URL}/customers/me/addresses`;
      let method = 'POST';

      if (isEditingAddress && customerId && addressFormData.id) {
        url = `${CONFIG.API_BASE_URL}/customers/${customerId}/addresses/${addressFormData.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressFormData),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setShowAddressModal(false);
        fetchAddresses();
      } else {
        window.alert(data.message || 'Lỗi khi lưu địa chỉ.');
      }
    } catch (err) {
      console.error(err);
      window.alert('Không thể kết nối tới máy chủ.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    const customerId = user.customerProfile?.id;
    if (!customerId) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ?')) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}/customers/${customerId}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok && data.success) {
        fetchAddresses();
      } else {
        window.alert(data.message || 'Lỗi khi xóa địa chỉ.');
      }
    } catch (err) {
      console.error(err);
      window.alert('Không thể kết nối tới máy chủ.');
    }
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-lg border border-[#e2e8f0] shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-8 font-montserrat animate-fadeIn">
      {/* Cột trái: Thông tin tổng quan */}
      <div className="lg:col-span-4 flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-[#e8e8e8] pb-6 lg:pb-0 lg:pr-8 gap-4">
        <div className="w-24 h-24 rounded-full bg-[#F4F4F4] border border-[#e2e8f0] flex items-center justify-center text-3xl font-bold text-[#bc0100] uppercase shadow-inner">
          {user.username.slice(0, 2)}
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#161D25]">{user.username}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {user.roles.map((r) => (
            <span key={r} className="text-[9px] font-bold bg-[#bc0100] text-white px-2 py-0.5 rounded uppercase tracking-wider">
              {r}
            </span>
          ))}
        </div>
        
        {/* Nút đổi mật khẩu mở modal */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 flex items-center justify-center gap-2 text-xs font-bold bg-[#161D25] text-white hover:bg-[#bc0100] transition-colors duration-200 px-6 py-3 rounded-md uppercase tracking-wider w-full max-w-[200px]"
        >
          <KeyRound size={14} />
          Đổi mật khẩu
        </button>
      </div>

      {/* Cột phải: Chi tiết */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        <div>
          <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-2">Thông tin tài khoản chi tiết</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-3">
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 font-medium">ID Người dùng</span>
              <span className="font-bold text-[#161D25] font-mono bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.id}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 font-medium">Số điện thoại</span>
              <span className="font-bold text-[#161D25] bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.phone || user.customerProfile?.phone || 'Chưa cập nhật'}</span>
            </div>
            {user.customerProfile?.customerCode && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 font-medium">Mã khách hàng</span>
                <span className="font-bold text-[#bc0100] font-mono bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">
                  {user.customerProfile.customerCode}
                </span>
              </div>
            )}
            {user.customerProfile?.customerType && (
              <div className="flex flex-col gap-1">
                <span className="text-gray-400 font-medium">Loại tài khoản</span>
                <span className="font-bold text-[#161D25] bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">
                  {user.customerProfile.customerType === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân'}
                </span>
              </div>
            )}
            {user.roles.includes('STAFF') && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-gray-400 font-medium">Kho được phân công</span>
                <span className="font-bold text-[#161D25] bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">
                  {user.staffProfile?.assignedFacility?.facilityName ? (
                    `${user.staffProfile.assignedFacility.facilityCode} - ${user.staffProfile.assignedFacility.facilityName}`
                  ) : user.managedFacilities && user.managedFacilities.length > 0 ? (
                    `${user.managedFacilities[0].facilityCode} - ${user.managedFacilities[0].facilityName}`
                  ) : (
                    'Chưa được phân công kho'
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Khối hiển thị Địa chỉ Khách hàng */}
        <div>
          <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-2">
            <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-[#bc0100]" />
              Sổ địa chỉ nhận / gửi hàng
            </h3>
            <div className="flex items-center gap-2.5">
              {customerAddresses.length > 0 && (
                <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
                  {customerAddresses.length} địa chỉ
                </span>
              )}
              <button
                type="button"
                onClick={handleOpenAddAddress}
                className="flex items-center gap-1 text-xs font-bold bg-[#bc0100] text-white hover:bg-[#a00100] transition-colors px-3 py-1.5 rounded-md shadow-sm"
              >
                <Plus size={14} />
                Thêm địa chỉ
              </button>
            </div>
          </div>

          <div className="mt-3">
            {loadingAddresses && customerAddresses.length === 0 ? (
              <div className="text-xs text-gray-400 py-4 text-center">Đang tải sổ địa chỉ...</div>
            ) : customerAddresses.length === 0 ? (
              <div className="bg-[#F8FAFC] border border-dashed border-[#cbd5e1] rounded-lg p-5 text-center flex flex-col items-center gap-2">
                <MapPin size={24} className="text-gray-300" />
                <p className="text-xs text-gray-600 font-semibold">Chưa có địa chỉ nào trong sổ địa chỉ</p>
                <p className="text-[11px] text-gray-400 max-w-sm">Bấm nút "Thêm địa chỉ" ở trên hoặc các địa chỉ lấy/giao hàng sẽ được tự động lưu lại khi bạn tạo đơn hàng mới.</p>
                <button
                  type="button"
                  onClick={handleOpenAddAddress}
                  className="mt-1 flex items-center gap-1.5 text-xs font-bold bg-[#161D25] text-white hover:bg-[#bc0100] transition-colors px-4 py-2 rounded-md"
                >
                  <Plus size={14} />
                  Thêm địa chỉ ngay
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {customerAddresses.map((item: any, idx: number) => {
                  const addr = item.address || item;
                  const ward = addr.wardRelation?.fullName || addr.wardRelation?.name || addr.wardName || addr.ward || item.ward || '';
                  const province = addr.wardRelation?.province?.fullName || addr.wardRelation?.province?.name || addr.provinceName || addr.province || item.province || '';

                  const addressParts = [
                    addr.addressLine1,
                    ward,
                    province,
                  ].filter(Boolean);

                  const fullAddressStr = addressParts.join(', ') || addr.fullAddress || 'Chi tiết địa chỉ chưa cập nhật';

                  const typeLabel =
                    item.addressType === 'HOME' ? 'Nhà riêng' :
                    item.addressType === 'OFFICE' ? 'Văn phòng' :
                    item.addressType === 'WAREHOUSE' ? 'Kho hàng' :
                    item.addressType === 'RETURN' ? 'Trả hàng' :
                    item.addressType || 'Địa chỉ';

                  return (
                    <div
                      key={item.id || idx}
                      className={`p-3.5 rounded-md border transition-all duration-200 ${
                        item.isDefault
                          ? 'border-[#bc0100]/40 bg-[#bc0100]/[0.02] shadow-sm'
                          : 'border-[#e2e8f0] bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200">
                            {typeLabel}
                          </span>
                          {item.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-[#bc0100] text-white">
                              Mặc định
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {(item.contactName || item.contactPhone) && (
                            <span className="text-xs font-semibold text-[#161D25]">
                              {item.contactName} {item.contactPhone ? <span className="text-gray-500 font-normal">({item.contactPhone})</span> : ''}
                            </span>
                          )}

                          <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditAddress(item)}
                              className="p-1 text-gray-400 hover:text-[#161D25] transition-colors rounded"
                              title="Chỉnh sửa địa chỉ"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(item.addressId || item.id)}
                              className="p-1 text-gray-400 hover:text-[#bc0100] transition-colors rounded"
                              title="Xóa địa chỉ"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-xs text-[#2d3748] mt-1 font-medium">
                        <MapPin size={14} className="text-[#bc0100] shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{fullAddressStr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal đổi mật khẩu */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <div className="p-1 font-montserrat">
          <h3 className="text-md font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-3 mb-5">Đổi mật khẩu tài khoản</h3>
          
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            {/* Mật khẩu cũ */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#4a5568] uppercase" htmlFor="old-pass">Mật khẩu hiện tại</label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  id="old-pass"
                  className="text-xs border border-gray-300 rounded p-2.5 w-full focus:border-[#bc0100] outline-none pr-10"
                  placeholder="Nhập mật khẩu hiện tại..."
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#4a5568] uppercase" htmlFor="new-pass">Mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  id="new-pass"
                  className="text-xs border border-gray-300 rounded p-2.5 w-full focus:border-[#bc0100] outline-none pr-10"
                  placeholder="Tối thiểu 6 ký tự..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[#4a5568] uppercase" htmlFor="confirm-pass">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  id="confirm-pass"
                  className="text-xs border border-gray-300 rounded p-2.5 w-full focus:border-[#bc0100] outline-none pr-10"
                  placeholder="Nhập lại mật khẩu mới..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Alert Banner */}
            {passwordAlert && (
              <div className={`text-xs font-semibold mt-1 p-2 rounded ${
                passwordAlert.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
              }`}>
                {passwordAlert.message}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isLoading}
                className="text-xs font-bold border border-gray-300 hover:bg-gray-50 transition-colors px-4 py-2.5 rounded uppercase tracking-wider"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="text-xs font-bold bg-[#bc0100] hover:bg-[#a00100] text-white transition-colors px-5 py-2.5 rounded uppercase tracking-wider"
              >
                {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Address Create/Edit Modal */}
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
