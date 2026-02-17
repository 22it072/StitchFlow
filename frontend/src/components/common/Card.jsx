// frontend/src/components/common/Card.jsx (Enhanced)
import React from 'react';

const Card = ({ 
  children, 
  className = '', 
  hover = false, 
  padding = 'p-6',
  gradient = false,
  onClick
}) => {
  const baseClasses = 'bg-white rounded-2xl shadow-sm border border-gray-100 transition-all duration-200';
  
  const hoverClasses = hover 
    ? 'hover:shadow-lg hover:border-indigo-200 hover:scale-[1.02] cursor-pointer' 
    : '';
    
  const gradientClasses = gradient
    ? 'bg-gradient-to-br from-gray-50 to-white'
    : '';

  return (
    <div
      className={`
        ${baseClasses}
        ${padding}
        ${hoverClasses}
        ${gradientClasses}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;