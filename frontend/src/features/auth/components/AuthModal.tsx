import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Modal } from '../../../components/ui/Modal';
import { Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, register, verifyOtp } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'otp'>('login');
  
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
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('CUSTOMER');

  // OTP State
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (activeTab === 'otp') {
      setOtpValues(Array(6).fill(''));
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [activeTab]);

  const handleOtpChange = (value: string, index: number) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newOtp = [...otpValues];
      newOtp[index] = '';
      setOtpValues(newOtp);
      return;
    }

    const digit = cleanVal.slice(-1);
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    // Auto-focus next box
    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        const newOtp = [...otpValues];
        newOtp[index - 1] = '';
        setOtpValues(newOtp);
        otpInputRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else if (otpValues[index]) {
        const newOtp = [...otpValues];
        newOtp[index] = '';
        setOtpValues(newOtp);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^[0-9]{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpValues(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Password Visibility States
  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showRegConfirmPass, setShowRegConfirmPass] = useState(false);

  // Loading State
  const [isLoading, setIsLoading] = useState(false);

  // Validation Errors
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
  }>({});

  const [loginErrors, setLoginErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Status message
  const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const resetForm = () => {
    setActiveTab('login');
    setLoginUser('');
    setLoginPass('');
    setRegUsername('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirmPassword('');
    setRegPhone('');
    setRegRole('CUSTOMER');
    setOtpEmail('');
    setOtpValues(Array(6).fill(''));
    setErrors({});
    setLoginErrors({});
    setShowLoginPass(false);
    setShowRegPass(false);
    setShowRegConfirmPass(false);
    setIsLoading(false);
    setAlert(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateLoginForm = (): boolean => {
    const newErrors: typeof loginErrors = {};

    const trimmedUser = loginUser.trim();
    if (!trimmedUser) {
      newErrors.username = 'Tài khoản đăng nhập không được để trống';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[0-9]{9,15}$/;
      const isEmail = emailRegex.test(trimmedUser);
      const isPhone = phoneRegex.test(trimmedUser);

      if (!isEmail && !isPhone) {
        newErrors.username = 'Tài khoản đăng nhập phải là Email hoặc Số điện thoại hợp lệ';
      }
    }

    if (!loginPass) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (loginPass.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setLoginErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Username check
    if (!regUsername.trim()) {
      newErrors.username = 'Tên tài khoản không được để trống';
    } else if (regUsername.trim().length < 3) {
      newErrors.username = 'Tên tài khoản phải có ít nhất 3 ký tự';
    }

    // Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.trim()) {
      newErrors.email = 'Email không được để trống';
    } else if (!emailRegex.test(regEmail.trim())) {
      newErrors.email = 'Email không đúng định dạng (VD: name@domain.com)';
    }

    // Password check
    if (!regPassword) {
      newErrors.password = 'Mật khẩu không được để trống';
    } else if (regPassword.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    // Confirm Password check
    if (regPassword !== regConfirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp';
    }

    // Phone check (optional)
    if (regPhone.trim()) {
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(regPhone.trim())) {
        newErrors.phone = 'Số điện thoại phải từ 10 đến 11 số';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);
    setLoginErrors({});

    if (!validateLoginForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginUser, loginPass);
      if (result.success) {
        onSuccess(result.message);
        handleClose();
      } else {
        setAlert({ message: result.message, type: 'error' });
      }
    } catch (err) {
      setAlert({ message: 'Có lỗi kết nối xảy ra. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        phone: regPhone || undefined,
        roleCode: regRole,
      });

      if (result.success) {
        setOtpEmail(regEmail);
        setAlert({ message: 'Đăng ký tài khoản thành công! Mã OTP đã được gửi đến email của bạn.', type: 'success' });
        
        // Clear register form (except email which is already copied to otpEmail)
        setRegUsername('');
        setRegEmail('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegPhone('');
        setRegRole('CUSTOMER');
        setErrors({});

        setTimeout(() => {
          setActiveTab('otp');
          setAlert(null);
        }, 1500);
      } else {
        let errorMsg = result.message;
        if (result.errors && result.errors.length > 0) {
          errorMsg += ': ' + result.errors.map((err: any) => `${err.field} (${err.constraints.join(', ')})`).join('; ');
        }
        setAlert({ message: errorMsg, type: 'error' });
      }
    } catch (err) {
      setAlert({ message: 'Có lỗi kết nối xảy ra. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      setAlert({ message: 'Mã OTP phải có độ dài đúng 6 chữ số', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOtp(otpEmail, otpCode);
      if (result.success) {
        onSuccess(result.message);
        handleClose();
      } else {
        setAlert({ message: result.message, type: 'error' });
      }
    } catch (err) {
      setAlert({ message: 'Có lỗi kết nối xảy ra. Vui lòng thử lại.', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      {/* Tabs */}
      {activeTab !== 'otp' && (
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setAlert(null); }}
          >
            ĐĂNG NHẬP
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => { setActiveTab('register'); setAlert(null); }}
          >
            ĐĂNG KÝ
          </button>
        </div>
      )}
      {activeTab === 'otp' && (
        <div className="p-4 text-center border-b border-gray-100 bg-[#bc0100]/5">
          <h3 className="text-sm font-bold text-[#bc0100] tracking-wider uppercase">Xác Thực Tài Khoản</h3>
          <p className="text-[11px] text-gray-500 mt-1">Một mã xác thực gồm 6 số đã được gửi đến email của bạn</p>
        </div>
      )}

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
                <label htmlFor="login-username">Tài khoản đăng nhập (Email / SĐT)</label>
                <input 
                  type="text" 
                  id="login-username" 
                  className="form-input"
                  required 
                  placeholder="Nhập Email hoặc Số điện thoại đăng nhập..."
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  disabled={isLoading}
                />
                {loginErrors.username && <div className="form-error">{loginErrors.username}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="login-password">Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showLoginPass ? 'text' : 'password'} 
                    id="login-password" 
                    className="form-input"
                    required 
                    placeholder="Nhập mật khẩu..."
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    disabled={isLoading}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass(!showLoginPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showLoginPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {loginErrors.password && <div className="form-error">{loginErrors.password}</div>}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary auth-submit-btn" 
                disabled={isLoading}
              >
                {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP HỆ THỐNG'}
              </button>
              <p className="auth-footer-text">
                Chưa có tài khoản?{' '}
                <span onClick={() => { setActiveTab('register'); setAlert(null); }}>
                  Đăng ký tại đây
                </span>
              </p>
            </form>
          )}

          {/* Register Form */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="auth-form-wrapper">
              <div className="form-group">
                <label htmlFor="reg-username">Tên tài khoản</label>
                <input 
                  type="text" 
                  id="reg-username" 
                  className="form-input"
                  required 
                  placeholder="Ví dụ: hungpp"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  disabled={isLoading}
                />
                {errors.username && <div className="form-error">{errors.username}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-email">Email</label>
                <input 
                  type="email" 
                  id="reg-email" 
                  className="form-input"
                  required 
                  placeholder="Ví dụ: hung@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={isLoading}
                />
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-password">Mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showRegPass ? 'text' : 'password'} 
                    id="reg-password" 
                    className="form-input"
                    required 
                    placeholder="Tối thiểu 6 ký tự..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={isLoading}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPass(!showRegPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showRegPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-confirm-password">Xác nhận mật khẩu</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showRegConfirmPass ? 'text' : 'password'} 
                    id="reg-confirm-password" 
                    className="form-input"
                    required 
                    placeholder="Nhập lại mật khẩu..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPass(!showRegConfirmPass)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--color-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 0,
                    }}
                  >
                    {showRegConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="reg-phone">Số điện thoại (Không bắt buộc)</label>
                <input 
                  type="text" 
                  id="reg-phone" 
                  className="form-input"
                  placeholder="Ví dụ: 0912345678"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  disabled={isLoading}
                />
                {errors.phone && <div className="form-error">{errors.phone}</div>}
              </div>
              <button 
                type="submit" 
                className="btn btn-primary auth-submit-btn" 
                disabled={isLoading}
              >
                {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG KÝ TÀI KHOẢN'}
              </button>
              <p className="auth-footer-text">
                Đã có tài khoản?{' '}
                <span onClick={() => { setActiveTab('login'); setAlert(null); }}>
                  Đăng nhập tại đây
                </span>
              </p>
            </form>
          )}

          {/* OTP Verification Form */}
          {activeTab === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="auth-form-wrapper">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-secondary)' }}>
                  Email nhận mã: <strong style={{ color: 'var(--color-text-primary)' }}>{otpEmail}</strong>
                </span>
              </div>
              <div className="form-group">
                <label style={{ textAlign: 'center', display: 'block', fontWeight: 'bold', fontSize: '11px', color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  MÃ XÁC THỰC OTP (6 SỐ)
                </label>
                
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px', marginBottom: '8px' }}>
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      onPaste={handleOtpPaste}
                      disabled={isLoading}
                      style={{
                        width: '42px',
                        height: '46px',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '6px',
                        outline: 'none',
                        transition: 'all 0.15s ease-in-out',
                        color: '#bc0100',
                        backgroundColor: '#f8fafc',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#bc0100';
                        e.target.style.backgroundColor = '#ffffff';
                        e.target.style.boxShadow = '0 0 0 3px rgba(188, 1, 0, 0.15)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.backgroundColor = '#f8fafc';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  ))}
                </div>
              </div>
              <button 
                type="submit" 
                className="btn btn-primary auth-submit-btn" 
                disabled={isLoading}
                style={{ marginTop: '8px' }}
              >
                {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN KÍCH HOẠT'}
              </button>
              <p className="auth-footer-text">
                Không nhận được mã hoặc nhập sai email?{' '}
                <span onClick={() => { setActiveTab('register'); setAlert(null); }}>
                  Quay lại đăng ký
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
