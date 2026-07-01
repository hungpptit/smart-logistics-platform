import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Modal } from '../../../components/Modal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    if (!isOpen) {
      setHeight('auto');
      return;
    }
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const observedHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
          setHeight(observedHeight);
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isOpen]);
  
  // Login Form State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Register Form State
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('CUSTOMER');

  // Status message
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setLoginUser('');
    setLoginPass('');
    setRegUsername('');
    setRegEmail('');
    setRegPassword('');
    setRegPhone('');
    setRegRole('CUSTOMER');
    setAlert(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const result = await login(loginUser, loginPass);
    if (result.success) {
      onSuccess(result.message);
      handleClose();
    } else {
      setAlert({ message: result.message, type: 'error' });
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const result = await register({
      username: regUsername,
      email: regEmail,
      password: regPassword,
      phone: regPhone || undefined,
      roleCode: regRole,
    });

    if (result.success) {
      setAlert({ message: 'Registration successful! You can now sign in.', type: 'success' });
      setTimeout(() => {
        setActiveTab('login');
        setLoginUser(regUsername);
        setAlert(null);
      }, 1500);
      
      // Clear register form
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegPhone('');
      setRegRole('CUSTOMER');
    } else {
      let errorMsg = result.message;
      if (result.errors && result.errors.length > 0) {
        errorMsg += ': ' + result.errors.map((err: any) => `${err.field} (${err.constraints.join(', ')})`).join('; ');
      }
      setAlert({ message: errorMsg, type: 'error' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Tabs */}
      <div className="auth-tabs">
        <button 
          type="button"
          className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => { setActiveTab('login'); setAlert(null); }}
        >
          SIGN IN
        </button>
        <button 
          type="button"
          className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => { setActiveTab('register'); setAlert(null); }}
        >
          REGISTER
        </button>
      </div>

      <div 
        style={{ 
          height: typeof height === 'number' ? `${height}px` : 'auto', 
          transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)', 
          overflow: 'hidden' 
        }}
      >
        <div ref={containerRef}>
          {/* Login Form */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="auth-form-wrapper">
              <div className="form-group">
                <label htmlFor="login-username">Username or Email</label>
                <input 
                  type="text" 
                  id="login-username" 
                  className="form-input"
                  required 
                  placeholder="Enter username or email..."
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input 
                  type="password" 
                  id="login-password" 
                  className="form-input"
                  required 
                  placeholder="Enter password..."
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary auth-submit-btn">SIGN IN TO ACCOUNT</button>
              <p className="auth-footer-text">
                Don't have an account?{' '}
                <span onClick={() => { setActiveTab('register'); setAlert(null); }}>
                  Register here
                </span>
              </p>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="auth-form-wrapper">
              <div className="form-group">
                <label htmlFor="reg-username">Username</label>
                <input 
                  type="text" 
                  id="reg-username" 
                  className="form-input"
                  required 
                  placeholder="e.g. hungpp"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input 
                  type="email" 
                  id="reg-email" 
                  className="form-input"
                  required 
                  placeholder="e.g. hung@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-password">Password</label>
                <input 
                  type="password" 
                  id="reg-password" 
                  className="form-input"
                  required 
                  placeholder="Minimum 6 characters..."
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="reg-phone">Phone Number (Optional)</label>
                <input 
                  type="text" 
                  id="reg-phone" 
                  className="form-input"
                  placeholder="e.g. 0912345678"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-primary auth-submit-btn">CREATE ACCOUNT</button>
              <p className="auth-footer-text">
                Already have an account?{' '}
                <span onClick={() => { setActiveTab('login'); setAlert(null); }}>
                  Sign in here
                </span>
              </p>
            </form>
          )}

          {/* Alert Banner */}
          {alert && (
            <div className={`alert-banner alert-${alert.type}`} style={{ marginTop: '16px' }}>
              {alert.message}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
