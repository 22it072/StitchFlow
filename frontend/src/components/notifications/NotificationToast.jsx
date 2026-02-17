import React from 'react';
import {
  Save,
  Check,
  Trash2,
  Layers,
  AlertCircle,
  Info,
  CheckCircle,
  X,
} from 'lucide-react';

const NotificationToast = ({ notification, onClose }) => {
  const getIcon = (iconType) => {
    const iconClass = 'w-5 h-5';
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
        return <Check className={iconClass} />;
    }
  };

  const colorStyles = {
    blue: {
      bg: 'bg-blue-500',
      icon: 'bg-blue-600',
      text: 'text-white',
    },
    green: {
      bg: 'bg-green-500',
      icon: 'bg-green-600',
      text: 'text-white',
    },
    red: {
      bg: 'bg-red-500',
      icon: 'bg-red-600',
      text: 'text-white',
    },
    purple: {
      bg: 'bg-purple-500',
      icon: 'bg-purple-600',
      text: 'text-white',
    },
    yellow: {
      bg: 'bg-yellow-500',
      icon: 'bg-yellow-600',
      text: 'text-white',
    },
  };

  const styles = colorStyles[notification.color] || colorStyles.blue;

  return (
    <div
      className={`
        ${styles.bg} ${styles.text}
        rounded-xl shadow-lg p-4 min-w-[320px] max-w-md
        transform transition-all duration-300 animate-slide-in-right
      `}
    >
      <div className="flex items-center space-x-3">
        <div className={`${styles.icon} p-2 rounded-lg`}>
          {getIcon(notification.icon)}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{notification.title}</p>
          <p className="text-sm opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={() => onClose(notification.id)}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;