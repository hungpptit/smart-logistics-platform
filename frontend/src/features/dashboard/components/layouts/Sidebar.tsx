import React from 'react';
import { LogOut, Home } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<any> | null;
  allowed: boolean;
}

interface SidebarProps {
  menuItems: MenuItem[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  onBackToHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  menuItems,
  activeTab,
  setActiveTab,
  onBackToHome
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#161D25] text-white shrink-0 font-montserrat">
      {/* Brand logo header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#bc0100]"></div>
          <span className="font-extrabold text-base tracking-widest uppercase">VELOCITY</span>
        </div>
        <span className="text-[10px] text-gray-400 mt-1 block uppercase tracking-wider font-semibold">Bảng điều khiển</span>
      </div>

      {/* Navigation menus */}
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

      {/* User profile card & Logout */}
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
  );
};
