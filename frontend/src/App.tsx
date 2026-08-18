import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { PublicTrackingResult } from './features/tracking/components/PublicTrackingResult';
import { ServicesGrid } from './features/pricing/components/ServicesGrid';
import { PricingCalculator } from './features/pricing/components/PricingCalculator';
import { AdminDashboard } from './features/dashboard/components/AdminDashboard';
import { Toast } from './components/ui/Toast';
import { Search, ArrowRight, X } from 'lucide-react';
import { Header } from './components/Header';
import { CONFIG } from './config';
import { io as socketIoClient } from 'socket.io-client';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  // Virtual Routing State
  const [view, setView] = useState<'landing' | 'pricing' | 'dashboard'>('landing');

  // Modals & Popups State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Tracking Engine State
  const [trackingCode, setTrackingCode] = useState('');
  const [currentTracking, setCurrentTracking] = useState<any>(null);
  const [liveDriverPos, setLiveDriverPos] = useState<[number, number] | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Auto-redirect to dashboard when logged in, or landing when logged out
  useEffect(() => {
    if (user) {
      setView('dashboard');
    } else {
      setView('landing');
    }
  }, [user]);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setIsToastVisible(true);
    setTimeout(() => {
      setIsToastVisible(false);
    }, 4000);
  };

  const fetchTrackingData = async (codeToSearch: string) => {
    const cleanCode = codeToSearch.trim().toUpperCase();
    if (!cleanCode) {
      setSearchError('Vui lòng nhập mã vận đơn để tra cứu!');
      triggerToast('Vui lòng nhập mã vận đơn để tra cứu!', 'error');
      return;
    }

    setIsTrackingLoading(true);
    setSearchError(null);

    try {
      // Query Backend Public Tracking API
      const res = await fetch(`${CONFIG.API_BASE_URL}/tracking/public/${cleanCode}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const payload = data.data;
        setCurrentTracking(payload);
        setSearchError(null);
        if (payload.coordinates?.currentDriver) {
          setLiveDriverPos([payload.coordinates.currentDriver.lat, payload.coordinates.currentDriver.lng]);
        }
        triggerToast(`Đã tìm thấy thông tin vận đơn ${cleanCode}!`, 'success');
      } else {
        const err = data.message || `Không tìm thấy mã đơn / mã vận đơn "${cleanCode}" trên hệ thống!`;
        setCurrentTracking(null);
        setLiveDriverPos(null);
        setSearchError(err);
        triggerToast(err, 'error');
      }
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      const networkErr = `Lỗi kết nối khi tra cứu mã "${cleanCode}". Vui lòng thử lại!`;
      setCurrentTracking(null);
      setLiveDriverPos(null);
      setSearchError(networkErr);
      triggerToast(networkErr, 'error');
    } finally {
      setIsTrackingLoading(false);
    }
  };

  // Socket.io Real-time GPS Listener when Shipper is delivering by motorbike
  useEffect(() => {
    if (!currentTracking?.routeId) return;

    const socketUrl = CONFIG.API_BASE_URL.replace('/api', '').replace('/v1', '');
    const socket = socketIoClient(socketUrl);

    socket.emit('join:route', { routeId: currentTracking.routeId });

    socket.on('driver:update_location', (data: any) => {
      if (data && data.latitude && data.longitude) {
        setLiveDriverPos([data.latitude, data.longitude]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentTracking?.routeId]);

  const handleTrackSubmit = () => {
    fetchTrackingData(trackingCode);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrackSubmit();
    }
  };

  // Render Admin Dashboard if user is logged in and view mode is dashboard
  if (view === 'dashboard' && user) {
    return (
      <>
        <AdminDashboard onBackToHome={() => setView('landing')} />
        <Toast
          message={toastMessage}
          type={toastType}
          isVisible={isToastVisible}
        />
      </>
    );
  }

  return (
    <>
      {/* Top Navigation Bar */}
      <Header
        view={view}
        setView={setView}
        setIsAuthOpen={setIsAuthOpen}
        triggerToast={triggerToast}
      />

      {view === 'landing' ? (
        <>
          {/* Hero & Tracking Input Section */}
          <section className="hero-section" id="tracking">
            <div className="hero-container">
              <span className="badge">MẠNG LƯỚI VẬN CHUYỂN THÔNG MINH</span>
              <h1 className="hero-title">Tra Cứu & Định Vị Đơn Hàng</h1>
              <p className="hero-subtitle">Theo dõi thời gian thực, trạng thái điều phối và trực quan hóa lộ trình cho chuỗi cung ứng doanh nghiệp.</p>

              <div className="tracking-box-container">
                <div className="tracking-search-bar">
                  <Search className="search-icon" size={17} />
                  <input
                    type="text"
                    placeholder="Nhập mã vận đơn tra cứu (VD: ORD-xxxxxxxxxx)..."
                    value={trackingCode}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTrackingCode(val);
                      if (!val.trim()) {
                        setCurrentTracking(null);
                        setLiveDriverPos(null);
                        setSearchError(null);
                      } else if (searchError) {
                        setSearchError(null);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                  />
                  {trackingCode && (
                    <button
                      type="button"
                      onClick={() => {
                        setTrackingCode('');
                        setCurrentTracking(null);
                        setLiveDriverPos(null);
                        setSearchError(null);
                      }}
                      className="p-1 mr-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <X size={15} />
                    </button>
                  )}
                  <button className="btn btn-primary cursor-pointer disabled:opacity-50" onClick={handleTrackSubmit} disabled={isTrackingLoading}>
                    <span>{isTrackingLoading ? 'Đang tìm...' : 'Tra cứu ngay'}</span>
                    {!isTrackingLoading && <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </div>
              </div>

              {/* Inline Error Notice OUTSIDE the capsule */}
              {searchError && (
                <div className="mt-3.5 inline-flex items-center gap-2 bg-rose-950/85 border border-rose-500/40 text-rose-200 text-xs px-4 py-2 rounded-full font-medium shadow-lg backdrop-blur-md animate-fade-in">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0"></span>
                  <span>{searchError}</span>
                </div>
              )}
            </div>
          </section>

          {/* Tracking Results Area (Modularized Component) */}
          <PublicTrackingResult
            currentTracking={currentTracking}
            liveDriverPos={liveDriverPos}
          />

          {/* Services offerings */}
          <ServicesGrid />
        </>
      ) : view === 'pricing' ? (
        <section id="pricing" className="pricing-calculator-section py-12 bg-[#F4F4F4] min-h-[calc(100vh-72px)] flex flex-col justify-start">
          <div className="container text-center mb-8">
            <h2 className="section-title text-[#161D25] font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Montserrat', fontSize: '24px' }}>Ước Tính Chi Phí</h2>
            <p className="section-subtitle text-gray-500">Xem trước chi phí vận chuyển để đưa ra lựa chọn gói cước phù hợp nhất.</p>
          </div>
          <PricingCalculator />
        </section>
      ) : null}

      {/* Auth Modal popup */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(msg) => triggerToast(msg, 'success')}
      />

      {/* Notification Toast */}
      <Toast message={toastMessage} type={toastType} isVisible={isToastVisible} />

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 Smart Logistics Platform. Thiết kế theo tiêu chuẩn hệ thống logistics doanh nghiệp. Hỗ trợ bởi PostGIS & Redis.</p>
        </div>
      </footer>
    </>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
