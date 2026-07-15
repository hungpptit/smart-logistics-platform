import React from 'react';
import { Package, Users, Building2, User, Earth, Truck } from 'lucide-react';
import { DashboardShell } from '../layouts/DashboardShell';
import type { MenuItem } from '../layouts/Sidebar';
import { OrderTab } from '../OrderTab';
import { CustomerTab } from '../CustomerTab';
import { FacilityTab } from '../FacilityTab';
import { LiveTrackingTab } from '../LiveTrackingTab';
import { DriverTab } from '../DriverTab';
import { VehicleTab } from '../VehicleTab';
import { useAuth } from '../../../../context/AuthContext';

interface StaffDashboardProps {
  onBackToHome?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onBackToHome }) => {
  const { user } = useAuth();

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
      allowed: !!(
        user?.roles.includes('ADMIN') ||
        user?.permissions.includes('CUSTOMER_VIEW') ||
        user?.permissions.includes('CUSTOMER_MANAGE')
      ),
    },
    {
      id: 'drivers',
      label: 'Quản lý Tài xế',
      icon: Truck,
      component: DriverTab,
      allowed: !!(
        user?.roles.includes('ADMIN') ||
        user?.permissions.includes('DRIVER_VIEW') ||
        user?.permissions.includes('DRIVER_MANAGE')
      ),
    },
    {
      id: 'vehicles',
      label: 'Quản lý Phương tiện',
      icon: Truck,
      component: VehicleTab,
      allowed: !!(
        user?.roles.includes('ADMIN') ||
        user?.permissions.includes('VEHICLE_VIEW') ||
        user?.permissions.includes('VEHICLE_MANAGE')
      ),
    },
    {
      id: 'facilities',
      label: 'Hệ thống Kho bãi',
      icon: Building2,
      component: FacilityTab,
      allowed: !!(
        user?.roles.includes('ADMIN') ||
        user?.permissions.includes('FACILITY_VIEW') ||
        user?.permissions.includes('FACILITY_MANAGE')
      ),
    },
    {
      id: 'profile',
      label: 'Hồ sơ nhân viên',
      icon: User,
      component: null, // Automatically handled by DashboardShell to render ProfileTab
      allowed: true,
    },
  ];

  return <DashboardShell menuItems={menuItems} onBackToHome={onBackToHome} />;
};

export default StaffDashboard;
