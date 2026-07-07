import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible }) => {
  return (
    <div className={`toast ${isVisible ? 'active' : ''}`}>
      <div className="toast-content">
        {type === 'success' ? (
          <CheckCircle2 className="toast-icon" size={18} />
        ) : (
          <XCircle className="toast-icon error-icon" size={18} />
        )}
        <span className="toast-message">{message}</span>
      </div>
    </div>
  );
};
