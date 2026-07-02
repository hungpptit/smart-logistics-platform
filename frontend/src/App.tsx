import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { TimelineStepper } from './features/tracking/components/TimelineStepper';
import { MapcnMap } from './features/tracking/components/MapcnMap';
import { ServicesGrid } from './components/ServicesGrid';
import { Toast } from './components/Toast';
import { TRACKING_DATABASE } from './features/tracking/services/mockDb';
import type { TrackingData } from './features/tracking/types';
import { Truck, LogOut, User as UserIcon, Search, Earth } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  
  // Modals & Popups State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isToastVisible, setIsToastVisible] = useState(false);

  // Tracking Engine State
  const [trackingCode, setTrackingCode] = useState('TRK-10029381');
  const [currentTracking, setCurrentTracking] = useState<TrackingData | null>(TRACKING_DATABASE['TRK-10029381']);

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

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#" className="brand-logo">
            <Truck className="logo-icon" size={24} style={{ color: 'var(--color-primary)' }} />
            <span>SMART</span><span className="logo-red">LOGISTICS</span>
          </a>
          <ul className="nav-menu">
            <li><a href="#tracking" className="nav-link active">Tra Cứu</a></li>
            <li><a href="#services" className="nav-link" style={{ textDecoration: 'none', color: 'var(--color-secondary)', fontWeight: 700 }}>Dịch Vụ</a></li>
            {user && (
              <li><a href="#dashboard" className="nav-link" style={{ textDecoration: 'none', color: 'var(--color-secondary)', fontWeight: 700 }}>Bảng Điều Khiển</a></li>
            )}
          </ul>
          
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
      </nav>

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

      {/* User / Developer Dashboard Panel */}
      {user && (
        <section className="dashboard-section" id="dashboard">
          <div className="container">
            <div className="section-header">
              <h2 className="section-title">Bảng Điều Khiển Nhà Phát Triển</h2>
              <p className="section-subtitle">Quản lý vận đơn và kiểm tra chi tiết vai trò/quyền hạn được cấp từ cơ sở dữ liệu local.</p>
            </div>

            <div className="dashboard-grid">
              {/* Profile Card */}
              <div className="card profile-card">
                <div className="card-header">
                  <h3 className="card-title">Thông tin tài khoản</h3>
                </div>
                <div className="card-body">
                  <div className="profile-header-info">
                    <div className="profile-avatar">
                      <UserIcon size={48} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div>
                      <h4>{user.username}</h4>
                      <p>{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="profile-meta-list">
                    <div className="meta-item">
                      <span className="meta-label">ID Người dùng:</span>
                      <span className="meta-value code-font">{user.id}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Vai trò:</span>
                      <div className="roles-container">
                        {user.roles.map((role) => (
                          <span key={role} className="badge-role">{role}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h4 className="sub-section-title">Quyền hạn (Danh sách RBAC)</h4>
                  <div className="permissions-list">
                    {user.permissions.length === 0 ? (
                      <span className="permission-tag">Không có quyền trực tiếp</span>
                    ) : (
                      user.permissions.map((perm) => (
                        <span key={perm} className="permission-tag">{perm}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Shipments list */}
              <div className="card table-card">
                <div className="card-header">
                  <h3 className="card-title">Đơn Hàng Của Tôi</h3>
                  <span className="table-meta">Hiện có 3 đơn hàng</span>
                </div>
                <div className="card-body no-padding">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mã Vận Đơn</th>
                          <th>Gói Dịch Vụ</th>
                          <th>Điểm Đến</th>
                          <th>Trạng Thái</th>
                          <th>Hành Động</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="code-font font-bold">TRK-10029381</td>
                          <td>Giao hàng Hỏa tốc</td>
                          <td>Quận 1, TP. HCM</td>
                          <td><span className="chip chip-transit">ĐANG VẬN CHUYỂN</span></td>
                          <td>
                            <button className="btn btn-secondary btn-xs" onClick={() => handleTableTrack('TRK-10029381')}>
                              Tra cứu
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="code-font font-bold">TRK-20938472</td>
                          <td>Giao hàng Tiêu chuẩn</td>
                          <td>Thủ Đức, TP. HCM</td>
                          <td><span className="chip chip-delivered" style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--status-delivered-bg)', color: 'var(--status-delivered-text)' }}>ĐÃ GIAO HÀNG</span></td>
                          <td>
                            <button className="btn btn-secondary btn-xs" onClick={() => handleTableTrack('TRK-20938472')}>
                              Tra cứu
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="code-font font-bold">TRK-49382012</td>
                          <td>Vận chuyển Đông lạnh</td>
                          <td>Quận 7, TP. HCM</td>
                          <td><span className="chip chip-created" style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--status-created-bg)', color: 'var(--status-created-text)' }}>ĐÃ TẠO ĐƠN</span></td>
                          <td>
                            <button className="btn btn-secondary btn-xs" onClick={() => triggerToast('Đơn hàng chạy thử TRK-49382012 chưa được cấu hình tọa độ GPS.', 'error')}>
                              Tra cứu
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Services offerings */}
      <ServicesGrid />

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
