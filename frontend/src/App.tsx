import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './features/auth/components/AuthModal';
import { TimelineStepper } from './features/tracking/components/TimelineStepper';
import { LeafletMap } from './features/tracking/components/LeafletMap';
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
      triggerToast(`Tracking code ${code} not found!`, 'error');
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
            <span>VELOCITY</span><span className="logo-red">LOGISTICS</span>
          </a>
          <ul className="nav-menu">
            <li><a href="#tracking" className="nav-link active">Track</a></li>
            <li><a href="#services" className="nav-link" style={{ textDecoration: 'none', color: 'var(--color-secondary)', fontWeight: 700 }}>Services</a></li>
            {user && (
              <li><a href="#dashboard" className="nav-link" style={{ textDecoration: 'none', color: 'var(--color-secondary)', fontWeight: 700 }}>Dashboard</a></li>
            )}
          </ul>
          
          <div className="nav-auth">
            {!user ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setIsAuthOpen(true)}>
                <UserIcon size={14} /> SIGN IN
              </button>
            ) : (
              <div className="nav-user">
                <span className="user-welcome">Hi, <strong>{user.username}</strong></span>
                <button className="btn btn-secondary btn-sm" onClick={() => { logout(); triggerToast('Logged out successfully', 'success'); }}>
                  <LogOut size={14} /> LOG OUT
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero & Tracking Input Section */}
      <section className="hero-section" id="tracking">
        <div className="hero-container">
          <span className="badge">PRECISION FLEET NETWORK</span>
          <h1 className="hero-title">Track & Trace Your Shipment</h1>
          <p className="hero-subtitle">Real-time tracking, dispatch status, and route visualization for enterprise supply chains.</p>
          
          <div className="tracking-box-container">
            <div className="tracking-search-bar">
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Enter tracking code (e.g., TRK-10029381)..."
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button className="btn btn-primary" onClick={handleTrackSubmit}>TRACK NOW</button>
            </div>
            <p className="search-tip">
              Demo tracking codes:{' '}
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
                    <span className="eta-label">Estimated Delivery</span>
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
                    Route & Live Location
                  </h3>
                  <span className="map-coordinates">
                    {currentTracking.currentPos[0].toFixed(6)}, {currentTracking.currentPos[1].toFixed(6)}
                  </span>
                </div>
                <div className="card-body map-body">
                  <LeafletMap 
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
              <h2 className="section-title">Developer Dashboard</h2>
              <p className="section-subtitle">Manage shipments and inspect roles/permissions issued by the local database.</p>
            </div>

            <div className="dashboard-grid">
              {/* Profile Card */}
              <div className="card profile-card">
                <div className="card-header">
                  <h3 className="card-title">User Account Info</h3>
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
                      <span className="meta-label">User ID:</span>
                      <span className="meta-value code-font">{user.id}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Roles:</span>
                      <div className="roles-container">
                        {user.roles.map((role) => (
                          <span key={role} className="badge-role">{role}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <h4 className="sub-section-title">Permissions (RBAC List)</h4>
                  <div className="permissions-list">
                    {user.permissions.length === 0 ? (
                      <span className="permission-tag">No direct permissions</span>
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
                  <h3 className="card-title">My Tracked Shipments</h3>
                  <span className="table-meta">3 Shipments Available</span>
                </div>
                <div className="card-body no-padding">
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Tracking Code</th>
                          <th>Service Type</th>
                          <th>Destination</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="code-font font-bold">TRK-10029381</td>
                          <td>Express Air Delivery</td>
                          <td>Quận 1, HCMC</td>
                          <td><span className="chip chip-transit">IN TRANSIT</span></td>
                          <td>
                            <button className="btn btn-secondary btn-xs" onClick={() => handleTableTrack('TRK-10029381')}>
                              Track
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="code-font font-bold">TRK-20938472</td>
                          <td>Standard Logistics</td>
                          <td>Thủ Đức, HCMC</td>
                          <td><span className="chip chip-delivered" style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--status-delivered-bg)', color: 'var(--status-delivered-text)' }}>DELIVERED</span></td>
                          <td>
                            <button className="btn btn-secondary btn-xs" onClick={() => handleTableTrack('TRK-20938472')}>
                              Track
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td className="code-font font-bold">TRK-49382012</td>
                          <td>Cold Chain Delivery</td>
                          <td>Quận 7, HCMC</td>
                          <td><span className="chip chip-created" style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', backgroundColor: 'var(--status-created-bg)', color: 'var(--status-created-text)' }}>CREATED</span></td>
                          <td>
                            <button className="btn btn-secondary btn-xs" onClick={() => triggerToast('Mock code TRK-49382012 has no map coordinates set.', 'error')}>
                              Track
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
          <p>&copy; 2026 Velocity Logistics. Designed under international enterprise standards. Powered by PostGIS & Redis.</p>
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
