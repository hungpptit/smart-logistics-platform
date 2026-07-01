import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 w-full h-full bg-slate-900/70 flex items-center justify-center z-50 transition-opacity duration-300"
      style={{
        backgroundColor: 'rgba(22, 29, 37, 0.7)',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-[450px] p-8 relative transform transition-transform duration-300"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '0.5rem',
          boxShadow: '0 8px 30px rgba(22, 29, 37, 0.1)',
          width: '100%',
          maxWidth: '450px',
          padding: '32px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="modal-close-btn"
          style={{
            position: 'absolute',
            right: '16px',
            top: '16px',
            background: 'rgba(22, 29, 37, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#585f68',
            cursor: 'pointer',
            zIndex: 10,
          }}
          aria-label="Close modal"
        >
          <X size={16} />
        </button>
        {title && <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
};
