import React, { useState, useEffect, useCallback } from 'react';

const Toast = ({ 
  type = 'info', 
  title, 
  message, 
  onClose, 
  onAction, 
  actionText,
  autoClose = true,
  duration = 4000 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300); // Wait for fade out animation
  }, [onClose]);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, handleClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200 text-green-800',
          icon: '✓',
          iconBg: 'bg-green-100'
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200 text-red-800',
          icon: '✕',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          container: 'bg-orange-50 border-orange-200 text-orange-800',
          icon: '⚠',
          iconBg: 'bg-orange-100'
        };
      case 'info':
      default:
        return {
          container: 'bg-blue-50 border-blue-200 text-blue-800',
          icon: 'ℹ',
          iconBg: 'bg-blue-100'
        };
    }
  };

  const styles = getTypeStyles();

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className={`
        border rounded-lg shadow-lg p-4
        ${styles.container}
      `}>
        <div className="flex items-start">
          {/* Icon */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mr-3
            ${styles.iconBg}
          `}>
            {styles.icon}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <p className="text-sm font-medium mb-1">
                {title}
              </p>
            )}
            {message && (
              <p className="text-sm opacity-90">
                {message}
              </p>
            )}
            
            {/* Action button */}
            {actionText && onAction && (
              <button
                onClick={onAction}
                className="mt-2 text-sm font-medium underline hover:no-underline focus:outline-none"
              >
                {actionText}
              </button>
            )}
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 ml-3 text-lg opacity-60 hover:opacity-80 focus:outline-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;