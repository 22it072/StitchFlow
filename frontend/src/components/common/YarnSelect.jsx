import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Layers, Plus, X } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { 
  generateYarnDisplayName, 
  getYarnCategoryColor, 
  getYarnTypeColor,
  getYarnCategoryLabel 
} from '../../utils/yarnFormatter';

const YarnSelect = ({
  label,
  name,
  value,
  onChange,
  yarns = [],
  yarnType = 'all',
  placeholder = 'Select a yarn',
  error,
  required = false,
  disabled = false,
  currencySymbol = '₹',
  onAddNew,
  showCategory = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter yarns by type, category, and search
  const filteredYarns = yarns
    .filter(yarn => {
      // Filter by yarn type
      if (yarnType !== 'all') {
        if (yarn.yarnType !== 'all' && yarn.yarnType !== yarnType) {
          return false;
        }
      }
      // Filter by category
      if (filterCategory !== 'all' && yarn.yarnCategory !== filterCategory) {
        return false;
      }
      // Filter by search
      const searchLower = searchQuery.toLowerCase();
      const displayName = yarn.displayName || generateYarnDisplayName(yarn);
      return (
        yarn.name.toLowerCase().includes(searchLower) ||
        displayName.toLowerCase().includes(searchLower) ||
        yarn.denier?.toString().includes(searchQuery)
      );
    });

  // Find selected yarn
  const selectedYarn = yarns.find(yarn => yarn._id === value);

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
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (yarn) => {
    onChange(yarn);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  const getDisplayName = (yarn) => {
    return yarn.displayName || generateYarnDisplayName(yarn);
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
        {selectedYarn ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedYarn.color || '#E5E7EB' }}
              >
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="font-medium text-gray-900 truncate">
                    {getDisplayName(selectedYarn)}
                  </span>
                  {showCategory && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getYarnCategoryColor(selectedYarn.yarnCategory)}`}>
                      {selectedYarn.yarnCategory === 'filament' ? 'Filament' : 'Spun'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500 mt-0.5">
                  <span className="font-medium text-indigo-600">
                    {formatCurrency(selectedYarn.price, currencySymbol)}
                  </span>
                  <span className="text-xs">+{selectedYarn.gstPercentage}% GST</span>
                  {selectedYarn.tpm && (
                    <>
                      <span>•</span>
                      <span className="text-xs">{selectedYarn.tpm} TPM</span>
                    </>
                  )}
                  {selectedYarn.filamentCount && (
                    <>
                      <span>•</span>
                      <span className="text-xs">{selectedYarn.filamentCount}F</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Layers className="w-5 h-5 text-gray-400" />
              </div>
              <span className="text-gray-400">{placeholder}</span>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-dropdown"
          style={{ maxHeight: '450px' }}
        >
          {/* Search & Filter */}
          <div className="p-3 border-b border-gray-100 bg-gray-50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, denier..."
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
            
            {/* Category Filter Tabs */}
            <div className="flex space-x-2">
              {['all', 'spun', 'filament'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`
                    px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
                    ${filterCategory === cat 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  {cat === 'all' ? 'All' : cat === 'spun' ? 'Spun' : 'Filament'}
                </button>
              ))}
            </div>
          </div>

          {/* Add New Button */}
          {onAddNew && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onAddNew();
              }}
              className="w-full px-4 py-3 flex items-center space-x-3 text-indigo-600 hover:bg-indigo-50 border-b border-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-medium">Add New Yarn</span>
            </button>
          )}

          {/* Yarns List */}
          <div className="overflow-y-auto" style={{ maxHeight: '300px' }}>
            {filteredYarns.length > 0 ? (
              <div className="py-2">
                {filteredYarns.map((yarn) => (
                  <button
                    key={yarn._id}
                    type="button"
                    onClick={() => handleSelect(yarn)}
                    className={`
                      w-full px-4 py-3 flex items-center justify-between
                      transition-colors duration-150
                      ${yarn._id === value
                        ? 'bg-indigo-50'
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: yarn.color || '#E5E7EB' }}
                      >
                        <Layers className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className={`font-medium truncate ${yarn._id === value ? 'text-indigo-700' : 'text-gray-900'}`}>
                            {getDisplayName(yarn)}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getYarnCategoryColor(yarn.yarnCategory)}`}>
                            {yarn.yarnCategory === 'filament' ? 'Filament' : 'Spun'}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${getYarnTypeColor(yarn.yarnType)}`}>
                            {yarn.yarnType === 'all' ? 'All Types' : yarn.yarnType}
                          </span>
                          <span className="text-xs text-indigo-600 font-medium">
                            {formatCurrency(yarn.price, currencySymbol)}
                          </span>
                        </div>
                        {/* Additional specs */}
                        <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
                          {yarn.tpm && <span>{yarn.tpm} TPM</span>}
                          {yarn.filamentCount && <span>{yarn.filamentCount} Filaments</span>}
                          {yarn.usageCount > 0 && (
                            <span>• Used {yarn.usageCount}x</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {yarn._id === value && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-12 text-center">
                <Layers className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No yarns found</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                    className="mt-3 text-indigo-600 text-sm font-medium hover:text-indigo-700"
                  >
                    Add a new yarn
                  </button>
                )}
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

export default YarnSelect;