// frontend/src/components/layout/Sidebar.jsx (Updated with Clear Separation)
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Scissors,
  Calculator,
  History,
  Settings,
  X,
  Layers,
  BarChart3,
  Factory,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Users,
  Building2,
  UserCheck,
  Receipt,
  Package,
  FilePlus,
  PackageCheck,
  Zap,
  Activity,
  ClipboardList,
  Wrench,
  FileSpreadsheet,
} from 'lucide-react';
import CompanySwitcher from '../company/CompanySwitcher';
import { usePermissions } from '../../hooks/usePermissions';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { isAdmin, hasPermission, userRole } = usePermissions();
  
  const [productionOpen, setProductionOpen] = useState(
    location.pathname.startsWith('/productions')
  );
  
  const [companyOpen, setCompanyOpen] = useState(
    location.pathname.startsWith('/company')
  );

  const [deliveryOpen, setDeliveryOpen] = useState(
    location.pathname.startsWith('/parties') || location.pathname.startsWith('/challans')
  );

  const [weavingOpen, setWeavingOpen] = useState(
    location.pathname.startsWith('/weaving')
  );

  const mainNavItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard:view' },
    { path: '/yarns', icon: Layers, label: 'Yarn Library', permission: 'yarns:view' },
    { path: '/estimates/new', icon: Calculator, label: 'New Estimate', permission: 'estimates:create' },
    { path: '/estimates', icon: History, label: 'Estimate History', permission: 'estimates:view' },
    { path: '/estimates/compare', icon: BarChart3, label: 'Compare Estimates', permission: 'estimates:view' },
  ];

  // General Textile Production (from estimates)
  const productionNavItems = [
    { path: '/productions/new', icon: Factory, label: 'Production Planner', permission: 'production:create' },
    { path: '/productions', icon: FileText, label: 'Production Records', permission: 'production:view' },
    { path: '/productions/analytics', icon: TrendingUp, label: 'Production Analytics', permission: 'analytics:view' },
  ];

  const deliveryNavItems = [
    { path: '/parties', icon: UserCheck, label: 'Party Management', permission: 'production:view' },
    { path: '/challans/new', icon: FilePlus, label: 'New Challan', permission: 'production:create' },
    { path: '/challans', icon: Receipt, label: 'Challan History', permission: 'production:view' },
  ];

  // Weaving Module - Separate Production System
  const weavingNavItems = [
    { path: '/weaving', icon: LayoutDashboard, label: 'Weaving Dashboard', permission: 'production:view' },
    { 
      path: '/weaving/looms', 
      icon: Factory, 
      label: 'Loom Management', 
      permission: 'production:view',
      badge: null
    },
    { 
      path: '/weaving/beams', 
      icon: Package, 
      label: 'Beam Management', 
      permission: 'production:view',
      badge: null
    },
    { 
      path: '/weaving/sets', 
      icon: PackageCheck, 
      label: 'Weaving Sets', 
      permission: 'production:view',
      badge: null
    },
    { 
      path: '/weaving/production/new', 
      icon: Zap, 
      label: 'Daily Entry', 
      permission: 'production:create',
      badge: null
    },
    { 
      path: '/weaving/production', 
      icon: ClipboardList, 
      label: 'Entry History', 
      permission: 'production:view',
      badge: null
    },
    { 
      path: '/weaving/maintenance', 
      icon: Wrench, 
      label: 'Maintenance Log', 
      permission: 'production:view',
      badge: null
    },
  ];

  const companyNavItems = [
    { path: '/company/users', icon: Users, label: 'Manage Users', permission: 'users:view' },
    { path: '/company/settings', icon: Settings, label: 'Company Settings', permission: 'company:settings' },
  ];

  const bottomNavItems = [
    { path: '/settings', icon: Settings, label: 'Settings', permission: 'settings:view' },
  ];

  const NavItem = ({ item, onClick }) => {
    const isActive = location.pathname === item.path || 
      // Estimates
      (item.path === '/estimates' && location.pathname.startsWith('/estimates/') && 
       !location.pathname.includes('/new') && !location.pathname.includes('/compare')) ||
      // General Production
      (item.path === '/productions' && location.pathname.startsWith('/productions/') && 
       !location.pathname.includes('/new') && !location.pathname.includes('/analytics')) ||
      // Parties
      (item.path === '/parties' && location.pathname.startsWith('/parties/')) ||
      // Challans
      (item.path === '/challans' && location.pathname.startsWith('/challans/') && 
       !location.pathname.includes('/new')) ||
      // Weaving Dashboard
      (item.path === '/weaving' && location.pathname === '/weaving') ||
      // Weaving Looms
      (item.path === '/weaving/looms' && location.pathname.startsWith('/weaving/looms')) ||
      // Weaving Beams
      (item.path === '/weaving/beams' && location.pathname.startsWith('/weaving/beams')) ||
      // Weaving Sets
      (item.path === '/weaving/sets' && location.pathname.startsWith('/weaving/sets')) ||
      // Weaving Production Entry (New)
      (item.path === '/weaving/production/new' && location.pathname === '/weaving/production/new') ||
      // Weaving Production History (List & Details)
      (item.path === '/weaving/production' && 
       (location.pathname === '/weaving/production' || 
        (location.pathname.startsWith('/weaving/production/') && location.pathname !== '/weaving/production/new'))) ||
      // Weaving Maintenance
      (item.path === '/weaving/maintenance' && location.pathname.startsWith('/weaving/maintenance'));

    const Icon = item.icon;

    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    return (
      <NavLink
        to={item.path}
        onClick={onClick}
        className={`
          flex items-center justify-between px-4 py-2.5 rounded-lg
          transition-all duration-200 text-sm group
          ${isActive
            ? 'bg-indigo-50 text-indigo-600 font-medium'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            isActive 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  const SectionHeader = ({ icon: Icon, title, isOpen, onClick }) => (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors group"
    >
      <span className="flex items-center space-x-2">
        <Icon className="w-4 h-4 group-hover:text-gray-600" />
        <span>{title}</span>
      </span>
      {isOpen ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>
  );

  const getRoleConfig = () => {
    switch (userRole) {
      case 'super_admin':
        return { label: 'Super Admin', color: 'bg-purple-100 text-purple-700 border border-purple-200' };
      case 'admin':
        return { label: 'Admin', color: 'bg-blue-100 text-blue-700 border border-blue-200' };
      case 'editor':
        return { label: 'Editor', color: 'bg-green-100 text-green-700 border border-green-200' };
      default:
        return { label: 'Viewer', color: 'bg-gray-100 text-gray-700 border border-gray-200' };
    }
  };

  const roleConfig = getRoleConfig();

  return (
    <aside
      className={`
        fixed top-0 left-0 z-30 h-screen w-64 bg-white shadow-xl
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">StitchFlow</h1>
            <p className="text-xs text-gray-500">Textile Management</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Company Switcher - Fixed */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <CompanySwitcher />
      </div>

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <nav className="p-3 space-y-1">
          {/* Main Navigation */}
          <div className="space-y-0.5">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Estimation
            </p>
            {mainNavItems.map((item) => (
              <NavItem key={item.path} item={item} onClick={onClose} />
            ))}
          </div>

          {/* General Production Section */}
          <div className="pt-4">
            <SectionHeader
              icon={Factory}
              title="Production"
              isOpen={productionOpen}
              onClick={() => setProductionOpen(!productionOpen)}
            />
            
            {productionOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-green-100 pl-3">
                {productionNavItems.map((item) => (
                  <NavItem key={item.path} item={item} onClick={onClose} />
                ))}
              </div>
            )}
          </div>

          {/* Weaving Module Section */}
          <div className="pt-4">
            <SectionHeader
              icon={Activity}
              title="Weaving"
              isOpen={weavingOpen}
              onClick={() => setWeavingOpen(!weavingOpen)}
            />
            
            {weavingOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-indigo-100 pl-3">
                {weavingNavItems.map((item) => (
                  <NavItem key={item.path} item={item} onClick={onClose} />
                ))}
              </div>
            )}
          </div>

          {/* Delivery & Party Section */}
          <div className="pt-4">
            <SectionHeader
              icon={Package}
              title="Delivery"
              isOpen={deliveryOpen}
              onClick={() => setDeliveryOpen(!deliveryOpen)}
            />
            
            {deliveryOpen && (
              <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-amber-100 pl-3">
                {deliveryNavItems.map((item) => (
                  <NavItem key={item.path} item={item} onClick={onClose} />
                ))}
              </div>
            )}
          </div>

          {/* Company Management Section (Admin Only) */}
          {isAdmin && (
            <div className="pt-4">
              <SectionHeader
                icon={Building2}
                title="Company"
                isOpen={companyOpen}
                onClick={() => setCompanyOpen(!companyOpen)}
              />
              
              {companyOpen && (
                <div className="mt-1 ml-3 space-y-0.5 border-l-2 border-blue-100 pl-3">
                  {companyNavItems.map((item) => (
                    <NavItem key={item.path} item={item} onClick={onClose} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          <div className="pt-4 border-t border-gray-100 mt-4">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
            {bottomNavItems.map((item) => (
              <NavItem key={item.path} item={item} onClick={onClose} />
            ))}
          </div>
        </nav>
      </div>

      {/* Role Badge - Fixed at Bottom */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
        <div className={`text-center py-2 px-3 rounded-lg text-xs font-medium ${roleConfig.color}`}>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Your Role: {roleConfig.label}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;