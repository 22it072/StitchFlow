// frontend/src/components/weaving/StatusIndicator.jsx
import React from 'react';
import { Circle } from 'lucide-react';

const StatusIndicator = ({ status, size = 'sm', withLabel = false, animated = true }) => {
  const statusConfig = {
    Active: {
      color: 'bg-green-500',
      label: 'Active',
      ring: 'ring-green-200',
    },
    Idle: {
      color: 'bg-yellow-500',
      label: 'Idle',
      ring: 'ring-yellow-200',
    },
    Maintenance: {
      color: 'bg-blue-500',
      label: 'Maintenance',
      ring: 'ring-blue-200',
    },
    Breakdown: {
      color: 'bg-red-500',
      label: 'Breakdown',
      ring: 'ring-red-200',
    },
    InProgress: {
      color: 'bg-indigo-500',
      label: 'In Progress',
      ring: 'ring-indigo-200',
    },
    Completed: {
      color: 'bg-green-600',
      label: 'Completed',
      ring: 'ring-green-200',
    },
    Cancelled: {
      color: 'bg-gray-500',
      label: 'Cancelled',
      ring: 'ring-gray-200',
    },
    Scheduled: {
      color: 'bg-purple-500',
      label: 'Scheduled',
      ring: 'ring-purple-200',
    },
  };

  const config = statusConfig[status] || statusConfig.Idle;

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const ringClasses = {
    xs: 'ring-2',
    sm: 'ring-2',
    md: 'ring-4',
    lg: 'ring-4',
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center">
        <span
          className={`
            ${sizeClasses[size]}
            ${config.color}
            rounded-full
            ${animated ? 'animate-pulse' : ''}
            ${ringClasses[size]} ${config.ring} ring-opacity-30
          `}
        />
      </div>
      {withLabel && (
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
      )}
    </div>
  );
};

export default StatusIndicator;