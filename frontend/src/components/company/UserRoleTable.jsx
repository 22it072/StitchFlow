// frontend/src/components/company/UserRoleTable.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreVertical, 
  Shield, 
  Edit3, 
  Eye, 
  Crown,
  UserMinus,
  Users,
  Lock
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Viewer', icon: Eye, color: 'gray' },
  { value: 'editor', label: 'Editor', icon: Edit3, color: 'green' },
  { value: 'admin', label: 'Admin', icon: Shield, color: 'blue' },
  { value: 'super_admin', label: 'Super Admin', icon: Crown, color: 'purple' }
];

// ─── Portal Dropdown for a single user row ───
const ActionDropdown = ({
  user,
  isOpen,
  onToggle,
  onClose,
  onRoleChange,
  onRemoveUser,
  onTransferOwnership,
  isSuperAdmin,
}) => {
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownWidth = 192;
    const dropdownHeight = 300;
    const padding = 8;

    let left = rect.right - dropdownWidth;
    if (left < padding) left = padding;
    if (left + dropdownWidth > window.innerWidth - padding) {
      left = window.innerWidth - dropdownWidth - padding;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    let top;
    if (spaceBelow >= dropdownHeight || spaceBelow >= rect.top) {
      top = rect.bottom + 4;
    } else {
      top = rect.top - dropdownHeight - 4;
      if (top < padding) top = padding;
    }

    setPosition({
      top: top + window.scrollY,
      left: left + window.scrollX,
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, onClose, calculatePosition]);

  const handleAction = (action) => {
    onClose();
    setTimeout(() => action(), 50);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onToggle();
        }}
        className={`p-2 rounded-lg transition-colors ${
          isOpen
            ? 'bg-gray-200 text-gray-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`}
        aria-label="User actions"
        aria-expanded={isOpen}
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen &&
        createPortal(
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 9998 }}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            />

            <div
              ref={dropdownRef}
              className="fixed w-48 bg-white rounded-xl shadow-2xl 
                border border-gray-200 py-1 overflow-hidden"
              style={{
                zIndex: 9999,
                top: `${position.top}px`,
                left: `${position.left}px`,
                animation: 'dropdownFadeIn 0.15s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-1">
                <p className="px-4 py-2 text-xs font-semibold text-gray-400 
                  uppercase tracking-wider">
                  Change Role
                </p>
                {ROLE_OPTIONS
                  .filter((role) => {
                    if (isSuperAdmin) return role.value !== 'super_admin';
                    return ['viewer', 'editor'].includes(role.value);
                  })
                  .map((role) => {
                    const Icon = role.icon;
                    const isActive = user.role === role.value;
                    return (
                      <button
                        key={role.value}
                        onClick={() => {
                          if (!isActive) {
                            handleAction(() => onRoleChange(user._id, role.value));
                          }
                        }}
                        disabled={isActive}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 
                          text-sm transition-colors
                          ${isActive
                            ? 'bg-blue-50 text-blue-600 cursor-default'
                            : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{role.label}</span>
                        {isActive && (
                          <span className="ml-auto text-xs text-blue-400">
                            Current
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className="border-t border-gray-100 py-1">
                {isSuperAdmin && onTransferOwnership && (
                  <button
                    onClick={() =>
                      handleAction(() => onTransferOwnership(user._id))
                    }
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 
                      text-sm text-purple-600 hover:bg-purple-50 
                      transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Transfer Ownership</span>
                  </button>
                )}

                {onRemoveUser && (
                  <button
                    onClick={() =>
                      handleAction(() => onRemoveUser(user._id))
                    }
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 
                      text-sm text-red-600 hover:bg-red-50 
                      transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Remove User</span>
                  </button>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

// ─── Main Table ───
const UserRoleTable = ({ 
  users, 
  currentUserId,
  onRoleChange, 
  onRemoveUser,
  onTransferOwnership,
  loading = false 
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const { isSuperAdmin, canManageUser, hasPermission } = usePermissions();

  const getRoleConfig = (role) => {
    return ROLE_OPTIONS.find(r => r.value === role) || ROLE_OPTIONS[0];
  };

  const getRoleBadgeStyles = (role) => {
    const styles = {
      viewer: 'bg-gray-100 text-gray-700 border-gray-200',
      editor: 'bg-green-100 text-green-700 border-green-200',
      admin: 'bg-blue-100 text-blue-700 border-blue-200',
      super_admin: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return styles[role] || styles.viewer;
  };

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Users className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 font-medium">No users found</p>
        <p className="text-sm text-gray-400 mt-1">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 text-xs font-semibold 
                text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold 
                text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="text-left py-3 px-4 text-xs font-semibold 
                text-gray-500 uppercase tracking-wider hidden md:table-cell">
                Joined
              </th>
              <th className="text-right py-3 px-4 text-xs font-semibold 
                text-gray-500 uppercase tracking-wider w-20">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const roleConfig = getRoleConfig(user.role);
              const RoleIcon = roleConfig.icon;
              const isCurrentUser = user._id === currentUserId;
              const canManage = canManageUser(user.role) && !isCurrentUser;
              const showActions = canManage && hasPermission('users:change_role');

              return (
                <tr 
                  key={user._id} 
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  {/* User Info */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br 
                        from-blue-500 to-purple-600 flex items-center justify-center 
                        text-white font-semibold flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-gray-100 
                              text-gray-500 px-1.5 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Role Badge */}
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 
                      rounded-full text-xs font-medium border
                      ${getRoleBadgeStyles(user.role)}`}
                    >
                      <RoleIcon className="w-3.5 h-3.5" />
                      {roleConfig.label}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="py-4 px-4 hidden md:table-cell">
                    <span className="text-sm text-gray-500">
                      {user.joinedAt
                        ? new Date(user.joinedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 text-right">
                    {showActions ? (
                      <ActionDropdown
                        user={user}
                        isOpen={openMenuId === user._id}
                        onToggle={() => 
                          setOpenMenuId(
                            openMenuId === user._id ? null : user._id
                          )
                        }
                        onClose={closeMenu}
                        onRoleChange={onRoleChange}
                        onRemoveUser={onRemoveUser}
                        onTransferOwnership={onTransferOwnership}
                        isSuperAdmin={isSuperAdmin}
                      />
                    ) : (
                      /* ── Disabled state: black lock icon ── */
                      <div className="relative group inline-block">
                        <button
                          disabled
                          className="p-2 rounded-lg text-gray-900 
                            cursor-not-allowed opacity-60"
                          aria-label="No actions available"
                        >
                          <Lock className="w-4 h-4" />
                        </button>

                        {/* Tooltip */}
                        <div className="absolute bottom-full right-0 mb-2 
                          hidden group-hover:block pointer-events-none z-50">
                          <div className="bg-gray-900 text-white text-xs 
                            rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                            {isCurrentUser
                              ? "You can't modify your own role"
                              : "You don't have permission to manage this user"}
                            {/* Tooltip arrow */}
                            <div className="absolute top-full right-3 
                              border-4 border-transparent 
                              border-t-gray-900" />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default UserRoleTable;