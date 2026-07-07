import React, { useState } from 'react';
import { Menu, X, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import type { MenuItem } from './Sidebar';

interface MobileHeaderProps {
  menuItems: MenuItem[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  onBackToHome?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  menuItems,
  activeTab,
  setActiveTab,
  onBackToHome
}) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Header - Mobile */}
      <header className="md:hidden bg-[#161D25] text-white p-4 flex items-center justify-between shrink-0 font-montserrat">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#bc0100]"></div>
          <span className="font-extrabold text-sm tracking-widest uppercase">VELOCITY</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
          className="text-white focus:outline-none cursor-pointer"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#161D25] text-white border-t border-gray-800 p-4 flex flex-col gap-2 z-50 font-montserrat">
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
    </>
  );
};
