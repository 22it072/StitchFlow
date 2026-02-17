// Role display configurations
export const ROLE_CONFIG = {
  viewer: {
    label: 'Viewer',
    description: 'View-only access to all data',
    color: 'gray',
    icon: 'Eye'
  },
  editor: {
    label: 'Editor',
    description: 'Can create and edit data',
    color: 'green',
    icon: 'Edit3'
  },
  admin: {
    label: 'Admin',
    description: 'Full access including user management',
    color: 'blue',
    icon: 'Shield'
  },
  super_admin: {
    label: 'Super Admin',
    description: 'System-level control and ownership',
    color: 'purple',
    icon: 'Crown'
  }
};

// Get role badge color classes
export const getRoleBadgeColor = (role) => {
  const colors = {
    viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    editor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    super_admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
  };
  return colors[role] || colors.viewer;
};

// Get role dot color
export const getRoleDotColor = (role) => {
  const colors = {
    viewer: 'bg-gray-500',
    editor: 'bg-green-500',
    admin: 'bg-blue-500',
    super_admin: 'bg-purple-500'
  };
  return colors[role] || colors.viewer;
};

// Format role for display
export const formatRole = (role) => {
  return ROLE_CONFIG[role]?.label || role;
};

// Check if role1 can manage role2
export const canRoleManage = (managerRole, targetRole) => {
  const hierarchy = { viewer: 0, editor: 1, admin: 2, super_admin: 3 };
  return hierarchy[managerRole] > hierarchy[targetRole];
};

// Get available roles for assignment based on current role
export const getAssignableRoles = (currentRole) => {
  if (currentRole === 'super_admin') {
    return ['viewer', 'editor', 'admin'];
  }
  if (currentRole === 'admin') {
    return ['viewer', 'editor'];
  }
  return [];
};