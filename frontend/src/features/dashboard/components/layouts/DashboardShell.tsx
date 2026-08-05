import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import { Sidebar } from './Sidebar';
import type { MenuItem } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { ProfileTab } from '../profile/ProfileTab';
import { Package, Clock, CheckCircle2 } from 'lucide-react';

interface DashboardShellProps {
  menuItems: MenuItem[];
  onBackToHome?: () => void;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ menuItems, onBackToHome }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('orders');

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

  const allowedMenuItems = menuItems.filter(item => item.allowed !== false);
  const currentTabItem = allowedMenuItems.find(item => item.id === activeTab) || allowedMenuItems[0];
  const CurrentTabComponent = currentTabItem?.component;

  return (
    <div className="h-screen bg-[#F4F4F4] flex flex-col md:flex-row overflow-hidden font-montserrat">
      <Sidebar
        menuItems={allowedMenuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBackToHome={onBackToHome}
      />
      
      <MobileHeader
        menuItems={allowedMenuItems}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBackToHome={onBackToHome}
      />

      <main className="flex-1 p-6 md:p-8 flex flex-col gap-6 overflow-y-auto">
        {/* Content Header Card */}
        <div className="bg-white p-6 rounded-lg border border-[#e2e8f0] shadow-soft flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[10px] font-extrabold bg-[#bc0100]/10 text-[#bc0100] px-2 py-0.5 rounded uppercase tracking-wider">
                {user.roles.join(' | ')}
              </span>
              {user.roles.includes('STAFF') && (user.staffProfile?.assignedFacility || (user.managedFacilities && user.managedFacilities.length > 0)) && (
                <>
                  <span className="text-gray-300">|</span>
                  <span className="text-[10px] font-bold text-gray-600 uppercase bg-gray-100 px-2 py-0.5 rounded">
                    Kho quản lý: {user.staffProfile?.assignedFacility?.facilityName || user.managedFacilities?.[0]?.facilityName}
                  </span>
                </>
              )}
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-400 font-medium">Bảng quản trị hệ thống</span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#161D25] uppercase tracking-wider">
              {currentTabItem.label}
            </h2>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        {activeTab === 'profile' ? (
          <ProfileTab />
        ) : (
          CurrentTabComponent && <CurrentTabComponent />
        )}
      </main>
    </div>
  );
};
