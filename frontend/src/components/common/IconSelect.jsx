import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const IconSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  required = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange({ target: { name, value: option.value } });
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full px-4 py-3 rounded-xl text-left
          bg-white border transition-all duration-200
          focus:outline-none
          ${error ? 'border-red-300' : 'border-gray-200'}
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between">
          {selectedOption ? (
            <div className="flex items-center space-x-3">
              {selectedOption.icon && (
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedOption.iconBg || 'bg-gray-100'}`}>
                  {typeof selectedOption.icon === 'string' ? (
                    <span className="text-xl">{selectedOption.icon}</span>
                  ) : (
                    <selectedOption.icon className={`w-5 h-5 ${selectedOption.iconColor || 'text-gray-600'}`} />
                  )}
                </div>
              )}
              <div>
                <span className="font-medium text-gray-900">{selectedOption.label}</span>
                {selectedOption.description && (
                  <span className="block text-sm text-gray-500">{selectedOption.description}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-dropdown">
          <div className="py-2 max-h-72 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option)}
                className={`
                  w-full px-4 py-3 flex items-center justify-between
                  transition-colors duration-150
                  ${option.value === value
                    ? 'bg-indigo-50'
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  {option.icon && (
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${option.iconBg || 'bg-gray-100'}`}>
                      {typeof option.icon === 'string' ? (
                        <span className="text-xl">{option.icon}</span>
                      ) : (
                        <option.icon className={`w-5 h-5 ${option.iconColor || 'text-gray-600'}`} />
                      )}
                    </div>
                  )}
                  <div className="text-left">
                    <span className={`font-medium ${option.value === value ? 'text-indigo-700' : 'text-gray-900'}`}>
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-sm text-gray-500">{option.description}</span>
                    )}
                  </div>
                </div>

                {option.value === value && (
                  <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default IconSelect;