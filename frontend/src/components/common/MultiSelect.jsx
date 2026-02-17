import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

const MultiSelect = ({
  label,
  name,
  value = [],
  onChange,
  options = [],
  placeholder = 'Select options',
  error,
  required = false,
  disabled = false,
  searchable = true,
  maxItems,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Get selected options
  const selectedOptions = options.filter(opt => value.includes(opt.value));

  // Filter options based on search
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleSelect = (optionValue) => {
    let newValue;
    if (value.includes(optionValue)) {
      newValue = value.filter(v => v !== optionValue);
    } else {
      if (maxItems && value.length >= maxItems) return;
      newValue = [...value, optionValue];
    }
    onChange({ target: { name, value: newValue } });
  };

  const handleRemove = (optionValue, e) => {
    e.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    onChange({ target: { name, value: newValue } });
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange({ target: { name, value: [] } });
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
          relative w-full min-h-[42px] px-3 py-2 rounded-xl text-left
          bg-white border transition-all duration-200
          focus:outline-none
          ${error ? 'border-red-300' : 'border-gray-200'}
          ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-100' : 'hover:border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer'}
        `}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Selected Tags or Placeholder */}
          <div className="flex-1 flex flex-wrap gap-1.5">
            {selectedOptions.length > 0 ? (
              selectedOptions.map(option => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-sm rounded-lg"
                >
                  {option.icon && <span className="text-xs">{option.icon}</span>}
                  <span>{option.label}</span>
                  <button
                    type="button"
                    onClick={(e) => handleRemove(option.value, e)}
                    className="hover:bg-indigo-200 rounded p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <ChevronDown
              className={`
                w-5 h-5 text-gray-400 transition-transform duration-200
                ${isOpen ? 'transform rotate-180' : ''}
              `}
            />
          </div>
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-dropdown"
          style={{ maxHeight: '320px' }}
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

          {/* Selection Info */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {selectedOptions.length} selected
              {maxItems && ` (max ${maxItems})`}
            </span>
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                const isDisabled = option.disabled || (maxItems && value.length >= maxItems && !isSelected);

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !isDisabled && handleSelect(option.value)}
                    className={`
                      w-full px-4 py-2.5 text-left flex items-center justify-between
                      transition-colors duration-150
                      ${isSelected
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                    disabled={isDisabled}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Checkbox */}
                      <div
                        className={`
                          w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                          ${isSelected
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'border-gray-300'
                          }
                        `}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Option Icon */}
                      {option.icon && (
                        <span className="text-lg">{option.icon}</span>
                      )}

                      {/* Option Label */}
                      <div>
                        <span className="block font-medium">{option.label}</span>
                        {option.description && (
                          <span className="block text-xs text-gray-500 mt-0.5">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
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
        <p className="mt-1.5 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default MultiSelect;