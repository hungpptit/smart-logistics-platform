import React from 'react';
import { Package, User } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardShell';
import type { MenuItem } from '../layouts/Sidebar';
import { OrderTab } from '../OrderTab';

interface CustomerDashboardProps {
  onBackToHome?: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onBackToHome }) => {
  const menuItems: MenuItem[] = [
    {
      id: 'orders',
      label: 'Đơn hàng của tôi',
      icon: Package,
      component: OrderTab,
      allowed: true,
    },
    {
      id: 'profile',
      label: 'Hồ sơ cá nhân',
      icon: User,
      component: null, // Automatically handled by DashboardShell to render ProfileTab
      allowed: true,
    },
  ];

  return <DashboardShell menuItems={menuItems} onBackToHome={onBackToHome} />;
};
