import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  isVisible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, type, isVisible }) => {
  return (
    <div className={`toast ${isVisible ? 'visible active' : ''} ${type === 'success' ? 'toast-success' : 'toast-error'}`}>
      <div className="toast-content flex items-center gap-2.5">
        {type === 'success' ? (
          <CheckCircle2 className="toast-icon text-emerald-400 shrink-0" size={18} />
        ) : (
          <XCircle className="toast-icon text-rose-400 shrink-0" size={18} />
        )}
        <span className="toast-message font-medium text-sm">{message}</span>
      </div>
    </div>
  );
};
