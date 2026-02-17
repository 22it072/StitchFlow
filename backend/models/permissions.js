// backend/models/permissions.js

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY = {
  viewer: 0,
  editor: 1,
  admin: 2,
  super_admin: 3
};

// ========== COMPLETE PERMISSION DEFINITIONS ==========
const PERMISSIONS = {
  // ==================== DASHBOARD ====================
  'dashboard:view': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // ==================== YARNS ====================
  'yarns:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'yarns:create': ['editor', 'admin', 'super_admin'],
  'yarns:edit': ['editor', 'admin', 'super_admin'],
  'yarns:delete': ['admin', 'super_admin'],
  'yarns:import': ['editor', 'admin', 'super_admin'],
  'yarns:export': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // ==================== ESTIMATES ====================
  'estimates:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'estimates:create': ['editor', 'admin', 'super_admin'],
  'estimates:edit': ['editor', 'admin', 'super_admin'],
  'estimates:delete': ['admin', 'super_admin'],
  'estimates:duplicate': ['editor', 'admin', 'super_admin'],
  'estimates:export': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // ==================== PRODUCTION ====================
  'production:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'production:create': ['editor', 'admin', 'super_admin'],
  'production:edit': ['editor', 'admin', 'super_admin'],
  'production:delete': ['admin', 'super_admin'],
  'production:manage': ['admin', 'super_admin'],
  
  // ==================== PARTIES ====================
  'parties:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'parties:create': ['editor', 'admin', 'super_admin'],
  'parties:edit': ['editor', 'admin', 'super_admin'],
  'parties:delete': ['admin', 'super_admin'],
  
  // ==================== CHALLANS ====================
  'challans:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'challans:create': ['editor', 'admin', 'super_admin'],
  'challans:edit': ['editor', 'admin', 'super_admin'],
  'challans:delete': ['admin', 'super_admin'],
  'challans:payment': ['editor', 'admin', 'super_admin'],
  
  // ==================== ANALYTICS ====================
  'analytics:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'analytics:export': ['editor', 'admin', 'super_admin'],
  
  // ==================== COMPANY MANAGEMENT ====================
  'company:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'company:edit': ['admin', 'super_admin'],
  'company:delete': ['super_admin'],
  'company:settings': ['admin', 'super_admin'],
  'company:regenerate_code': ['admin', 'super_admin'],
  
  // ==================== USER MANAGEMENT ====================
  'users:view': ['admin', 'super_admin'],
  'users:invite': ['admin', 'super_admin'],
  'users:remove': ['admin', 'super_admin'],
  'users:change_role': ['admin', 'super_admin'],
  'users:manage_admins': ['super_admin'],
  
  // ==================== SETTINGS ====================
  'settings:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'settings:edit': ['admin', 'super_admin'],
  
  // ==================== WEAVING MODULE - LOOMS ====================
  'weaving:looms:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:looms:create': ['editor', 'admin', 'super_admin'],
  'weaving:looms:edit': ['editor', 'admin', 'super_admin'],
  'weaving:looms:delete': ['admin', 'super_admin'],
  'weaving:looms:status': ['editor', 'admin', 'super_admin'], // Operators can update status
  
  // ==================== WEAVING MODULE - BEAMS ====================
  'weaving:beams:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:beams:create': ['editor', 'admin', 'super_admin'],
  'weaving:beams:edit': ['editor', 'admin', 'super_admin'],
  'weaving:beams:delete': ['admin', 'super_admin'],
  'weaving:beams:allocate': ['editor', 'admin', 'super_admin'],
  
  // ==================== WEAVING MODULE - SETS ====================
  'weaving:sets:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:sets:create': ['editor', 'admin', 'super_admin'],
  'weaving:sets:edit': ['editor', 'admin', 'super_admin'],
  'weaving:sets:delete': ['admin', 'super_admin'],
  'weaving:sets:allocate': ['editor', 'admin', 'super_admin'],
  'weaving:sets:complete': ['editor', 'admin', 'super_admin'],
  
  // ==================== WEAVING MODULE - PRODUCTION ====================
  'weaving:production:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:production:create': ['editor', 'admin', 'super_admin'], // Operators can create entries
  'weaving:production:edit': ['admin', 'super_admin'], // Only supervisors+ can edit
  'weaving:production:delete': ['admin', 'super_admin'],
  'weaving:production:today': ['viewer', 'editor', 'admin', 'super_admin'],
  
  // ==================== WEAVING MODULE - MAINTENANCE ====================
  'weaving:maintenance:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:maintenance:create': ['editor', 'admin', 'super_admin'],
  'weaving:maintenance:edit': ['editor', 'admin', 'super_admin'],
  'weaving:maintenance:delete': ['admin', 'super_admin'],
  'weaving:maintenance:schedule': ['editor', 'admin', 'super_admin'],
  'weaving:maintenance:complete': ['editor', 'admin', 'super_admin'],
  
  // ==================== WEAVING MODULE - ANALYTICS ====================
  'weaving:analytics:view': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:analytics:dashboard': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:analytics:reports': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:analytics:export': ['editor', 'admin', 'super_admin'],
  'weaving:analytics:loom_performance': ['viewer', 'editor', 'admin', 'super_admin'],
  'weaving:analytics:defect_tracking': ['viewer', 'editor', 'admin', 'super_admin'],
};

// ==================== PERMISSION UTILITY FUNCTIONS ====================

/**
 * Check if role has specific permission
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
const hasPermission = (role, permission) => {
  if (!role) return false;
  if (!PERMISSIONS[permission]) {
    console.warn(`⚠️  Unknown permission: ${permission}`);
    return false;
  }
  return PERMISSIONS[permission].includes(role);
};

/**
 * Check if role has any of the permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
const hasAnyPermission = (role, permissions) => {
  if (!role) return false;
  return permissions.some(permission => hasPermission(role, permission));
};

/**
 * Check if role has all of the permissions
 * @param {string} role - User role
 * @param {string[]} permissions - Array of permissions to check
 * @returns {boolean}
 */
const hasAllPermissions = (role, permissions) => {
  if (!role) return false;
  return permissions.every(permission => hasPermission(role, permission));
};

/**
 * Compare roles (returns true if role1 >= role2)
 * @param {string} role1 - First role
 * @param {string} role2 - Second role
 * @returns {boolean}
 */
const isRoleHigherOrEqual = (role1, role2) => {
  if (!role1 || !role2) return false;
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
};

/**
 * Get all permissions for a role
 * @param {string} role - User role
 * @returns {string[]} Array of permission keys
 */
const getRolePermissions = (role) => {
  if (!role) return [];
  const permissions = [];
  for (const [permission, allowedRoles] of Object.entries(PERMISSIONS)) {
    if (allowedRoles.includes(role)) {
      permissions.push(permission);
    }
  }
  return permissions;
};

/**
 * Get permission categories
 * @returns {Object} Permissions grouped by category
 */
const getPermissionCategories = () => {
  const categories = {};
  for (const permission of Object.keys(PERMISSIONS)) {
    const [category] = permission.split(':');
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(permission);
  }
  return categories;
};

/**
 * Get permissions by module
 * @param {string} module - Module name (e.g., 'weaving', 'estimates')
 * @returns {string[]} Array of permissions for that module
 */
const getModulePermissions = (module) => {
  return Object.keys(PERMISSIONS).filter(permission => 
    permission.startsWith(`${module}:`)
  );
};

/**
 * Check if user can access weaving module
 * @param {string} role - User role
 * @returns {boolean}
 */
const canAccessWeaving = (role) => {
  return hasPermission(role, 'weaving:looms:view');
};

// ==================== ROLE METADATA ====================

// Role display names
const ROLE_DISPLAY_NAMES = {
  viewer: 'Viewer',
  editor: 'Editor',
  admin: 'Admin',
  super_admin: 'Super Admin'
};

// Role descriptions
const ROLE_DESCRIPTIONS = {
  viewer: 'View-only access to all data and reports',
  editor: 'Can create and edit data, manage production entries',
  admin: 'Full access including user management and settings',
  super_admin: 'System-level control, company ownership, and all permissions'
};

// Role capabilities summary
const ROLE_CAPABILITIES = {
  viewer: [
    'View all modules',
    'View analytics and reports',
    'Export data',
  ],
  editor: [
    'All Viewer capabilities',
    'Create and edit estimates',
    'Manage yarn library',
    'Create production entries',
    'Create weaving sets',
    'Record loom production',
    'Schedule maintenance',
  ],
  admin: [
    'All Editor capabilities',
    'Delete records',
    'Manage users and roles',
    'Configure company settings',
    'Approve critical operations',
  ],
  super_admin: [
    'All Admin capabilities',
    'Full system control',
    'Company ownership',
    'Manage other admins',
    'System-level settings',
  ],
};

// ==================== PERMISSION GROUPS ====================

const PERMISSION_GROUPS = {
  'Core Modules': [
    'dashboard',
    'yarns',
    'estimates',
    'production',
  ],
  'Business Operations': [
    'parties',
    'challans',
    'analytics',
  ],
  'Weaving Operations': [
    'weaving:looms',
    'weaving:beams',
    'weaving:sets',
    'weaving:production',
    'weaving:maintenance',
    'weaving:analytics',
  ],
  'Administration': [
    'company',
    'users',
    'settings',
  ],
};

// ==================== EXPORTS ====================

module.exports = {
  ROLE_HIERARCHY,
  PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isRoleHigherOrEqual,
  getRolePermissions,
  getPermissionCategories,
  getModulePermissions,
  canAccessWeaving,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  ROLE_CAPABILITIES,
  PERMISSION_GROUPS,
};