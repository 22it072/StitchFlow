// frontend/src/components/company/CompanySwitcher.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  ChevronDown, 
  Plus, 
  Check, 
  Settings,
  Users
} from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

const CompanySwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  
  const { companies, activeCompany, switchCompany, loading } = useCompany();
  const { isAdmin } = usePermissions();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCompanySelect = (company) => {
    switchCompany(company);
    setIsOpen(false);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'editor':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="px-3 py-3 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!activeCompany) {
    return (
      <div className="px-3 py-3">
        <button
          onClick={() => navigate('/companies/join')}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 
            text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Join or Create Company</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative px-3 py-3" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 bg-gray-50 
          rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 
            flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-medium text-gray-900 text-sm truncate max-w-[130px]">
              {activeCompany.name}
            </p>
            <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(activeCompany.role)}`}>
              {activeCompany.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 
            ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-3 right-3 mt-1 bg-white rounded-lg 
          shadow-lg border border-gray-200 z-50 overflow-hidden">
          
          {/* Company List */}
          <div className="max-h-48 overflow-y-auto">
            {companies.map((company) => (
              <button
                key={company._id}
                onClick={() => handleCompanySelect(company)}
                className={`w-full flex items-center justify-between p-2.5 hover:bg-gray-50 
                  transition-colors border-b border-gray-100 last:border-b-0
                  ${activeCompany._id === company._id ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 
                    flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-gray-500" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate max-w-[120px]">
                      {company.name}
                    </p>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(company.role)}`}>
                      {company.role?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                {activeCompany._id === company._id && (
                  <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200" />

          {/* Actions */}
          <div className="p-1.5">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    navigate('/company/settings');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 
                    hover:bg-gray-100 rounded-md transition-colors text-sm"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  <span>Company Settings</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/company/users');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-gray-700 
                    hover:bg-gray-100 rounded-md transition-colors text-sm"
                >
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>Manage Users</span>
                </button>
              </>
            )}
            <button
              onClick={() => {
                navigate('/companies/join');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-blue-600 
                hover:bg-blue-50 rounded-md transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Join or Create Company</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySwitcher;