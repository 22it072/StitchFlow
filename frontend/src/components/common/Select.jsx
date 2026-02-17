import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error,
  required = false,
  disabled = false,
  searchable = false,
  icon: Icon,
  className = '',
  size = 'md', // sm, md, lg
  variant = 'default', // default, filled, outlined
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search
  const filteredOptions = searchable
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && highlightedIndex >= 0) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setHighlightedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      default:
        break;
    }
  };

  const handleSelect = (option) => {
    onChange({ target: { name, value: option.value } });
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setHighlightedIndex(-1);
      }
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  // Variant classes
  const variantClasses = {
    default: `bg-white border ${error ? 'border-red-300' : 'border-gray-200'} ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'hover:border-gray-300'}`,
    filled: `bg-gray-100 border-transparent ${isOpen ? 'bg-gray-50 ring-2 ring-indigo-100' : 'hover:bg-gray-50'}`,
    outlined: `bg-transparent border-2 ${error ? 'border-red-300' : 'border-gray-300'} ${isOpen ? 'border-indigo-500' : 'hover:border-gray-400'}`,
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
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          relative w-full rounded-xl text-left
          transition-all duration-200 ease-in-out
          focus:outline-none
          ${sizeClasses[size]}
          ${variantClasses[variant]}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            {/* Custom Icon or Option Icon */}
            {(Icon || selectedOption?.icon) && (
              <span className="flex-shrink-0">
                {Icon ? (
                  <Icon className="w-5 h-5 text-gray-400" />
                ) : selectedOption?.icon ? (
                  <span className="text-lg">{selectedOption.icon}</span>
                ) : null}
              </span>
            )}

            {/* Selected Value or Placeholder */}
            <span className={`block truncate ${!selectedOption ? 'text-gray-400' : 'text-gray-900'}`}>
              {selectedOption ? (
                <span className="flex items-center space-x-2">
                  {selectedOption.color && (
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedOption.color }}
                    />
                  )}
                  <span>{selectedOption.label}</span>
                </span>
              ) : (
                placeholder
              )}
            </span>
          </div>

          {/* Dropdown Arrow */}
          <ChevronDown
            className={`
              w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0
              ${isOpen ? 'transform rotate-180' : ''}
            `}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className={`
            absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg
            border border-gray-100 overflow-hidden
            animate-dropdown
          `}
          style={{ maxHeight: '300px' }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 outline-none"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="overflow-y-auto" style={{ maxHeight: searchable ? '240px' : '280px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    w-full px-4 py-2.5 text-left flex items-center justify-between
                    transition-colors duration-150
                    ${option.value === value
                      ? 'bg-indigo-50 text-indigo-700'
                      : highlightedIndex === index
                        ? 'bg-gray-50 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                    ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  disabled={option.disabled}
                >
                  <div className="flex items-center space-x-3">
                    {/* Option Icon or Color */}
                    {option.icon && (
                      <span className="text-lg">{option.icon}</span>
                    )}
                    {option.color && (
                      <span
                        className="w-4 h-4 rounded-full flex-shrink-0 border border-gray-200"
                        style={{ backgroundColor: option.color }}
                      />
                    )}

                    {/* Option Label & Description */}
                    <div>
                      <span className="block font-medium">{option.label}</span>
                      {option.description && (
                        <span className="block text-xs text-gray-500 mt-0.5">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Checkmark for Selected */}
                  {option.value === value && (
                    <Check className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <p className="text-sm">No options found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-red-500 flex items-center">
          <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;