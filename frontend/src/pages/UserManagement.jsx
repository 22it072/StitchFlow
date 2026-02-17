// frontend/src/pages/UserManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Search, 
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { usePermissions } from '../hooks/usePermissions';
import { AccessDenied } from '../components/guards/PermissionGuard';
import UserRoleTable from '../components/company/UserRoleTable';
import JoinCodeDisplay from '../components/company/JoinCodeDisplay';
import api from '../services/api';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const { activeCompany } = useCompany();
  const { hasPermission, isSuperAdmin } = usePermissions();
  
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [companyCode, setCompanyCode] = useState('');

  const canManageUsers = hasPermission('users:view');

  const fetchUsers = useCallback(async () => {
    if (!activeCompany?._id) return;
    try {
      setLoading(true);
      const response = await api.get(`/companies/${activeCompany._id}/users`);
      setUsers(response.data.data.users);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [activeCompany?._id]);

  const fetchStats = useCallback(async () => {
    if (!activeCompany?._id) return;
    try {
      const response = await api.get(`/companies/${activeCompany._id}/users/stats`);
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [activeCompany?._id]);

  const fetchCompanyDetails = useCallback(async () => {
    if (!activeCompany?._id) return;
    try {
      const response = await api.get(`/companies/${activeCompany._id}`);
      setCompanyCode(response.data.data.companyCode || '');
    } catch (err) {
      console.error('Failed to fetch company details:', err);
    }
  }, [activeCompany?._id]);

  useEffect(() => {
    if (activeCompany && canManageUsers) {
      fetchUsers();
      fetchStats();
      fetchCompanyDetails();
    }
  }, [activeCompany, canManageUsers, fetchUsers, fetchStats, fetchCompanyDetails]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/companies/${activeCompany._id}/users/${userId}/role`, { 
        role: newRole 
      });
      toast.success('Role updated successfully');
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this user from the company?')) {
      return;
    }
    try {
      await api.delete(`/companies/${activeCompany._id}/users/${userId}`);
      toast.success('User removed successfully');
      fetchUsers();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove user');
    }
  };

  const handleTransferOwnership = async (userId) => {
    if (!window.confirm(
      'Are you sure you want to transfer ownership? You will become an Admin.'
    )) {
      return;
    }
    try {
      await api.post(`/companies/${activeCompany._id}/transfer-ownership`, { 
        newOwnerId: userId 
      });
      toast.success('Ownership transferred successfully');
      fetchUsers();
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer ownership');
    }
  };

  // Check permission after all hooks
  if (!canManageUsers) {
    return <AccessDenied message="You don't have permission to manage users" />;
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage users and roles for {activeCompany?.name}
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="p-2 text-gray-500 hover:text-gray-700 
            hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm text-purple-600">Super Admins</p>
            <p className="text-2xl font-bold text-purple-700">
              {stats.super_admin}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-600">Admins</p>
            <p className="text-2xl font-bold text-blue-700">{stats.admin}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-600">Editors</p>
            <p className="text-2xl font-bold text-green-700">{stats.editor}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600">Viewers</p>
            <p className="text-2xl font-bold text-gray-700">{stats.viewer}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Users Table - REMOVED overflow-hidden from here */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm">
          {/* Table Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 
                  w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 
                    rounded-lg focus:ring-2 focus:ring-blue-500 
                    focus:border-transparent bg-white text-gray-900"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 
                  rounded-lg focus:ring-2 focus:ring-blue-500 
                  focus:border-transparent bg-white text-gray-900"
              >
                <option value="">All Roles</option>
                <option value="viewer">Viewers</option>
                <option value="editor">Editors</option>
                <option value="admin">Admins</option>
                <option value="super_admin">Super Admins</option>
              </select>
            </div>
          </div>

          {/* Table Content - overflow-visible so dropdowns aren't clipped */}
          <div className="relative">
            <UserRoleTable
              users={filteredUsers}
              currentUserId={activeCompany?.createdBy}
              onRoleChange={handleRoleChange}
              onRemoveUser={handleRemoveUser}
              onTransferOwnership={handleTransferOwnership}
              loading={loading}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {companyCode && (
            <JoinCodeDisplay
              companyCode={companyCode}
              companyId={activeCompany?._id}
              onCodeRegenerated={(newCode) => setCompanyCode(newCode)}
            />
          )}

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => {
                  const message = `Join our company on StitchFlow!\n\nCompany: ${activeCompany?.name}\nCode: ${companyCode}`;
                  navigator.clipboard.writeText(message);
                  toast.success('Invite message copied!');
                }}
                className="w-full flex items-center gap-3 p-3 text-left 
                  text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Copy Invite Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;