import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    
    // Auto-hide after duration
    const hideTimer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
    }, toast.duration || 4000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  const getTypeClass = () => {
    switch (toast.type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'warning': return 'toast-warning';
      case 'info': return 'toast-info';
      default: return 'toast-info';
    }
  };

  return (
    <div 
      className={`toast ${getTypeClass()} ${isVisible ? 'toast-visible' : ''} ${isLeaving ? 'toast-leaving' : ''}`}
      onClick={() => {
        setIsLeaving(true);
        setTimeout(() => onRemove(toast.id), 300);
      }}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{toast.message}</span>
      <button 
        className="toast-close"
        onClick={(e) => {
          e.stopPropagation();
          setIsLeaving(true);
          setTimeout(() => onRemove(toast.id), 300);
        }}
      >
        ×
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};

export default Toast;