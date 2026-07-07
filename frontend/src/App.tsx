import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { TimelineStepper } from './features/tracking/components/TimelineStepper';
import { MapcnMap } from './features/tracking/components/MapcnMap';
import { ServicesGrid } from './components/ServicesGrid';
import { PricingCalculator } from './components/PricingCalculator';
import { AdminDashboard } from './features/dashboard/components/AdminDashboard';
import { Toast } from './components/Toast';
import { TRACKING_DATABASE } from './features/tracking/services/mockDb';
import type { TrackingData } from './features/tracking/types';
import { Search, Earth } from 'lucide-react';
import { Header } from './components/Header';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();

  // Virtual Routing State
  const [view, setView] = useState<'landing' | 'pricing' | 'dashboard'>('landing');

  // Modals & Popups State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Tracking Engine State
  const [trackingCode, setTrackingCode] = useState('TRK-10029381');
  const [currentTracking, setCurrentTracking] = useState<TrackingData | null>(TRACKING_DATABASE['TRK-10029381']);

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

  const handleTrackSubmit = () => {
    const code = trackingCode.trim();
    const data = TRACKING_DATABASE[code];
    if (data) {
      setCurrentTracking(data);
    } else {
      triggerToast(`Không tìm thấy mã vận đơn ${code}!`, 'error');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTrackSubmit();
    }
  };

  const handleTableTrack = (code: string) => {
    setTrackingCode(code);
    const data = TRACKING_DATABASE[code];
    if (data) {
      setCurrentTracking(data);
      document.getElementById('tracking')?.scrollIntoView({ behavior: 'smooth' });
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
                  <Search className="search-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Nhập mã vận đơn cần tra cứu (VD: TRK-10029381)..."
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    onKeyPress={handleKeyPress}
                  />
                  <button className="btn btn-primary" onClick={handleTrackSubmit}>TRA CỨU NGAY</button>
                </div>
                <p className="search-tip">
                  Mã vận đơn chạy thử:{' '}
                  <strong onClick={() => { setTrackingCode('TRK-10029381'); handleTableTrack('TRK-10029381'); }}>TRK-10029381</strong>,{' '}
                  <strong onClick={() => { setTrackingCode('TRK-20938472'); handleTableTrack('TRK-20938472'); }}>TRK-20938472</strong>
                </p>
              </div>
            </div>
          </section>

          {/* Tracking Results Area */}
          {currentTracking && (
            <section className="tracking-results-section" id="tracking-results">
              <div className="container">
                <div className="results-grid">

                  {/* Timeline Stepper */}
                  <div className="card timeline-card">
                    <div className="card-header">
                      <div>
                        <span className={`chip chip-${currentTracking.status.toLowerCase()}`}>
                          {currentTracking.statusLabel}
                        </span>
                        <h3 className="card-title" style={{ marginTop: '8px' }}>{currentTracking.code}</h3>
                      </div>
                      <div className="eta-box">
                        <span className="eta-label">Thời gian giao dự kiến</span>
                        <span className="eta-date">{currentTracking.eta}</span>
                      </div>
                    </div>

                    <div className="card-body">
                      <TimelineStepper
                        status={currentTracking.status}
                        timestamps={currentTracking.timestamps}
                      />
                    </div>
                  </div>

                  {/* Leaflet Geospatial Map */}
                  <div className="card map-card">
                    <div className="card-header">
                      <h3 className="card-title">
                        <Earth className="map-icon" size={18} style={{ color: 'var(--color-primary)' }} />
                        Lộ trình & Vị trí trực tiếp
                      </h3>
                      <span className="map-coordinates">
                        {currentTracking.currentPos[0].toFixed(6)}, {currentTracking.currentPos[1].toFixed(6)}
                      </span>
                    </div>
                    <div className="card-body map-body">
                      <MapcnMap
                        route={currentTracking.route}
                        currentPos={currentTracking.currentPos}
                        destination={currentTracking.destination}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </section>
          )}

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

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
