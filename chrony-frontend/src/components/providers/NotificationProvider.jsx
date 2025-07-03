import React, { useState, useCallback } from 'react';
import { NotificationContext } from '../../contexts/NotificationContext';
import Toast from '../common/Toast';

// NotificationProvider component - only exports this component
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  // Remove a notification by ID
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Add a basic notification
  const showNotification = useCallback((type, title, message, options = {}) => {
    const id = Date.now() + Math.random();
    const notification = {
      id,
      type,
      title,
      message,
      autoClose: options.autoClose !== false,
      duration: options.duration || 4000,
      actionText: options.actionText,
      onAction: options.onAction,
      onClose: () => removeNotification(id)
    };
    
    setNotifications(prev => [...prev, notification]);
    return id;
  }, [removeNotification]);

  // Convenience methods for different notification types
  const showSuccess = useCallback((title, message, options) => {
    return showNotification('success', title, message, options);
  }, [showNotification]);

  const showError = useCallback((title, message, options) => {
    return showNotification('error', title, message, options);
  }, [showNotification]);

  const showWarning = useCallback((title, message, options) => {
    return showNotification('warning', title, message, options);
  }, [showNotification]);

  const showInfo = useCallback((title, message, options) => {
    return showNotification('info', title, message, options);
  }, [showNotification]);

  // Special method for moved events notifications
  const showMovedEventsNotification = useCallback((movedEvents, message, onViewDetails) => {
    const count = movedEvents.length;
    const title = count === 1 ? 'Event Moved' : `${count} Events Moved`;
    const notificationMessage = message || `${count} event${count > 1 ? 's' : ''} ${count > 1 ? 'were' : 'was'} automatically rescheduled.`;
    
    return showNotification('info', title, notificationMessage, {
      autoClose: false,
      actionText: 'View Details',
      onAction: onViewDetails
    });
  }, [showNotification]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Context value
  const value = {
    notifications,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showMovedEventsNotification,
    clearAllNotifications,
    removeNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.map(notification => (
        <Toast key={notification.id} {...notification} />
      ))}
    </NotificationContext.Provider>
  );
};