import { useMemo, useCallback } from 'react';
import { useCompany } from '../context/CompanyContext';

// Permission definitions (mirror of backend)
const PERMISSIONS = {
  // Dashboard
  'dashboard:view': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // Yarns
  'yarns:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'yarns:create': ['editor', 'admin', 'super_admin'],
  'yarns:edit': ['editor', 'admin', 'super_admin'],
  'yarns:delete': ['admin', 'super_admin'],
  'yarns:import': ['editor', 'admin', 'super_admin'],
  'yarns:export': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // Estimates
  'estimates:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'estimates:create': ['editor', 'admin', 'super_admin'],
  'estimates:edit': ['editor', 'admin', 'super_admin'],
  'estimates:delete': ['admin', 'super_admin'],
  'estimates:duplicate': ['editor', 'admin', 'super_admin'],
  'estimates:export': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // Production
  'production:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'production:create': ['editor', 'admin', 'super_admin'],
  'production:edit': ['editor', 'admin', 'super_admin'],
  'production:delete': ['admin', 'super_admin'],
  'production:manage': ['admin', 'super_admin'],
  
  // Analytics
  'analytics:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'analytics:export': ['editor', 'admin', 'super_admin'],
  
  // Company Management
  'company:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'company:edit': ['admin', 'super_admin'],
  'company:delete': ['super_admin'],
  'company:settings': ['admin', 'super_admin'],
  'company:regenerate_code': ['admin', 'super_admin'],
  
  // User Management
  'users:view': ['admin', 'super_admin'],
  'users:invite': ['admin', 'super_admin'],
  'users:remove': ['admin', 'super_admin'],
  'users:change_role': ['admin', 'super_admin'],
  'users:manage_admins': ['super_admin'],
  
  // Settings
  'settings:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'settings:edit': ['admin', 'super_admin']
};

const ROLE_HIERARCHY = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3
};

export const usePermissions = () => {
  const { userRole, activeCompany } = useCompany();

  // Check if user has specific permission
  const hasPermission = useCallback((permission) => {
    if (!userRole || !PERMISSIONS[permission]) return false;
    return PERMISSIONS[permission].includes(userRole);
  }, [userRole]);

  // Check if user has any of the permissions
  const hasAnyPermission = useCallback((permissions) => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  // Check if user has all permissions
  const hasAllPermissions = useCallback((permissions) => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  // Check if user has specific role
  const hasRole = useCallback((roles) => {
    if (!userRole) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(userRole);
  }, [userRole]);

  // Check if user role is at least the minimum required
  const hasMinRole = useCallback((minRole) => {
    if (!userRole) return false;
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
  }, [userRole]);

  // Check if user can manage another user
  const canManageUser = useCallback((targetRole) => {
    if (!userRole) return false;
    
    // super_admin can manage everyone except other super_admins
    if (userRole === 'super_admin') {
      return targetRole !== 'super_admin';
    }
    
    // admin can manage editors and viewers
    if (userRole === 'admin') {
      return ['viewer', 'editor'].includes(targetRole);
    }
    
    return false;
  }, [userRole]);

  // Get all permissions for current role
  const rolePermissions = useMemo(() => {
    if (!userRole) return [];
    return Object.entries(PERMISSIONS)
      .filter(([_, roles]) => roles.includes(userRole))
      .map(([permission]) => permission);
  }, [userRole]);

  // UI helper - check if element should be visible
  const isVisible = useCallback((permission) => {
    return hasPermission(permission);
  }, [hasPermission]);

  // UI helper - check if element should be disabled
  const isDisabled = useCallback((permission) => {
    return !hasPermission(permission);
  }, [hasPermission]);

  return {
    userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasMinRole,
    canManageUser,
    rolePermissions,
    isVisible,
    isDisabled,
    isAdmin: hasRole(['admin', 'super_admin']),
    isSuperAdmin: hasRole('super_admin'),
    isEditor: hasMinRole('editor'),
    isViewer: userRole === 'viewer',
    hasCompanyContext: !!activeCompany
  };
};

export default usePermissions;