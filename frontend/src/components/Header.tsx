import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, LogOut, User as UserIcon, Menu, X } from 'lucide-react';

interface HeaderProps {
  view: 'landing' | 'pricing' | 'dashboard';
  setView: (view: 'landing' | 'pricing' | 'dashboard') => void;
  setIsAuthOpen: (open: boolean) => void;
  triggerToast: (message: string, type: 'success' | 'error') => void;
}

export const Header: React.FC<HeaderProps> = ({
  view,
  setView,
  setIsAuthOpen,
  triggerToast,
}) => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="navbar relative z-50">
      <div className="nav-container flex justify-between items-center">
        <button
          onClick={() => setView('landing')}
          className="brand-logo"
          style={{ border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Truck className="logo-icon shrink-0 w-[18px] h-[18px] md:w-6 md:h-6" style={{ color: 'var(--color-primary)' }} />
          <span className="text-[13px] sm:text-base md:text-[1.25rem] font-extrabold tracking-wider">SMART</span>
          <span className="logo-red text-[13px] sm:text-base md:text-[1.25rem] font-extrabold tracking-wider">LOGISTICS</span>
        </button>

        <ul className="nav-menu hidden md:flex">
          <li>
            <button
              onClick={() => setView('landing')}
              className={`nav-link ${view === 'landing' ? 'active' : ''}`}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Tra Cứu
            </button>
          </li>
          <li>
            <button
              onClick={() => setView('pricing')}
              className={`nav-link ${view === 'pricing' ? 'active' : ''}`}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Chi Phí
            </button>
          </li>
          <li>
            <button
              onClick={() => {
                setView('landing');
                setTimeout(() => {
                  document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="nav-link"
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Dịch Vụ
            </button>
          </li>
          {user && (
            <li>
              <button
                onClick={() => setView('dashboard')}
                className={`nav-link ${view === 'dashboard' ? 'active' : ''}`}
                style={{ textDecoration: 'none', color: 'var(--color-secondary)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer' }}
              >
                Bảng Điều Khiển
              </button>
            </li>
          )}
        </ul>

        <div className="hidden md:block">
          <div className="nav-auth">
            {!user ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAuthOpen(true)}>
                <UserIcon size={14} /> ĐĂNG NHẬP
              </button>
            ) : (
              <div className="nav-user">
                <span className="user-welcome">Xin chào, <strong>{user.username}</strong></span>
                <button className="btn btn-secondary btn-sm" onClick={() => { logout(); triggerToast('Đã đăng xuất thành công', 'success'); }}>
                  <LogOut size={14} /> ĐĂNG XUẤT
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Hamburger Mobile Toggle / User Greeting on Mobile */}
        <div className="md:hidden flex items-center gap-1.5">
          {user && (
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium whitespace-nowrap">
              Xin chào, <strong className="text-gray-900">{user.username}</strong>
            </span>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-[#161D25] focus:outline-none cursor-pointer flex items-center justify-center p-1 rounded hover:bg-gray-100"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#e2e8f0] px-6 py-4 flex flex-col gap-4 font-montserrat shadow-md absolute left-0 right-0 top-[72px] z-50">
          <button
            onClick={() => {
              setView('landing');
              setIsMobileMenuOpen(false);
            }}
            className={`text-left font-bold text-xs uppercase tracking-wider py-2 ${view === 'landing' ? 'text-[#bc0100]' : 'text-gray-600'}`}
          >
            Tra Cứu
          </button>
          <button
            onClick={() => {
              setView('pricing');
              setIsMobileMenuOpen(false);
            }}
            className={`text-left font-bold text-xs uppercase tracking-wider py-2 ${view === 'pricing' ? 'text-[#bc0100]' : 'text-gray-600'}`}
          >
            Chi Phí
          </button>
          <button
            onClick={() => {
              setView('landing');
              setIsMobileMenuOpen(false);
              setTimeout(() => {
                document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="text-left font-bold text-xs uppercase tracking-wider py-2 text-gray-600"
          >
            Dịch Vụ
          </button>
          {user && (
            <button
              onClick={() => {
                setView('dashboard');
                setIsMobileMenuOpen(false);
              }}
              className={`text-left font-bold text-xs uppercase tracking-wider py-2 ${view === 'dashboard' ? 'text-[#bc0100]' : 'text-gray-600'}`}
            >
              Bảng Điều Khiển
            </button>
          )}
          <div className="border-t border-gray-100 pt-3 mt-1 flex flex-col gap-3">
            {!user ? (
              <button
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#bc0100] hover:bg-[#a00100] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
                onClick={() => {
                  setIsAuthOpen(true);
                  setIsMobileMenuOpen(false);
                }}
              >
                <UserIcon size={14} /> ĐĂNG NHẬP
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-xs text-gray-500 font-medium">Xin chào, <strong className="text-gray-900">{user.username}</strong></span>
                <button
                  className="w-full flex items-center justify-center gap-2 py-2 border border-red-500 hover:bg-red-500 hover:text-white text-red-500 font-bold text-xs uppercase tracking-wider rounded transition-colors"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                    triggerToast('Đã đăng xuất thành công', 'success');
                  }}
                >
                  <LogOut size={14} /> ĐĂNG XUẤT
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
export default Header;
