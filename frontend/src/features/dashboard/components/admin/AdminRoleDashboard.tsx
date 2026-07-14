import React from 'react';
import { Users, Building2, User, Settings, Package, Truck, UserCheck, Earth } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardShell';
import type { MenuItem } from '../layouts/Sidebar';
import { OrderTab } from '../OrderTab';
import { CustomerTab } from '../CustomerTab';
import { FacilityTab } from '../FacilityTab';
import { SystemConfigTab } from './SystemConfigTab';
import { DriverTab } from '../DriverTab';
import { StaffTab } from '../StaffTab';
import { LiveTrackingTab } from '../LiveTrackingTab';

interface AdminRoleDashboardProps {
  onBackToHome?: () => void;
}

export const AdminRoleDashboard: React.FC<AdminRoleDashboardProps> = ({ onBackToHome }) => {
  const menuItems: MenuItem[] = [
    {
      id: 'orders',
      label: 'Quản lý Đơn hàng',
      icon: Package,
      component: OrderTab,
      allowed: true,
    },
    {
      id: 'live-tracking',
      label: 'Giám sát Lộ trình',
      icon: Earth,
      component: LiveTrackingTab,
      allowed: true,
    },
    {
      id: 'customers',
      label: 'Quản lý Khách hàng',
      icon: Users,
      component: CustomerTab,
      allowed: true,
    },
    {
      id: 'staff',
      label: 'Quản lý Nhân viên',
      icon: UserCheck,
      component: StaffTab,
      allowed: true,
    },
    {
      id: 'drivers',
      label: 'Quản lý Tài xế',
      icon: Truck,
      component: DriverTab,
      allowed: true,
    },
    {
      id: 'facilities',
      label: 'Hệ thống Kho bãi',
      icon: Building2,
      component: FacilityTab,
      allowed: true,
    },
    {
      id: 'system-config',
      label: 'Cấu hình Hệ thống',
      icon: Settings,
      component: SystemConfigTab,
      allowed: true,
    },
    {
      id: 'profile',
      label: 'Hồ sơ quản trị',
      icon: User,
      component: null, // Automatically handled by DashboardShell to render ProfileTab
      allowed: true,
    },
  ];

  return <DashboardShell menuItems={menuItems} onBackToHome={onBackToHome} />;
};

export default AdminRoleDashboard;
