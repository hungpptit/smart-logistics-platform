import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { OrderTab } from './OrderTab';
import { CustomerTab } from './CustomerTab';
import { FacilityTab } from './FacilityTab';
import { 
  ClipboardList, 
  Users, 
  Warehouse, 
  UserCircle, 
  LogOut, 
  Menu, 
  X,
  Package,
  Clock,
  CheckCircle2,
  Home
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToHome }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('orders');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-[#F4F4F4] font-montserrat">
        <div className="bg-white p-8 rounded-lg shadow-soft border border-[#e2e8f0] text-center max-w-md">
          <h3 className="text-lg font-bold text-[#bc0100] uppercase tracking-wider mb-2">Yêu cầu đăng nhập</h3>
          <p className="text-sm text-gray-500 mb-4">Vui lòng đăng nhập hệ thống để truy cập bảng điều khiển quản trị.</p>
        </div>
      </div>
    );
  }

  const isAdminOrStaff = user.roles.includes('ADMIN') || user.roles.includes('STAFF');

  // Define tabs based on role
  const menuItems = [
    {
      id: 'orders',
      label: isAdminOrStaff ? 'Quản lý Đơn hàng' : 'Đơn hàng của tôi',
      icon: ClipboardList,
      component: OrderTab,
      allowed: true
    },
    {
      id: 'customers',
      label: 'Quản lý Khách hàng',
      icon: Users,
      component: CustomerTab,
      allowed: isAdminOrStaff
    },
    {
      id: 'facilities',
      label: 'Hệ thống Kho bãi',
      icon: Warehouse,
      component: FacilityTab,
      allowed: isAdminOrStaff
    },
    {
      id: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: UserCircle,
      component: null, // Custom profile view directly in return
      allowed: true
    }
  ].filter(item => item.allowed);

  const currentTabItem = menuItems.find(item => item.id === activeTab) || menuItems[0];
  const CurrentTabComponent = currentTabItem.component;

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex flex-col md:flex-row font-montserrat">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#161D25] text-white shrink-0">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#bc0100]"></div>
            <span className="font-extrabold text-base tracking-widest uppercase">VELOCITY</span>
          </div>
          <span className="text-[10px] text-gray-400 mt-1 block uppercase tracking-wider font-semibold">Bảng điều khiển</span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-4 flex flex-col gap-1.5">
          {onBackToHome && (
            <button
              onClick={onBackToHome}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider text-[#bc0100] hover:bg-[#bc0100]/10 transition-colors cursor-pointer text-left mb-2 border border-dashed border-[#bc0100]/30"
            >
              <Home size={16} />
              <span>Quay lại Trang chủ</span>
            </button>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer text-left ${
                  isActive 
                    ? 'bg-[#bc0100] text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User profile brief & logout */}
        <div className="p-4 border-t border-gray-800 bg-black/20 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white uppercase">
              {user.username.slice(0, 2)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate text-white">{user.username}</span>
              <span className="text-[10px] text-gray-400 truncate">{user.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-gray-700 hover:border-red-500 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-[#bc0100] transition-colors cursor-pointer"
          >
            <LogOut size={12} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden bg-[#161D25] text-white p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#bc0100]"></div>
          <span className="font-extrabold text-sm tracking-widest uppercase">VELOCITY</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-white focus:outline-none"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#161D25] text-white border-t border-gray-800 p-4 flex flex-col gap-2 z-50">
          {onBackToHome && (
            <button
              onClick={() => {
                onBackToHome();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider text-[#bc0100] hover:bg-gray-800 transition-colors text-left border border-dashed border-[#bc0100]/30 mb-1"
            >
              <Home size={16} />
              <span>Quay lại Trang chủ</span>
            </button>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-colors text-left ${
                  isActive ? 'bg-[#bc0100] text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="border-t border-gray-800 pt-3 mt-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 font-bold truncate pr-4">{user.email}</span>
            <button
              onClick={() => {
                logout();
                setIsMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-500 rounded text-[10px] font-bold text-red-500 uppercase hover:bg-red-500 hover:text-white"
            >
              <LogOut size={10} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
        {/* Content Header Card */}
        <div className="bg-white p-6 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold bg-[#bc0100]/10 text-[#bc0100] px-2 py-0.5 rounded uppercase tracking-wider">
                {user.roles.join(' | ')}
              </span>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-400 font-medium">Bảng quản trị hệ thống</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#161D25] uppercase tracking-wider">
              {currentTabItem.label}
            </h2>
          </div>

          {/* Quick Metrics Summary Bar */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="bg-[#F4F4F4] px-4 py-2.5 rounded border border-[#e8e8e8] flex items-center gap-2">
              <Package size={14} className="text-[#bc0100]" />
              <div>
                <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Tổng Đơn</span>
                <span className="font-bold text-[#161D25] text-sm">--</span>
              </div>
            </div>
            <div className="bg-[#F4F4F4] px-4 py-2.5 rounded border border-[#e8e8e8] flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <div>
                <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Đang Xử Lý</span>
                <span className="font-bold text-[#161D25] text-sm">--</span>
              </div>
            </div>
            <div className="bg-[#F4F4F4] px-4 py-2.5 rounded border border-[#e8e8e8] flex items-center gap-2">
              <CheckCircle2 size={14} className="text-green-600" />
              <div>
                <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Hoàn Thành</span>
                <span className="font-bold text-[#161D25] text-sm">--</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'profile' ? (
          <div className="bg-white p-6 md:p-8 rounded-lg border border-[#e2e8f0] shadow-soft grid grid-cols-1 lg:grid-cols-12 gap-8">
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
            </div>

            <div className="lg:col-span-8 flex flex-col gap-6">
              <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-2">Thông tin tài khoản chi tiết</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 font-medium">ID Người dùng</span>
                  <span className="font-bold text-[#161D25] font-mono bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.id}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-400 font-medium">Số điện thoại</span>
                  <span className="font-bold text-[#161D25] bg-[#F4F4F4] p-2 rounded border border-[#e2e8f0]">{user.phone || 'Chưa cập nhật'}</span>
                </div>
              </div>

              <h3 className="text-sm font-bold text-[#161D25] uppercase tracking-wider border-b border-[#e8e8e8] pb-2 mt-4">Danh sách quyền hạn được cấp (RBAC)</h3>
              
              <div className="flex flex-wrap gap-2">
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
        ) : (
          CurrentTabComponent && <CurrentTabComponent />
        )}
      </main>
    </div>
  );
};
export default AdminDashboard;
