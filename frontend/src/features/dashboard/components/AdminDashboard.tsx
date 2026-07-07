import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { CustomerDashboard } from './customer/CustomerDashboard';
import { StaffDashboard } from './staff/StaffDashboard';
import { ShipperDashboard } from './shipper/ShipperDashboard';
import { AdminRoleDashboard } from './admin/AdminRoleDashboard';

export const AdminDashboard: React.FC<{ onBackToHome?: () => void }> = ({ onBackToHome }) => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-[#F4F4F4] font-montserrat">
        <div className="bg-white p-8 rounded-lg shadow-soft border border-[#e2e8f0] text-center max-w-md">
          <h3 className="text-lg font-bold text-[#bc0100] uppercase tracking-wider mb-2">Yêu cầu đăng nhập</h3>
          <p className="text-sm text-gray-500 mb-4">Vui lòng đăng nhập hệ thống để truy cập bảng điều khiển.</p>
        </div>
      </div>
    );
  }

  // 1. ADMIN Dashboard
  if (user.roles.includes('ADMIN')) {
    return <AdminRoleDashboard onBackToHome={onBackToHome} />;
  }

  // 2. STAFF Dashboard
  if (user.roles.includes('STAFF')) {
    return <StaffDashboard onBackToHome={onBackToHome} />;
  }

  // 3. SHIPPER Dashboard
  if (user.roles.includes('SHIPPER')) {
    return <ShipperDashboard onBackToHome={onBackToHome} />;
  }

  // 4. Fallback/Default dashboard for CUSTOMERs
  return <CustomerDashboard onBackToHome={onBackToHome} />;
};

export default AdminDashboard;
