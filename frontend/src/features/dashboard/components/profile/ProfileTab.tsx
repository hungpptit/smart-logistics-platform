import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Modal } from '../../../../components/ui/Modal';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export const ProfileTab: React.FC = () => {
  const { user, changePassword } = useAuth();

  // Modal Open State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
    setAlert(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setAlert({ message: 'Vui lòng nhập đầy đủ thông tin mật khẩu', type: 'error' });
      return;
    }

    if (newPassword.length < 6) {
      setAlert({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự', type: 'error' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ message: 'Mật khẩu xác nhận không trùng khớp', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await changePassword(oldPassword, newPassword);
      if (result.success) {
        setAlert({ message: 'Đổi mật khẩu thành công!', type: 'success' });
        setTimeout(() => {
          handleCloseModal();
        }, 1500);
      } else {
        setAlert({ message: result.message, type: 'error' });
      }
    } catch (err) {
      setAlert({ message: 'Có lỗi kết nối xảy ra. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsLoading(false);
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
              <span className="font-bold text-[#161D25] bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.phone || 'Chưa cập nhật'}</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-2">Danh sách quyền hạn được cấp (RBAC)</h3>
          <div className="flex flex-wrap gap-2 mt-3">
            {user.permissions.length === 0 ? (
              <span className="text-xs text-gray-400 italic">Không có quyền hạn đặc biệt</span>
            ) : (
              user.permissions.map((p) => (
                <span key={p} className="text-[10px] font-bold font-mono bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded">
                  {p}
                </span>
              ))
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
            {alert && (
              <div className={`text-xs font-semibold mt-1 p-2 rounded ${
                alert.type === 'success' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
              }`}>
                {alert.message}
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
    </div>
  );
};
