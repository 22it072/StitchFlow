import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    setUnreadCount(prev => prev + 1);

    // Auto-dismiss after duration if specified
    if (notification.autoDismiss !== false) {
      setTimeout(() => {
        markAsRead(id);
      }, notification.duration || 5000);
    }

    return id;
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id);
      if (notification && !notification.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Notification types
  const notifyAutoSave = useCallback((qualityName) => {
    return addNotification({
      type: 'auto-save',
      title: 'Draft Auto-Saved',
      message: qualityName 
        ? `Draft "${qualityName}" saved automatically`
        : 'Your draft has been saved automatically',
      icon: 'save',
      color: 'blue',
      autoDismiss: true,
      duration: 3000,
    });
  }, [addNotification]);

  const notifyEstimateSaved = useCallback((qualityName, isUpdate = false) => {
    return addNotification({
      type: 'estimate-saved',
      title: isUpdate ? 'Estimate Updated' : 'Estimate Saved',
      message: `"${qualityName}" has been ${isUpdate ? 'updated' : 'saved'} successfully`,
      icon: 'check',
      color: 'green',
      autoDismiss: true,
      duration: 5000,
    });
  }, [addNotification]);

  const notifyEstimateDeleted = useCallback((qualityName) => {
    return addNotification({
      type: 'estimate-deleted',
      title: 'Estimate Deleted',
      message: `"${qualityName}" has been deleted`,
      icon: 'trash',
      color: 'red',
      autoDismiss: true,
      duration: 4000,
    });
  }, [addNotification]);

  const notifyYarnSaved = useCallback((yarnName, isUpdate = false) => {
    return addNotification({
      type: 'yarn-saved',
      title: isUpdate ? 'Yarn Updated' : 'Yarn Added',
      message: `"${yarnName}" has been ${isUpdate ? 'updated' : 'added'} to your library`,
      icon: 'layers',
      color: 'purple',
      autoDismiss: true,
      duration: 4000,
    });
  }, [addNotification]);

  const notifyError = useCallback((message, title = 'Error') => {
    return addNotification({
      type: 'error',
      title,
      message,
      icon: 'alert',
      color: 'red',
      autoDismiss: true,
      duration: 6000,
    });
  }, [addNotification]);

  const notifySuccess = useCallback((message, title = 'Success') => {
    return addNotification({
      type: 'success',
      title,
      message,
      icon: 'check',
      color: 'green',
      autoDismiss: true,
      duration: 4000,
    });
  }, [addNotification]);

  const notifyInfo = useCallback((message, title = 'Info') => {
    return addNotification({
      type: 'info',
      title,
      message,
      icon: 'info',
      color: 'blue',
      autoDismiss: true,
      duration: 4000,
    });
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        // Specific notification functions
        notifyAutoSave,
        notifyEstimateSaved,
        notifyEstimateDeleted,
        notifyYarnSaved,
        notifyError,
        notifySuccess,
        notifyInfo,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};