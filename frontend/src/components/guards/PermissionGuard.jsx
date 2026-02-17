// frontend/src/components/guards/PermissionGuard.jsx
import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { Shield, Lock } from 'lucide-react';

/**
 * Guard component that renders children only if user has required permission
 */
export const PermissionGuard = ({ 
  permission, 
  permissions, 
  requireAll = false,
  fallback = null,
  showLock = false,
  children 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions) {
    hasAccess = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
  }

  if (hasAccess) {
    return children;
  }

  if (showLock) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Lock className="w-5 h-5 text-gray-400 mr-2" />
        <span className="text-sm text-gray-500">
          You don't have permission to access this
        </span>
      </div>
    );
  }

  return fallback;
};

/**
 * Guard component that renders children only if user has required role
 */
export const RoleGuard = ({ 
  role, 
  roles, 
  minRole,
  fallback = null,
  children 
}) => {
  const { hasRole, hasMinRole } = usePermissions();

  let hasAccess = false;

  if (minRole) {
    hasAccess = hasMinRole(minRole);
  } else if (role || roles) {
    hasAccess = hasRole(roles || role);
  }

  if (hasAccess) {
    return children;
  }

  return fallback;
};

/**
 * Access denied page component
 */
export const AccessDenied = ({ message = "You don't have permission to access this page" }) => {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center">
      <div className="bg-red-50 rounded-full p-6 mb-6">
        <Shield className="w-16 h-16 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Access Denied
      </h2>
      <p className="text-gray-600 text-center max-w-md">
        {message}
      </p>
    </div>
  );
};

export default PermissionGuard;