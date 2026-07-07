import React from 'react';
import { Users, Building2, User, Settings, Package } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardShell';
import type { MenuItem } from '../layouts/Sidebar';
import { OrderTab } from '../OrderTab';
import { CustomerTab } from '../CustomerTab';
import { FacilityTab } from '../FacilityTab';
import { SystemConfigTab } from './SystemConfigTab';

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
      id: 'customers',
      label: 'Quản lý Khách hàng',
      icon: Users,
      component: CustomerTab,
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
