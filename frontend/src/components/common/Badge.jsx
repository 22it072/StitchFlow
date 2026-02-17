// frontend/src/components/common/Badge.jsx (Enhanced)
import React from 'react';

const Badge = ({ 
  children, 
  variant = 'default', 
  size = 'md',
  icon: Icon,
  className = '' 
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border border-gray-200',
    primary: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    secondary: 'bg-purple-100 text-purple-800 border border-purple-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    danger: 'bg-red-100 text-red-800 border border-red-200',
    info: 'bg-blue-100 text-blue-800 border border-blue-200',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${variants[variant] || variants.default}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {Icon && <Icon className={`w-3 h-3 mr-1 ${size === 'sm' ? 'w-2.5 h-2.5' : ''}`} />}
      {children}
    </span>
  );
};

export default Badge;