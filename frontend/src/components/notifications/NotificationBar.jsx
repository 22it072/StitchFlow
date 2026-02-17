import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Check,
  Save,
  Trash2,
  Layers,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { formatRelativeTime } from '../../utils/formatters';

const NotificationBar = () => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [latestNotification, setLatestNotification] = useState(null);

  // Show banner for latest unread notification - SINGLE NOTIFICATION ONLY
  useEffect(() => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length > 0) {
      const latest = unreadNotifications[0];
      // Only show new notifications, prevent duplicates
      if (latest.id !== latestNotification?.id) {
        setLatestNotification(latest);
        setShowBanner(true);
        
        // Auto-hide banner after duration
        const timer = setTimeout(() => {
          setShowBanner(false);
        }, latest.duration || 5000);
        
        return () => clearTimeout(timer);
      }
    } else {
      // Hide banner when no unread notifications
      setShowBanner(false);
      setLatestNotification(null);
    }
  }, [notifications, latestNotification]);

  const getIcon = (iconType, color) => {
    const colorClasses = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      red: 'text-red-500',
      purple: 'text-purple-500',
      yellow: 'text-yellow-500',
    };

    const iconClass = `w-5 h-5 ${colorClasses[color] || 'text-gray-500'}`;

    switch (iconType) {
      case 'save':
        return <Save className={iconClass} />;
      case 'check':
        return <CheckCircle className={iconClass} />;
      case 'trash':
        return <Trash2 className={iconClass} />;
      case 'layers':
        return <Layers className={iconClass} />;
      case 'alert':
        return <AlertCircle className={iconClass} />;
      case 'info':
        return <Info className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getBgColor = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200',
      green: 'bg-green-50 border-green-200',
      red: 'bg-red-50 border-red-200',
      purple: 'bg-purple-50 border-purple-200',
      yellow: 'bg-yellow-50 border-yellow-200',
    };
    return colors[color] || 'bg-gray-50 border-gray-200';
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    if (latestNotification) {
      markAsRead(latestNotification.id);
      setLatestNotification(null);
    }
  };

  return (
    <>
      {/* Floating Banner for Latest Notification - SINGLE DISPLAY */}
      {showBanner && latestNotification && (
        <div className="fixed top-4 right-4 left-4 md:left-auto md:w-96 z-50 animate-slide-down">
          <div
            className={`
              ${getBgColor(latestNotification.color)}
              border rounded-xl shadow-lg p-4
              transform transition-all duration-300
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(latestNotification.icon, latestNotification.color)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {latestNotification.title}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  {latestNotification.message}
                </p>
                <p className="text-xs text-gray-400 mt-1 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  {formatRelativeTime(latestNotification.timestamp)}
                </p>
              </div>
              <button
                onClick={handleDismissBanner}
                className="flex-shrink-0 p-1 hover:bg-white/50 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Bell in Header */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-600" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 animate-fade-in">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-indigo-100 text-indigo-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAll}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`
                          px-4 py-3 cursor-pointer transition-colors
                          ${notification.read ? 'bg-white' : 'bg-indigo-50/50'}
                          hover:bg-gray-50
                        `}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`
                            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                            ${notification.read ? 'bg-gray-100' : getBgColor(notification.color)}
                          `}>
                            {getIcon(notification.icon, notification.read ? 'gray' : notification.color)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(notification.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                              >
                                <X className="w-3 h-3 text-gray-400" />
                              </button>
                            </div>
                            <p className={`text-sm ${notification.read ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {formatRelativeTime(notification.timestamp)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="flex-shrink-0 w-2 h-2 bg-indigo-500 rounded-full mt-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Bell className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No notifications yet</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 5 && (
                <div className="px-4 py-3 border-t border-gray-100 text-center">
                  <button className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center justify-center w-full">
                    View all notifications
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default NotificationBar;