import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { TimelineStepper } from './features/tracking/components/TimelineStepper';
import { MapcnMap } from './features/tracking/components/MapcnMap';
import { ServicesGrid } from './features/pricing/components/ServicesGrid';
import { PricingCalculator } from './features/pricing/components/PricingCalculator';
import { AdminDashboard } from './features/dashboard/components/AdminDashboard';
import { Toast } from './components/ui/Toast';
import { TRACKING_DATABASE } from './features/tracking/services/mockDb';
import { Search, Earth } from 'lucide-react';
import { Header } from './components/Header';
import { CONFIG } from './config';
import { io as socketIoClient } from 'socket.io-client';

const formatMockTimeline = (timestamps: any) => {
  if (Array.isArray(timestamps)) return timestamps;
  if (!timestamps) return [];
  return [
    { status: 'CREATED', title: 'ĐÃ TẠO ĐƠN HÀNG', subtitle: 'Khách hàng tạo đơn trên hệ thống', timestamp: timestamps.created || '-', isCompleted: true },
    { status: 'IN_FACILITY', title: 'ĐÃ NHẬP KHO GOM', subtitle: 'Đã lưu kho bưu cục xuất phát', timestamp: timestamps.hub || '-', isCompleted: timestamps.hub !== '-' },
    { status: 'IN_TRANSIT', title: 'ĐANG TRUNG CHUYỂN GIỮA KHO', subtitle: 'Đơn hàng trên đường di chuyển đến bưu cục giao', timestamp: timestamps.transit || '-', isCompleted: timestamps.transit !== '-' },
    { status: 'OUT_FOR_DELIVERY', title: 'SHIPPER ĐANG GIAO HÀNG (XE MÁY 🏍️)', subtitle: 'Shipper đang chở sọt hàng đi giao', timestamp: timestamps.out || '-', isCompleted: timestamps.out !== '-' },
    { status: 'DELIVERED', title: 'GIAO HÀNG THÀNH CÔNG', subtitle: 'Đã bàn giao cho người nhận', timestamp: timestamps.delivered || '-', isCompleted: timestamps.delivered !== '-' },
  ];
};

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

          {/* Tracking Results Area */}
          {currentTracking && (
            <section className="tracking-results-section" id="tracking-results">
              <div className="container">
                <div className="results-grid">

                  {/* Timeline Stepper Card */}
                  <div className="card timeline-card">
                    <div className="card-header flex justify-between items-start border-b pb-3 mb-2">
                      <div className="flex flex-col gap-1">
                        <span className="inline-block bg-red-100 text-[#bc0100] px-2.5 py-1 rounded font-extrabold text-[11px] uppercase tracking-wider w-fit">
                          {currentTracking.statusLabel || currentTracking.status}
                        </span>
                        <h3 className="card-title font-mono text-base font-extrabold text-slate-800 mt-1">{currentTracking.code}</h3>
                        {currentTracking.driverName && (
                          <div className="text-xs text-slate-500 font-medium">
                            🏍️ Shipper phụ trách: <strong className="text-slate-800">{currentTracking.driverName}</strong> ({currentTracking.vehiclePlate || 'Xe máy'})
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-bold">Thời gian giao dự kiến</span>
                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 mt-0.5 inline-block">{currentTracking.eta}</span>
                      </div>
                    </div>

                    <div className="card-body">
                      <TimelineStepper
                        status={currentTracking.status}
                        timestamps={currentTracking.timeline ? currentTracking.timeline.map((t: any) => ({
                          status: t.status,
                          label: t.title,
                          time: t.timestamp,
                          completed: t.isCompleted,
                          detail: t.subtitle,
                        })) : currentTracking.timestamps || []}
                      />
                    </div>
                  </div>

                  {/* Geospatial Map with Real-time Motorbike GPS Marker */}
                  <div className="card map-card">
                    <div className="card-header flex justify-between items-center">
                      <h3 className="card-title flex items-center gap-2">
                        <Earth className="map-icon" size={18} style={{ color: 'var(--color-primary)' }} />
                        <span>{currentTracking.status === 'OUT_FOR_DELIVERY' ? 'Định vị trực tiếp Shipper Xe Máy 🏍️' : 'Định vị vị trí Bưu cục & Người nhận 🏢'}</span>
                      </h3>
                      {liveDriverPos && currentTracking.status === 'OUT_FOR_DELIVERY' && (
                        <span className="map-coordinates font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                          GPS: {liveDriverPos[0].toFixed(5)}, {liveDriverPos[1].toFixed(5)}
                        </span>
                      )}
                    </div>
                    <div className="card-body map-body">
                      <MapcnMap
                        route={currentTracking.route}
                        currentPos={liveDriverPos || [currentTracking.coordinates?.currentDriver?.lat || 10.824, currentTracking.coordinates?.currentDriver?.lng || 106.759]}
                        destination={currentTracking.receiverAddress || currentTracking.destination || 'Điểm giao hàng'}
                        receiverPos={currentTracking.coordinates?.receiver ? [currentTracking.coordinates.receiver.lat, currentTracking.coordinates.receiver.lng] : undefined}
                        facilityPos={currentTracking.coordinates?.currentFacility ? [currentTracking.coordinates.currentFacility.lat, currentTracking.coordinates.currentFacility.lng] : undefined}
                        facilityName={currentTracking.destinationFacilityName || currentTracking.originFacilityName || 'Bưu cục Phước Long'}
                        shipperName={currentTracking.driverName}
                        vehiclePlate={currentTracking.vehiclePlate}
                        statusLabel={currentTracking.statusLabel}
                        isOutForDelivery={currentTracking.status === 'OUT_FOR_DELIVERY'}
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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
