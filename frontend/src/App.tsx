import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { PublicTrackingResult } from './features/tracking/components/PublicTrackingResult';
import { ServicesGrid } from './features/pricing/components/ServicesGrid';
import { PricingCalculator } from './features/pricing/components/PricingCalculator';
import { AdminDashboard } from './features/dashboard/components/AdminDashboard';
import { Toast } from './components/ui/Toast';
import { TRACKING_DATABASE, formatMockTimeline } from './features/tracking/services/mockDb';
import { Search } from 'lucide-react';
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
  const [trackingCode, setTrackingCode] = useState('TRK-10029381');
  const [currentTracking, setCurrentTracking] = useState<any>(null);
  const [liveDriverPos, setLiveDriverPos] = useState<[number, number] | null>(null);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Auto-redirect to dashboard when logged in, or landing when logged out
  useEffect(() => {
    if (user) {
      setView('dashboard');
    } else {
      setView('landing');
    }
  }, [user]);

  // Default initial tracking data on landing page load
  useEffect(() => {
    fetchTrackingData('TRK-10029381');
  }, []);

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
    if (!cleanCode) return;

    setIsTrackingLoading(true);

    try {
      // 1. Query Backend API
      const res = await fetch(`${CONFIG.API_BASE_URL}/tracking/public/${cleanCode}`);
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const payload = data.data;
        setCurrentTracking(payload);
        if (payload.coordinates?.currentDriver) {
          setLiveDriverPos([payload.coordinates.currentDriver.lat, payload.coordinates.currentDriver.lng]);
        }
        triggerToast(`Đã tìm thấy thông tin đơn hàng ${cleanCode}!`, 'success');
      } else {
        // 2. Fallback to mock DB for demonstration seed codes
        const mockData = TRACKING_DATABASE[cleanCode];
        if (mockData) {
          setCurrentTracking({
            code: mockData.code,
            status: mockData.status,
            statusLabel: mockData.statusLabel,
            eta: mockData.eta,
            destination: mockData.destination,
            route: mockData.route,
            coordinates: {
              sender: { lat: mockData.route[0][0], lng: mockData.route[0][1] },
              receiver: { lat: mockData.route[mockData.route.length - 1][0], lng: mockData.route[mockData.route.length - 1][1] },
              currentDriver: { lat: mockData.currentPos[0], lng: mockData.currentPos[1] },
            },
            timeline: formatMockTimeline(mockData.timestamps),
          });
          setLiveDriverPos([mockData.currentPos[0], mockData.currentPos[1]]);
          triggerToast(`Đã tìm thấy thông tin đơn hàng mẫu ${cleanCode}!`, 'success');
        } else {
          triggerToast(`Không tìm thấy mã vận đơn ${cleanCode} trên hệ thống!`, 'error');
        }
      }
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      const mockData = TRACKING_DATABASE[cleanCode];
      if (mockData) {
        setCurrentTracking({
          code: mockData.code,
          status: mockData.status,
          statusLabel: mockData.statusLabel,
          eta: mockData.eta,
          destination: mockData.destination,
          route: mockData.route,
          coordinates: {
            sender: { lat: mockData.route[0][0], lng: mockData.route[0][1] },
            receiver: { lat: mockData.route[mockData.route.length - 1][0], lng: mockData.route[mockData.route.length - 1][1] },
            currentDriver: { lat: mockData.currentPos[0], lng: mockData.currentPos[1] },
          },
          timeline: formatMockTimeline(mockData.timestamps),
        });
      } else {
        triggerToast(`Không tìm thấy mã vận đơn ${cleanCode}!`, 'error');
      }
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

  const handleTableTrack = (code: string) => {
    setTrackingCode(code);
    fetchTrackingData(code);
    document.getElementById('tracking')?.scrollIntoView({ behavior: 'smooth' });
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
                  <Search className="search-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Nhập mã vận đơn cần tra cứu (VD: TRK-10029381 hoặc ORD-66266482)..."
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button className="btn btn-primary cursor-pointer disabled:opacity-50" onClick={handleTrackSubmit} disabled={isTrackingLoading}>
                    {isTrackingLoading ? 'ĐANG TRA CỨU...' : 'TRA CỨU NGAY'}
                  </button>
                </div>
                <p className="search-tip">
                  Mã vận đơn chạy thử:{' '}
                  <strong className="cursor-pointer underline" onClick={() => { setTrackingCode('TRK-10029381'); handleTableTrack('TRK-10029381'); }}>TRK-10029381</strong>,{' '}
                  <strong className="cursor-pointer underline" onClick={() => { setTrackingCode('TRK-20938472'); handleTableTrack('TRK-20938472'); }}>TRK-20938472</strong>
                </p>
              </div>
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
